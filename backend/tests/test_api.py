from __future__ import annotations

from fastapi.testclient import TestClient

import backend.app.main as main


class DummyLLM:
    def embed(self, text: str):
        return [0.1, 0.2, 0.3]

    def chat(self, messages):
        return "OK"

    def chat_json(self, messages):
        return {
            "decision": "flag",
            "confidence": 0.7,
            "rationale": "No finance evidence.",
            "evidence_ids": [],
            "overlay_edges": [],
        }


class DummyQdrant:
    def __init__(self):
        pass


class DummyKuzu:
    def neighborhood(self, anchors, depth=2):
        return {
            "nodes": [{"id": "chunk:1", "label": "INV-1", "group": "Chunk"}],
            "edges": [],
        }


class DummyPetStore:
    def get_pet(self, pet_id):
        return {
            "stats": {
                "risk": 50,
                "compliance": 50,
                "thriftiness": 50,
                "anomaly_sensitivity": 50,
            },
            "path": "Baby",
        }

    def log_interaction(self, pet_id, question, evidence, answer):
        return "test-interaction"

    def add_overlay_edges(self, pet_id, edges):
        return []

    def get_overlay_graph(self, pet_id):
        return {"nodes": [], "edges": []}

    def update_stats(self, pet_id, action):
        return {
            "risk": 52,
            "compliance": 51,
            "thriftiness": 50,
            "anomaly_sensitivity": 50,
        }

    def maybe_evolve(self, pet_id):
        return None

    def get_interaction_pet(self, interaction_id):
        return "default"

    def list_interactions(self, pet_id, limit=10):
        return []


client = TestClient(main.app)


def setup_module(module):
    main.llm = DummyLLM()
    main.qdrant = DummyQdrant()
    main.kuzu = DummyKuzu()
    main.pet_store = DummyPetStore()

    # Patch retrieval helpers
    main.search = lambda client, vector: []
    main.to_evidence = lambda points: [
        {
            "id": "qdrant:DocumentChunk_text:1",
            "text": "{'invoice_number': 'INV-1', 'vendor_id': 1, 'total': 10.0}",
            "meta": {
                "parsed": {"invoice_number": "INV-1", "vendor_id": 1, "total": 10.0}
            },
        }
    ]
    main.extract_anchors = lambda evidence: {
        "chunk_id": {"1"},
        "vendor_id": {"1"},
        "transaction_id": set(),
        "sku": set(),
    }


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_qa():
    resp = client.post("/qa", json={"question": "Test?", "pet_id": "default"})
    assert resp.status_code == 200
    data = resp.json()
    assert "answer_json" in data
    assert "neighborhood_graph" in data
    assert "overlay_graph" in data
    assert "graph_combined" in data


def test_feedback():
    resp = client.post(
        "/feedback",
        json={"interaction_id": "test-interaction", "action": "flag", "rationale": "x"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "pet_stats" in data
    assert "updated_pet_stats" in data


def test_graph_sample():
    resp = client.get("/graph/sample")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data
