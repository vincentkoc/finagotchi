# Simple task shortcuts for local development.

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

.PHONY: help setup-venv install install-dev format lint test precommit api kill-port api-restart

help:
	@echo "Available targets:"
	@echo "  help          Show this help message (default)"
	@echo "  setup-venv    Create virtual environment in $(VENV)"
	@echo "  install       Install backend dependencies"
	@echo "  install-dev   Install backend dependencies + dev extras"
	@echo "  format        Run formatter (ruff)"
	@echo "  lint          Run linter (ruff)"
	@echo "  test          Run tests (if any)"
	@echo "  api           Run backend API (uvicorn)"
	@echo "  kill-port     Stop process on PORT (default 8000)"
	@echo "  api-restart   Kill port and restart API"

setup-venv:
	python3 -m venv $(VENV)

install:
	$(call warn_if_no_venv)
	$(PIP) install -r backend/requirements.txt

install-dev:
	$(call warn_if_no_venv)
	$(PIP) install -r backend/requirements.txt
	$(PIP) install ruff pytest

format:
	$(call warn_if_no_venv)
	$(PYTHON) -m ruff format backend

lint:
	$(call warn_if_no_venv)
	$(PYTHON) -m ruff check backend

test:
	$(call warn_if_no_venv)
	$(PYTHON) -m pytest

kill-port:
	PORT=$(PORT) scripts/kill_port.sh $${PORT:-8000}

api:
	$(PYTHON) -m uvicorn backend.app.main:app --host 127.0.0.1 --port $${PORT:-8000} --reload --reload-dir $(CURDIR)

api-restart:
	PORT=$(PORT) scripts/kill_port.sh $${PORT:-8000}
	$(PYTHON) -m uvicorn backend.app.main:app --host 127.0.0.1 --port $${PORT:-8000} --reload --reload-dir $(CURDIR)
