import os
import ast
from typing import Any

import kuzu
from qdrant_client import QdrantClient
from dotenv import load_dotenv

# Load env from repo root and backend/.env if present
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")))

QDRANT_URL = os.environ.get(
    "QDRANT_CLUSTER_ENDPOINT",
    "http://localhost:6333",
)
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
ENTITY_COLLECTION = os.environ.get("ENTITY_COLLECTION", "Entity_name")
CHUNK_COLLECTION = os.environ.get("CHUNK_COLLECTION", "DocumentChunk_text")
OUTPUT_DIR = os.environ.get("KUZU_OUT_DIR", "data/kuzu")
MAX_POINTS = int(os.environ.get("MAX_POINTS", "100000"))
BATCH = int(os.environ.get("BATCH", "1000"))

client = (
    QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    if QDRANT_API_KEY
    else QdrantClient(url=QDRANT_URL)
)

if os.path.exists(OUTPUT_DIR):
    print(f"Kuzu output dir exists: {OUTPUT_DIR}")
else:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

lock_path = os.path.join(OUTPUT_DIR, ".lock")
if os.path.exists(lock_path):
    raise SystemExit(
        f"Kuzu lock exists at {lock_path}. Stop any running process using this DB and delete the lock file."
    )

print("Building Kuzu DB at:", OUTPUT_DIR)

conn = kuzu.Connection(kuzu.Database(OUTPUT_DIR))

# Nodes
conn.execute(
    "CREATE NODE TABLE IF NOT EXISTS Entity(entity_id STRING, name STRING, type STRING, PRIMARY KEY(entity_id))"
)
conn.execute(
    "CREATE NODE TABLE IF NOT EXISTS Chunk(chunk_id STRING, text STRING, PRIMARY KEY(chunk_id))"
)
conn.execute(
    "CREATE NODE TABLE IF NOT EXISTS Vendor(vendor_id STRING, name STRING, PRIMARY KEY(vendor_id))"
)
conn.execute(
    "CREATE NODE TABLE IF NOT EXISTS Invoice(invoice_id STRING, vendor_id STRING, total DOUBLE, date STRING, due_date STRING, PRIMARY KEY(invoice_id))"
)
conn.execute(
    "CREATE NODE TABLE IF NOT EXISTS SKU(sku STRING, product STRING, PRIMARY KEY(sku))"
)

# Relationships
conn.execute("CREATE REL TABLE IF NOT EXISTS Mentions(FROM Chunk TO Entity, rel STRING)")
conn.execute("CREATE REL TABLE IF NOT EXISTS Issued(FROM Vendor TO Invoice, rel STRING)")
conn.execute("CREATE REL TABLE IF NOT EXISTS Contains(FROM Invoice TO SKU, rel STRING)")
conn.execute("CREATE REL TABLE IF NOT EXISTS Supplies(FROM Vendor TO SKU, rel STRING)")

entity_ids = set()
entity_name_to_id = {}


def _extract_name(payload: dict[str, Any]) -> str | None:
    for key in ("name", "value", "text", "entity", "label"):
        if key in payload and isinstance(payload[key], str):
            return payload[key]
    return None


def _extract_type(payload: dict[str, Any]) -> str | None:
    for key in ("type", "entity_type", "kind"):
        if key in payload and isinstance(payload[key], str):
            return payload[key]
    return None


print("Loading entities...")
next_offset = None
count = 0
while True:
    points, next_offset = client.scroll(
        collection_name=ENTITY_COLLECTION,
        offset=next_offset,
        limit=BATCH,
        with_payload=True,
        with_vectors=False,
    )
    for p in points:
        eid = str(p.id)
        payload = p.payload or {}
        name = _extract_name(payload) or eid
        etype = _extract_type(payload) or ""
        if eid not in entity_ids:
            conn.execute(
                "MERGE (e:Entity {entity_id: $id}) SET e.name = $name, e.type = $type",
                {"id": eid, "name": name, "type": etype},
            )
            entity_ids.add(eid)
            entity_name_to_id[name] = eid
    count += len(points)
    if next_offset is None or count >= MAX_POINTS:
        break

print(f"Loaded {len(entity_ids)} entities")

print("Loading chunks + edges...")
next_offset = None
count = 0
while True:
    points, next_offset = client.scroll(
        collection_name=CHUNK_COLLECTION,
        offset=next_offset,
        limit=BATCH,
        with_payload=True,
        with_vectors=False,
    )
    for p in points:
        cid = str(p.id)
        payload = p.payload or {}
        text = None
        for key in ("text", "content", "chunk", "body"):
            if key in payload and isinstance(payload[key], str):
                text = payload[key]
                break
        if text is None:
            text = ""
        conn.execute(
            "MERGE (c:Chunk {chunk_id: $id}) SET c.text = $text",
            {"id": cid, "text": text[:2000]},
        )

        # Parse structured chunk text
        parsed = None
        if isinstance(text, str) and text.startswith("{") and text.endswith("}"):
            try:
                parsed = ast.literal_eval(text)
            except Exception:
                parsed = None

        # Create vendor/invoice/sku nodes + edges
        if isinstance(parsed, dict):
            vendor_id = parsed.get("vendor_id")
            invoice_id = parsed.get("invoice_number") or parsed.get("transaction_id")
            total = parsed.get("total")
            date = parsed.get("date")
            due = parsed.get("due_date")

            if vendor_id is not None:
                conn.execute(
                    "MERGE (v:Vendor {vendor_id: $id}) SET v.name = $name",
                    {"id": str(vendor_id), "name": f"Vendor {vendor_id}"},
                )

            if invoice_id is not None:
                conn.execute(
                    "MERGE (i:Invoice {invoice_id: $id}) SET i.vendor_id = $vendor, i.total = $total, i.date = $date, i.due_date = $due",
                    {
                        "id": str(invoice_id),
                        "vendor": str(vendor_id) if vendor_id is not None else "",
                        "total": float(total) if isinstance(total, (int, float)) else 0.0,
                        "date": str(date) if date is not None else "",
                        "due": str(due) if due is not None else "",
                    },
                )
                if vendor_id is not None:
                    conn.execute(
                        "MATCH (v:Vendor {vendor_id: $vid}), (i:Invoice {invoice_id: $iid}) MERGE (v)-[:Issued {rel: $rel}]->(i)",
                        {"vid": str(vendor_id), "iid": str(invoice_id), "rel": "ISSUED"},
                    )

            items = parsed.get("items")
            if isinstance(items, str):
                try:
                    items = ast.literal_eval(items)
                except Exception:
                    items = None

            if isinstance(items, list):
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    sku = item.get("sku")
                    product = item.get("product")
                    if sku:
                        conn.execute(
                            "MERGE (s:SKU {sku: $sku}) SET s.product = $product",
                            {"sku": str(sku), "product": str(product) if product else ""},
                        )
                        if invoice_id is not None:
                            conn.execute(
                                "MATCH (i:Invoice {invoice_id: $iid}), (s:SKU {sku: $sku}) MERGE (i)-[:Contains {rel: $rel}]->(s)",
                                {"iid": str(invoice_id), "sku": str(sku), "rel": "CONTAINS"},
                            )
                        if vendor_id is not None:
                            conn.execute(
                                "MATCH (v:Vendor {vendor_id: $vid}), (s:SKU {sku: $sku}) MERGE (v)-[:Supplies {rel: $rel}]->(s)",
                                {"vid": str(vendor_id), "sku": str(sku), "rel": "SUPPLIES"},
                            )

        # Entity relationships if present in payload
        entities: list[Any] = []
        if isinstance(payload.get("entities"), list):
            entities = list(payload.get("entities") or [])
        elif isinstance(payload.get("entity_ids"), list):
            entities = list(payload.get("entity_ids") or [])
        elif isinstance(payload.get("entity_names"), list):
            entities = list(payload.get("entity_names") or [])

        for ent in entities:
            if isinstance(ent, dict):
                ent_id = str(ent.get("id") or "")
                ent_name = ent.get("name") if isinstance(ent.get("name"), str) else None
            else:
                ent_id = str(ent) if ent is not None else ""
                ent_name = str(ent) if ent is not None else None

            target_id = None
            if ent_id and ent_id in entity_ids:
                target_id = ent_id
            elif ent_name and ent_name in entity_name_to_id:
                target_id = entity_name_to_id[ent_name]

            if target_id:
                conn.execute(
                    "MATCH (c:Chunk {chunk_id: $cid}), (e:Entity {entity_id: $eid}) MERGE (c)-[:Mentions {rel: $rel}]->(e)",
                    {"cid": cid, "eid": target_id, "rel": "MENTIONS"},
                )

    count += len(points)
    if next_offset is None or count >= MAX_POINTS:
        break

print("Done.")
