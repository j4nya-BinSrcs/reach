import { useState } from 'react';
import type { Source } from '../../types/source';
import { formatSourceIndex } from '../../lib/utils';

interface EvidenceReferenceProps {
  sourceIndex: number;
  source: Source | undefined;
}

export function EvidenceReference({ sourceIndex, source }: EvidenceReferenceProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    // Scroll to source card
    const el = document.getElementById(`source-${source?.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '2px solid var(--accent)';
      setTimeout(() => { el.style.outline = 'none'; }, 1500);
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={source ? `Source ${sourceIndex + 1}: ${source.title}` : `Source ${sourceIndex + 1}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.125rem 0.375rem',
          borderRadius: 'var(--radius-xs)',
          background: 'var(--accent-dim)',
          border: '1px solid rgba(79,142,247,0.2)',
          color: 'var(--accent)',
          fontSize: '0.6875rem',
          fontWeight: 600,
          fontFamily: 'JetBrains Mono, monospace',
          cursor: 'pointer',
          transition: 'background 0.15s ease, border-color 0.15s ease',
          lineHeight: 1,
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(79,142,247,0.2)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,142,247,0.4)';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,142,247,0.2)';
        }}
      >
        {formatSourceIndex(sourceIndex)}
      </button>

      {/* Tooltip */}
      {showTooltip && source && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.75rem',
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text)',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {source.title}
          </span>
          <span
            style={{
              display: 'block',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              marginTop: '0.125rem',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {source.domain}
          </span>
        </span>
      )}
    </span>
  );
}
