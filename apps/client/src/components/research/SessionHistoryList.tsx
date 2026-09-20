import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { listResearchSessions } from '../../lib/api';
import type { SessionSummary, ResearchStatus } from '../../types/research';
import { formatRelativeTime } from '../../lib/utils';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';

function StatusPill({ status }: { status: ResearchStatus }) {
  const config: Record<ResearchStatus, { label: string; color: string; bg: string }> = {
    planning:     { label: 'Planning',        color: 'var(--accent)',      bg: 'var(--accent-dim)' },
    searching:    { label: 'Searching',       color: 'var(--accent)',      bg: 'var(--accent-dim)' },
    filtering:    { label: 'Filtering',       color: 'var(--accent)',      bg: 'var(--accent-dim)' },
    fetching:     { label: 'Fetching',        color: 'var(--accent)',      bg: 'var(--accent-dim)' },
    analyzing:    { label: 'Analyzing',       color: 'var(--accent)',      bg: 'var(--accent-dim)' },
    synthesizing: { label: 'Synthesizing',    color: 'var(--accent)',      bg: 'var(--accent-dim)' },
    complete:     { label: 'Complete',        color: 'var(--green)',       bg: 'var(--green-dim)' },
    failed:       { label: 'Failed',          color: 'var(--red)',         bg: 'var(--red-dim)' },
  };
  const c = config[status] ?? config.planning;
  return (
    <span
      style={{
        fontSize: '0.625rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.color}22`,
        borderRadius: 'var(--radius-xs)',
        padding: '0.125rem 0.4375rem',
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </span>
  );
}

export function SessionHistoryList({ limit = 10 }: { limit?: number }) {
  const sessionsQuery = useQuery({
    queryKey: ['sessions', limit],
    queryFn: () => listResearchSessions({ limit }),
  });

  if (sessionsQuery.isPending) {
    return (
      <div style={{ padding: '1rem 0' }}>
        <LoadingState />
      </div>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <EmptyState
        title="Could not load research history"
        description={sessionsQuery.error instanceof Error ? sessionsQuery.error.message : 'Unknown error'}
      />
    );
  }

  const sessions = sessionsQuery.data ?? [];
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No research sessions yet"
        description="Start a research objective above — your run history will appear here."
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '680px',
        margin: '0 auto',
      }}
    >
      {sessions.map((session: SessionSummary) => (
        <Link
          key={session.id}
          to={session.status === 'complete' || session.status === 'failed'
            ? `/research/${session.id}`
            : `/research/${session.id}`}
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.875rem 1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            transition: 'border-color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'var(--border-strong)';
            el.style.background = 'var(--surface-elevated)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'var(--border)';
            el.style.background = 'var(--surface)';
          }}
        >
          {/* Left: objective + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <StatusPill status={session.status} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>
                {formatRelativeTime(session.created_at)}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.875rem',
                color: 'var(--text)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.4,
              }}
            >
              {session.objective}
            </span>
            {/* Counts */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem' }}>
                <FileText size={12} aria-hidden="true" />
                {session.sources_count} sources
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem' }}>
                <CheckCircle2 size={12} aria-hidden="true" />
                {session.findings_count} findings
              </span>
              {session.status === 'failed' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3125rem', color: 'var(--red)' }}>
                  <AlertTriangle size={12} aria-hidden="true" />
                  {session.error ?? 'Failed'}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <span aria-hidden="true" style={{ color: 'var(--text-subtle)', flexShrink: 0 }}>
            →
          </span>
        </Link>
      ))}
    </div>
  );
}