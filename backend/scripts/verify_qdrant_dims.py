import os

from qdrant_client import QdrantClient

qdrant_url = os.environ.get("QDRANT_URL", "http://localhost:6333")
qdrant_api_key = os.environ.get("QDRANT_API_KEY")
collection = os.environ.get("QDRANT_COLLECTION", "DocumentChunk_text")

client = (
    QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
    if qdrant_api_key
    else QdrantClient(url=qdrant_url)
)

info = client.get_collection(collection)
print("collection:", collection)
vectors = info.config.params.vectors
size = None
if isinstance(vectors, dict):
    size = next(iter(vectors.values())).size
else:
    size = vectors.size if vectors else None
print("vector_size:", size)
