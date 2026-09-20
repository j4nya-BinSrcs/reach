import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useResearch } from '../hooks/useResearch';
import { ArrowRight } from 'lucide-react';

export function SignIn() {
  const { login, error: authError, loading } = useAuth();
  const { error: researchError, isLoading: researchLoading } = useResearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const isLoading = loading || researchLoading;
  const error = authError || researchError || localError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');
    if (!email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch {}
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      <div className="bg-grid" aria-hidden="true" />
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.5" fill="white" fillOpacity="0.9" />
              <circle cx="6" cy="6" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
            </svg>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            REACH
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Sign in to your account
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="signin-email" style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text)' }}>
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.9375rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,185,49,0.4)'; }}
              onBlurCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="signin-password" style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text)' }}>
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-strong)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.9375rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
              onFocusCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,185,49,0.4)'; }}
              onBlurCapture={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
            />
          </div>

          {error && (
            <p role="alert" style={{ fontSize: '0.8125rem', color: 'var(--red)', textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.9375rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              opacity: isLoading ? 0.6 : 1,
              transition: 'background 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'var(--accent-bright)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
            onMouseDown={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
          >
            {isLoading ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> : <ArrowRight size={16} />}
            Sign in
          </button>
        </form>

        {/* Footer */}
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Don't have an account?{' '}
          <a
            href="/signup"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-bright)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
