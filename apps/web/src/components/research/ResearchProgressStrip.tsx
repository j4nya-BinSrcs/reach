import { useEffect, useRef } from 'react';
import type { ResearchProgress } from '../../types/research';
import { STATUS_STEPS, STATUS_ORDER } from '../../lib/constants';

interface ResearchProgressStripProps {
  progress: ResearchProgress | undefined;
}

/** Compact live progress strip shown above the running workspace. */
export function ResearchProgressStrip({ progress }: ResearchProgressStripProps) {
  const currentIndex = progress ? STATUS_ORDER.indexOf(progress.status) : 0;
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current && progress) {
      barRef.current.style.width = `${progress.progress}%`;
    }
  }, [progress]);

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface)',
        overflow: 'hidden',
        marginBottom: '2rem',
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          height: '2px',
          background: 'var(--surface-elevated)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          ref={barRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${progress?.progress ?? 0}%`,
            background: 'linear-gradient(90deg, var(--accent), var(--accent-bright))',
            transition: 'width 0.6s ease',
            boxShadow: '0 0 8px var(--accent)',
          }}
        />
      </div>

      {/* Status message */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
        }}
      >
        <span className="pulse-dot" aria-hidden="true" />
        <span className="mono-text" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {progress?.message || 'Researching…'}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6875rem',
            color: 'var(--text-subtle)',
          }}
        >
          {progress?.progress ?? 0}%
        </span>
      </div>

      {/* Stage chips */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          padding: '0 1rem 0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {STATUS_STEPS.filter((s) => s.status !== 'complete').map((step) => {
          const stepIndex = STATUS_ORDER.indexOf(step.status);
          const isDone = stepIndex < currentIndex;
          const isActive = stepIndex === currentIndex;
          return (
            <span
              key={step.status}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.1875rem 0.5rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.6875rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: isActive ? 'var(--accent)' : isDone ? 'var(--text-muted)' : 'var(--text-subtle)',
                background: isActive ? 'var(--accent-dim)' : 'var(--surface-elevated)',
                border: `1px solid ${
                  isActive
                    ? 'rgba(79,142,247,0.25)'
                    : 'var(--border)'
                }`,
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {isDone ? '✓' : ''}
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}