from __future__ import annotations

import ast
from typing import Any

# Map anchor key → (display-friendly group, node type for frontend)
_ANCHOR_TYPE_MAP = {
    "vendor_id": ("vendor", "vendor"),
    "transaction_id": ("transaction", "transaction"),
    "sku": ("sku", "entity"),
    "chunk_id": ("chunk", "entity"),
}


def build_graph_from_evidence(
    evidence: list[dict[str, Any]],
    anchors: dict[str, set[str]],
) -> dict[str, Any]:
    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []

    # Evidence nodes — create one per evidence item with a readable label
    for item in evidence:
        node_id = item.get("id")
        if not node_id:
            continue
        parsed = (item.get("meta") or {}).get("parsed")
        label = _label_from_parsed(parsed, node_id)
        group = _group_from_parsed(parsed)
        nodes.setdefault(
            node_id,
            {
                "id": node_id,
                "label": label,
                "group": group,
                "type": group,
                "meta": {},
            },
        )

    # Anchor nodes — vendor_id, transaction_id, sku etc.
    for key, values in anchors.items():
        group, node_type = _ANCHOR_TYPE_MAP.get(key, (key, "entity"))
        for value in values:
            node_id = f"{key}:{value}"
            label = _anchor_label(key, value)
            nodes.setdefault(
                node_id,
                {
                    "id": node_id,
                    "label": label,
                    "group": group,
                    "type": node_type,
                    "meta": {"anchor_type": key},
                },
            )

    # Connect evidence to matching anchors
    for item in evidence:
        eid = item.get("id")
        meta = item.get("meta", {})
        parsed = meta.get("parsed", {}) if isinstance(meta, dict) else {}
        if not eid:
            continue
        # Check both meta top-level and parsed
        for key, values in anchors.items():
            for value in values:
                # Match on top-level meta, parsed, or invoice_number → transaction_id
                matched = False
                for src in (meta, parsed):
                    if str(src.get(key)) == value:
                        matched = True
                        break
                    # invoice_number also maps to transaction_id anchor
                    if (
                        key == "transaction_id"
                        and str(src.get("invoice_number")) == value
                    ):
                        matched = True
                        break
                if matched:
                    edge_id = f"{eid}->{key}:{value}"
                    edges.append(
                        {
                            "id": edge_id,
                            "source": eid,
                            "target": f"{key}:{value}",
                            "label": "MENTIONS",
                            "weight": 1.0,
                            "meta": {},
                        }
                    )

    # Inter-anchor edges (e.g. vendor → transaction if they co-occur in evidence)
    _add_cooccurrence_edges(evidence, anchors, nodes, edges)

    # Prune orphan nodes (no edges)
    connected = set()
    for e in edges:
        connected.add(e["source"])
        connected.add(e["target"])
    pruned_nodes = [n for n in nodes.values() if n["id"] in connected]

    return {"nodes": pruned_nodes, "edges": edges}


def _label_from_parsed(parsed: dict | None, fallback_id: str) -> str:
    """Build a readable label from parsed evidence metadata."""
    if not isinstance(parsed, dict):
        return fallback_id.split(":")[-1][:12]
    invoice = parsed.get("invoice_number") or parsed.get("transaction_id")
    total = parsed.get("total") or parsed.get("amount")
    if invoice:
        if total is not None:
            return f"{invoice} | ${total}"
        return str(invoice)
    vendor = parsed.get("vendor_id")
    if vendor is not None and total is not None:
        return f"V{vendor} | ${total}"
    return fallback_id.split(":")[-1][:12]


def _group_from_parsed(parsed: dict | None) -> str:
    """Determine a frontend-friendly group from parsed fields."""
    if not isinstance(parsed, dict):
        return "entity"
    if parsed.get("invoice_number"):
        return "transaction"
    if parsed.get("transaction_id"):
        return "transaction"
    return "entity"


def _anchor_label(key: str, value: str) -> str:
    """Create a short readable label for an anchor node."""
    if key == "vendor_id":
        return f"Vendor {value}"
    if key == "transaction_id":
        return value  # e.g. "INV-V6-001" or "TX-V9-M04-859067"
    if key == "sku":
        return value
    return value[:20]


def _add_cooccurrence_edges(
    evidence: list[dict[str, Any]],
    anchors: dict[str, set[str]],
    nodes: dict[str, dict[str, Any]],
    edges: list[dict[str, Any]],
) -> None:
    """Link vendor → transaction anchors when they co-occur in the same evidence item."""
    seen_pairs: set[tuple[str, str]] = set()
    for item in evidence:
        meta = item.get("meta", {})
        parsed = meta.get("parsed", {}) if isinstance(meta, dict) else {}
        combined = {**meta, **parsed} if isinstance(parsed, dict) else meta

        vid = str(combined.get("vendor_id", ""))
        txn = str(
            combined.get("transaction_id") or combined.get("invoice_number") or ""
        )

        if (
            vid
            and txn
            and vid in anchors.get("vendor_id", set())
            and txn in anchors.get("transaction_id", set())
        ):
            pair = (f"vendor_id:{vid}", f"transaction_id:{txn}")
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                edges.append(
                    {
                        "id": f"{pair[0]}->{pair[1]}",
                        "source": pair[0],
                        "target": pair[1],
                        "label": "ISSUED",
                        "weight": 1.0,
                        "meta": {},
                    }
                )

        # Also link transaction → sku
        items = combined.get("items")
        if isinstance(items, str):
            try:
                items = ast.literal_eval(items)
            except Exception:
                items = None
        if isinstance(items, list) and txn:
            for it in items:
                if isinstance(it, dict) and it.get("sku"):
                    sku_val = str(it["sku"])
                    if sku_val in anchors.get("sku", set()):
                        pair2 = (f"transaction_id:{txn}", f"sku:{sku_val}")
                        if pair2 not in seen_pairs:
                            seen_pairs.add(pair2)
                            edges.append(
                                {
                                    "id": f"{pair2[0]}->{pair2[1]}",
                                    "source": pair2[0],
                                    "target": pair2[1],
                                    "label": "CONTAINS",
                                    "weight": 1.0,
                                    "meta": {},
                                }
                            )
