# DigitalOcean CPU Deployment (Fast Setup)

## Overview
Two droplets:
- **Backend** on CPU droplet (8GB recommended)
- **Frontend** on CPU droplet (1–2GB)

Repo: https://github.com/vincentkoc/finagotchi

## Backend CPU Droplet

### 1) Create Droplet
- Plan: **s-4vcpu-8gb** (recommended)
- Image: **Ubuntu 22.04**
- Region: nyc2 (or any)
- Add your SSH key

### 2) SSH in
```bash
ssh root@<backend_ip>
```

### 3) Install Docker
```bash
apt-get update
apt-get install -y docker.io docker-compose-plugin git rsync
```

### 4) Clone repo
```bash
git clone https://github.com/vincentkoc/finagotchi
cd finagotchi
```

### 5) Upload GGUF models
From local machine:
```bash
rsync -av external/grey/models/ root@<backend_ip>:/opt/finagotchi/models/
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
KUZU_DB_PATH=data/kuzu
```

### 7) Build + run backend
```bash
docker build -f backend/Dockerfile -t finagotchi-backend .
docker run -d --name finagotchi-backend -p 8000:8000 --env-file .env \
  -v /opt/finagotchi/models:/opt/finagotchi/models \
  -v /root/finagotchi/data:/app/data \
  finagotchi-backend
```

### 8) Build Kuzu graph (once)
```bash
python backend/scripts/build_kuzu_from_qdrant.py
```

Swagger:
```
http://<backend_ip>:8000/
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
apt-get install -y docker.io docker-compose-plugin git
```

### 4) Clone repo
```bash
git clone https://github.com/vincentkoc/finagotchi
cd finagotchi
```

### 5) Build + run frontend
```bash
docker build -t finagotchi-frontend -f frontend/Dockerfile .
docker run -d --name finagotchi-frontend -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://<backend_ip>:8000 finagotchi-frontend
```

Frontend:
```
http://<frontend_ip>:3000
```
