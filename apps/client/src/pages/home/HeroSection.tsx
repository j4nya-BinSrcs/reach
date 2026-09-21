import { useRef } from 'react';
import { motion } from 'framer-motion';
import MagicRings from '../../components/common/MagicRings';
import { ResearchInput } from '../../components/research/ResearchInput';

interface HeroSectionProps {
  beginResearch: (objective: string) => void;
  isLoading: boolean;
  error: string | null;
}

const HEADLINE_WORDS = [
  { word: 'Turn', accent: false },
  { word: 'a', accent: false },
  { word: 'research', accent: false },
  { word: 'objective', accent: false },
  { word: 'into', accent: false },
  { word: 'the', accent: false },
  { word: 'knowledge', accent: true },
  { word: 'needed', accent: false },
  { word: 'to', accent: false },
  { word: 'understand', accent: false },
  { word: 'it.', accent: false },
];

export function HeroSection({ beginResearch, isLoading, error }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-labelledby="hero-heading"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8rem 1.5rem 5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* MagicRings scoped to Hero Section */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <MagicRings
          color="#e8b931"
          colorTwo="#c8930a"
          ringCount={6}
          speed={0.55}
          attenuation={9}
          lineThickness={1.8}
          baseRadius={0.28}
          radiusStep={0.11}
          scaleRate={0.08}
          opacity={0.38}
          blur={0}
          noiseAmount={0.04}
          rotation={0}
          ringGap={1.45}
          fadeIn={0.65}
          fadeOut={0.52}
          followMouse={true}
          mouseInfluence={0.14}
          hoverScale={1.06}
          parallax={0.03}
          clickBurst={true}
          alphaMode="luminance"
          trackGlobal={false} // Only track mouse when hovering the hero
        />
      </div>

      {/* Central radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(232,185,49,0.07) 0%, transparent 68%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          aria-hidden="true"
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}
        >
          <motion.div
            style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2.5" fill="white" fillOpacity="0.9" />
              <circle cx="6" cy="6" r="5" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
            </svg>
          </motion.div>
          <span style={{
            fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            Research Exploration, Aggregation &amp; Context Hub
          </span>
        </motion.div>

        {/* Animated word-reveal headline */}
        <h1
          id="hero-heading"
          style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 3.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.12,
            color: 'var(--text)',
            textAlign: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0 0.28em',
          }}
        >
          {HEADLINE_WORDS.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.055, ease: [0.22, 1, 0.36, 1] }}
              style={{ color: w.accent ? 'var(--accent)' : 'var(--text)', display: 'inline-block' }}
            >
              {w.word}
            </motion.span>
          ))}
        </h1>

        {/* Sub-tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85 }}
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.65,
            maxWidth: '520px',
          }}
        >
          REACH plans the investigation, searches external sources, synthesizes cross-source
          findings, and surfaces open questions — all organized around your objective.
        </motion.p>

        {/* Real research input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%' }}
        >
          <ResearchInput onSubmit={beginResearch} isLoading={isLoading} error={error} />
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          aria-hidden="true"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}
        >
          <span style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>
            Explore how it works
          </span>
          <motion.span
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ color: 'var(--text-subtle)' }}
          >
            ↓
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}
