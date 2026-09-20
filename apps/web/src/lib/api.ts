import type {
  ResearchSession,
  ResearchProgress,
  ResearchQuery,
  ResearchSynthesis,
  Finding,
  ResearchGap,
  SourceComparison,
  ResearchReport,
  StartResearchResponse,
} from '../types/research';
import type { Source, SourceAnalysis, SourceType, FetchStatus } from '../types/source';
import { API_BASE } from './constants';

// ── Fetch wrapper ─────────────────────────────────────────
async function fetchAPI<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.text();
}

// ── Normalization: backend wire format → view contract ────

const STATUS_NORMALIZER: Record<string, FetchStatus> = {
  fetched: 'success',
  pending: 'pending',
  partial: 'partial',
  failed: 'failed',
  skipped: 'pending',
};

function normalizeSourceType(value: string): SourceType {
  const valid: SourceType[] = ['paper', 'github', 'documentation', 'tool', 'project', 'article', 'other'];
  return valid.includes(value as SourceType) ? (value as SourceType) : 'other';
}

function normalizeSource(raw: Record<string, unknown>): Source {
  const analysis = raw['analysis'] && typeof raw['analysis'] === 'object'
    ? raw['analysis'] as SourceAnalysis
    : null;
  const relevance = typeof raw['relevance'] === 'number' ? raw['relevance'] : 0;
  const fetchRaw = typeof raw['fetch_status'] === 'string' ? raw['fetch_status'] : 'pending';
  return {
    id: String(raw['id']),
    session_id: String(raw['session_id'] ?? ''),
    url: String(raw['url'] ?? ''),
    title: String(raw['title'] ?? ''),
    type: normalizeSourceType(String(raw['source_type'] ?? 'other')),
    domain: String(raw['domain'] ?? ''),
    description: String(raw['description'] ?? ''),
    snippet: String(raw['snippet'] ?? ''),
    relevance: Math.round(relevance * 100),
    fetch_status: STATUS_NORMALIZER[fetchRaw] ?? 'pending',
    analysis,
    starred: Boolean(raw['starred']),
    saved: Boolean(raw['saved']),
    note: String(raw['note'] ?? ''),
    tags: Array.isArray(raw['tags']) ? (raw['tags'] as string[]) : [],
  };
}

function normalizeFinding(raw: Record<string, unknown>): Finding {
  const ids = Array.isArray(raw['supporting_source_ids'])
    ? (raw['supporting_source_ids'] as unknown[]).map(String)
    : [];
  return {
    id: String(raw['id']),
    session_id: String(raw['session_id'] ?? ''),
    title: String(raw['title'] ?? ''),
    summary: String(raw['summary'] ?? ''),
    source_ids: ids,
  };
}

function normalizeGap(raw: Record<string, unknown>): ResearchGap {
  return {
    id: String(raw['id']),
    title: String(raw['question'] ?? ''),
    description: String(raw['rationale'] ?? ''),
  };
}

function normalizeSynthesis(raw: Record<string, unknown> | null): ResearchSynthesis | null {
  if (!raw) return null;
  return {
    overview: String(raw['overview'] ?? ''),
    key_technologies: Array.isArray(raw['relevant_technologies'])
      ? (raw['relevant_technologies'] as string[])
      : [],
    existing_projects: Array.isArray(raw['existing_projects'])
      ? (raw['existing_projects'] as string[])
      : [],
    research_directions: [],
  };
}

function normalizeComparison(raw: Record<string, unknown>): SourceComparison {
  return {
    id: String(raw['id']),
    source_a_id: String(raw['source_a_id']),
    source_b_id: String(raw['source_b_id']),
    result: (raw['result'] ?? {}) as SourceComparison['result'],
  };
}

function normalizeReport(raw: Record<string, unknown> | null): ResearchReport | null {
  if (!raw) return null;
  return {
    intent: (raw['intent'] as ResearchReport['intent']) ?? 'general',
    markdown: String(raw['markdown'] ?? ''),
  };
}

function normalizeQuery(raw: unknown, index: number): ResearchQuery {
  if (typeof raw === 'string') {
    return { id: `${index}`, session_id: '', query: raw, created_at: '' };
  }
  const obj = raw as Record<string, unknown>;
  return {
    id: String(obj['id'] ?? index),
    session_id: String(obj['session_id'] ?? ''),
    query: String(obj['query'] ?? ''),
    created_at: String(obj['created_at'] ?? ''),
  };
}

function normalizeSession(raw: Record<string, unknown>): ResearchSession {
  const sources = Array.isArray(raw['sources'])
    ? (raw['sources'] as unknown[]).map((s) => normalizeSource(s as Record<string, unknown>))
    : [];
  const findings = Array.isArray(raw['findings'])
    ? (raw['findings'] as unknown[]).map((f) => normalizeFinding(f as Record<string, unknown>))
    : [];
  const gaps = Array.isArray(raw['gaps'])
    ? (raw['gaps'] as unknown[]).map((g) => normalizeGap(g as Record<string, unknown>))
    : [];
  const queries = Array.isArray(raw['queries'])
    ? (raw['queries'] as unknown[]).map(normalizeQuery)
    : [];
  const comparisons = Array.isArray(raw['comparisons'])
    ? (raw['comparisons'] as unknown[]).map((c) => normalizeComparison(c as Record<string, unknown>))
    : [];
  return {
    id: String(raw['id']),
    objective: String(raw['objective'] ?? ''),
    status: (raw['status'] as ResearchSession['status']) ?? 'planning',
    progress: typeof raw['progress'] === 'number' ? raw['progress'] : 0,
    message: String(raw['message'] ?? ''),
    error: raw['error'] ? String(raw['error']) : null,
    created_at: String(raw['created_at'] ?? ''),
    updated_at: String(raw['updated_at'] ?? ''),
    queries,
    sources,
    findings,
    gaps,
    summary: normalizeSynthesis((raw['summary'] as Record<string, unknown>) ?? null),
    comparisons,
    report: normalizeReport((raw['report'] as Record<string, unknown>) ?? null),
  };
}

// ── API Functions ─────────────────────────────────────────

/**
 * Start a new research session.
 */
export async function startResearch(objective: string): Promise<StartResearchResponse> {
  return fetchAPI<StartResearchResponse>('/research', {
    method: 'POST',
    body: JSON.stringify({ objective }),
  });
}

/**
 * Poll the status of a research session.
 */
export async function getResearchStatus(sessionId: string): Promise<ResearchProgress> {
  return fetchAPI<ResearchProgress>(`/research/${sessionId}/status`);
}

/**
 * Get the full research session (after completion).
 */
export async function getResearchSession(sessionId: string): Promise<ResearchSession> {
  const raw = await fetchAPI<Record<string, unknown>>(`/research/${sessionId}`);
  return normalizeSession(raw);
}

/**
 * Get the detailed markdown research report (plain text).
 */
export async function getResearchReport(sessionId: string): Promise<string> {
  return fetchText(`/research/${sessionId}/report`);
}

/**
 * List persisted comparisons for a session.
 */
export async function listComparisons(sessionId: string): Promise<SourceComparison[]> {
  const raw = await fetchAPI<unknown[]>(`/research/${sessionId}/comparisons`);
  return raw.map((c) => normalizeComparison(c as Record<string, unknown>));
}

/**
 * Compare two sources of a session.
 */
export async function compareSources(
  sessionId: string,
  sourceAId: string,
  sourceBId: string
): Promise<SourceComparison> {
  const raw = await fetchAPI<Record<string, unknown>>(`/research/${sessionId}/compare`, {
    method: 'POST',
    body: JSON.stringify({
      source_a_id: Number(sourceAId),
      source_b_id: Number(sourceBId),
    }),
  });
  return normalizeComparison(raw);
}

/**
 * List workspace sources (optionally filtered to starred/saved).
 */
export async function listWorkspaceSources(
  sessionId: string,
  starred = false,
  saved = false
): Promise<Source[]> {
  const params = new URLSearchParams();
  if (starred) params.set('starred', 'true');
  if (saved) params.set('saved', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  const raw = await fetchAPI<unknown[]>(`/research/${sessionId}/workspace${qs}`);
  return raw.map((s) => normalizeSource(s as Record<string, unknown>));
}

/**
 * Update a source's workspace properties (star/save/note/tags).
 */
export async function updateSourceWorkspace(
  sessionId: string,
  sourceId: string,
  updates: { starred?: boolean; saved?: boolean; note?: string; tags?: string[] }
): Promise<Source> {
  const raw = await fetchAPI<Record<string, unknown>>(`/research/${sessionId}/sources/${sourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return normalizeSource(raw);
}

/**
 * Produce a focused summary of a single source.
 */
export async function summarizeSource(
  sessionId: string,
  sourceId: string
): Promise<SourceAnalysis> {
  return fetchAPI<SourceAnalysis>(`/research/${sessionId}/sources/${sourceId}/summarize`, {
    method: 'POST',
  });
}