from __future__ import annotations

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

        # The schema varies across Cognee exports.
        # We attempt a conservative query path. If it fails, return empty.
        try:
            nodes = []
            edges = []
            # Best-effort: use anchor values as labels in a simple lookup
            anchor_values = set()
            for values in anchors.values():
                anchor_values.update(values)

            # If no anchors, return empty.
            if not anchor_values:
                return {"nodes": [], "edges": []}

            # Attempt to find matching entities in any table with a name column.
            tables = self._conn.execute("CALL show_tables()")
            table_rows = []
            while tables.has_next():
                table_rows.append(tables.get_next())

            for row in table_rows:
                table_name = row[0]
                if not isinstance(table_name, str):
                    continue
                # Try to query a "name" or "id" column if present.
                try:
                    cols = self._conn.execute(f"CALL table_info('{table_name}')")
                    col_names = []
                    while cols.has_next():
                        col_names.append(cols.get_next()[1])
                    target_col = None
                    for candidate in ("name", "id", "entity", "value"):
                        if candidate in col_names:
                            target_col = candidate
                            break
                    if target_col is None:
                        continue

                    for value in anchor_values:
                        result = self._conn.execute(
                            f"MATCH (n:{table_name}) WHERE n.{target_col} = $val RETURN n LIMIT 5",
                            {"val": value},
                        )
                        while result.has_next():
                            record = result.get_next()
                            node = record[0]
                            node_id = f"{table_name}:{value}"
                            nodes.append(
                                {
                                    "id": node_id,
                                    "label": value,
                                    "group": table_name,
                                    "meta": {},
                                }
                            )
                except Exception:
                    continue

            return {"nodes": nodes, "edges": edges}
        except Exception:
            return {"nodes": [], "edges": []}
