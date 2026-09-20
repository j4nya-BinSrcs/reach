import React, { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

const SECTIONS = ['overview', 'findings', 'sources', 'questions'];

export function AppShell({ children }: AppShellProps) {
  const [activeSection, setActiveSection] = useState('overview');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Observe section visibility for active nav state
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [children]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TopBar />
      <div
        style={{
          display: 'flex',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          padding: '0 1.5rem',
        }}
      >
        {/* Sidebar — hidden below 1024px */}
        <div
          className="sidebar-wrapper"
          style={{ display: 'none' }}
          aria-hidden="true"
        >
          <Sidebar
            activeSection={activeSection}
            onNavigate={setActiveSection}
          />
        </div>

        {/* Main content */}
        <main
          id="main-content"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '2rem 0 4rem',
            maxWidth: '860px',
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .sidebar-wrapper {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
