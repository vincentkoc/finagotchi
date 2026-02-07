from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class QARequest(BaseModel):
    question: str
    pet_id: str = "default"


class EvidenceItem(BaseModel):
    id: str
    text: str
    meta: dict[str, Any] = Field(default_factory=dict)


class GraphNode(BaseModel):
    id: str
    label: str | None = None
    group: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str | None = None
    source: str
    target: str
    label: str | None = None
    weight: float | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class GraphBundle(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class AnswerJSON(BaseModel):
    decision: str
    confidence: float
    rationale: str
    evidence_ids: list[str]
    overlay_edges: list[dict[str, Any]] = Field(default_factory=list)


class QAResponse(BaseModel):
    answer_json: AnswerJSON
    evidence_bundle: list[EvidenceItem]
    neighborhood_graph: GraphBundle
    overlay_graph: GraphBundle
    pet_stats: dict[str, int]
    interaction_id: str


class FeedbackRequest(BaseModel):
    interaction_id: str
    action: str
    rationale: str | None = None


class FeedbackResponse(BaseModel):
    pet_stats: dict[str, int]
    overlay_graph_delta: GraphBundle
    new_path: str | None = None


class PetResponse(BaseModel):
    pet_stats: dict[str, int]
    path: str
    recent_interactions: list[dict[str, Any]]
