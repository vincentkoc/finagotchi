from __future__ import annotations

import time
from fastapi import FastAPI, Request, Response, Body
import logging
import httpx
import json
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .logging_setup import setup_logging
from .llm_client import LLMClient
from .kuzu_adapter import KuzuAdapter
from .pet_store import PetStore
from .qdrant_client import make_client, search, to_evidence, extract_anchors
from .dilemma_bank import DilemmaBank
from .graph_fallback import build_graph_from_evidence
from .schemas import (
    QARequest,
    QAResponse,
    FeedbackRequest,
    FeedbackResponse,
    PetResponse,
    DilemmaResponse,
    GraphBundle,
    AnswerJSON,
)
from .docstrings import (
    QA_EXAMPLE_REQUEST,
    QA_EXAMPLE_RESPONSE,
    FEEDBACK_EXAMPLE_REQUEST,
    FEEDBACK_EXAMPLE_RESPONSE,
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

def _nodes_from_edges(edges: list[dict[str, object]]) -> list[dict[str, object]]:
    nodes: dict[str, dict[str, object]] = {}
    for edge in edges:
        src = str(edge.get("source"))
        dst = str(edge.get("target"))
        nodes.setdefault(src, {"id": src, "label": src, "group": "overlay"})
        nodes.setdefault(dst, {"id": dst, "label": dst, "group": "overlay"})
    return list(nodes.values())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": str(time.time())}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)
    if request.url.path in {"/qa", "/feedback"}:
        logger.info("%s %s %s %sms", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.get("/health/models")
def health_models() -> dict[str, object]:
    status = {"chat": False, "embed": False}
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


@app.post("/llm/chat", summary="Proxy chat completions", tags=["LLM"])
def llm_chat_proxy(payload: dict, request: Request) -> Response:
    # Proxy raw OpenAI-compatible payload to chat server (or in-proc if enabled)
    if llm.inproc is not None:
        result = llm.inproc.chat(payload.get("messages", []))
        return Response(content=json.dumps(result).encode("utf-8"), status_code=200, media_type="application/json")
    url = f"{settings.llm_chat_url.rstrip('/')}/chat/completions"
    headers = {"Content-Type": "application/json"}
    resp = httpx.post(url, json=payload, headers=headers, timeout=120.0)
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))


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
            result = {"data": [{"embedding": vector, "index": 0, "object": "embedding"}], "model": "inproc"}
        return Response(content=json.dumps(result).encode("utf-8"), status_code=200, media_type="application/json")
    url = f"{settings.llm_embed_url.rstrip('/')}/embeddings"
    headers = {"Content-Type": "application/json"}
    resp = httpx.post(url, json=payload, headers=headers, timeout=120.0)
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))


@app.get(
    "/dilemma/next",
    response_model=DilemmaResponse,
    summary="Get a demo dilemma",
    tags=["Game"],
)
def next_dilemma() -> DilemmaResponse:
    item = bank.next()
    return DilemmaResponse(id=item.id, question=item.question)


@app.post(
    "/qa",
    response_model=QAResponse,
    summary="Answer a question with evidence",
    tags=["Core"],
    responses={200: {"content": {"application/json": {"example": QA_EXAMPLE_RESPONSE}}}},
)
def qa(req: QARequest = Body(..., example=QA_EXAMPLE_REQUEST)) -> QAResponse:
    pet = pet_store.get_pet(req.pet_id)

    query_vec = llm.embed(req.question)
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
        "You are a finance/ops auditor agent. Use ONLY the provided evidence. "
        "If the question is unrelated to invoices, vendors, payments, or procurement, "
        "respond with decision=flag and explain lack of relevant evidence. "
        "Return strict JSON only with schema: "
        "{decision, confidence, rationale, evidence_ids, overlay_edges}."
    )
    user_prompt = (
        f"Question: {req.question}\n\nEvidence:\n{evidence_snippets}\n\n"
        "Decide approve|flag|reject|escalate. "
        "Use evidence_ids from the evidence list only."
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

    # Normalize answer
    answer_json = AnswerJSON(
        decision=answer.get("decision", "flag"),
        confidence=float(answer.get("confidence", 0.5)),
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

    def _normalize_graph(bundle: dict) -> GraphBundle:
        nodes = []
        for n in bundle.get("nodes", []):
            nodes.append(
                {
                    "id": n.get("id"),
                    "label": n.get("label"),
                    "type": n.get("type") or n.get("group"),
                    "group": n.get("group"),
                    "meta": n.get("meta", {}),
                    "properties": n.get("properties") or n.get("meta", {}),
                }
            )
        edges = []
        for e in bundle.get("edges", []):
            edges.append(
                {
                    "id": e.get("id"),
                    "source": e.get("source"),
                    "target": e.get("target"),
                    "label": e.get("label"),
                    "weight": e.get("weight"),
                    "meta": e.get("meta", {}),
                    "isOverlay": e.get("isOverlay"),
                }
            )
        return GraphBundle(nodes=nodes, edges=edges)

    # Combined graph for convenience
    combined = {
        "nodes": neighborhood.get("nodes", []) + overlay_graph.get("nodes", []),
        "edges": neighborhood.get("edges", []) + overlay_graph.get("edges", []),
    }

    return QAResponse(
        answer_json=answer_json,
        evidence_bundle=evidence,
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
    responses={200: {"content": {"application/json": {"example": FEEDBACK_EXAMPLE_RESPONSE}}}},
)
def feedback(req: FeedbackRequest = Body(..., example=FEEDBACK_EXAMPLE_REQUEST)) -> FeedbackResponse:
    pet_id = pet_store.get_interaction_pet(req.interaction_id) or "default"
    pet_stats = pet_store.update_stats(pet_id, req.action)
    new_path = pet_store.maybe_evolve(pet_id)

    # Convert feedback into overlay edges if requested
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
            nodes=_nodes_from_edges(overlay_delta),
            edges=overlay_delta,
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
    summary="Fetch a graph neighborhood",
    tags=["Graph"],
)
def graph_neighborhood(entity_id: str, depth: int = 2) -> dict[str, object]:
    anchors = {"vendor_id": {entity_id}, "transaction_id": set(), "sku": set()}
    return kuzu.neighborhood(anchors, depth=depth)


@app.get(
    "/graph/sample",
    summary="Debug sample graph nodes",
    tags=["Graph"],
)
def graph_sample() -> dict[str, object]:
    # Return a small sample by using recent evidence from Qdrant
    points = search(qdrant, llm.embed("invoice vendor payment"))
    evidence = to_evidence(points)
    anchors = extract_anchors(evidence)
    anchors["chunk_id"] = anchors.get("chunk_id", set())
    neighborhood = kuzu.neighborhood(anchors, depth=1)
    if not neighborhood.get("nodes"):
        neighborhood = build_graph_from_evidence(evidence, anchors)
    return neighborhood
