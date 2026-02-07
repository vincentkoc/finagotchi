from __future__ import annotations

import os
from typing import Any

try:
    import kuzu as kuzu  # type: ignore
except Exception:  # pragma: no cover
    kuzu = None  # type: ignore

from .config import settings


class KuzuAdapter:
    def __init__(self) -> None:
        self._enabled = False
        self._conn = None
        if kuzu is None:
            return
        try:
            if not settings.kuzu_db_path or not os.path.isdir(settings.kuzu_db_path):
                return
            db = kuzu.Database(settings.kuzu_db_path, read_only=True)
            self._conn = kuzu.Connection(db)
            self._enabled = True
        except Exception:
            self._enabled = False

    @property
    def enabled(self) -> bool:
        return self._enabled

    def neighborhood(self, anchors: dict[str, set[str]], depth: int = 2) -> dict[str, Any]:
        if not self._enabled or self._conn is None:
            return {"nodes": [], "edges": []}

        try:
            nodes: dict[str, dict[str, Any]] = {}
            edges: list[dict[str, Any]] = []

            vendor_ids = anchors.get("vendor_id", set())
            invoice_ids = anchors.get("transaction_id", set())
            chunk_ids = anchors.get("chunk_id", set())

            # Vendor-centered neighborhood
            for vid in list(vendor_ids)[:20]:
                res: Any = self._conn.execute(
                    "MATCH (v:Vendor {vendor_id: $vid})-[:Issued]->(i:Invoice)-[:Contains]->(s:SKU) RETURN v,i,s LIMIT 50",
                    {"vid": str(vid)},
                )
                while res.has_next():
                    v, i, s = res.get_next()
                    v_id = f"vendor:{getattr(v, 'vendor_id', vid)}"
                    i_id = f"invoice:{getattr(i, 'invoice_id', '')}"
                    s_id = f"sku:{getattr(s, 'sku', '')}"

                    nodes.setdefault(
                        v_id,
                        {
                            "id": v_id,
                            "label": f"Vendor {getattr(v, 'vendor_id', vid)}",
                            "group": "vendor",
                            "type": "vendor",
                            "meta": {"vendor_id": getattr(v, 'vendor_id', vid)},
                            "properties": {
                                "vendor_id": getattr(v, 'vendor_id', vid),
                                "tooltip": f"Vendor {getattr(v, 'vendor_id', vid)}",
                            },
                        },
                    )
                    nodes.setdefault(
                        i_id,
                        {
                            "id": i_id,
                            "label": f"{getattr(i, 'invoice_id', '')} | ${getattr(i, 'total', '')}",
                            "group": "transaction",
                            "type": "transaction",
                            "meta": {"invoice_id": getattr(i, 'invoice_id', '')},
                            "properties": {
                                "invoice_id": getattr(i, 'invoice_id', ''),
                                "total": getattr(i, 'total', None),
                                "date": getattr(i, 'date', None),
                                "due_date": getattr(i, 'due_date', None),
                                "tooltip": f"Invoice {getattr(i, 'invoice_id', '')} | ${getattr(i, 'total', '')} | due {getattr(i, 'due_date', '')}",
                            },
                        },
                    )
                    nodes.setdefault(
                        s_id,
                        {
                            "id": s_id,
                            "label": f"{getattr(s, 'sku', '')} | {getattr(s, 'product', '')}",
                            "group": "entity",
                            "type": "entity",
                            "meta": {"sku": getattr(s, 'sku', '')},
                            "properties": {
                                "sku": getattr(s, 'sku', ''),
                                "product": getattr(s, 'product', ''),
                                "tooltip": f"{getattr(s, 'sku', '')} | {getattr(s, 'product', '')}",
                            },
                        },
                    )

                    edges.append(
                        {
                            "id": f"{v_id}->{i_id}",
                            "source": v_id,
                            "target": i_id,
                            "label": "ISSUED",
                            "weight": 1.0,
                            "meta": {},
                        }
                    )
                    edges.append(
                        {
                            "id": f"{i_id}->{s_id}",
                            "source": i_id,
                            "target": s_id,
                            "label": "CONTAINS",
                            "weight": 1.0,
                            "meta": {},
                        }
                    )

            # Invoice-centered neighborhood
            for iid in list(invoice_ids)[:20]:
                res = self._conn.execute(
                    "MATCH (i:Invoice {invoice_id: $iid})-[:Contains]->(s:SKU) OPTIONAL MATCH (v:Vendor)-[:Issued]->(i) RETURN v,i,s LIMIT 50",
                    {"iid": str(iid)},
                )
                while res.has_next():
                    v, i, s = res.get_next()
                    if v is not None:
                        v_id = f"vendor:{getattr(v, 'vendor_id', '')}"
                        nodes.setdefault(
                            v_id,
                            {
                                "id": v_id,
                                "label": f"Vendor {getattr(v, 'vendor_id', '')}",
                                "group": "Vendor",
                                "type": "Vendor",
                                "meta": {"vendor_id": getattr(v, 'vendor_id', '')},
                                "properties": {
                                    "vendor_id": getattr(v, 'vendor_id', ''),
                                    "tooltip": f"Vendor {getattr(v, 'vendor_id', '')}",
                                },
                            },
                        )
                    i_id = f"invoice:{getattr(i, 'invoice_id', iid)}"
                    nodes.setdefault(
                        i_id,
                        {
                            "id": i_id,
                            "label": f"{getattr(i, 'invoice_id', iid)} | ${getattr(i, 'total', '')}",
                            "group": "transaction",
                            "type": "transaction",
                            "meta": {"invoice_id": getattr(i, 'invoice_id', iid)},
                            "properties": {
                                "invoice_id": getattr(i, 'invoice_id', iid),
                                "total": getattr(i, 'total', None),
                                "date": getattr(i, 'date', None),
                                "due_date": getattr(i, 'due_date', None),
                                "tooltip": f"Invoice {getattr(i, 'invoice_id', iid)} | ${getattr(i, 'total', '')} | due {getattr(i, 'due_date', '')}",
                            },
                        },
                    )
                    if s is not None:
                        s_id = f"sku:{getattr(s, 'sku', '')}"
                        nodes.setdefault(
                            s_id,
                            {
                                "id": s_id,
                                "label": f"{getattr(s, 'sku', '')} | {getattr(s, 'product', '')}",
                                "group": "SKU",
                                "type": "SKU",
                                "meta": {"sku": getattr(s, 'sku', '')},
                                "properties": {
                                    "sku": getattr(s, 'sku', ''),
                                    "product": getattr(s, 'product', ''),
                                    "tooltip": f"{getattr(s, 'sku', '')} | {getattr(s, 'product', '')}",
                                },
                            },
                        )
                        edges.append(
                            {
                                "id": f"{i_id}->{s_id}",
                                "source": i_id,
                                "target": s_id,
                                "label": "CONTAINS",
                                "weight": 1.0,
                                "meta": {},
                            }
                        )

            # Chunk fallback (if no vendor/invoice anchors)
            if not nodes and chunk_ids:
                for cid in list(chunk_ids)[:20]:
                    res = self._conn.execute(
                        "MATCH (c:Chunk {chunk_id: $cid})-[:Mentions]->(e:Entity) RETURN c,e LIMIT 50",
                        {"cid": cid},
                    )
                    while res.has_next():
                        c, e = res.get_next()
                        c_id = f"chunk:{cid}"
                        e_id = f"entity:{getattr(e, 'entity_id', '')}"
                        nodes.setdefault(
                            c_id,
                            {
                                "id": c_id,
                                "label": cid,
                                "group": "entity",
                                "type": "entity",
                                "meta": {"chunk_id": cid},
                                "properties": {"chunk_id": cid},
                            },
                        )
                        nodes.setdefault(
                            e_id,
                            {
                                "id": e_id,
                                "label": getattr(e, "name", None) or e_id,
                                "group": getattr(e, "type", None) or "Entity",
                                "type": getattr(e, "type", None) or "Entity",
                                "meta": {"entity_id": getattr(e, "entity_id", None)},
                                "properties": {"entity_id": getattr(e, "entity_id", None)},
                            },
                        )
                        edges.append(
                            {
                                "id": f"{c_id}->{e_id}",
                                "source": c_id,
                                "target": e_id,
                                "label": "MENTIONS",
                                "weight": 1.0,
                                "meta": {},
                            }
                        )

            return {"nodes": list(nodes.values()), "edges": edges}
        except Exception:
            return {"nodes": [], "edges": []}
