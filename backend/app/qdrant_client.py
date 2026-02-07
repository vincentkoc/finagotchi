from __future__ import annotations

import ast
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from .config import settings


def make_client() -> QdrantClient:
    if settings.qdrant_api_key:
        return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    return QdrantClient(url=settings.qdrant_url)


def search(
    client: QdrantClient, vector: list[float]
) -> list[qdrant_models.ScoredPoint]:
    query_vector: list[float] | qdrant_models.NamedVector = vector
    if settings.qdrant_vector_name:
        query_vector = qdrant_models.NamedVector(
            name=settings.qdrant_vector_name, vector=vector
        )
    return client.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_vector,
        limit=settings.qdrant_top_k,
        with_payload=True,
        with_vectors=False,
    )


def _summarize_parsed(parsed: dict[str, Any]) -> str:
    """Build a human-readable one-liner from a parsed finance record."""
    parts: list[str] = []
    inv = parsed.get("invoice_number") or parsed.get("transaction_id") or ""
    if inv:
        parts.append(str(inv))
    vendor = parsed.get("vendor_id")
    if vendor is not None:
        parts.append(f"vendor {vendor}")
    amount = parsed.get("total") or parsed.get("amount")
    if amount is not None:
        parts.append(f"${amount}")
    date = parsed.get("date") or parsed.get("due_date")
    if date:
        parts.append(str(date))
    items = parsed.get("items")
    if isinstance(items, str):
        try:
            items = ast.literal_eval(items)
        except Exception:
            items = None
    if isinstance(items, list) and items:
        products = [i.get("product", "") for i in items[:3] if isinstance(i, dict)]
        products = [p for p in products if p]
        if products:
            parts.append(", ".join(products))
    return " | ".join(parts) if parts else ""


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
        # Attempt to parse dict-like text into structured fields
        parsed = None
        if isinstance(text, str) and text.startswith("{") and text.endswith("}"):
            try:
                parsed = ast.literal_eval(text)
            except Exception:
                parsed = None
        if parsed and isinstance(parsed, dict):
            payload = dict(payload)
            payload["parsed"] = parsed
            # Replace raw dict text with a readable summary
            summary = _summarize_parsed(parsed)
            if summary:
                text = summary

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
        "chunk_id": set(),
    }
    for item in evidence:
        meta = item.get("meta", {})
        # Search both top-level meta and nested parsed dict
        sources = [meta]
        if isinstance(meta.get("parsed"), dict):
            sources.append(meta["parsed"])
        for src in sources:
            if "id" in src:
                anchors["chunk_id"].add(str(src["id"]))
            for key in ("vendor_id", "vendorId", "vendor"):
                if key in src:
                    anchors["vendor_id"].add(str(src[key]))
            for key in (
                "transaction_id", "transactionId", "txn_id", "txn",
                "invoice_number",
            ):
                if key in src:
                    anchors["transaction_id"].add(str(src[key]))
            for key in ("sku", "product_sku"):
                if key in src:
                    anchors["sku"].add(str(src[key]))
            # Also extract SKUs from parsed items list
            items = src.get("items")
            if isinstance(items, str):
                try:
                    items = ast.literal_eval(items)
                except Exception:
                    items = None
            if isinstance(items, list):
                for it in items:
                    if isinstance(it, dict) and it.get("sku"):
                        anchors["sku"].add(str(it["sku"]))
    return anchors
