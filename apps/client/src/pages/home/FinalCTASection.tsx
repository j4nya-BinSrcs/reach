import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ResearchInput } from '../../components/research/ResearchInput';

interface FinalCTASectionProps {
  beginResearch: (objective: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function FinalCTASection({ beginResearch, isLoading, error }: FinalCTASectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      id="start-research"
      aria-labelledby="cta-heading"
      style={{
        padding: '8rem 1.5rem 7rem',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Background glow */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(232,185,49,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={ref}
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45 }}
          aria-hidden="true"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <motion.div
            style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }}
            animate={{ opacity: [1, 0.4, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Ready to start
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center' }}
        >
          <h2
            id="cta-heading"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.12,
              color: 'var(--text)',
              marginBottom: '1rem',
            }}
          >
            Have a question<br />worth{' '}
            <span style={{ color: 'var(--accent)' }}>exploring?</span>
          </h2>
          <p style={{
            fontSize: '1.0625rem',
            color: 'var(--text-muted)',
            lineHeight: 1.65,
            maxWidth: '480px',
            margin: '0 auto',
          }}>
            Start your research journey. REACH will plan the investigation, discover the sources, and synthesize the findings.
          </p>
        </motion.div>

        {/* Real research input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%' }}
        >
          <ResearchInput
            onSubmit={beginResearch}
            isLoading={isLoading}
            error={error}
          />
        </motion.div>

        {/* Trust note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.45, delay: 0.45 }}
          style={{
            fontSize: '0.8125rem',
            color: 'var(--text-subtle)',
            textAlign: 'center',
          }}
        >
          No account required for mock mode · Real research requires API keys
        </motion.p>
      </div>
    </section>
  );
}
