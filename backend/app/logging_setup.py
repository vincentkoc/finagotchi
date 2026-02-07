from __future__ import annotations

import logging
import os


def setup_logging() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper().strip()
    if level.isdigit():
        numeric_level = int(level)
    else:
        numeric_level = getattr(logging, level, logging.INFO)

    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    # Keep noisy libs quieter
    for name in ("httpx", "urllib3", "qdrant_client"):
        logging.getLogger(name).setLevel(logging.WARNING)
