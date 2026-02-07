import os

import httpx

chat_url = os.environ.get("LLM_CHAT_URL", "http://localhost:8080/v1").rstrip("/")
embed_url = os.environ.get("LLM_EMBED_URL", "http://localhost:8081/v1").rstrip("/")
chat_model = os.environ.get("LLM_CHAT_MODEL", "distil-labs-slm")
embed_model = os.environ.get("LLM_EMBED_MODEL", "nomic-embed-text")

print("Embedding...")
embed_resp = httpx.post(
    f"{embed_url}/embeddings", json={"model": embed_model, "input": "hello world"}
)
embed_resp.raise_for_status()
print("embed ok", len(embed_resp.json()["data"][0]["embedding"]))

print("Chat...")
chat_resp = httpx.post(
    f"{chat_url}/chat/completions",
    json={
        "model": chat_model,
        "messages": [
            {"role": "system", "content": "Reply with the word OK."},
            {"role": "user", "content": "Test"},
        ],
        "temperature": 0,
    },
)
chat_resp.raise_for_status()
print("chat ok", chat_resp.json()["choices"][0]["message"]["content"])
