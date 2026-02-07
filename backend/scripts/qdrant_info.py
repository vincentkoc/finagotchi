import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv('.env')
load_dotenv('backend/.env')

url = os.environ.get('QDRANT_CLUSTER_ENDPOINT')
key = os.environ.get('QDRANT_API_KEY')
collection = os.environ.get('QDRANT_COLLECTION', 'DocumentChunk_text')

if not url or not key:
    raise SystemExit('QDRANT_CLUSTER_ENDPOINT and QDRANT_API_KEY must be set')

client = QdrantClient(url=url, api_key=key)
print(client.get_collections())

try:
    info = client.get_collection(collection)
    print('collection:', collection)
    print(info)
except Exception as exc:
    print('collection info error:', exc)
