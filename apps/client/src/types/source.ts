// Source types (view contract after API normalization)

export type SourceType =
  | 'paper'
  | 'github'
  | 'documentation'
  | 'tool'
  | 'project'
  | 'article'
  | 'discussion'
  | 'other';

export type FetchStatus = 'success' | 'partial' | 'failed' | 'pending';

export interface SourceAnalysis {
  summary: string;
  key_points: string[];
  technologies: string[];
  concepts: string[];
  why_relevant: string;
  limitations: string[];
}

export interface Source {
  id: string;
  session_id: string;
  url: string;
  title: string;
  type: SourceType; // backend: source_type
  domain: string;
  description: string;
  snippet: string;
  relevance: number; // 0–100 (backend sends 0–1, normalized)
  fetch_status: FetchStatus; // 'fetched' → 'success', 'skipped' → 'pending'
  analysis: SourceAnalysis | null;
  starred: boolean;
  saved: boolean;
  note: string;
  tags: string[];
}