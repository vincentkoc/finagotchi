from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class QARequest(BaseModel):
    """Request to answer a user question."""

    question: str = Field(description="User question or dilemma prompt")
    pet_id: str = Field(default="default", description="Pet identifier")


class DilemmaResponse(BaseModel):
    id: str
    question: str


class EvidenceItem(BaseModel):
    id: str
    text: str
    meta: dict[str, Any] = Field(default_factory=dict)


class GraphNode(BaseModel):
    id: str
    label: str | None = None
    group: str | None = None
    type: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    properties: dict[str, Any] | None = None


class GraphEdge(BaseModel):
    id: str | None = None
    source: str
    target: str
    label: str | None = None
    weight: float | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    isOverlay: bool | None = None


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
    graph_combined: GraphBundle | None = None
    pet_stats: dict[str, int]
    interaction_id: str


class FeedbackRequest(BaseModel):
    """User feedback to update pet state."""

    interaction_id: str = Field(description="Interaction id from /qa")
    action: str = Field(description="approve|flag|reject|escalate")
    rationale: str | None = Field(default=None, description="Optional rationale")


class FeedbackResponse(BaseModel):
    pet_stats: dict[str, int]
    updated_pet_stats: dict[str, int] | None = None
    overlay_graph_delta: GraphBundle
    new_path: str | None = None


class PetResponse(BaseModel):
    pet_stats: dict[str, int]
    path: str
    recent_interactions: list[dict[str, Any]]
