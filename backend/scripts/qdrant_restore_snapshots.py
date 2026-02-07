import glob
import os
import httpx
from dotenv import load_dotenv

load_dotenv('.env')
load_dotenv('backend/.env')

qdrant_url = os.environ.get("QDRANT_URL") or os.environ.get("QDRANT_CLUSTER_ENDPOINT")
qdrant_api_key = os.environ.get("QDRANT_API_KEY")

if not qdrant_url or not qdrant_api_key:
    raise SystemExit("QDRANT_URL/QDRANT_CLUSTER_ENDPOINT and QDRANT_API_KEY are required")

QDRANT_URL = qdrant_url.rstrip("/")
SNAPSHOTS_DIR = os.environ.get("QDRANT_SNAPSHOTS_DIR", "data/qdrant/snapshots")

HEADERS = {"api-key": qdrant_api_key}

COLLECTION_NAMES = [
    "DocumentChunk_text",
    "EdgeType_relationship_name",
    "Entity_name",
    "EntityType_name",
    "TextDocument_name",
    "TextSummary_text",
]


def get_collection_name(filename: str) -> str:
    for name in COLLECTION_NAMES:
        if filename.startswith(name):
            return name
    return filename.removesuffix(".snapshot")


def restore_snapshot(filepath: str) -> bool:
    collection = get_collection_name(os.path.basename(filepath))
    size_mb = os.path.getsize(filepath) / 1e6
    print(f"Restoring {collection} ({size_mb:.1f}MB)...")

    with open(filepath, "rb") as f:
        resp = httpx.post(
            f"{QDRANT_URL}/collections/{collection}/snapshots/upload",
            headers=HEADERS,
            files={"snapshot": (os.path.basename(filepath), f)},
            params={"priority": "snapshot"},
            timeout=300.0,
        )

    if resp.status_code == 200:
        print(f"  Restored {collection}")
        return True

    print(f"  Error restoring {collection}: {resp.status_code} {resp.text}")
    return False


def main() -> None:
    snapshot_files = sorted(glob.glob(os.path.join(SNAPSHOTS_DIR, "*.snapshot")))
    if not snapshot_files:
        print(f"No snapshot files found in {SNAPSHOTS_DIR}/")
        print("Run: python backend/scripts/qdrant_download_snapshots.py")
        return

    print(f"Found {len(snapshot_files)} snapshots in {SNAPSHOTS_DIR}/")
    print(f"Restoring to {QDRANT_URL}\n")

    success = 0
    for filepath in snapshot_files:
        if restore_snapshot(filepath):
            success += 1

    print(f"\nDone: {success}/{len(snapshot_files)} collections restored.")

    print("\nVerifying collections:")
    for filepath in snapshot_files:
        collection = get_collection_name(os.path.basename(filepath))
        r = httpx.get(f"{QDRANT_URL}/collections/{collection}", headers=HEADERS)
        if r.status_code == 200:
            info = r.json()["result"]
            print(f"  {collection}: {info['points_count']} points")
        else:
            print(f"  {collection}: ERROR {r.status_code}")


if __name__ == "__main__":
    main()
