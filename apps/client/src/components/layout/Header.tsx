import { Link } from 'react-router-dom';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useState } from 'react';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const { user: demoUser } = useUser();
  const [showDropdown, setShowDropdown] = useState(false);

  const user = isAuthenticated && authUser ? { name: authUser.name, email: authUser.email, avatar: authUser.name.charAt(0).toUpperCase() } : demoUser;

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
        background: theme === 'dark' ? 'rgba(10,10,11,0.9)' : 'rgba(250,250,250,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, textDecoration: 'none' }}>
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
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: theme === 'dark' ? 'var(--surface)' : 'var(--surface-elevated)',
            color: theme === 'dark' ? 'var(--text-muted)' : 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease, background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
            (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'var(--surface-hover)' : 'var(--surface-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'var(--surface)' : 'var(--surface-elevated)';
            (e.currentTarget as HTMLElement).style.color = theme === 'dark' ? 'var(--text-muted)' : 'var(--text)';
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {isAuthenticated ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="User menu"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.25rem 0.5rem 0.25rem 0.25rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 600,
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
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowDropdown(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  minWidth: '180px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  background: theme === 'dark' ? 'var(--surface-elevated)' : 'var(--surface)',
                  backdropFilter: 'blur(12px)', overflow: 'hidden',
                  animation: 'fade-in-fast 0.15s ease both',
                }}>
                  <div style={{ padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => { logout(); setShowDropdown(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.625rem 0.875rem', border: 'none', background: 'transparent',
                      color: 'var(--text-muted)', fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link to="/signin" style={{ fontSize: '0.8125rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', transition: 'background 0.15s ease' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
