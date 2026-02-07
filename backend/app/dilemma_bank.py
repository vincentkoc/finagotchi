from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Dilemma:
    id: str
    question: str


_DEFAULTS = [
    Dilemma(
        id="vendor_discount_risk",
        question=(
            "Vendor 6 offers a 10% discount but has late payments in recent months. "
            "Approve this invoice or flag for audit?"
        ),
    ),
    Dilemma(
        id="duplicate_invoice",
        question=(
            "Two invoices appear nearly identical for the same SKU and amount. "
            "Should we reject one or escalate for review?"
        ),
    ),
    Dilemma(
        id="amount_outlier",
        question=(
            "A transaction amount is 3x higher than this vendor's usual spend. "
            "Approve or flag as anomaly?"
        ),
    ),
]


class DilemmaBank:
    def __init__(self) -> None:
        self._idx = 0

    def next(self) -> Dilemma:
        if not _DEFAULTS:
            raise ValueError("No dilemmas configured")
        item = _DEFAULTS[self._idx % len(_DEFAULTS)]
        self._idx += 1
        return item
