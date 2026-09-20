import { Link } from 'react-router-dom';

export function TopBar() {
  return (
    <header
      style={{
        height: '52px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            textDecoration: 'none',
          }}
          aria-label="REACH — Home"
        >
          {/* Wordmark icon */}
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
              flexShrink: 0,
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
        </Link>

        {/* Right side */}
        <nav aria-label="Site navigation">
          <Link
            to="/"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.375rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              transition: 'color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-elevated)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            New research
          </Link>
        </nav>
      </div>
    </header>
  );
}
