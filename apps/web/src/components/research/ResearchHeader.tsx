import type { ResearchSession } from '../../types/research';
import { formatRelativeTime } from '../../lib/utils';

interface ResearchHeaderProps {
  session: ResearchSession;
  running?: boolean;
}

export function ResearchHeader({ session, running = false }: ResearchHeaderProps) {
  const sourceCount  = session.sources.length;
  const queryCount   = session.queries.length;
  const findingCount = session.findings.length;
  const gapCount     = session.gaps.length;

  return (
    <header
      id="overview"
      className="animate-fade-in"
      style={{
        paddingBottom: '2rem',
        borderBottom: '1px solid var(--border)',
        marginBottom: '2.5rem',
      }}
    >
      {/* Eyebrow */}
      <p className="label" style={{ marginBottom: '0.875rem', color: 'var(--accent)' }}>
        Research Session
      </p>

      {/* Objective */}
      <h1
        style={{
          fontSize: '1.375rem',
          fontWeight: 600,
          letterSpacing: '-0.025em',
          lineHeight: 1.3,
          color: 'var(--text)',
          marginBottom: '1.5rem',
          maxWidth: '700px',
        }}
      >
        {session.objective}
      </h1>

      {/* Metadata pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        {[
          { value: sourceCount,  label: sourceCount === 1 ? 'source' : 'sources' },
          { value: queryCount,   label: queryCount === 1 ? 'query' : 'queries' },
          { value: findingCount, label: findingCount === 1 ? 'finding' : 'findings' },
          { value: gapCount,     label: gapCount === 1 ? 'open question' : 'open questions' },
        ].map(({ value, label }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              {value}
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
        ))}

        {/* Divider */}
        <span
          aria-hidden="true"
          style={{
            width: '1px',
            height: '14px',
            background: 'var(--border-strong)',
          }}
        />

        {/* Status badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-xs)',
            background: running ? 'var(--accent-dim)' : 'var(--green-dim)',
            border: `1px solid ${running ? 'rgba(79,142,247,0.25)' : 'rgba(76,175,130,0.2)'}`,
          }}
        >
          {running && (
            <span className="pulse-dot" aria-hidden="true" />
          )}
          {!running && (
            <span
              aria-hidden="true"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--green)',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: running ? 'var(--accent)' : 'var(--green)',
            }}
          >
            {running ? 'In progress' : 'Complete'}
          </span>
        </div>

        <span
          style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}
          title={session.created_at}
        >
          {formatRelativeTime(session.created_at)}
        </span>
      </div>

      {/* Query chips */}
      {session.queries.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <p className="label" style={{ marginBottom: '0.625rem' }}>
            Research queries
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {session.queries.map((q) => (
              <span
                key={q.id}
                style={{
                  padding: '0.3125rem 0.625rem',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {q.query}
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
