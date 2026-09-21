import { Link } from 'react-router-dom';

interface LinkGroup {
  label: string;
  links: { text: string; to: string; external?: boolean }[];
}

const LINK_GROUPS: LinkGroup[] = [
  {
    label: 'Explore',
    links: [
      { text: 'Home', to: '/' },
      { text: 'How It Works', to: '/#how-it-works' },
      { text: 'Research Journey', to: '/#research-journey' },
    ],
  },
  {
    label: 'Account',
    links: [
      { text: 'Sign In', to: '/signin' },
      { text: 'Sign Up', to: '/signup' },
    ],
  },
  {
    label: 'Product',
    links: [
      { text: 'Research', to: '/signin' },
    ],
  },
];

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Main footer body */}
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '4rem 1.5rem 3rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '3rem',
        }}
      >
        {/* Brand column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: 'span 1' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '26px', height: '26px', borderRadius: '7px',
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="2.5" fill="white" fillOpacity="0.9" />
                <circle cx="6" cy="6" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              REACH
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '220px' }}>
            Research Exploration, Aggregation &amp; Context Hub. Turn a research objective into the knowledge needed to understand it.
          </p>
        </div>

        {/* Link groups */}
        {LINK_GROUPS.map((group) => (
          <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              {group.label}
            </span>
            <nav aria-label={`${group.label} links`}>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {group.links.map((link) => (
                  <li key={link.text}>
                    <Link
                      to={link.to}
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-subtle)',
                        textDecoration: 'none',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-subtle)'; }}
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        ))}
      </div>

      {/* Footer bottom bar */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
          © {year} REACH · Research Exploration, Aggregation &amp; Context Hub
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6875rem',
            color: 'var(--text-subtle)',
            letterSpacing: '0.06em',
          }}
        >
          On-demand research intelligence
        </span>
      </div>
    </footer>
  );
}
