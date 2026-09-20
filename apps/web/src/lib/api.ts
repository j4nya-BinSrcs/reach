import type {
  ResearchSession,
  ResearchProgress,
  StartResearchResponse,
} from '../types/research';
import { API_BASE } from './constants';

// ── Mock data for standalone demo ─────────────────────────
import { MOCK_SESSION, MOCK_PROGRESS } from './mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

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

// ── API Functions ─────────────────────────────────────────

/**
 * Start a new research session.
 */
export async function startResearch(
  objective: string
): Promise<StartResearchResponse> {
  if (USE_MOCK) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));
    return { session_id: 'mock-session-001' };
  }

  return fetchAPI<StartResearchResponse>('/research', {
    method: 'POST',
    body: JSON.stringify({ objective }),
  });
}

/**
 * Poll the status of a research session.
 */
export async function getResearchStatus(
  sessionId: string
): Promise<ResearchProgress> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_PROGRESS(sessionId);
  }

  return fetchAPI<ResearchProgress>(`/research/${sessionId}/status`);
}

/**
 * Get the full research session (after completion).
 */
export async function getResearchSession(
  sessionId: string
): Promise<ResearchSession> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_SESSION;
  }

  return fetchAPI<ResearchSession>(`/research/${sessionId}`);
}
