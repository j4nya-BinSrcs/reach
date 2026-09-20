import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useState } from 'react';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '56px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,11,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <div
          aria-hidden="true"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '7px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="2.5" fill="white" fillOpacity="0.9" />
            <circle cx="6" cy="6" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
          </svg>
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          REACH
        </span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Research, Exploration & Context Hub
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="User menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.5rem 0.25rem 0.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              {user.avatar}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text)', fontWeight: 500 }}>
              {user.name.split(' ')[0]}
            </span>
          </button>

          {showDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                onClick={() => setShowDropdown(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: '180px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-elevated)',
                  backdropFilter: 'blur(12px)',
                  overflow: 'hidden',
                  animation: 'fade-in-fast 0.15s ease both',
                }}
              >
                <div style={{ padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.email}</div>
                </div>
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 0.875rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                  }}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
