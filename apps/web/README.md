# REACH — web UI

React 19 + Vite + TypeScript + TanStack Query frontend for REACH
(Research Exploration, Aggregation & Context Hub).

## Routes

- `/` — Home: research objective input, example prompts, live progress
  polling, link to the session page on completion.
- `/session/:id` — ResearchSession: summary, findings, ranked sources,
  generated markdown report, pairwise source comparison, and workspace
  actions (star / save / tag / note / summarize).

## API integration

All backend calls go through `src/lib/api.ts`, which also normalizes the
backend wire format into the typed view contracts in `src/types/`
(score scales, `source_type`→`type`, provenance ids, etc.). The UI never
touches raw API shapes.

In development, `vite.config.ts` proxies `/api/*` → `http://localhost:8000`
so the backend is served from port 8000 and the UI from 5173.

## Commands

```bash
npm install       # dependencies
npm run dev       # development server (port 5173)
npm run lint      # oxlint
npm run build     # tsc -b && vite build (production bundle)
npm run preview   # serve the production build
```

## End-to-end

`../scripts/launch.sh` at the repo root builds this app, serves it, boots
the backend in mock mode, and smoke-tests the full API contract.