// Source types

export type SourceType =
  | 'paper'
  | 'github'
  | 'documentation'
  | 'tool'
  | 'project'
  | 'article'
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
  type: SourceType;
  domain: string;
  description: string;
  snippet: string;
  relevance: number; // 0–100
  fetch_status: FetchStatus;
  analysis: SourceAnalysis | null;
}
