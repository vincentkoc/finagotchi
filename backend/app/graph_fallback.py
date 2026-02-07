from __future__ import annotations

from typing import Any


def build_graph_from_evidence(
    evidence: list[dict[str, Any]],
    anchors: dict[str, set[str]],
) -> dict[str, Any]:
    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, Any]] = []

    # Evidence nodes
    for item in evidence:
        node_id = item.get("id")
        if not node_id:
            continue
        label = node_id.split(":")[-1]
        parsed = (item.get("meta") or {}).get("parsed")
        if isinstance(parsed, dict):
            invoice = parsed.get("invoice_number") or parsed.get("transaction_id")
            total = parsed.get("total")
            due = parsed.get("due_date") or parsed.get("date")
            if invoice:
                if total is not None:
                    label = f"{invoice} | ${total}"
                elif due:
                    label = f"{invoice} | due {due}"
                else:
                    label = str(invoice)
        nodes.setdefault(
            node_id,
            {
                "id": node_id,
                "label": label,
                "group": "evidence",
                "meta": item.get("meta", {}),
            },
        )

    # Anchor nodes
    for key, values in anchors.items():
        for value in values:
            node_id = f"{key}:{value}"
            nodes.setdefault(
                node_id,
                {
                    "id": node_id,
                    "label": f"{key} {value}"
                    if key in ("vendor_id", "transaction_id")
                    else value,
                    "group": key,
                    "meta": {"type": key},
                },
            )

    # Connect evidence to anchors if possible
    for item in evidence:
        eid = item.get("id")
        meta = item.get("meta", {})
        if not eid:
            continue
        for key, values in anchors.items():
            for value in values:
                if str(meta.get(key)) == value:
                    edges.append(
                        {
                            "id": f"{eid}->{key}:{value}",
                            "source": eid,
                            "target": f"{key}:{value}",
                            "label": "MENTIONS",
                            "weight": 1.0,
                            "meta": {},
                        }
                    )

    return {"nodes": list(nodes.values()), "edges": edges}
