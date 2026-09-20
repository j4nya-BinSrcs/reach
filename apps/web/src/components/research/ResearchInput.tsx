import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { EXAMPLE_PROMPTS } from '../../lib/constants';

interface ResearchInputProps {
  onSubmit: (objective: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ResearchInput({ onSubmit, isLoading = false, error }: ResearchInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  }

  function applyExample(prompt: string) {
    setValue(prompt);
    textareaRef.current?.focus();
  }

  const canSubmit = value.trim().length > 0 && !isLoading;

  return (
    <div style={{ width: '100%', maxWidth: '680px' }}>
      <form onSubmit={handleSubmit} noValidate>
        {/* Input box */}
        <div
          style={{
            position: 'relative',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            transition: 'border-color 0.15s ease',
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,142,247,0.4)';
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
          }}
        >
          <label
            htmlFor="research-objective"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
            }}
          >
            Research objective
          </label>
          <textarea
            id="research-objective"
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What are you trying to understand?"
            disabled={isLoading}
            rows={3}
            aria-describedby={error ? 'research-error' : 'research-hint'}
            style={{
              width: '100%',
              padding: '1.125rem 1.25rem 3.5rem',
              background: 'transparent',
              border: 'none',
              resize: 'none',
              color: 'var(--text)',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              outline: 'none',
              fontFamily: 'inherit',
              minHeight: '120px',
              caretColor: 'var(--accent)',
            }}
          />

          {/* Footer bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.625rem 0.75rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              id="research-hint"
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-subtle)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              ⌘ + Enter to search
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: canSubmit ? 'var(--accent)' : 'var(--surface-elevated)',
                color: canSubmit ? 'white' : 'var(--text-muted)',
                border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontSize: '0.8125rem',
                fontWeight: 500,
                transition: 'background 0.15s ease, transform 0.1s ease, opacity 0.15s ease',
                opacity: canSubmit ? 1 : 0.5,
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (canSubmit) (e.currentTarget as HTMLElement).style.background = 'var(--accent-bright)';
              }}
              onMouseLeave={(e) => {
                if (canSubmit) (e.currentTarget as HTMLElement).style.background = 'var(--accent)';
              }}
              onMouseDown={(e) => {
                if (canSubmit) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
              aria-label="Begin research"
            >
              {isLoading ? (
                <Loader2 size={14} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ArrowRight size={14} aria-hidden="true" />
              )}
              {isLoading ? 'Starting…' : 'Begin Research'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            id="research-error"
            role="alert"
            style={{
              marginTop: '0.625rem',
              fontSize: '0.8125rem',
              color: 'var(--red)',
            }}
          >
            {error}
          </p>
        )}
      </form>

      {/* Example prompts */}
      <div style={{ marginTop: '1.75rem' }}>
        <p
          className="label"
          style={{ marginBottom: '0.75rem' }}
        >
          Example objectives
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => applyExample(prompt)}
              style={{
                textAlign: 'left',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                cursor: 'pointer',
                transition: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = 'var(--text)';
                el.style.borderColor = 'var(--border-strong)';
                el.style.background = 'var(--surface)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = 'var(--text-muted)';
                el.style.borderColor = 'var(--border)';
                el.style.background = 'transparent';
              }}
              aria-label={`Use example: ${prompt.slice(0, 60)}…`}
            >
              {prompt.length > 100 ? prompt.slice(0, 100) + '…' : prompt}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
