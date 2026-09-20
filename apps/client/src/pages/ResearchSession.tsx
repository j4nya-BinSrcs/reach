import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResearchSession } from '../hooks/useResearchSession';
import { ResearchHeader } from '../components/research/ResearchHeader';
import { ResearchProgress } from '../components/research/ResearchProgress';
import { ResearchReportView } from '../components/research/ResearchReportView';
import { FindingCard } from '../components/research/FindingCard';
import { ResearchGapCard } from '../components/research/ResearchGapCard';
import { SourceComparisonPanel } from '../components/research/SourceComparisonPanel';
import { SourceList } from '../components/research/SourceList';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { CardListSkeleton, ReportSkeleton } from '../components/research/WorkspaceSkeleton';

type Tab = 'report' | 'findings' | 'workspace';

const TABS: { id: Tab; label: string }[] = [
  { id: 'report', label: 'Research Report' },
  { id: 'findings', label: 'Findings & Open Questions' },
  { id: 'workspace', label: 'Workspace' },
];

function TabBar({ active, onSwitch }: { active: Tab; onSwitch: (t: Tab) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '1.5rem',
      }}
    >
      {TABS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSwitch(id)}
            style={{
              padding: '0.75rem 1.125rem',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              background: isActive ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ResearchSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('report');
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [notesContent, setNotesContent] = useState('');

  // Load notes from localStorage when session ID changes
  useEffect(() => {
    if (id) {
      const stored = localStorage.getItem(`reach-notes-${id}`);
      if (stored) {
        setNotesContent(stored);
      }
    }
  }, [id]);

  const saveNotes = useCallback((content: string) => {
    if (id) {
      localStorage.setItem(`reach-notes-${id}`, content);
      setNotesContent(content);
    }
  }, [id]);

  const handleCloseNotes = useCallback(() => {
    setShowNotesPopup(false);
  }, []);

  const handleSaveAndClose = useCallback(() => {
    saveNotes(notesContent);
    setShowNotesPopup(false);
  }, [notesContent, saveNotes]);

  const {
    progress,
    session,
    isLoadingSession,
    isComplete,
    isFailed,
    error,
  } = useResearchSession(id ?? '');

  useEffect(() => {
    if (!id) navigate('/');
  }, [id, navigate]);

  const isRunning = !isComplete && !isFailed;
  const hasLiveData = !!session && session.sources.length > 0;

  if (isRunning && !hasLiveData) {
    return <ResearchProgress objective={id ?? ''} progress={progress} isFailed={isFailed} />;
  }

  if (isFailed) {
    return <ResearchProgress objective={id ?? ''} progress={progress} isFailed={true} />;
  }

  if (isLoadingSession || !session) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '0 1.5rem' }}>
          <CardListSkeleton count={3} />
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <ErrorState
          title="Failed to load research session"
          message={error instanceof Error ? error.message : 'An unexpected error occurred.'}
        />
        <Footer />
      </div>
    );
  }

  const savedSources = session.sources.filter(s => s.saved);

  const leftContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', minHeight: 0 }}>
      <ResearchHeader session={session} running={isRunning} />
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>
          Sources ({session.sources.length})
        </p>
        {session.sources.length > 0 ? (
          <SourceList sources={session.sources} sessionId={session.id} />
        ) : (
          <CardListSkeleton count={3} />
        )}
      </div>
    </div>
  );

  const rightContent = (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
      <TabBar active={activeTab} onSwitch={setActiveTab} />

      {/* Report Tab */}
      {activeTab === 'report' && (
        <section aria-label="Research report" style={{ overflowY: 'auto', paddingRight: '0.5rem', flex: 1, minHeight: 0 }}>
          {session.report ? (
            <ResearchReportView report={session.report} />
          ) : (
            <ReportSkeleton />
          )}
        </section>
      )}

      {/* Findings Tab */}
      {activeTab === 'findings' && (
        <section aria-label="Findings and open questions" style={{ overflowY: 'auto', paddingRight: '0.5rem', flex: 1, minHeight: 0 }}>
          {session.findings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {session.findings.map((finding, i) => (
                <FindingCard key={finding.id} finding={finding} sources={session.sources} index={i} />
              ))}
            </div>
          )}
          {session.gaps.length > 0 && (
            <>
              <div
                style={{
                  height: '1px',
                  background: 'var(--border)',
                  margin: '1.5rem 0',
                }}
              />
              <p
                className="label"
                style={{ marginBottom: '0.75rem', color: 'var(--amber)' }}
              >
                Open Questions ({session.gaps.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {session.gaps.map((gap, i) => (
                  <ResearchGapCard key={gap.id} gap={gap} index={i} />
                ))}
              </div>
            </>
          )}
          {session.findings.length === 0 && session.gaps.length === 0 && (
            <EmptyState title="No findings yet" description="Findings and open questions will appear here as the research progresses." />
          )}
        </section>
      )}

      {/* Workspace Tab */}
      {activeTab === 'workspace' && (
        <section aria-label="Workspace" style={{ overflowY: 'auto', paddingRight: '0.5rem', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Workspace header with notes button on right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>Workspace</h2>
            <button
              onClick={() => {
                setShowNotesPopup(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              Session Notes
            </button>
          </div>

          {/* Saved Sources */}
          {savedSources.length > 0 && (
            <div style={{ flexShrink: 0, overflowY: 'auto', maxHeight: '45vh' }}>
              <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Saved Sources ({savedSources.length})</p>
              <SourceList sources={savedSources} sessionId={session.id} />
            </div>
          )}

          {/* Comparison moved to workspace */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <p className="label" style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Source Comparison</p>
            {session.sources.length >= 2 ? (
              <SourceComparisonPanel
                sessionId={session.id}
                sources={session.sources}
                enabled={true}
              />
            ) : (
              <EmptyState title="Need 2+ sources" description="Compare sources to find similarities, differences, and contradictions." />
            )}
          </div>
        </section>
      )}
    </div>
  );

  return (
    <div
      style={{
        height: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div className="bg-grid" aria-hidden="true" />

      {/* Persistent header */}
      <Header />

      {/* Main content area - fills remaining viewport */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          padding: '5.5rem 1.5rem 0',
          gap: '2rem',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left partition: 40% */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', minHeight: 0 }}>
          {leftContent}
        </div>
        {/* Right partition: 60% */}
        <div style={{ flex: '0 0 60%', minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0 }}>
          {rightContent}
        </div>
      </div>

      {/* Persistent footer */}
      <Footer />

      {/* Notes Popup */}
      {showNotesPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            animation: 'fade-in-fast 0.15s ease both',
          }}
          onClick={() => setShowNotesPopup(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fade-in 0.2s ease both',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>Session Notes</h3>
              <button
                onClick={() => setShowNotesPopup(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <textarea
                placeholder="Add notes about this research session..."
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '300px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleCloseNotes}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text)', fontSize: '0.8125rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                Close
              </button>
              <button
                onClick={handleSaveAndClose}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid transparent', background: 'var(--accent)',
                  color: 'white', fontSize: '0.8125rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-bright)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
