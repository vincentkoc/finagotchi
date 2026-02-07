// API client for Finagotchi backend

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types matching backend contracts
export type EvidenceItem = {
  id: string;
  text: string;
  score?: number;
};

export type GraphNode = {
  id: string;
  label: string;
  type?: string;
  properties?: Record<string, unknown>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  weight?: number;
  isOverlay?: boolean;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type AnswerJson = {
  decision: "approve" | "flag" | "reject" | "escalate";
  confidence: number;
  rationale: string;
  evidence_ids: string[];
  overlay_edges: Array<{
    src: string;
    rel: string;
    dst: string;
    weight: number;
  }>;
};

export type PetStats = {
  risk: number;
  compliance: number;
  thriftiness: number;
  anomaly_sensitivity: number;
};

export type QAResponse = {
  answer_json: AnswerJson;
  evidence_bundle: EvidenceItem[];
  neighborhood_graph: GraphData;
  overlay_graph: GraphData;
  pet_stats: PetStats;
  interaction_id?: string;
};

export type FeedbackResponse = {
  updated_pet_stats: PetStats;
  overlay_graph_delta: GraphData;
  new_path?: string;
};

export type PetResponse = {
  pet_stats: PetStats;
  path: string;
  recent_interactions: Array<{
    id: string;
    question: string;
    decision: string;
    timestamp: string;
  }>;
};

// API functions
export async function postQA(
  question: string,
  petId: string = "default"
): Promise<QAResponse> {
  const res = await fetch(`${API_BASE_URL}/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, pet_id: petId }),
  });

  if (!res.ok) {
    throw new Error(`QA request failed: ${res.status}`);
  }

  return res.json();
}

export async function postFeedback(
  interactionId: string,
  action: "approve" | "flag" | "escalate" | "reject",
  rationale?: string
): Promise<FeedbackResponse> {
  const res = await fetch(`${API_BASE_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      interaction_id: interactionId,
      action,
      rationale,
    }),
  });

  if (!res.ok) {
    throw new Error(`Feedback request failed: ${res.status}`);
  }

  return res.json();
}

export async function getPet(
  petId: string = "default"
): Promise<PetResponse> {
  const res = await fetch(`${API_BASE_URL}/pet?pet_id=${petId}`);

  if (!res.ok) {
    throw new Error(`Pet request failed: ${res.status}`);
  }

  return res.json();
}

export async function getGraphNeighborhood(
  entityId: string,
  depth: number = 2
): Promise<GraphData> {
  const res = await fetch(
    `${API_BASE_URL}/graph/neighborhood?entity_id=${encodeURIComponent(entityId)}&depth=${depth}`
  );

  if (!res.ok) {
    throw new Error(`Graph request failed: ${res.status}`);
  }

  return res.json();
}
