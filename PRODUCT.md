# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individual researcher or engineer doing self-directed technical research — exploring papers, documentation, code, and the broader technical ecosystem to turn an objective into a focused, traceable knowledge workspace.

## Product Purpose

REACH turns a research objective into a detailed, traceable knowledge workspace. The user states what they want to learn or build; the system auto-generates dimension-covering queries, searches and filters the web, analyzes the strongest sources, and synthesizes a comprehensive research report — with findings, open questions, source comparisons, and a persistent workspace attached to every session.

## Positioning

An AI-first research copilot that does the entire search-and-synthesis loop end to end. Unlike a browser search or a static documentation site, REACH autonomously plans, discovers, filters, and analyzes — then delivers a structured report with every claim traceable back to its source. The research session is a single, pollable, ephemeral workspace.

## Operating Context

- Local-first, single-user: each session is a lightweight SQLite row; no accounts or collaboration.
- Mock mode runs fully keylessly (no LLM, no search, no network) for demo and CI.
- Live research optionally requires an OpenAI-compatible LLM key and a Tavily search key.
- Bounded by design: ≤7 generated queries and ≤15 sources per session.
- Tech stack: React 19 + Vite + TypeScript + TanStack Query + TailwindCSS client; FastAPI + Pydantic v2 + SQLite + httpx/BeautifulSoup4 server.
- 159 hermetic pytest tests on the server; 18 unit tests on the client.
- Dev flow: `make dev`, `make test`, `./scripts/launch.sh` product smoke test.

## Capabilities and Constraints

- Plan → search → filter/dedupe → rank → fetch → analyze → synthesize → report, all automated per session.
- Source fetching is bounded and failure-tolerant; a bad source never kills a session.
- Typed structured output: every LLM result is schema-validated with bounded retry.
- Source provenance: findings reference their supporting source IDs.
- Open questions surfaced separately from established findings.
- Pairwise source comparison persisted per session; workspace with notes and saved sources.
- Deterministic filtering (dedupe, classify, rank) before any LLM analysis.
- Ephemeral sessions — no cross-session knowledge graph or persistence beyond the current run.

## Brand Commitments

- Name: **REACH** — Research Exploration, Aggregation & Context Hub.
- Brand mark: a circle with a centered dot (the "reach" glyph). Accent color blue (`#4f8ef7`).
- Voice: precise, technical, traceable — every claim cites its source.

## Evidence on Hand

- Full documentation: `docs/PRD.md`, `docs/SRS.md`, `docs/architecture.md`, `docs/data-model.md`, `docs/development.md`, `docs/deployment.md`, `docs/api.md`, `docs/testing.md`.
- 159 hermetic server tests covering models, storage, agents, service, API, search, and report generation.
- 18 client unit tests covering normalization utilities.
- End-to-end Playwright tests via `./scripts/launch.sh`.
- Mock-mode full pipeline smoke test.

## Accessibility & Inclusion

No product-specific accessibility requirement was established. The UI uses semantic HTML, ARIA labels, keyboard-navigable controls, and `prefers-reduced-motion`-friendly animations as baseline.

## Product Principles

1. **Traceable** — every finding and claim cites its source; nothing is presented without provenance.
2. **Bounded** — research is scoped and fast; the session never exceeds 7 queries or 15 sources.
3. **Keyless-first** — mock mode delivers the full experience without any API key; real keys are optional for live research.
4. **Deterministic first** — filter, dedupe, and rank before any LLM touches the data; LLM only adds where it genuinely adds value.
5. **Complete surface** — every session produces a report, findings, open questions, comparisons, and a workspace — not a partial answer.
