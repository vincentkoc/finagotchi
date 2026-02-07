from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from typing import Any

from .config import settings

DEFAULT_STATS = {
    "risk": 50,
    "compliance": 50,
    "thriftiness": 50,
    "anomaly_sensitivity": 50,
}

DEFAULT_PATH = "Baby Auditor"


class PetStore:
    def __init__(self) -> None:
        self.db_path = settings.sqlite_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS pet_state (
                    pet_id TEXT PRIMARY KEY,
                    stats_json TEXT NOT NULL,
                    path TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS interactions (
                    id TEXT PRIMARY KEY,
                    pet_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    evidence_json TEXT NOT NULL,
                    answer_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS overlay_edges (
                    id TEXT PRIMARY KEY,
                    pet_id TEXT NOT NULL,
                    src TEXT NOT NULL,
                    rel TEXT NOT NULL,
                    dst TEXT NOT NULL,
                    weight REAL NOT NULL,
                    meta_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
                """
            )
            conn.commit()

    def get_pet(self, pet_id: str) -> dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT stats_json, path FROM pet_state WHERE pet_id = ?",
                (pet_id,),
            ).fetchone()
            if row:
                return {"stats": json.loads(row[0]), "path": row[1]}
            conn.execute(
                "INSERT INTO pet_state (pet_id, stats_json, path) VALUES (?, ?, ?)",
                (pet_id, json.dumps(DEFAULT_STATS), DEFAULT_PATH),
            )
            conn.commit()
            return {"stats": dict(DEFAULT_STATS), "path": DEFAULT_PATH}

    def log_interaction(
        self,
        pet_id: str,
        question: str,
        evidence: list[dict[str, Any]],
        answer: dict[str, Any],
    ) -> str:
        interaction_id = str(uuid.uuid4())
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO interactions (id, pet_id, question, evidence_json, answer_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    interaction_id,
                    pet_id,
                    question,
                    json.dumps(evidence),
                    json.dumps(answer),
                    time.time(),
                ),
            )
            conn.commit()
        return interaction_id

    def get_interaction_pet(self, interaction_id: str) -> str | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT pet_id FROM interactions WHERE id = ?",
                (interaction_id,),
            ).fetchone()
            if row:
                return row[0]
        return None

    def list_interactions(self, pet_id: str, limit: int = 10) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, question, answer_json, created_at FROM interactions WHERE pet_id = ? ORDER BY created_at DESC LIMIT ?",
                (pet_id, limit),
            ).fetchall()
            items = []
            for r in rows:
                decision = None
                try:
                    answer = json.loads(r[2])
                    decision = answer.get("decision")
                except Exception:
                    decision = None
                items.append(
                    {
                        "id": r[0],
                        "question": r[1],
                        "decision": decision,
                        "timestamp": r[3],
                    }
                )
            return items

    def update_stats(self, pet_id: str, action: str) -> dict[str, int]:
        current = self.get_pet(pet_id)
        stats = current["stats"]

        deltas = {
            "approve": {"thriftiness": 2, "risk": -1},
            "flag": {"risk": 2, "compliance": 1},
            "escalate": {"risk": 3, "compliance": 2},
            "reject": {"compliance": 2, "risk": 1},
        }.get(action, {})

        for key, delta in deltas.items():
            stats[key] = max(0, min(100, stats.get(key, 50) + delta))

        with self._connect() as conn:
            conn.execute(
                "UPDATE pet_state SET stats_json = ? WHERE pet_id = ?",
                (json.dumps(stats), pet_id),
            )
            conn.commit()
        return stats

    def maybe_evolve(self, pet_id: str) -> str | None:
        current = self.get_pet(pet_id)
        stats = current["stats"]
        score = sum(stats.values())
        new_path = None
        if score >= 240 and current["path"] != "Vigilant Auditor":
            new_path = "Vigilant Auditor"
        elif score >= 220 and current["path"] != "Steady Analyst":
            new_path = "Steady Analyst"

        if new_path:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE pet_state SET path = ? WHERE pet_id = ?",
                    (new_path, pet_id),
                )
                conn.commit()
        return new_path

    def add_overlay_edges(
        self, pet_id: str, edges: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        saved = []
        with self._connect() as conn:
            for edge in edges:
                edge_id = str(uuid.uuid4())
                src = edge.get("src")
                rel = edge.get("rel")
                dst = edge.get("dst")
                if not src or not rel or not dst:
                    continue
                weight = float(edge.get("weight", 1.0))
                meta = edge.get("meta", {})
                conn.execute(
                    "INSERT INTO overlay_edges (id, pet_id, src, rel, dst, weight, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        edge_id,
                        pet_id,
                        src,
                        rel,
                        dst,
                        weight,
                        json.dumps(meta),
                        time.time(),
                    ),
                )
                saved.append(
                    {
                        "id": edge_id,
                        "source": src,
                        "target": dst,
                        "label": rel,
                        "weight": weight,
                        "meta": meta,
                        "isOverlay": True,
                    }
                )
            conn.commit()
        return saved

    def get_overlay_graph(self, pet_id: str, limit: int = 50) -> dict[str, Any]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT src, rel, dst, weight, meta_json FROM overlay_edges WHERE pet_id = ? ORDER BY created_at DESC LIMIT ?",
                (pet_id, limit),
            ).fetchall()

        nodes: dict[str, dict[str, object]] = {}
        edges = []
        for src, rel, dst, weight, meta_json in rows:
            nodes.setdefault(src, {"id": src, "label": src, "group": "overlay"})
            nodes.setdefault(dst, {"id": dst, "label": dst, "group": "overlay"})
            edges.append(
                {
                    "id": f"{src}->{rel}->{dst}",
                    "source": src,
                    "target": dst,
                    "label": rel,
                    "weight": weight,
                    "meta": json.loads(meta_json) if meta_json else {},
                    "isOverlay": True,
                }
            )
        return {"nodes": list(nodes.values()), "edges": edges}

    def export_pet(self, pet_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            interactions = conn.execute(
                "SELECT question, evidence_json, answer_json, created_at FROM interactions WHERE pet_id = ? ORDER BY created_at ASC",
                (pet_id,),
            ).fetchall()
            overlay_edges = conn.execute(
                "SELECT src, rel, dst, weight, meta_json, created_at FROM overlay_edges WHERE pet_id = ? ORDER BY created_at ASC",
                (pet_id,),
            ).fetchall()

        overlay = [
            {
                "src": r[0],
                "rel": r[1],
                "dst": r[2],
                "weight": r[3],
                "meta": json.loads(r[4]) if r[4] else {},
                "timestamp": r[5],
            }
            for r in overlay_edges
        ]

        exports = []
        for q, evidence_json, answer_json, created_at in interactions:
            try:
                evidence = json.loads(evidence_json)
            except Exception:
                evidence = []
            try:
                answer = json.loads(answer_json)
            except Exception:
                answer = {}
            exports.append(
                {
                    "question": q,
                    "evidence": evidence,
                    "decision": answer.get("decision"),
                    "rationale": answer.get("rationale"),
                    "confidence": answer.get("confidence"),
                    "overlay_edges": overlay,
                    "timestamp": created_at,
                }
            )
        return exports
