import type { SourceType } from '../types/source';
import type { ResearchStatus } from '../types/research';

// ── API Base ──────────────────────────────────────────────
export const API_BASE = '/api';

// ── Example research prompts ──────────────────────────────
export const EXAMPLE_PROMPTS = [
  'I want to build a privacy-focused search engine using Rust. Find relevant research papers, existing search projects, indexing libraries, documentation, and technologies I should investigate.',
  'Explore the state of WebAssembly runtimes in 2024. What are the leading projects, performance benchmarks, and use cases outside the browser?',
  'I need to understand federated learning — its practical implementations, limitations, and open-source libraries for use in a production ML pipeline.',
  'Find the key research and tools around LLM inference optimization: quantization, speculative decoding, and efficient serving frameworks.',
];

// ── Status labels & ordering ──────────────────────────────
export const STATUS_STEPS: { status: ResearchStatus; label: string }[] = [
  { status: 'planning',     label: 'Understanding objective' },
  { status: 'searching',    label: 'Generating research queries' },
  { status: 'filtering',    label: 'Discovering sources' },
  { status: 'fetching',     label: 'Filtering relevant sources' },
  { status: 'analyzing',    label: 'Analyzing sources' },
  { status: 'synthesizing', label: 'Building research synthesis' },
  { status: 'complete',     label: 'Research complete' },
];

export const STATUS_ORDER: ResearchStatus[] = [
  'planning',
  'searching',
  'filtering',
  'fetching',
  'analyzing',
  'synthesizing',
  'complete',
];

export const STATUS_MESSAGES: Record<ResearchStatus, string> = {
  planning:     'Planning research strategy...',
  searching:    'Discovering sources...',
  filtering:    'Filtering relevant results...',
  fetching:     'Fetching source content...',
  analyzing:    'Analyzing sources...',
  synthesizing: 'Synthesizing findings...',
  complete:     'Research complete',
  failed:       'Research failed',
};

// ── Source type metadata ──────────────────────────────────
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  paper:         'Paper',
  github:        'GitHub',
  documentation: 'Documentation',
  tool:          'Tool',
  project:       'Project',
  article:       'Article',
  other:         'Other',
};

// Polling interval in ms
export const POLL_INTERVAL_MS = 2000;
