export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
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
  );
}
