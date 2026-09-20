interface SidebarProps {
  activeSection?: string;
  onNavigate?: (section: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'findings',  label: 'Findings' },
  { id: 'sources',   label: 'Sources' },
  { id: 'questions', label: 'Open Questions' },
];

export function Sidebar({ activeSection = 'overview', onNavigate }: SidebarProps) {
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onNavigate?.(id);
    }
  }

  return (
    <aside
      aria-label="Research sections"
      style={{
        width: '200px',
        flexShrink: 0,
        paddingTop: '2rem',
        paddingRight: '1.5rem',
        position: 'sticky',
        top: '52px',
        height: 'calc(100vh - 52px)',
        overflowY: 'auto',
      }}
    >
      <p
        className="label"
        style={{ marginBottom: '0.75rem', paddingLeft: '0.625rem' }}
      >
        Research
      </p>
      <nav>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => scrollTo(item.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.4375rem 0.625rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    background: isActive ? 'var(--surface-elevated)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease, background 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
