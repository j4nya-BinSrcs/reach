# REACH documentation

**Research Exploration, Aggregation & Context Hub**

This directory is the canonical technical and product documentation set for
REACH. Documents are written against the implemented codebase (backend
pipeline, SQLite storage, FastAPI surface, React workspace UI).

## Document map

| Document | Audience | Purpose |
| --- | --- | --- |
| [PRD.md](PRD.md) | Product, engineering | Product requirements, goals, scope, success metrics |
| [CRM.md](CRM.md) | Stakeholders, product | Conceptual requirements model — actors, goals, concepts |
| [SRS.md](SRS.md) | Engineering, QA | Software requirements specification (functional & non-functional) |
| [architecture.md](architecture.md) | Engineering | System design, layers, data flow, design rules |
| [workflow.md](workflow.md) | Engineering, product | End-to-end research and workspace workflows |
| [agent.md](agent.md) | Engineering | Planner, researcher, synthesizer, comparator, report writer |
| [api.md](api.md) | Frontend, integrators | HTTP API contract, payloads, errors, polling |
| [data-model.md](data-model.md) | Engineering | Domain models, SQLite schema, migrations |
| [development.md](development.md) | Contributors | Local setup, env vars, Makefile, day-to-day workflow |
| [testing.md](testing.md) | Engineering, QA | Test strategy, suites, mock mode, smoke tests |
| [deployment.md](deployment.md) | Ops, engineering | Run modes, configuration, packaging considerations |
| [accessibility.md](accessibility.md) | Frontend, QA | A11y expectations, current patterns, gaps |
| [limitations.md](limitations.md) | All | Known bounds, failure modes, out-of-scope items |

Supporting READMEs outside this folder:

- [`../README.md`](../README.md) — project overview and quick start
- [`../server/README.md`](../server/README.md) — backend-focused quick reference
- [`../apps/client/README.md`](../apps/client/README.md) — web UI routes and commands

## Reading order

1. **New to the product:** PRD → CRM → workflow → limitations  
2. **Implementing or changing features:** architecture → agent → data-model → api → SRS  
3. **Shipping / operating:** development → testing → deployment → accessibility  

## Conventions

- Environment variables use the `REACH_` prefix (see `server/.env.example`).
- Bounds cited in docs (≤7 queries, 8–15 sources, etc.) match runtime defaults
  in `server/app/config.py` and the agent modules unless stated otherwise.
- Mock mode (`REACH_MOCK_MODE=mock`) is the hermetic path for CI, demos, and
  frontend work without live LLM/search keys.
- Version of the documented system: **0.1.0** (API title in `app/main.py`).
