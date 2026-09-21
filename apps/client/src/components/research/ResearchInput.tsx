import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2, Paperclip, X } from 'lucide-react';

interface ResearchInputProps {
  onSubmit: (objective: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ResearchInput({ onSubmit, isLoading = false, error }: ResearchInputProps) {
  const [value, setValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    // Append attached file names as context for the backend objective text
    const fileContext =
      attachedFiles.length > 0
        ? `\n\n[Context files: ${attachedFiles.map((f) => f.name).join(', ')}]`
        : '';

    onSubmit(trimmed + fileContext);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setAttachedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...files.filter((f) => !names.has(f.name))];
    });
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  function removeFile(name: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  const canSubmit = value.trim().length > 0 && !isLoading;

  return (
    <div style={{ width: '100%', maxWidth: '680px' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            position: 'relative',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocusCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(232,185,49,0.45)';
            el.style.boxShadow = '0 0 0 3px rgba(232,185,49,0.08)';
          }}
          onBlurCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'var(--border-strong)';
            el.style.boxShadow = 'none';
          }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            tabIndex={-1}
            aria-hidden="true"
          />

          {/* Accessibility label */}
          <label
            htmlFor="research-objective"
            style={{
              position: 'absolute', width: '1px', height: '1px',
              overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap',
            }}
          >
            Research objective
          </label>

          {/* Textarea */}
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
              padding: '1.25rem 1.5rem 3.5rem',
              background: 'transparent',
              border: 'none',
              resize: 'none',
              color: 'var(--text)',
              fontSize: '1rem',
              lineHeight: 1.65,
              outline: 'none',
              fontFamily: 'inherit',
              minHeight: '120px',
              caretColor: 'var(--accent)',
            }}
          />

          {/* Attached files chips */}
          {attachedFiles.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.375rem',
                padding: '0 1rem 0.625rem',
              }}
            >
              {attachedFiles.map((file) => (
                <div
                  key={file.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.5rem 0.2rem 0.625rem',
                    borderRadius: '20px',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-elevated)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    maxWidth: '180px',
                  }}
                >
                  <Paperclip size={10} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--accent)' }} />
                  <span
                    style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    aria-label={`Remove ${file.name}`}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                      color: 'var(--text-subtle)', padding: '1px', flexShrink: 0,
                      borderRadius: '50%',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-subtle)'; }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom toolbar */}
          <div
            style={{
              position: attachedFiles.length > 0 ? 'relative' : 'absolute',
              bottom: 0, left: 0, right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.625rem 0.75rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            {/* Left: hint + attach button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span
                id="research-hint"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-subtle)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                ⌘ + Enter
              </span>

              {/* Attach file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach files"
                title="Attach files or documents"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-subtle)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease, color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(232,185,49,0.4)';
                  el.style.color = 'var(--accent)';
                  el.style.background = 'var(--accent-dim)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.color = 'var(--text-subtle)';
                  el.style.background = 'transparent';
                }}
              >
                <Paperclip size={12} aria-hidden="true" />
                {attachedFiles.length > 0 ? (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {attachedFiles.length}
                  </span>
                ) : (
                  <span>+ files</span>
                )}
              </button>
            </div>

            {/* Right: submit button */}
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.125rem',
                borderRadius: 'var(--radius-sm)',
                background: canSubmit ? 'var(--accent)' : 'var(--surface-elevated)',
                color: canSubmit ? '#0a0a0b' : 'var(--text-muted)',
                border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
                opacity: canSubmit ? 1 : 0.5,
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (canSubmit) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--accent-bright)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(232,185,49,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (canSubmit) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--accent)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }
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

        {error && (
          <p
            id="research-error"
            role="alert"
            style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--red)' }}
          >
            {error}
          </p>
        )}
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
