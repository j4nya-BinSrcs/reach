import { useState } from 'react';
import type { ResearchGap } from '../../types/research';

interface ResearchGapCardProps {
  gap: ResearchGap;
  index: number;
}

export function ResearchGapCard({ gap, index }: ResearchGapCardProps) {
  const [expanded, setExpanded] = useState(false);

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
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((v) => !v)}
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

      {/* Description — always visible */}
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          lineHeight: 1.7,
        }}
      >
        {gap.description}
      </p>

      {/* Expandable caveat */}
      <div
        style={{
          maxHeight: expanded ? '600px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-subtle)',
            lineHeight: 1.5,
            borderTop: expanded ? '1px solid rgba(232,168,76,0.1)' : 'none',
            paddingTop: expanded ? '0.75rem' : '0',
            fontStyle: 'italic',
          }}
        >
          This question was not conclusively answered by the collected sources.
        </p>
      </div>

      {/* Expand hint */}
      <span
        style={{
          alignSelf: 'flex-end',
          fontSize: '0.6875rem',
          color: 'var(--text-subtle)',
          transition: 'opacity 0.2s ease',
          opacity: expanded ? 0 : 1,
        }}
      >
        {expanded ? '▲ less' : '▼ more'}
      </span>
    </article>
  );
}
