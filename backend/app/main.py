from __future__ import annotations

import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .logging_setup import setup_logging
from .llm_client import LLMClient
from .kuzu_adapter import KuzuAdapter
from .pet_store import PetStore
from .qdrant_client import make_client, search, to_evidence, extract_anchors
from .dilemma_bank import DilemmaBank
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

setup_logging()
app = FastAPI()
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


@app.get("/dilemma/next", response_model=DilemmaResponse)
def next_dilemma() -> DilemmaResponse:
    item = bank.next()
    return DilemmaResponse(id=item.id, question=item.question)


@app.post("/qa", response_model=QAResponse)
def qa(req: QARequest) -> QAResponse:
    pet = pet_store.get_pet(req.pet_id)

    query_vec = llm.embed(req.question)
    points = search(qdrant, query_vec)
    evidence = to_evidence(points)
    anchors = extract_anchors(evidence)

    evidence_snippets = "\n\n".join(
        [f"[{e['id']}] {e['text'][:400]}" for e in evidence]
    )

    system_prompt = (
        "You are a finance/ops auditor agent. Answer using the evidence. "
        "Return strict JSON only with schema: "
        "{decision, confidence, rationale, evidence_ids, overlay_edges}."
    )
    user_prompt = (
        f"Question: {req.question}\n\nEvidence:\n{evidence_snippets}\n\n"
        "Decide approve|flag|reject|escalate. Include evidence_ids from the evidence list."
    )

    answer = llm.chat_json(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )

    # Normalize answer
    answer_json = AnswerJSON(
        decision=answer.get("decision", "flag"),
        confidence=float(answer.get("confidence", 0.5)),
        rationale=answer.get("rationale", ""),
        evidence_ids=answer.get("evidence_ids", [e["id"] for e in evidence]),
        overlay_edges=answer.get("overlay_edges", []),
    )

    interaction_id = pet_store.log_interaction(
        req.pet_id, req.question, evidence, answer_json.model_dump()
    )

    if answer_json.overlay_edges:
        pet_store.add_overlay_edges(req.pet_id, answer_json.overlay_edges)

    overlay_graph = pet_store.get_overlay_graph(req.pet_id)
    neighborhood = kuzu.neighborhood(anchors, depth=2)

    return QAResponse(
        answer_json=answer_json,
        evidence_bundle=evidence,
        neighborhood_graph=GraphBundle(**neighborhood),
        overlay_graph=GraphBundle(**overlay_graph),
        pet_stats=pet["stats"],
        interaction_id=interaction_id,
    )


@app.post("/feedback", response_model=FeedbackResponse)
def feedback(req: FeedbackRequest) -> FeedbackResponse:
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
        overlay_graph_delta=GraphBundle(
            nodes=_nodes_from_edges(overlay_delta),
            edges=overlay_delta,
        ),
        new_path=new_path,
    )


@app.get("/pet", response_model=PetResponse)
def pet(pet_id: str = "default") -> PetResponse:
    pet_state = pet_store.get_pet(pet_id)
    recent = pet_store.list_interactions(pet_id)
    return PetResponse(
        pet_stats=pet_state["stats"],
        path=pet_state["path"],
        recent_interactions=recent,
    )


@app.get("/graph/neighborhood")
def graph_neighborhood(entity_id: str, depth: int = 2) -> dict[str, object]:
    anchors = {"vendor_id": {entity_id}, "transaction_id": set(), "sku": set()}
    return kuzu.neighborhood(anchors, depth=depth)
