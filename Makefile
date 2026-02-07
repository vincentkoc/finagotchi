# ─── Finagotchi ────────────────────────────────────────────────────────────────
# Shortcuts for local development, linting, and CI-like checks.
# Run `make help` to see all targets.
# ──────────────────────────────────────────────────────────────────────────────

VENV ?= .venv
VENV_PY := $(VENV)/bin/python
VENV_PRECOMMIT := $(VENV)/bin/pre-commit

ifeq ($(wildcard $(VENV_PY)),)
PYTHON ?= python3
PIP ?= $(PYTHON) -m pip
PRECOMMIT ?= pre-commit
else
PYTHON ?= $(VENV_PY)
PIP ?= $(PYTHON) -m pip
PRECOMMIT ?= $(VENV_PRECOMMIT)
endif

define warn_if_no_venv
@if [ ! -f "$(VENV_PY)" ]; then \
  echo "[warn] Virtual environment $(VENV) not found; using system-level interpreters/tools."; \
fi
endef

.DEFAULT_GOAL := help

PORT ?= 8000
FE_DIR := frontend

.PHONY: help setup install install-all \
        fe-install fe-dev fe-build fe-lint fe-typecheck fe-check \
        be-install be-dev be-lint be-format be-typecheck be-test be-check \
        lint check format precommit precommit-install \
        api api-noreload kill-port api-restart \
        qdrant-download qdrant-restore qdrant-setup \
        llm-chat llm-embed llm-all \
        clean

# ──────────────────────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Finagotchi — development commands"
	@echo "  ─────────────────────────────────────────────"
	@echo ""
	@echo "  Setup"
	@echo "    make setup            Create venv + install all deps"
	@echo "    make install-all      Install frontend + backend deps"
	@echo "    make fe-install       Install frontend deps (npm)"
	@echo "    make be-install       Install backend deps (pip)"
	@echo ""
	@echo "  Run"
	@echo "    make fe-dev           Start frontend dev server"
	@echo "    make api              Start backend API (uvicorn, reload)"
	@echo "    make api-noreload     Start backend API (no reload)"
	@echo "    make api-restart      Kill port + restart API"
	@echo ""
	@echo "  Frontend checks"
	@echo "    make fe-lint          ESLint (Next.js)"
	@echo "    make fe-typecheck     TypeScript type check"
	@echo "    make fe-build         Production build"
	@echo "    make fe-check         All frontend checks"
	@echo ""
	@echo "  Backend checks (commented out — enable when ready)"
	@echo "    make be-lint          Ruff lint"
	@echo "    make be-format        Ruff format"
	@echo "    make be-typecheck     Mypy type check"
	@echo "    make be-test          Pytest"
	@echo "    make be-check         All backend checks"
	@echo ""
	@echo "  All"
	@echo "    make lint             Lint frontend + backend"
	@echo "    make check            Full sweep (lint + types + build)"
	@echo "    make format           Format all code"
	@echo "    make precommit        Run pre-commit on all files"
	@echo "    make clean            Remove build artifacts"
	@echo ""
	@echo "  Data"
	@echo "    make qdrant-download  Download Qdrant snapshots"
	@echo "    make qdrant-restore   Restore Qdrant snapshots to cloud"
	@echo "    make qdrant-setup     Download + restore snapshots"
	@echo ""
	@echo "  Models"
	@echo "    make llm-chat         Run local chat model server"
	@echo "    make llm-embed        Run local embedding model server"
	@echo "    make llm-all          Show instructions to run both"
	@echo ""

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────
setup: setup-venv be-install fe-install precommit-install
	@echo "[ok] Setup complete."

setup-venv:
	python3 -m venv $(VENV)

install-all: be-install fe-install

# ──────────────────────────────────────────────────────────────────────────────
# Frontend
# ──────────────────────────────────────────────────────────────────────────────
fe-install:
	cd $(FE_DIR) && npm install

fe-dev:
	cd $(FE_DIR) && npm run dev

fe-build:
	cd $(FE_DIR) && npm run build

fe-lint:
	cd $(FE_DIR) && npx next lint

fe-typecheck:
	cd $(FE_DIR) && npx tsc --noEmit

fe-check: fe-lint fe-typecheck fe-build
	@echo "[ok] Frontend checks passed."

# ──────────────────────────────────────────────────────────────────────────────
# Backend  (commented out — uncomment when backend code is ready)
# ──────────────────────────────────────────────────────────────────────────────
be-install:
	$(call warn_if_no_venv)
	@if [ -f backend/requirements.txt ]; then \
	  $(PIP) install -r backend/requirements.txt; \
	else \
	  echo "[skip] backend/requirements.txt not found"; \
	fi

be-install-dev:
	$(call warn_if_no_venv)
	@if [ -f backend/requirements.txt ]; then \
	  $(PIP) install -r backend/requirements.txt; \
	  $(PIP) install ruff mypy pytest; \
	else \
	  echo "[skip] backend/requirements.txt not found"; \
	fi

be-format:
	$(call warn_if_no_venv)
	$(PYTHON) -m ruff format backend/

be-lint:
	$(call warn_if_no_venv)
	$(PYTHON) -m ruff check backend/

be-typecheck:
	$(call warn_if_no_venv)
	$(PYTHON) -m mypy backend/ --ignore-missing-imports

be-test:
	$(call warn_if_no_venv)
	$(PYTHON) -m pytest backend/tests

be-check:
	@$(MAKE) be-lint
	@$(MAKE) be-typecheck
	@$(MAKE) be-test
	@echo "[ok] Backend checks passed."

# ──────────────────────────────────────────────────────────────────────────────
# Combined
# ──────────────────────────────────────────────────────────────────────────────
lint: fe-lint be-lint

format: be-format
	@echo "[note] Frontend uses Prettier via ESLint — no separate format target."

check: fe-check be-check
	@echo ""
	@echo "=============================="
	@echo "  All checks passed."
	@echo "=============================="

# ──────────────────────────────────────────────────────────────────────────────
# Pre-commit
# ──────────────────────────────────────────────────────────────────────────────
precommit-install:
	$(PRECOMMIT) install || echo "[skip] pre-commit not installed — run: pip install pre-commit"

precommit:
	$(PRECOMMIT) run --all-files

# ──────────────────────────────────────────────────────────────────────────────
# API servers
# ──────────────────────────────────────────────────────────────────────────────
api:
	$(PYTHON) -m uvicorn backend.app.main:app --host 127.0.0.1 --port $(PORT) --reload --reload-dir $(CURDIR)

api-noreload:
	$(PYTHON) -m uvicorn backend.app.main:app --host 127.0.0.1 --port $(PORT)

kill-port:
	@lsof -ti :$(PORT) | xargs kill -9 2>/dev/null || echo "[ok] Port $(PORT) already free"

api-restart: kill-port api

# ──────────────────────────────────────────────────────────────────────────────
# Data / Qdrant
# ──────────────────────────────────────────────────────────────────────────────
qdrant-download:
	$(PYTHON) backend/scripts/qdrant_download_snapshots.py

qdrant-restore:
	$(PYTHON) backend/scripts/qdrant_restore_snapshots.py

qdrant-setup: qdrant-download qdrant-restore

# ──────────────────────────────────────────────────────────────────────────────
# Local model servers
# ──────────────────────────────────────────────────────────────────────────────
llm-chat:
	./scripts/run_llm_chat.sh

llm-embed:
	./scripts/run_llm_embed.sh

llm-all:
	@echo "Run in two terminals:"
	@echo "  make llm-chat"
	@echo "  make llm-embed"

# ──────────────────────────────────────────────────────────────────────────────
# Clean
# ──────────────────────────────────────────────────────────────────────────────
clean:
	rm -rf $(FE_DIR)/.next $(FE_DIR)/node_modules/.cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "[ok] Cleaned."
