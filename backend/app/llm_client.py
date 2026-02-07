from __future__ import annotations

import json
import os
from typing import Any

import httpx

from .config import settings
from .inproc_llm import InprocLLM


class LLMClient:
    def __init__(self) -> None:
        self.chat_base = settings.llm_chat_url.rstrip("/")
        self.embed_base = settings.llm_embed_url.rstrip("/")
        self.inproc = None
        if os.environ.get("INPROC_LLM", "0") == "1":
            self.inproc = InprocLLM()
        self.max_tokens = int(os.environ.get("LLM_MAX_TOKENS", "256"))
        self.temperature = float(os.environ.get("LLM_TEMPERATURE", "0.2"))

    def embed(self, text: str) -> list[float]:
        if self.inproc is not None:
            return self.inproc.embed(text)
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
        if self.inproc is not None:
            result = self.inproc.chat(messages, max_tokens=self.max_tokens, temperature=self.temperature)
            return result["choices"][0]["message"]["content"]
        url = f"{self.chat_base}/chat/completions"
        payload = {
            "model": settings.llm_chat_model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
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
