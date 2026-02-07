# DigitalOcean GPU Deployment (Fast Setup)

## Overview
Two droplets:
- **Backend** on GPU droplet (RTX 4000 ADA recommended)
- **Frontend** on CPU droplet

## Backend GPU Droplet

### 1) Create Droplet
- Plan: **RTX 4000 ADA** (1 GPU)
- Image: **ML/AI-ready NVIDIA** image
- Region: NYC2 / TOR1 / ATL1 / AMS3
- Add your SSH key

### 2) SSH in
```bash
ssh root@<gpu_ip>
```

### 3) Install Docker
```bash
apt-get update
apt-get install -y docker.io docker-compose-plugin
```

### 4) Clone repo
```bash
git clone <your_repo_url>
cd finagotchi
```

### 5) Upload GGUF models
From local machine:
```bash
rsync -av external/grey/models/ root@<gpu_ip>:/opt/finagotchi/models/
```

### 6) Configure `.env`
In repo root:
```
QDRANT_CLUSTER_ENDPOINT=...
QDRANT_API_KEY=...
QDRANT_VECTOR_NAME=text

INPROC_LLM=1
LLM_CHAT_MODEL_PATH=/opt/finagotchi/models/cognee-distillabs-model-gguf-quantized/model-quantized.gguf
LLM_EMBED_MODEL_PATH=/opt/finagotchi/models/nomic-embed-text/nomic-embed-text-v1.5.f16.gguf
```

### 7) Build + run backend
```bash
docker build -f backend/Dockerfile -t finagotchi-backend .
docker run -d --name finagotchi-backend -p 8000:8000 --env-file .env \
  -v /opt/finagotchi/models:/opt/finagotchi/models finagotchi-backend
```

Swagger:
```
http://<gpu_ip>:8000/
```

## Frontend CPU Droplet

### 1) Create Droplet
- Basic 1–2GB RAM

### 2) SSH in
```bash
ssh root@<frontend_ip>
```

### 3) Install Docker
```bash
apt-get update
apt-get install -y docker.io docker-compose-plugin
```

### 4) Clone repo
```bash
git clone <your_repo_url>
cd finagotchi
```

### 5) Build + run frontend
```bash
docker build -t finagotchi-frontend -f frontend/Dockerfile .
docker run -d --name finagotchi-frontend -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://<gpu_ip>:8000 finagotchi-frontend
```

Frontend:
```
http://<frontend_ip>:3000
```

## Notes
- GPU droplets bill even when powered off. Destroy after demo.
- If you want HTTPS, put Caddy/Nginx in front.
