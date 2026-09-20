import { ResearchInput } from '../components/research/ResearchInput';
import { Header } from '../components/layout/Header';
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
        transition: 'background 0.4s ease',
      }}
    >
      {/* Ambient background */}
      <div className="bg-atmosphere" aria-hidden="true" />

      {/* Header */}
      <Header />

      {/* Main hero */}
      <main
        id="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '7rem 1.5rem 3rem',
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
            alignItems: 'center',
            gap: '2.5rem',
          }}
        >
          {/* Brand mark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              opacity: 0.6,
            }}
            aria-hidden="true"
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse-dot 3s ease-in-out infinite',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="2.5" fill="white" fillOpacity="0.9" />
                <circle cx="6" cy="6" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Research Exploration, Aggregation & Context Hub
            </span>
          </div>

          {/* Tagline */}
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
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

      {/* Minimal footer */}
      <footer
        style={{
          position: 'relative',
          zIndex: 1,
          borderTop: '1px solid var(--border)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          © {new Date().getFullYear()} REACH
        </span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a
            href="#"
            style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-subtle)'; }}
          >
            Docs
          </a>
          <a
            href="#"
            style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-subtle)'; }}
          >
            API
          </a>
          <a
            href="#"
            style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-subtle)'; }}
          >
            Status
          </a>
        </div>
      </footer>
    </div>
  );
}
