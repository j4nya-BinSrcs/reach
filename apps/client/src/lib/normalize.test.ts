import { describe, expect, it } from 'vitest';
import {
  normalizeSource,
  normalizeFinding,
  normalizeGap,
  normalizeSynthesis,
  normalizeComparison,
  normalizeReport,
  normalizeQuery,
  normalizeSession,
  normalizeSessionSummary,
} from './normalize';

describe('normalizeSource', () => {
  it('maps backend source fields to the view contract', () => {
    const source = normalizeSource({
      id: 7,
      session_id: 'abc',
      url: 'https://github.com/rust-lang/rust',
      title: 'The Rust Programming Language',
      source_type: 'github',
      domain: 'github.com',
      description: 'A systems language',
      snippet: 'Rust repo',
      relevance: 0.85,
      fetch_status: 'fetched',
      starred: true,
      saved: false,
      note: 'must revisit',
      tags: ['core', 'reference'],
    });

    expect(source.id).toBe('7');
    expect(source.session_id).toBe('abc');
    expect(source.type).toBe('github');
    expect(source.relevance).toBe(85); // 0–1 → 0–100
    expect(source.fetch_status).toBe('success'); // fetched → success
    expect(source.starred).toBe(true);
    expect(source.saved).toBe(false);
    expect(source.note).toBe('must revisit');
    expect(source.tags).toEqual(['core', 'reference']);
  });

  it('falls back to safe defaults for missing/invalid fields', () => {
    const source = normalizeSource({});
    expect(source.id).toBe('');
    expect(source.type).toBe('other');
    expect(source.relevance).toBe(0);
    expect(source.fetch_status).toBe('pending');
    expect(source.starred).toBe(false);
    expect(source.tags).toEqual([]);
    expect(source.analysis).toBeNull();
  });

  it('normalizes not-yet-fetched status', () => {
    expect(normalizeSource({ fetch_status: 'skipped' }).fetch_status).toBe('pending');
    expect(normalizeSource({ fetch_status: 'failed' }).fetch_status).toBe('failed');
    expect(normalizeSource({ fetch_status: 'partial' }).fetch_status).toBe('partial');
  });

  it('coerces an invalid source_type to other', () => {
    expect(normalizeSource({ source_type: 'weird' }).type).toBe('other');
  });

  it('clamps relevance rounding to integers', () => {
    expect(normalizeSource({ relevance: 0.993 }).relevance).toBe(99);
  });
});

describe('normalizeFinding', () => {
  it('maps supporting_source_ids and tolerates ints', () => {
    const finding = normalizeFinding({
      id: 3,
      title: 'Borrow checker',
      summary: 'Rust prevents data races at compile time.',
      supporting_source_ids: [1, 2],
    });
    expect(finding.id).toBe('3');
    expect(finding.source_ids).toEqual(['1', '2']);
  });

  it('defaults missing source ids to empty array', () => {
    expect(normalizeFinding({}).source_ids).toEqual([]);
  });
});

describe('normalizeGap', () => {
  it('maps question/rationale to title/description', () => {
    const gap = normalizeGap({ id: 1, question: 'Why?', rationale: 'Because.' });
    expect(gap.title).toBe('Why?');
    expect(gap.description).toBe('Because.');
  });
});

describe('normalizeSynthesis', () => {
  it('maps relevant_technologies to key_technologies', () => {
    const synthesis = normalizeSynthesis({
      overview: 'ok',
      relevant_technologies: ['Rust', 'tokio'],
      existing_projects: ['servo'],
    });
    expect(synthesis).not.toBeNull();
    expect(synthesis!.overview).toBe('ok');
    expect(synthesis!.key_technologies).toEqual(['Rust', 'tokio']);
    expect(synthesis!.existing_projects).toEqual(['servo']);
    expect(synthesis!.research_directions).toEqual([]);
  });

  it('returns null for empty payload', () => {
    expect(normalizeSynthesis(null)).toBeNull();
    expect(normalizeSynthesis(undefined as unknown as Record<string, unknown>)).toBeNull();
  });
});

describe('normalizeComparison', () => {
  it('stringifies ids and keeps the result payload', () => {
    const comparison = normalizeComparison({
      id: 9,
      source_a_id: 4,
      source_b_id: 5,
      result: { overview: 'similar', similarities: [], differences: [], contradictions: [] },
    });
    expect(comparison.id).toBe('9');
    expect(comparison.source_a_id).toBe('4');
    expect(comparison.source_b_id).toBe('5');
    expect(comparison.result.overview).toBe('similar');
  });
});

describe('normalizeReport', () => {
  it('maps report fields', () => {
    const report = normalizeReport({ intent: 'build', markdown: '# Research Report' });
    expect(report?.intent).toBe('build');
    expect(report?.markdown).toBe('# Research Report');
  });

  it('returns null for missing report', () => {
    expect(normalizeReport(null)).toBeNull();
  });
});

describe('normalizeQuery', () => {
  it('keeps object queries', () => {
    const query = normalizeQuery({ id: 2, query: 'servo architecture' }, 0);
    expect(query.id).toBe('2');
    expect(query.query).toBe('servo architecture');
  });

  it('synthesizes query rows from plain strings with an index id', () => {
    const query = normalizeQuery('rust search engine', 3);
    expect(query.id).toBe('3');
    expect(query.query).toBe('rust search engine');
  });
});

describe('normalizeSessionSummary', () => {
  it('maps the history row and keeps numeric counts', () => {
    const summary = normalizeSessionSummary({
      id: 'abc',
      objective: 'Build a search engine',
      status: 'complete',
      progress: 100,
      sources_count: 12,
      findings_count: 5,
      gaps_count: 3,
    });
    expect(summary.id).toBe('abc');
    expect(summary.status).toBe('complete');
    expect(summary.sources_count).toBe(12);
    expect(summary.error).toBeNull();
  });

  it('defaults counts to zero', () => {
    expect(normalizeSessionSummary({}).sources_count).toBe(0);
  });
});

describe('normalizeSession', () => {
  it('assembles the full research workspace from wire payload', () => {
    const session = normalizeSession({
      id: 's1',
      objective: 'Build a search engine',
      status: 'complete',
      progress: 100,
      queries: ['query one', { id: 2, query: 'query two' }],
      sources: [{ id: 1, url: 'https://a.example', title: 'A', source_type: 'documentation', relevance: 0.5, fetch_status: 'fetched' }],
      findings: [{ id: 1, title: 'F', supporting_source_ids: [1] }],
      gaps: [{ id: 1, question: 'Q', rationale: 'R' }],
      summary: { overview: 'O', relevant_technologies: ['rust'] },
      comparisons: [],
      report: { intent: 'build', markdown: '# R' },
    });

    expect(session.queries[0].query).toBe('query one');
    expect(session.sources[0].relevance).toBe(50);
    expect(session.findings[0].source_ids).toEqual(['1']);
    expect(session.gaps[0].title).toBe('Q');
    expect(session.summary?.key_technologies).toEqual(['rust']);
    expect(session.report?.markdown).toBe('# R');
  });
});