// Research session types (view contract after API normalization)

export type ResearchStatus =
  | 'planning'
  | 'searching'
  | 'filtering'
  | 'fetching'
  | 'analyzing'
  | 'synthesizing'
  | 'complete'
  | 'failed';

export interface ResearchProgress {
  status: ResearchStatus;
  progress: number; // 0–100
  message: string;
  queries_count?: number;
  results_count?: number;
  sources_count?: number;
}

export interface ResearchQuery {
  id: string;
  session_id: string;
  query: string;
  created_at: string;
}

export interface Finding {
  id: string;
  session_id: string;
  title: string;
  summary: string;
  source_ids: string[]; // source ids (as strings) supporting this finding
}

export interface ResearchGap {
  id: string;
  title: string;     // backend: question
  description: string; // backend: rationale
}

export interface ResearchSynthesis {
  overview: string;
  key_technologies: string[];   // backend: relevant_technologies
  existing_projects: string[];
  research_directions: string[]; // backend does not emit; normalized to []
}

export interface ComparisonPoint {
  statement: string;
  source_a_evidence: string;
  source_b_evidence: string;
}

export interface SourceComparisonResult {
  overview: string;
  similarities: ComparisonPoint[];
  differences: ComparisonPoint[];
  contradictions: ComparisonPoint[];
  complementarity_notes: string;
}

export interface SourceComparison {
  id: string;
  source_a_id: string;
  source_b_id: string;
  result: SourceComparisonResult;
}

export interface ResearchReport {
  intent: 'build' | 'study' | 'general';
  markdown: string;
}

export interface ResearchSession {
  id: string;
  objective: string;
  status: ResearchStatus;
  progress: number;
  message: string;
  error: string | null;
  created_at: string;
  updated_at: string;
  queries: ResearchQuery[];
  sources: import('./source').Source[];
  findings: Finding[];
  gaps: ResearchGap[];
  summary: ResearchSynthesis | null;
  comparisons: SourceComparison[];
  report: ResearchReport | null;
}

export interface SessionSummary {
  id: string;
  objective: string;
  status: ResearchStatus;
  progress: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  sources_count: number;
  findings_count: number;
  gaps_count: number;
}

export interface StartResearchResponse {
  session_id: string;
}