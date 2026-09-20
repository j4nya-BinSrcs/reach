import type { ResearchGap } from '../../types/research';

interface ResearchGapCardProps {
  gap: ResearchGap;
  index: number;
}

export function ResearchGapCard({ gap, index }: ResearchGapCardProps) {
  return (
    <article
      className="animate-fade-in"
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(232,168,76,0.18)',
        background: 'rgba(232,168,76,0.04)',
        transition: 'border-color 0.2s ease, background 0.2s ease',
        animationDelay: `${index * 60}ms`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,168,76,0.3)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(232,168,76,0.07)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,168,76,0.18)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(232,168,76,0.04)';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--amber-dim)',
            border: '1px solid rgba(232,168,76,0.25)',
            fontSize: '0.625rem',
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--amber)',
            flexShrink: 0,
          }}
        >
          ?
        </span>
        <p
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--amber)',
          }}
        >
          Open Question
        </p>
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.4,
        }}
      >
        {gap.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          lineHeight: 1.7,
        }}
      >
        {gap.description}
      </p>

      {/* Caveat */}
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-subtle)',
          lineHeight: 1.5,
          borderTop: '1px solid rgba(232,168,76,0.1)',
          paddingTop: '0.75rem',
          fontStyle: 'italic',
        }}
      >
        This question was not conclusively answered by the collected sources.
      </p>
    </article>
  );
}
