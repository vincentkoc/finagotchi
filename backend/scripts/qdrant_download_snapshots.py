import os
import tarfile
import httpx
from dotenv import load_dotenv

load_dotenv('.env')
load_dotenv('backend/.env')

SNAPSHOTS_URL = os.environ.get(
    "QDRANT_SNAPSHOTS_URL",
    "https://cognee-data.nyc3.digitaloceanspaces.com/cognee-vectors-snapshot.tar.gz",
)
SNAPSHOTS_DIR = os.environ.get("QDRANT_SNAPSHOTS_DIR", "data/qdrant/snapshots")


def main() -> None:
    os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

    existing = [f for f in os.listdir(SNAPSHOTS_DIR) if f.endswith(".snapshot")]
    if existing:
        print(f"Already have {len(existing)} snapshots in {SNAPSHOTS_DIR}/")
        print("  " + "\n  ".join(sorted(existing)))
        print("Delete them to re-download.")
        return

    tarball = os.path.join(SNAPSHOTS_DIR, "cognee-vectors-snapshot.tar.gz")
    print(f"Downloading {SNAPSHOTS_URL}...")

    with httpx.stream("GET", SNAPSHOTS_URL, timeout=300.0) as resp:
        resp.raise_for_status()
        with open(tarball, "wb") as f:
            for chunk in resp.iter_bytes(chunk_size=8192):
                f.write(chunk)

    size_mb = os.path.getsize(tarball) / 1e6
    print(f"  Downloaded ({size_mb:.1f}MB)")

    print("Extracting snapshots...")
    with tarfile.open(tarball) as tf:
        tf.extractall(SNAPSHOTS_DIR)
    os.remove(tarball)

    extracted = [f for f in os.listdir(SNAPSHOTS_DIR) if f.endswith(".snapshot")]
    print(f"  Extracted {len(extracted)} snapshots to {SNAPSHOTS_DIR}/")
    print("Next step: python backend/scripts/qdrant_restore_snapshots.py")


if __name__ == "__main__":
    main()
