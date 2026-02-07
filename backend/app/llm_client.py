from __future__ import annotations

import json
from typing import Any

import httpx

from .config import settings


class LLMClient:
    def __init__(self) -> None:
        self.chat_base = settings.llm_chat_url.rstrip("/")
        self.embed_base = settings.llm_embed_url.rstrip("/")

    def embed(self, text: str) -> list[float]:
        url = f"{self.embed_base}/embeddings"
        payload = {
            "model": settings.llm_embed_model,
            "input": text,
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["data"][0]["embedding"]

    def chat(self, messages: list[dict[str, str]]) -> str:
        url = f"{self.chat_base}/chat/completions"
        payload = {
            "model": settings.llm_chat_model,
            "messages": messages,
            "temperature": 0.2,
        }
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["choices"][0]["message"]["content"]

    def chat_json(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        content = self.chat(messages)
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # second-pass JSONify
            fix_messages = messages + [
                {
                    "role": "system",
                    "content": "Convert the previous answer into strict JSON only. No extra text.",
                },
                {"role": "user", "content": content},
            ]
            fixed = self.chat(fix_messages)
            return json.loads(fixed)
