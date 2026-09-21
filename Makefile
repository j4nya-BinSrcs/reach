# REACH — monorepo makefile
# Convenience wrappers for the server, client, and full-stack workflows.

SHELL := /usr/bin/env bash
ROOT  := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
SERVER := $(ROOT)/server
CLIENT := $(ROOT)/apps/client

.PHONY: help setup setup-server setup-client server client test test-server test-client test-unit test-e2e full dev drone clean

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## ── Setup ────────────────────────────────────────────────

setup: setup-server setup-client ## Install server + client dependencies

setup-server: ## Create venv and install server deps
	cd $(SERVER) && python3 -m venv .venv && .venv/bin/pip install -U pip
	cd $(SERVER) && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt

setup-client: ## Install client dependencies
	cd $(CLIENT) && npm install

## ── Run (dev) ────────────────────────────────────────────

server: ## Run the FastAPI server (dev, reload)
	./scripts/dev.sh server

client: ## Run the Vite dev server
	./scripts/dev.sh client

## ── Test ─────────────────────────────────────────────────

test-server: ## Run the server test suite + lint
	cd $(SERVER) && .venv/bin/python -m pytest -q
	cd $(SERVER) && .venv/bin/python -m pyflakes app/ tests/

test-client: ## Lint + typecheck + build the client app
	cd $(CLIENT) && npm run lint && npm run build

test-unit: ## Client unit tests (vitest) + server tests + lint
	cd $(CLIENT) && npm run test
	cd $(SERVER) && .venv/bin/python -m pytest -q
	cd $(SERVER) && .venv/bin/python -m pyflakes app/ tests/

test-e2e: ## Run Playwright E2E (start ./scripts/launch.sh first in another terminal)
	cd $(CLIENT) && npm run test:e2e

test: test-server test-client ## Run all static/lint/build checks

## ── Full product ─────────────────────────────────────────

full: ## Launch API server + Vite client against local SQLite
	./scripts/launch.sh

dev: ## Launch server and client dev servers side by side
	./scripts/dev.sh server &
	./scripts/dev.sh client

## ── Clean ────────────────────────────────────────────────

clean: ## Remove venv, node_modules, build outputs
	rm -rf $(SERVER)/.venv $(CLIENT)/node_modules $(CLIENT)/dist $(ROOT)/data/*.db*
	rm -rf $(SERVER)/.pytest_cache $(SERVER)/.mypy_cache $(SERVER)/.ruff_cache