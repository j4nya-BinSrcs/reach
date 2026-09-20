import { useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import type { ResearchProgress } from '../../types/research';
import { STATUS_STEPS, STATUS_ORDER } from '../../lib/constants';

interface ResearchProgressProps {
  objective: string;
  progress: ResearchProgress | undefined;
  isFailed?: boolean;
}

export function ResearchProgress({ objective, progress, isFailed }: ResearchProgressProps) {
  const currentStatusIndex = progress
    ? STATUS_ORDER.indexOf(progress.status)
    : 0;

  const barRef = useRef<HTMLDivElement>(null);

  // Animate progress bar width
  useEffect(() => {
    if (barRef.current && progress) {
      barRef.current.style.width = `${progress.progress}%`;
    }
  }, [progress]);

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        gap: '3rem',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <p
          className="label"
          style={{ marginBottom: '1.25rem', color: 'var(--accent)' }}
        >
          {isFailed ? 'Research failed' : 'Researching'}
        </p>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            fontStyle: 'italic',
            maxWidth: '540px',
          }}
        >
          "{objective}"
        </p>
      </div>

      {/* Main progress block */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface)',
          overflow: 'hidden',
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
              background: isFailed
                ? 'var(--red)'
                : `linear-gradient(90deg, var(--accent), var(--accent-bright))`,
              transition: 'width 0.6s ease',
              boxShadow: isFailed ? 'none' : '0 0 8px var(--accent)',
            }}
          />
        </div>

        {/* Steps */}
        <ul
          style={{
            listStyle: 'none',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
          aria-label="Research progress steps"
        >
          {STATUS_STEPS.filter((s) => s.status !== 'complete').map((step, i) => {
            const stepIndex = STATUS_ORDER.indexOf(step.status);
            const isDone    = stepIndex < currentStatusIndex;
            const isActive  = stepIndex === currentStatusIndex && !isFailed;


            return (
              <li
                key={step.status + i}
                className={isDone || isActive ? 'animate-slide-in' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  animationDelay: `${i * 40}ms`,
                }}
                aria-label={`${step.label}: ${isDone ? 'complete' : isActive ? 'in progress' : 'pending'}`}
              >
                {/* Icon */}
                <span style={{ flexShrink: 0, lineHeight: 1 }}>
                  {isDone ? (
                    <CheckCircle2
                      size={15}
                      aria-hidden="true"
                      style={{ color: 'var(--green)' }}
                    />
                  ) : isActive ? (
                    isFailed ? (
                      <AlertCircle size={15} aria-hidden="true" style={{ color: 'var(--red)' }} />
                    ) : (
                      <Loader2
                        size={15}
                        aria-hidden="true"
                        style={{
                          color: 'var(--accent)',
                          animation: 'spin 1.2s linear infinite',
                        }}
                      />
                    )
                  ) : (
                    <Circle
                      size={15}
                      aria-hidden="true"
                      style={{ color: 'var(--text-subtle)' }}
                    />
                  )}
                </span>

                {/* Label */}
                <span
                  style={{
                    fontSize: '0.875rem',
                    color: isDone
                      ? 'var(--text-muted)'
                      : isActive
                      ? 'var(--text)'
                      : 'var(--text-subtle)',
                    fontWeight: isActive ? 500 : 400,
                    transition: 'color 0.3s ease',
                  }}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Live metrics */}
        {progress && (
          <div
            style={{
              borderTop: '1px solid var(--border)',
              padding: '0.875rem 1.25rem',
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {[
              { value: progress.queries_count,  label: 'queries' },
              { value: progress.results_count,  label: 'results discovered' },
              { value: progress.sources_count,  label: 'sources selected' },
            ].map(({ value, label }) =>
              value != null ? (
                <div key={label} className="animate-fade-fast">
                  <span
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {value}
                  </span>
                  <span
                    style={{
                      marginLeft: '0.375rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {label}
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Status message */}
        {progress?.message && (
          <div
            style={{
              borderTop: '1px solid var(--border)',
              padding: '0.625rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {!isFailed && <span className="pulse-dot" aria-hidden="true" />}
            <span
              className="mono-text"
              style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
            >
              {progress.message}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
