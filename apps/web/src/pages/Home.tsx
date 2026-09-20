import { ResearchInput } from '../components/research/ResearchInput';
import { useResearch } from '../hooks/useResearch';

export function Home() {
  const { beginResearch, isLoading, error } = useResearch();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="grid-texture"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0.3,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top bar */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: '52px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2rem',
          background: 'rgba(10,10,11,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {/* Logo mark */}
          <div
            aria-hidden="true"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.5" fill="white" fillOpacity="0.9" />
              <circle cx="6" cy="6" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
            }}
          >
            REACH
          </span>
        </div>
      </header>

      {/* Main hero */}
      <main
        id="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8rem 1.5rem 4rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className="animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '680px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2.5rem',
          }}
        >
          {/* Wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  background: 'var(--accent-dim)',
                  border: '1px solid rgba(79,142,247,0.2)',
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-xs)',
                }}
              >
                Research Intelligence
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.875rem, 5vw, 2.75rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                color: 'var(--text)',
              }}
            >
              Turn a research objective<br />
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                into the knowledge needed
              </span>
              <br />
              to understand it.
            </h1>

            <p
              style={{
                fontSize: '1rem',
                color: 'var(--text-muted)',
                lineHeight: 1.7,
                maxWidth: '520px',
              }}
            >
              REACH searches across the technical ecosystem, filters noise,
              analyzes sources, and builds a focused, traceable research workspace —
              tailored to your exact objective.
            </p>
          </div>

          {/* Input */}
          <ResearchInput
            onSubmit={beginResearch}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>

      {/* How it works — compact */}
      <section
        aria-label="How REACH works"
        style={{
          borderTop: '1px solid var(--border)',
          padding: '3rem 1.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          <p className="label" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            How it works
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.5rem',
            }}
          >
            {[
              { step: '01', label: 'Research objective' },
              { step: '02', label: 'Query generation' },
              { step: '03', label: 'Source discovery' },
              { step: '04', label: 'Relevance filtering' },
              { step: '05', label: 'Source analysis' },
              { step: '06', label: 'Knowledge synthesis' },
            ].map(({ step, label }, i) => (
              <div
                key={step}
                className="animate-fade-in"
                style={{
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.625rem',
                    color: 'var(--accent)',
                    marginBottom: '0.375rem',
                    fontWeight: 600,
                  }}
                >
                  {step}
                </span>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span
          className="mono-text"
          style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}
        >
          REACH — Research Exploration, Aggregation & Context Hub
        </span>
        <span
          style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}
        >
          LJ University Hackathon 2026
        </span>
      </footer>
    </div>
  );
}
