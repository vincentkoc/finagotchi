# Deployment (DigitalOcean + Docker)

## Docker (local)
```bash
docker compose up --build
```

Backend will be available at `http://localhost:8000/`.

## DigitalOcean Droplet (Docker)
1) Create a droplet (Ubuntu 22.04+).
2) Install Docker and Compose:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
```
3) Copy repo to droplet (git clone or rsync).
4) Add `.env` with Qdrant endpoint + API key + model paths.
5) Build + run:
```bash
docker compose up --build -d
```

## Notes
- If you run in-process GGUF, the model files must exist on the droplet at the paths in `.env`.
- For Qdrant Cloud, only `QDRANT_CLUSTER_ENDPOINT` and `QDRANT_API_KEY` are required.
