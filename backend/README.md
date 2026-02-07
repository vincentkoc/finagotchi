# Backend

## Quick start

1. Copy env file and fill Qdrant Cloud values:

```bash
cp backend/.env.example backend/.env
```

1. Install deps and run:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

## Swagger (API docs)

Open: `http://127.0.0.1:8000/` (Swagger UI)

## Example usage

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/health/models
curl http://127.0.0.1:8000/dilemma/next

curl -X POST http://127.0.0.1:8000/qa \
  -H "Content-Type: application/json" \
  -d '{"question":"Is vendor 6 risky due to late payments?","pet_id":"default"}'

curl -X POST http://127.0.0.1:8000/feedback \
  -H "Content-Type: application/json" \
  -d '{"interaction_id":"<from /qa>","action":"flag","rationale":"Discount looks too high"}'

curl http://127.0.0.1:8000/graph/sample
```

Note: `/qa` returns `graph_combined` which merges `neighborhood_graph` + `overlay_graph` for convenience.

## Model serving (single port)

The backend can run GGUF models **in-process** (no extra ports). Set:

```text
INPROC_LLM=1
LLM_CHAT_MODEL_PATH=external/grey/models/cognee-distillabs-model-gguf-quantized/model-quantized.gguf
LLM_EMBED_MODEL_PATH=external/grey/models/nomic-embed-text/nomic-embed-text-v1.5.f16.gguf
```

Then run:

```bash
make api-noreload
```

### Optional: external servers + proxy

If you prefer separate llama.cpp servers, keep:

- `LLM_CHAT_URL` → chat server
- `LLM_EMBED_URL` → embed server

The backend exposes proxy routes:

- `POST /llm/chat`
- `POST /llm/embeddings`

Frontend can still talk to the backend only.

For macOS OpenBLAS build details, see: `docs/LLAMA_CPP_SETUP.md`

## Qdrant snapshots (cloud)

```bash
make qdrant-download
make qdrant-restore
```

## Smoke tests

```bash
python backend/scripts/smoke_models.py
python backend/scripts/verify_qdrant_dims.py
```

## Tests

```bash
pytest backend/tests
```
