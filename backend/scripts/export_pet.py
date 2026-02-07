import json
import os

from dotenv import load_dotenv

from backend.app.pet_store import PetStore

load_dotenv(".env")
load_dotenv("backend/.env")

pet_id = os.environ.get("PET_ID", "default")
out_path = os.environ.get("EXPORT_PATH", "data/exports/pet_export.jsonl")

store = PetStore()
exports = store.export_pet(pet_id)

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w") as f:
    for row in exports:
        f.write(json.dumps(row) + "\n")

print(f"Wrote {len(exports)} rows to {out_path}")
