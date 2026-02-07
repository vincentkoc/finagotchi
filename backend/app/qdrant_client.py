from __future__ import annotations

from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from .config import settings


def make_client() -> QdrantClient:
    if settings.qdrant_api_key:
        return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    return QdrantClient(url=settings.qdrant_url)


def search(client: QdrantClient, vector: list[float]) -> list[qdrant_models.ScoredPoint]:
    return client.search(
        collection_name=settings.qdrant_collection,
        query_vector=vector,
        limit=settings.qdrant_top_k,
        with_payload=True,
        with_vectors=False,
    )


def to_evidence(points: list[qdrant_models.ScoredPoint]) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    for p in points:
        payload = p.payload or {}
        text = None
        for key in ("text", "content", "chunk", "body"):
            if key in payload:
                text = payload.get(key)
                break
        if text is None:
            text = str(payload)[:800]
        evidence.append(
            {
                "id": f"qdrant:{settings.qdrant_collection}:{p.id}",
                "text": text,
                "meta": payload,
            }
        )
    return evidence


def extract_anchors(evidence: list[dict[str, Any]]) -> dict[str, set[str]]:
    anchors: dict[str, set[str]] = {
        "vendor_id": set(),
        "transaction_id": set(),
        "sku": set(),
    }
    for item in evidence:
        meta = item.get("meta", {})
        for key in ("vendor_id", "vendorId", "vendor"):
            if key in meta:
                anchors["vendor_id"].add(str(meta[key]))
        for key in ("transaction_id", "transactionId", "txn_id", "txn"):
            if key in meta:
                anchors["transaction_id"].add(str(meta[key]))
        for key in ("sku", "product_sku"):
            if key in meta:
                anchors["sku"].add(str(meta[key]))
    return anchors
