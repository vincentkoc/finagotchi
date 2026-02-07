# Backend

## Quick start
1. Copy env file and fill Qdrant Cloud values:
```bash
cp backend/.env.example backend/.env
```

2. Install deps and run:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

## Model servers
This backend expects OpenAI-compatible endpoints:
- `LLM_CHAT_URL` → llama.cpp server for chat
- `LLM_EMBED_URL` → llama.cpp server for embeddings

Use your existing GGUF runner setup (from airgapped-offfline-rag) and set env vars accordingly.

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
