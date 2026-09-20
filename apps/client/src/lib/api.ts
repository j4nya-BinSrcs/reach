import type {
  ResearchSession,
  ResearchProgress,
  SourceComparison,
  SessionSummary,
  StartResearchResponse,
} from '../types/research';
import type { Source, SourceAnalysis } from '../types/source';
import { API_BASE } from './constants';
import {
  normalizeComparison,
  normalizeSession,
  normalizeSessionSummary,
  normalizeSource,
} from './normalize';

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
 * List all research sessions (newest first) for the history dashboard.
 */
export async function listResearchSessions(
  options: { status?: string; limit?: number; exclude_in_progress?: boolean } = {}
): Promise<SessionSummary[]> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.exclude_in_progress) params.set('exclude_in_progress', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  const raw = await fetchAPI<unknown[]>(`/research${qs}`);
  return raw.map((s) => normalizeSessionSummary(s as Record<string, unknown>));
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
 * List workspace sources (optionally filtered to starred/saved/tagged).
 */
export async function listWorkspaceSources(
  sessionId: string,
  starred = false,
  saved = false,
  tag = ''
): Promise<Source[]> {
  const params = new URLSearchParams();
  if (starred) params.set('starred', 'true');
  if (saved) params.set('saved', 'true');
  if (tag) params.set('tag', tag);
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