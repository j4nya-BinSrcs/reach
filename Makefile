# REACH — monorepo makefile
# Convenience wrappers for the backend, web, and full-stack workflows.

SHELL := /usr/bin/env bash
ROOT  := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BACKEND := $(ROOT)/backend
WEB     := $(ROOT)/apps/web

.PHONY: help setup setup-backend setup-web backend web test test-backend test-web test-unit test-e2e full dev drone clean

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## ── Setup ────────────────────────────────────────────────

setup: setup-backend setup-web ## Install backend + web dependencies

setup-backend: ## Create venv and install backend deps
	cd $(BACKEND) && python3 -m venv .venv && .venv/bin/pip install -U pip
	cd $(BACKEND) && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt

setup-web: ## Install web dependencies
	cd $(WEB) && npm install

## ── Run (dev) ────────────────────────────────────────────

backend: ## Run the FastAPI backend (dev, reload)
	./scripts/dev.sh backend

web: ## Run the Vite dev server
	./scripts/dev.sh frontend

## ── Test ─────────────────────────────────────────────────

test-backend: ## Run the backend test suite + lint
	cd $(BACKEND) && .venv/bin/python -m pytest -q
	cd $(BACKEND) && .venv/bin/python -m pyflakes app/ tests/

test-web: ## Lint + typecheck + build the web app
	cd $(WEB) && npm run lint && npm run build

test-unit: ## Web unit tests (vitest) + backend tests + lint
	cd $(WEB) && npm run test
	cd $(BACKEND) && .venv/bin/python -m pytest -q
	cd $(BACKEND) && .venv/bin/python -m pyflakes app/ tests/

test-e2e: ## Boot the product via launch.sh and drive it with a headless browser
	RUN_E2E=1 ./scripts/launch.sh

test: test-backend test-web ## Run all static/lint/build checks

## ── Full product ─────────────────────────────────────────

full: ## Launch backend + web and smoke-test the whole product
	./scripts/launch.sh

dev: ## Launch backend and web dev servers side by side
	./scripts/dev.sh backend &
	./scripts/dev.sh frontend

## ── Clean ────────────────────────────────────────────────

clean: ## Remove venv, node_modules, build outputs
	rm -rf $(BACKEND)/.venv $(WEB)/node_modules $(WEB)/dist $(ROOT)/data/*.db*
	rm -rf $(BACKEND)/.pytest_cache $(BACKEND)/.mypy_cache $(BACKEND)/.ruff_cache