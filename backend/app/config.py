from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv


def _env(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name, default)


# Load .env files (repo root or backend/.env)
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env")))


@dataclass(frozen=True)
class Settings:
    qdrant_url: str = _env("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key: str | None = _env("QDRANT_API_KEY")
    qdrant_collection: str = _env("QDRANT_COLLECTION", "DocumentChunk_text")
    qdrant_top_k: int = int(_env("QDRANT_TOP_K", "5"))

    llm_chat_url: str = _env("LLM_CHAT_URL", "http://localhost:8080/v1")
    llm_chat_model: str = _env("LLM_CHAT_MODEL", "distil-labs-slm")
    llm_embed_url: str = _env("LLM_EMBED_URL", "http://localhost:8081/v1")
    llm_embed_model: str = _env("LLM_EMBED_MODEL", "nomic-embed-text")

    kuzu_db_path: str | None = _env(
        "KUZU_DB_PATH",
        os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
                "external",
                "grey",
                "cognee_export",
                "system_databases",
                "cognee_graph_kuzu",
            )
        ),
    )

    sqlite_path: str = _env("SQLITE_PATH", os.path.abspath("./backend/pet_state.db"))

    cors_origins: list[str] = field(
        default_factory=lambda: _env("CORS_ORIGINS", "http://localhost:3000").split(
            ","
        )
    )


settings = Settings()
