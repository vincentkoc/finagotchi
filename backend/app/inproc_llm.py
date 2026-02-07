from __future__ import annotations

import os
from typing import Any, cast

try:
    from llama_cpp import Llama
except Exception:  # pragma: no cover
    Llama = None  # type: ignore


class InprocLLM:
    def __init__(self) -> None:
        if Llama is None:
            raise RuntimeError("llama_cpp is not installed")

        chat_model_path = os.environ.get("LLM_CHAT_MODEL_PATH")
        embed_model_path = os.environ.get("LLM_EMBED_MODEL_PATH")
        if not chat_model_path or not embed_model_path:
            raise RuntimeError(
                "LLM_CHAT_MODEL_PATH and LLM_EMBED_MODEL_PATH are required"
            )

        n_threads = int(os.environ.get("LLM_CHAT_THREADS", "4"))
        n_ctx = int(os.environ.get("LLM_CHAT_CTX", "4096"))
        chat_format = os.environ.get("LLM_CHAT_FORMAT", "chatml")

        embed_threads = int(os.environ.get("LLM_EMBED_THREADS", "4"))
        embed_ctx = int(os.environ.get("LLM_EMBED_CTX", "8192"))

        self._chat = Llama(
            model_path=chat_model_path,
            n_ctx=n_ctx,
            n_threads=n_threads,
            chat_format=chat_format,
            logits_all=False,
            embedding=False,
        )
        self._embed = Llama(
            model_path=embed_model_path,
            n_ctx=embed_ctx,
            n_threads=embed_threads,
            embedding=True,
        )

    def chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 256,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        result = self._chat.create_chat_completion(
            messages=cast(Any, messages),
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return cast(dict[str, Any], result)

    def embed(self, text: str) -> list[float]:
        result = self._embed.create_embedding(text)
        embedding = result["data"][0]["embedding"]
        return cast(list[float], embedding)
