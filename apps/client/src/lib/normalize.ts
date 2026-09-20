// Normalization layer: backend wire format → view contract.
// Kept pure and framework-free so it can be unit-tested directly.

import type {
  Finding,
  ResearchGap,
  ResearchQuery,
  ResearchReport,
  ResearchSession,
  ResearchSynthesis,
  SessionSummary,
  SourceComparison,
} from '../types/research';
import type { FetchStatus, Source, SourceType } from '../types/source';

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

function asString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

export function normalizeSource(raw: Record<string, unknown>): Source {
  const analysis = raw['analysis'] && typeof raw['analysis'] === 'object'
    ? raw['analysis'] as Source['analysis']
    : null;
  const relevance = typeof raw['relevance'] === 'number' ? raw['relevance'] : 0;
  const fetchRaw = typeof raw['fetch_status'] === 'string' ? raw['fetch_status'] : 'pending';
  return {
    id: asString(raw['id']),
    session_id: asString(raw['session_id']),
    url: asString(raw['url']),
    title: asString(raw['title']),
    type: normalizeSourceType(asString(raw['source_type'] ?? 'other')),
    domain: asString(raw['domain']),
    description: asString(raw['description']),
    snippet: asString(raw['snippet']),
    relevance: Math.round(relevance * 100),
    fetch_status: STATUS_NORMALIZER[fetchRaw] ?? 'pending',
    analysis,
    starred: Boolean(raw['starred']),
    saved: Boolean(raw['saved']),
    note: asString(raw['note']),
    tags: asStrings(raw['tags']),
  };
}

export function normalizeFinding(raw: Record<string, unknown>): Finding {
  return {
    id: asString(raw['id']),
    session_id: asString(raw['session_id']),
    title: asString(raw['title']),
    summary: asString(raw['summary']),
    source_ids: asStrings(raw['supporting_source_ids']),
  };
}

export function normalizeGap(raw: Record<string, unknown>): ResearchGap {
  return {
    id: asString(raw['id']),
    title: asString(raw['question']),
    description: asString(raw['rationale']),
  };
}

export function normalizeSynthesis(raw: Record<string, unknown> | null): ResearchSynthesis | null {
  if (!raw) return null;
  return {
    overview: asString(raw['overview']),
    key_technologies: asStrings(raw['relevant_technologies']),
    existing_projects: asStrings(raw['existing_projects']),
    research_directions: [],
  };
}

export function normalizeComparison(raw: Record<string, unknown>): SourceComparison {
  return {
    id: asString(raw['id']),
    source_a_id: asString(raw['source_a_id']),
    source_b_id: asString(raw['source_b_id']),
    result: (raw['result'] ?? {}) as SourceComparison['result'],
  };
}

export function normalizeReport(raw: Record<string, unknown> | null): ResearchReport | null {
  if (!raw) return null;
  return {
    intent: (raw['intent'] as ResearchReport['intent']) ?? 'general',
    markdown: asString(raw['markdown']),
  };
}

export function normalizeQuery(raw: unknown, index: number): ResearchQuery {
  if (typeof raw === 'string') {
    return { id: `${index}`, session_id: '', query: raw, created_at: '' };
  }
  const obj = raw as Record<string, unknown>;
  return {
    id: asString(obj['id'] ?? index),
    session_id: asString(obj['session_id']),
    query: asString(obj['query']),
    created_at: asString(obj['created_at']),
  };
}

export function normalizeSessionSummary(raw: Record<string, unknown>): SessionSummary {
  return {
    id: asString(raw['id']),
    objective: asString(raw['objective']),
    status: (raw['status'] as SessionSummary['status']) ?? 'planning',
    progress: typeof raw['progress'] === 'number' ? raw['progress'] : 0,
    error: raw['error'] ? asString(raw['error']) : null,
    created_at: asString(raw['created_at']),
    updated_at: asString(raw['updated_at']),
    sources_count: typeof raw['sources_count'] === 'number' ? raw['sources_count'] : 0,
    findings_count: typeof raw['findings_count'] === 'number' ? raw['findings_count'] : 0,
    gaps_count: typeof raw['gaps_count'] === 'number' ? raw['gaps_count'] : 0,
  };
}

export function normalizeSession(raw: Record<string, unknown>): ResearchSession {
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
    id: asString(raw['id']),
    objective: asString(raw['objective']),
    status: (raw['status'] as ResearchSession['status']) ?? 'planning',
    progress: typeof raw['progress'] === 'number' ? raw['progress'] : 0,
    message: asString(raw['message']),
    error: raw['error'] ? asString(raw['error']) : null,
    created_at: asString(raw['created_at']),
    updated_at: asString(raw['updated_at']),
    queries,
    sources,
    findings,
    gaps,
    summary: normalizeSynthesis((raw['summary'] as Record<string, unknown>) ?? null),
    comparisons,
    report: normalizeReport((raw['report'] as Record<string, unknown>) ?? null),
  };
}