"""Lightweight docstrings and examples for Swagger and README sync."""

QA_EXAMPLE_REQUEST = {
    "question": "Is vendor 6 risky due to late payments?",
    "pet_id": "default",
}

QA_EXAMPLE_RESPONSE = {
    "answer_json": {
        "decision": "flag",
        "confidence": 0.7,
        "rationale": "Vendor has insufficient payment history; monitor for anomalies.",
        "evidence_ids": ["qdrant:DocumentChunk_text:..."],
        "overlay_edges": [],
    },
    "evidence_bundle": [
        {
            "id": "qdrant:DocumentChunk_text:...",
            "text": "{...invoice_text...}",
            "meta": {"vendor_id": 6, "invoice_number": "INV-V6-M05-..."},
        }
    ],
    "neighborhood_graph": {"nodes": [], "edges": []},
    "overlay_graph": {"nodes": [], "edges": []},
    "pet_stats": {"risk": 50, "compliance": 50, "thriftiness": 50},
    "interaction_id": "uuid",
}

FEEDBACK_EXAMPLE_REQUEST = {
    "interaction_id": "uuid",
    "action": "flag",
    "rationale": "Discount looks too high compared to vendor history",
}

FEEDBACK_EXAMPLE_RESPONSE = {
    "pet_stats": {"risk": 52, "compliance": 51, "thriftiness": 50},
    "overlay_graph_delta": {"nodes": [], "edges": []},
    "new_path": None,
}
