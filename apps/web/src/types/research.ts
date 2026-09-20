// Research session types

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
  source_ids: string[]; // references into sources array
}

export interface ResearchGap {
  id: string;
  title: string;
  description: string;
}

export interface ResearchSynthesis {
  overview: string;
  key_technologies: string[];
  existing_projects: string[];
  research_directions: string[];
}

export interface ResearchSession {
  id: string;
  objective: string;
  status: ResearchStatus;
  created_at: string;
  updated_at: string;
  queries: ResearchQuery[];
  sources: import('./source').Source[];
  findings: Finding[];
  gaps: ResearchGap[];
  synthesis: ResearchSynthesis | null;
}

export interface StartResearchResponse {
  session_id: string;
}
