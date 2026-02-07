import os
from typing import Any

import kuzu

kuzu_path = os.environ.get(
    "KUZU_DB_PATH",
    "external/grey/cognee_export/system_databases/cognee_graph_kuzu",
)

if not os.path.exists(kuzu_path):
    raise SystemExit(f"Kuzu path not found: {kuzu_path}")

if not os.path.isdir(kuzu_path):
    raise SystemExit(
        f"Kuzu expects a directory, but KUZU_DB_PATH is a file: {kuzu_path}\n"
        "If you have a Kuzu directory export, point KUZU_DB_PATH to that folder."
    )

conn = kuzu.Connection(kuzu.Database(kuzu_path, read_only=True))

tables: Any = conn.execute("CALL show_tables()")
print("Tables:")
while tables.has_next():
    row = tables.get_next()
    print("-", row[0])

print("\nSample columns:")
conn = kuzu.Connection(kuzu.Database(kuzu_path, read_only=True))

tables = conn.execute("CALL show_tables()")
while tables.has_next():
    row = tables.get_next()
    table = row[0]
    cols: Any = conn.execute(f"CALL table_info('{table}')")
    col_names = []
    while cols.has_next():
        col_names.append(cols.get_next()[1])
    print(f"{table}: {', '.join(col_names)}")
