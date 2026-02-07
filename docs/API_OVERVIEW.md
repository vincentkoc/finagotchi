# Finagotchi API Overview

This backend is the single entrypoint for the app. It handles:
- Qdrant retrieval (vector search)
- Kuzu graph neighborhood
- Pet state + overlay memory
- Local GGUF inference (in-process)

Swagger UI lives at: `http://127.0.0.1:8000/`

## Setup (local)
1. Create venv + install:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2. Configure `.env` (root):
```
QDRANT_CLUSTER_ENDPOINT=...
QDRANT_API_KEY=...
QDRANT_COLLECTION=DocumentChunk_text
QDRANT_VECTOR_NAME=text

INPROC_LLM=1
LLM_CHAT_MODEL_PATH=external/grey/models/cognee-distillabs-model-gguf-quantized/model-quantized.gguf
LLM_EMBED_MODEL_PATH=external/grey/models/nomic-embed-text/nomic-embed-text-v1.5.f16.gguf
```

3. Build Kuzu graph (once):
```bash
python backend/scripts/build_kuzu_from_qdrant.py
```

4. Start backend:
```bash
make api-noreload
```

## Endpoints

### `GET /health`
Quick health check.

### `GET /health/models`
Returns `{ chat: bool, embed: bool }` for local model availability.

### `GET /ready`
Readiness check for Qdrant + model availability.

### `GET /dilemma/next`
Returns a demo dilemma for the gameplay loop.

### `POST /qa`
Answers a question using Qdrant evidence + local model.

Request:
```json
{"question":"Is vendor 6 risky due to late payments?","pet_id":"default"}
```

Response highlights:
- `answer_json.decision` — approve|flag|reject|escalate
- `evidence_bundle` — top chunks from Qdrant
- `neighborhood_graph` — Kuzu neighborhood (Vendor → Invoice → SKU)
- `overlay_graph` — pet memory overlay
- `graph_combined` — merged neighborhood + overlay (convenience)

### `POST /feedback`
Updates pet stats + overlay graph.

Request:
```json
{"interaction_id":"<from /qa>","action":"flag","rationale":"Discount looks too high"}
```

Response:
- `pet_stats` / `updated_pet_stats` — stats after feedback
- `overlay_graph_delta` — edges to add

### `GET /pet?pet_id=default`
Returns current pet stats + recent interactions.

### `GET /graph/neighborhood?entity_id=...`
Returns a graph slice for a given entity id (used for debug or manual graph browsing).

### `GET /graph/sample`
Returns a small graph sample for UI testing.

### `GET /export/pet?pet_id=default`
Returns exportable pet data for distillation/fine‑tuning.

### `GET /export/pet.jsonl?pet_id=default`
Returns JSONL stream (one JSON object per line) for training ingestion.

### `POST /llm/chat` and `POST /llm/embeddings`
OpenAI-compatible proxy routes (only used if you run external model servers).

## Common Issues
- **Qdrant 400 error**: set `QDRANT_VECTOR_NAME=text` (named vector).
- **/qa hangs**: reduce `LLM_MAX_TOKENS` or ensure in-process model path is correct.
- **Kuzu empty graph**: rebuild with `python backend/scripts/build_kuzu_from_qdrant.py`.
