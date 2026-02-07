from __future__ import annotations

import os
from typing import Any

try:
    import kuzu
except Exception:  # pragma: no cover
    kuzu = None

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

        # Kuzu DB built by scripts/build_kuzu_from_qdrant.py
        try:
            nodes: dict[str, dict[str, Any]] = {}
            edges: list[dict[str, Any]] = []

            chunk_ids = anchors.get("chunk_id", set())
            if not chunk_ids:
                return {"nodes": [], "edges": []}

            for cid in list(chunk_ids)[:50]:
                # Get chunk node
                chunk_res = self._conn.execute(
                    "MATCH (c:Chunk {chunk_id: $cid}) RETURN c LIMIT 1",
                    {"cid": cid},
                )
                if chunk_res.has_next():
                    chunk_node = chunk_res.get_next()[0]
                    nodes.setdefault(
                        f"chunk:{cid}",
                        {
                            "id": f"chunk:{cid}",
                            "label": cid,
                            "group": "Chunk",
                            "meta": {"text": getattr(chunk_node, "text", None)},
                        },
                    )

                # Expand to entities via Mentions
                rel_res = self._conn.execute(
                    "MATCH (c:Chunk {chunk_id: $cid})-[:Mentions]->(e:Entity) RETURN e, c LIMIT 50",
                    {"cid": cid},
                )
                while rel_res.has_next():
                    e, c = rel_res.get_next()
                    eid = getattr(e, "entity_id", None)
                    name = getattr(e, "name", None) or eid
                    etype = getattr(e, "type", None)
                    if eid is None:
                        continue
                    nodes.setdefault(
                        f"entity:{eid}",
                        {
                            "id": f"entity:{eid}",
                            "label": name,
                            "group": etype or "Entity",
                            "meta": {"type": etype},
                        },
                    )
                    edges.append(
                        {
                            "id": f"chunk:{cid}->entity:{eid}",
                            "source": f"chunk:{cid}",
                            "target": f"entity:{eid}",
                            "label": "MENTIONS",
                            "weight": 1.0,
                            "meta": {},
                        }
                    )

            return {"nodes": list(nodes.values()), "edges": edges}
        except Exception:
            return {"nodes": [], "edges": []}
