from __future__ import annotations

import json
import os
import re
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
            result = self.inproc.chat(
                messages, max_tokens=self.max_tokens, temperature=self.temperature
            )
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
            # try to extract a JSON object from the response
            extracted = _extract_json(content)
            if extracted is not None:
                return extracted

            # second-pass JSONify
            fix_messages = messages + [
                {
                    "role": "system",
                    "content": "Convert the previous answer into strict JSON only. No extra text.",
                },
                {"role": "user", "content": content},
            ]
            fixed = self.chat(fix_messages)
            try:
                return json.loads(fixed)
            except json.JSONDecodeError:
                extracted = _extract_json(fixed)
                if extracted is not None:
                    return extracted
                # final fallback
                return {
                    "decision": "flag",
                    "confidence": 0.3,
                    "rationale": "Model returned invalid JSON; defaulting to flag.",
                    "evidence_ids": [],
                    "overlay_edges": [],
                }


def _extract_json(text: str) -> dict[str, Any] | None:
    # Try to find the first JSON object in the text
    if not text:
        return None
    # Quick brace extraction
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    candidate = text[start : end + 1]
    # Remove trailing code fences if present
    candidate = re.sub(r"^```json\\s*|```$", "", candidate, flags=re.IGNORECASE).strip()
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        # Try to recover from single-quoted dicts
        try:
            import ast

            parsed = ast.literal_eval(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return None
    return None
