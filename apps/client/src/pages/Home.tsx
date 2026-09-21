import { Header } from '../components/layout/Header';
import { LandingFooter } from '../components/layout/LandingFooter';
import { useResearch } from '../hooks/useResearch';

import { HeroSection } from './home/HeroSection';
import { ResearchJourneySection } from './home/ResearchJourneySection';
import { HowItWorksSection } from './home/HowItWorksSection';
import { ResearchIntelligenceSection } from './home/ResearchIntelligenceSection';
import { CapabilitiesSection } from './home/CapabilitiesSection';
import { WorkflowSection } from './home/WorkflowSection';
import { FinalCTASection } from './home/FinalCTASection';

export function Home() {
  const { beginResearch, isLoading, error } = useResearch();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Fixed decorative backgrounds */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-atmosphere" aria-hidden="true" />

      {/* ── Header (above background) ── */}
      <Header />

      {/* ── Page content ── */}
      <main
        id="main-content"
        style={{ flex: 1, position: 'relative', zIndex: 1 }}
      >
        <HeroSection beginResearch={beginResearch} isLoading={isLoading} error={error} />

        <div className="landing-divider" aria-hidden="true" />

        <ResearchJourneySection />
        <HowItWorksSection />
        <ResearchIntelligenceSection />
        <CapabilitiesSection />
        <WorkflowSection />

        <FinalCTASection beginResearch={beginResearch} isLoading={isLoading} error={error} />
      </main>

      <LandingFooter />
    </div>
  );
}
