from __future__ import annotations

import json
import logging
import time
from typing import Annotated, cast

import httpx
from fastapi import Body, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .dilemma_bank import DilemmaBank
from .docstrings import (
    FEEDBACK_EXAMPLE_REQUEST,
    FEEDBACK_EXAMPLE_RESPONSE,
    QA_EXAMPLE_REQUEST,
    QA_EXAMPLE_RESPONSE,
)
from .graph_fallback import build_graph_from_evidence
from .kuzu_adapter import KuzuAdapter
from .llm_client import LLMClient
from .logging_setup import setup_logging
from .pet_store import PetStore
from .qdrant_client import (
    extract_anchors,
    make_client,
    records_to_scored,
    retrieve_by_ids,
    search,
    to_evidence,
)
from .schemas import (
    AnswerJSON,
    DilemmaResponse,
    EvidenceItem,
    FeedbackRequest,
    FeedbackResponse,
    GraphBundle,
    GraphEdge,
    GraphNode,
    PetResponse,
    QARequest,
    QAResponse,
)

setup_logging()
logger = logging.getLogger("finagotchi.api")
app = FastAPI(
    title="Finagotchi API",
    description=(
        "Memory-aware finance/ops agent backend. "
        "Provides Qdrant retrieval, Kuzu neighborhood graphs, "
        "pet state updates, and local GGUF inference."
    ),
    version="0.1.0",
    docs_url="/",
    redoc_url="/redoc",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = LLMClient()
qdrant = make_client()
kuzu = KuzuAdapter()
pet_store = PetStore()
bank = DilemmaBank()


def _normalize_graph(bundle: dict) -> GraphBundle:
    """Convert raw graph dicts into validated GraphBundle with normalized types."""
    nodes: list[GraphNode] = []
    for n in bundle.get("nodes", []):
        nodes.append(
            GraphNode(
                id=n.get("id"),
                label=n.get("label"),
                type=n.get("type") or n.get("group"),
                group=n.get("group"),
                meta=n.get("meta", {}),
                properties=n.get("properties") or n.get("meta", {}),
            )
        )
    edges: list[GraphEdge] = []
    for e in bundle.get("edges", []):
        edges.append(
            GraphEdge(
                id=e.get("id"),
                source=e.get("source"),
                target=e.get("target"),
                label=e.get("label"),
                weight=e.get("weight"),
                meta=e.get("meta", {}),
                isOverlay=e.get("isOverlay"),
            )
        )
    return GraphBundle(nodes=nodes, edges=edges)


def _nodes_from_edges(edges: list[dict[str, object]]) -> list[dict[str, object]]:
    nodes: dict[str, dict[str, object]] = {}
    for edge in edges:
        src = str(edge.get("source"))
        dst = str(edge.get("target"))
        nodes.setdefault(
            src, {"id": src, "label": src, "group": "overlay", "type": "overlay"}
        )
        nodes.setdefault(
            dst, {"id": dst, "label": dst, "group": "overlay", "type": "overlay"}
        )
    return list(nodes.values())


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)
    if request.url.path in {"/qa", "/feedback"}:
        logger.info(
            "%s %s %s %sms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": str(time.time())}


@app.get("/health/models")
def health_models() -> dict[str, object]:
    status: dict[str, object] = {"chat": False, "embed": False}
    try:
        llm.chat([{"role": "system", "content": "Reply with OK."}])
        status["chat"] = True
    except Exception:
        status["chat"] = False
    try:
        llm.embed("ping")
        status["embed"] = True
    except Exception:
        status["embed"] = False
    return status


@app.get("/ready")
def ready() -> dict[str, object]:
    # Readiness check: qdrant + models
    ok = True
    details: dict[str, object] = {}
    try:
        _ = qdrant.get_collection(settings.qdrant_collection)
        details["qdrant"] = True
    except Exception as exc:  # pragma: no cover
        details["qdrant"] = False
        details["qdrant_error"] = str(exc)
        ok = False

    models = health_models()
    details.update(models)
    if not models.get("chat") or not models.get("embed"):
        ok = False
    return {"ok": ok, "details": details}


@app.post("/llm/chat", summary="Proxy chat completions", tags=["LLM"])
def llm_chat_proxy(payload: dict, request: Request) -> Response:
    # Proxy raw OpenAI-compatible payload to chat server (or in-proc if enabled)
    if llm.inproc is not None:
        result = llm.inproc.chat(payload.get("messages", []))
        return Response(
            content=json.dumps(result).encode("utf-8"),
            status_code=200,
            media_type="application/json",
        )
    url = f"{settings.llm_chat_url.rstrip('/')}/chat/completions"
    headers = {"Content-Type": "application/json"}
    resp = httpx.post(url, json=payload, headers=headers, timeout=120.0)
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )


@app.post("/llm/embeddings", summary="Proxy embeddings", tags=["LLM"])
def llm_embed_proxy(payload: dict, request: Request) -> Response:
    if llm.inproc is not None:
        inp = payload.get("input", "")
        if isinstance(inp, list):
            data = []
            for idx, text in enumerate(inp):
                vector = llm.inproc.embed(text)
                data.append({"embedding": vector, "index": idx, "object": "embedding"})
            result = {"data": data, "model": "inproc"}
        else:
            vector = llm.inproc.embed(inp)
            result = {
                "data": [{"embedding": vector, "index": 0, "object": "embedding"}],
                "model": "inproc",
            }
        return Response(
            content=json.dumps(result).encode("utf-8"),
            status_code=200,
            media_type="application/json",
        )
    url = f"{settings.llm_embed_url.rstrip('/')}/embeddings"
    headers = {"Content-Type": "application/json"}
    resp = httpx.post(url, json=payload, headers=headers, timeout=120.0)
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )


@app.get(
    "/dilemma/next",
    response_model=DilemmaResponse,
    summary="Generate a dilemma from real data",
    tags=["Game"],
)
def next_dilemma() -> DilemmaResponse:
    """Pick random evidence from Qdrant and generate a contextual dilemma."""
    import random

    # Sample a random finance-related query to get diverse evidence
    seed_queries = [
        "invoice vendor payment due",
        "purchase order expense transaction",
        "vendor discount bulk pricing",
        "overdue invoice late payment",
        "high amount transaction review",
        "duplicate invoice matching amounts",
        "new vendor procurement order",
        "expense claim reimbursement receipt",
    ]
    seed = random.choice(seed_queries)

    try:
        query_vec = llm.embed(seed)
        points = search(qdrant, query_vec)
        evidence = to_evidence(points)

        if not evidence:
            # Fallback to static dilemma bank
            item = bank.next()
            return DilemmaResponse(id=item.id, question=item.question)

        # Pick 1-2 evidence items for the dilemma context
        selected = random.sample(evidence, min(2, len(evidence)))
        context_lines = []
        evidence_ids = []
        for e in selected:
            context_lines.append(e["text"][:300])
            evidence_ids.append(e["id"])

        evidence_context = "\n".join(context_lines)

        # Ask LLM to generate a dilemma from the evidence
        gen_messages = [
            {
                "role": "system",
                "content": (
                    "You are a finance/ops scenario writer for a training game. "
                    "Given real financial evidence, write a short 1-2 sentence dilemma "
                    "that a finance agent must decide on. Reference specific details "
                    "from the evidence (vendor IDs, amounts, dates, SKUs). "
                    "End with a clear question. Keep it under 60 words. "
                    "Output ONLY the dilemma text, nothing else."
                ),
            },
            {
                "role": "user",
                "content": f"Evidence:\n{evidence_context}\n\nWrite a dilemma:",
            },
        ]

        question = llm.chat(gen_messages).strip().strip('"')
        dilemma_id = f"generated_{random.randint(1000, 9999)}"

        return DilemmaResponse(
            id=dilemma_id,
            question=question,
            context=evidence_context,
            evidence_ids=evidence_ids,
        )
    except Exception as exc:
        logger.warning("Dilemma generation failed: %s — falling back to static", exc)
        item = bank.next()
        return DilemmaResponse(id=item.id, question=item.question)


@app.post(
    "/qa",
    response_model=QAResponse,
    summary="Answer a question with evidence",
    tags=["Core"],
    responses={
        200: {"content": {"application/json": {"example": QA_EXAMPLE_RESPONSE}}}
    },
)
def qa(req: Annotated[QARequest, Body(example=QA_EXAMPLE_REQUEST)]) -> QAResponse:
    pet = pet_store.get_pet(req.pet_id)

    # If evidence_ids are provided (from dilemma generation), fetch those exact points.
    # Otherwise fall back to semantic search.
    if req.evidence_ids:
        records = retrieve_by_ids(qdrant, req.evidence_ids)
        points = records_to_scored(records)
        # Also do a supplementary search to enrich the graph
        retrieval_text = req.context or req.question
        extra_vec = llm.embed(retrieval_text)
        extra_points = search(qdrant, extra_vec)
        # Merge — deduplicate by point ID
        seen_ids = {str(p.id) for p in points}
        for ep in extra_points:
            if str(ep.id) not in seen_ids:
                points.append(ep)
                seen_ids.add(str(ep.id))
    else:
        retrieval_text = req.context or req.question
        query_vec = llm.embed(retrieval_text)
        points = search(qdrant, query_vec)

    evidence = to_evidence(points)
    anchors = extract_anchors(evidence)

    evidence_snippets = "\n\n".join(
        [f"[{e['id']}] {e['text'][:400]}" for e in evidence]
    )

    # Guardrail: if evidence lacks key finance fields, flag by default.
    has_finance_signal = False
    for item in evidence:
        meta = item.get("meta", {})
        parsed = meta.get("parsed") if isinstance(meta, dict) else None
        if isinstance(parsed, dict) and (
            parsed.get("vendor_id")
            or parsed.get("invoice_number")
            or parsed.get("transaction_id")
        ):
            has_finance_signal = True
            break

    system_prompt = (
        "You are a finance/ops auditor agent. Analyze the evidence and return a JSON decision.\n"
        "Example response:\n"
        '{"decision":"flag","confidence":0.7,"rationale":"Amount exceeds vendor average by 3x.","evidence_ids":[],"overlay_edges":[]}\n\n'
        "Rules:\n"
        "- decision must be one of: approve, flag, reject, escalate\n"
        "- confidence is 0.0 to 1.0\n"
        "- rationale is a brief explanation (1-2 sentences)\n"
        "- Return ONLY valid JSON, no other text"
    )
    user_prompt = (
        f"Question: {req.question}\n\nEvidence:\n{evidence_snippets}\n\n"
        "Analyze the evidence and return your JSON decision."
    )

    if has_finance_signal:
        answer = llm.chat_json(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
    else:
        answer = {
            "decision": "flag",
            "confidence": 0.2,
            "rationale": "No finance/ops evidence found for this question. Flagging for review.",
            "evidence_ids": [e["id"] for e in evidence],
            "overlay_edges": [],
        }

    def _coerce_confidence(value: object) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return 0.5
        return 0.5

    answer_json = AnswerJSON(
        decision=answer.get("decision", "flag"),
        confidence=_coerce_confidence(answer.get("confidence", 0.5)),
        rationale=answer.get("rationale", ""),
        evidence_ids=[e["id"] for e in evidence],
        overlay_edges=answer.get("overlay_edges", []),
    )

    interaction_id = pet_store.log_interaction(
        req.pet_id, req.question, evidence, answer_json.model_dump()
    )

    if answer_json.overlay_edges:
        pet_store.add_overlay_edges(req.pet_id, answer_json.overlay_edges)

    overlay_graph = pet_store.get_overlay_graph(req.pet_id)
    neighborhood = kuzu.neighborhood(anchors, depth=2)
    if not neighborhood.get("nodes"):
        neighborhood = build_graph_from_evidence(evidence, anchors)

    combined = {
        "nodes": neighborhood.get("nodes", []) + overlay_graph.get("nodes", []),
        "edges": neighborhood.get("edges", []) + overlay_graph.get("edges", []),
    }

    return QAResponse(
        answer_json=answer_json,
        evidence_bundle=[EvidenceItem(**e) for e in evidence],
        neighborhood_graph=_normalize_graph(neighborhood),
        overlay_graph=_normalize_graph(overlay_graph),
        graph_combined=_normalize_graph(combined),
        pet_stats=pet["stats"],
        interaction_id=interaction_id,
    )


@app.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Apply user feedback to pet state",
    tags=["Core"],
    responses={
        200: {"content": {"application/json": {"example": FEEDBACK_EXAMPLE_RESPONSE}}}
    },
)
def feedback(
    req: Annotated[FeedbackRequest, Body(example=FEEDBACK_EXAMPLE_REQUEST)],
) -> FeedbackResponse:
    pet_id = pet_store.get_interaction_pet(req.interaction_id) or "default"
    pet_stats = pet_store.update_stats(pet_id, req.action)
    new_path = pet_store.maybe_evolve(pet_id)

    overlay_edges = []
    if req.rationale:
        overlay_edges.append(
            {
                "src": "feedback",
                "rel": req.action.upper(),
                "dst": "latest",
                "weight": 1.0,
                "meta": {"note": req.rationale},
            }
        )
    overlay_delta = pet_store.add_overlay_edges(pet_id, overlay_edges)

    return FeedbackResponse(
        pet_stats=pet_stats,
        updated_pet_stats=pet_stats,
        overlay_graph_delta=GraphBundle(
            nodes=[
                GraphNode(
                    id=str(n.get("id")),
                    label=str(n.get("label")) if n.get("label") is not None else None,
                    group=str(n.get("group")) if n.get("group") is not None else None,
                    type=str(n.get("type")) if n.get("type") is not None else None,
                    meta=cast(dict, n.get("meta"))
                    if isinstance(n.get("meta"), dict)
                    else {},
                    properties=cast(dict, n.get("properties"))
                    if isinstance(n.get("properties"), dict)
                    else None,
                )
                for n in _nodes_from_edges(overlay_delta)
            ],
            edges=[
                GraphEdge(
                    id=e.get("id"),
                    source=str(e.get("source")),
                    target=str(e.get("target")),
                    label=e.get("label"),
                    weight=e.get("weight"),
                    meta=e.get("meta", {}),
                    isOverlay=e.get("isOverlay"),
                )
                for e in overlay_delta
            ],
        ),
        new_path=new_path,
    )


@app.get(
    "/pet",
    response_model=PetResponse,
    summary="Fetch pet state",
    tags=["Game"],
)
def pet(pet_id: str = "default") -> PetResponse:
    pet_state = pet_store.get_pet(pet_id)
    recent = pet_store.list_interactions(pet_id)
    return PetResponse(
        pet_stats=pet_state["stats"],
        path=pet_state["path"],
        recent_interactions=recent,
    )


@app.get(
    "/graph/neighborhood",
    response_model=GraphBundle,
    summary="Fetch a graph neighborhood",
    tags=["Graph"],
)
def graph_neighborhood(entity_id: str, depth: int = 2) -> GraphBundle:
    anchors = {
        "vendor_id": {entity_id},
        "transaction_id": set(),
        "sku": set(),
        "chunk_id": set(),
    }
    result = kuzu.neighborhood(anchors, depth=depth)
    return _normalize_graph(result)


@app.get(
    "/graph/sample",
    response_model=GraphBundle,
    summary="Debug sample graph nodes",
    description="Returns a small graph sample for quick UI testing.",
    tags=["Graph"],
)
def graph_sample() -> GraphBundle:
    points = search(qdrant, llm.embed("invoice vendor payment"))
    evidence = to_evidence(points)
    anchors = extract_anchors(evidence)
    anchors["chunk_id"] = anchors.get("chunk_id", set())
    neighborhood = kuzu.neighborhood(anchors, depth=1)
    if not neighborhood.get("nodes"):
        neighborhood = build_graph_from_evidence(evidence, anchors)
    return _normalize_graph(neighborhood)


@app.get(
    "/export/pet",
    summary="Export pet interactions for distillation",
    tags=["Export"],
)
def export_pet(pet_id: str = "default") -> dict[str, object]:
    return {"pet_id": pet_id, "rows": pet_store.export_pet(pet_id)}


@app.get(
    "/export/pet.jsonl",
    summary="Export pet interactions as JSONL",
    tags=["Export"],
)
def export_pet_jsonl(pet_id: str = "default") -> Response:
    rows = pet_store.export_pet(pet_id)
    lines = "\n".join(json.dumps(r) for r in rows)
    return Response(content=lines, media_type="application/jsonl")
