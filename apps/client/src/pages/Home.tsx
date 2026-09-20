import { ResearchInput } from '../components/research/ResearchInput';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { useResearch } from '../hooks/useResearch';
import { useState, useEffect } from 'react';

export function Home() {
  const { beginResearch, isLoading, error } = useResearch();
  const [gridActive, setGridActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = () => {
      setGridActive(true);
      const timeout = setTimeout(() => setGridActive(false), 500);
      return () => clearTimeout(timeout);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      {/* Grid background with hover animations */}
      <div className="bg-grid" aria-hidden="true" />
      <div
        className={`grid-hover-zone ${gridActive ? 'active' : ''}`}
        aria-hidden="true"
      />

      {/* Persistent header */}
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

      {/* Persistent footer */}
      <Footer />
    </div>
  );
}
