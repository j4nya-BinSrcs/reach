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
          opacity: 0.18,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Soft radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(79,142,247,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top brand bar */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: '56px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2rem',
          background: 'rgba(10,10,11,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            aria-hidden="true"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.5" fill="white" fillOpacity="0.9" />
              <circle cx="6" cy="6" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
            }}
          >
            REACH
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginLeft: '0.25rem',
            }}
          >
            Research, Exploration, Aggregation & Context Hub
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
          padding: '7rem 1.5rem 4rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className="animate-fade-in"
          style={{
            width: '100%',
            maxWidth: '640px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2rem',
          }}
        >
          {/* Tagline */}
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4.5vw, 2.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              color: 'var(--text)',
              textAlign: 'center',
            }}
          >
            Turn a research objective into the knowledge needed
            <br />
            to understand it.
          </h1>

          {/* Query input */}
          <ResearchInput
            onSubmit={beginResearch}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
    </div>
  );
}
