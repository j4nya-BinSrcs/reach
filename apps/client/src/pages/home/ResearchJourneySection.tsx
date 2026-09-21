import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Stepper, { Step } from '../../components/common/Stepper';

// ── Inline animated SVG illustrations per step ──────────────────────────────

function IllustrationQuestion() {
  return (
    <svg viewBox="0 0 260 140" style={{ width: '100%', maxWidth: 300 }} aria-hidden="true">
      {/* Input box */}
      <motion.rect
        x="20" y="30" width="220" height="54" rx="8"
        fill="none" stroke="rgba(232,185,49,0.35)" strokeWidth="1.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      {/* Blinking cursor */}
      <motion.rect
        x="38" y="50" width="2" height="18" rx="1" fill="rgba(232,185,49,0.9)"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      {/* Typing text lines */}
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x="46" y={50 + i * 8} width={80 + i * 20} height="5" rx="2"
          fill="rgba(232,185,49,0.15)"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.6 + i * 0.2 }}
        />
      ))}
      {/* Pulsing send arrow */}
      <motion.g
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        transform="translate(220,57)"
      >
        <circle r="12" fill="rgba(232,185,49,0.2)" stroke="rgba(232,185,49,0.5)" strokeWidth="1" />
        <path d="M-4,0 L4,0 M2,-3 L5,0 L2,3" stroke="rgba(232,185,49,0.9)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </motion.g>
      {/* Query suggestions */}
      {['How does X relate to Y?', 'What evidence exists for Z?'].map((q, i) => (
        <motion.g key={q} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 + i * 0.3 }}>
          <rect x="20" y={100 + i * 20} width="220" height="14" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
          <rect x="28" y={105 + i * 20} width={80 + i * 30} height="4" rx="2" fill="rgba(255,255,255,0.1)" />
        </motion.g>
      ))}
    </svg>
  );
}

function IllustrationExplore() {
  const nodes = [
    { cx: 130, cy: 70, r: 10, delay: 0 },
    { cx: 60,  cy: 40, r:  6, delay: 0.1 },
    { cx: 200, cy: 40, r:  6, delay: 0.15 },
    { cx: 40,  cy: 100, r: 5, delay: 0.2 },
    { cx: 220, cy: 100, r: 5, delay: 0.25 },
    { cx: 90,  cy: 120, r: 5, delay: 0.3 },
    { cx: 175, cy: 120, r: 5, delay: 0.35 },
  ];
  const lines = [
    [130,70, 60,40], [130,70, 200,40], [130,70, 40,100],
    [130,70, 220,100], [130,70, 90,120], [130,70, 175,120],
    [60,40, 40,100], [200,40, 220,100],
  ];
  return (
    <svg viewBox="0 0 260 140" style={{ width: '100%', maxWidth: 300 }} aria-hidden="true">
      {lines.map(([x1,y1,x2,y2], i) => (
        <motion.line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(232,185,49,0.25)" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: i * 0.08 }} />
      ))}
      {nodes.map((n, i) => (
        <motion.circle key={i} cx={n.cx} cy={n.cy} r={n.r}
          fill={i === 0 ? 'rgba(232,185,49,0.7)' : 'rgba(232,185,49,0.35)'}
          initial={{ scale: 0 }} animate={{ scale: 1, opacity: [0.5, 1, 0.5] }}
          transition={{ scale: { duration: 0.3, delay: n.delay }, opacity: { duration: 2.5, repeat: Infinity, delay: n.delay } }} />
      ))}
      {/* Radar ring */}
      <motion.circle cx="130" cy="70" r="50" fill="none" stroke="rgba(232,185,49,0.15)" strokeWidth="1"
        animate={{ r: [30, 70, 30], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }} />
    </svg>
  );
}

function IllustrationSources() {
  const cards = [
    { x: 10,  y: 10, label: 'Article' },
    { x: 100, y: 10, label: 'Paper' },
    { x: 160, y: 40, label: 'Doc' },
    { x: 10,  y: 70, label: 'Repo' },
    { x: 90,  y: 75, label: 'Tool' },
    { x: 170, y: 90, label: 'Ref' },
  ];
  return (
    <svg viewBox="0 0 260 140" style={{ width: '100%', maxWidth: 300 }} aria-hidden="true">
      {cards.map((c, i) => (
        <motion.g key={c.label}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.35 }}>
          <rect x={c.x} y={c.y} width="72" height="44" rx="6"
            fill="rgba(255,255,255,0.03)" stroke="rgba(232,185,49,0.2)" strokeWidth="1" />
          <rect x={c.x + 8} y={c.y + 10} width="36" height="4" rx="2" fill="rgba(232,185,49,0.3)" />
          <rect x={c.x + 8} y={c.y + 19} width="52" height="3" rx="1.5" fill="rgba(255,255,255,0.08)" />
          <rect x={c.x + 8} y={c.y + 26} width="42" height="3" rx="1.5" fill="rgba(255,255,255,0.06)" />
          <text x={c.x + 8} y={c.y + 38} fontSize="6" fill="rgba(232,185,49,0.5)" fontFamily="JetBrains Mono, monospace">
            {c.label}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

function IllustrationEvidence() {
  return (
    <svg viewBox="0 0 260 140" style={{ width: '100%', maxWidth: 300 }} aria-hidden="true">
      {/* Left source */}
      <rect x="10" y="40" width="70" height="60" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {[0,1,2].map(i => <rect key={i} x="18" y={52+i*12} width={42} height="4" rx="2" fill="rgba(255,255,255,0.08)" />)}
      {/* Right source */}
      <rect x="180" y="40" width="70" height="60" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {[0,1,2].map(i => <rect key={i} x="188" y={52+i*12} width={42} height="4" rx="2" fill="rgba(255,255,255,0.08)" />)}
      {/* Animated connecting flows */}
      <motion.path d="M80,70 C115,70 115,70 150,70" fill="none"
        stroke="rgba(232,185,49,0.7)" strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }} />
      <motion.path d="M80,70 C115,50 115,50 150,70" fill="none"
        stroke="rgba(232,185,49,0.3)" strokeWidth="1" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }} />
      {/* Central evidence node */}
      <motion.circle cx="130" cy="70" r="20" fill="rgba(232,185,49,0.12)"
        stroke="rgba(232,185,49,0.6)" strokeWidth="1.5"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }} />
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
        <text x="130" y="68" textAnchor="middle" fontSize="7" fill="rgba(232,185,49,0.9)" fontWeight="600" fontFamily="DM Sans,sans-serif">Evidence</text>
        <motion.path d="M118,74 L123,79 L130,71" stroke="rgba(232,185,49,0.9)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 1.3 }} />
      </motion.g>
    </svg>
  );
}

function IllustrationContext() {
  const groups = [
    { x: 20,  items: [80, 60, 90], label: 'Cluster A' },
    { x: 145, items: [70, 85],     label: 'Cluster B' },
  ];
  return (
    <svg viewBox="0 0 260 140" style={{ width: '100%', maxWidth: 300 }} aria-hidden="true">
      {groups.map((g, gi) => (
        <motion.g key={g.label} initial={{ opacity: 0, x: gi === 0 ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.2 }}>
          <rect x={g.x} y="18" width="100" height={110} rx="8"
            fill="rgba(255,255,255,0.02)" stroke="rgba(232,185,49,0.2)" strokeWidth="1" />
          <text x={g.x + 8} y="32" fontSize="7" fill="rgba(232,185,49,0.5)" fontFamily="JetBrains Mono,monospace">{g.label}</text>
          {g.items.map((w, i) => (
            <motion.rect key={i} x={g.x + 8} y={38 + i * 18} height="8" rx="3"
              fill="rgba(232,185,49,0.15)" stroke="rgba(232,185,49,0.12)" strokeWidth="0.8"
              initial={{ width: 0 }} animate={{ width: w }} transition={{ delay: gi * 0.2 + i * 0.12, duration: 0.5 }} />
          ))}
        </motion.g>
      ))}
      {/* Connecting line between groups */}
      <motion.line x1="120" y1="73" x2="145" y2="73" stroke="rgba(232,185,49,0.4)" strokeWidth="1.5" strokeDasharray="3 2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.4 }} />
    </svg>
  );
}

function IllustrationUnderstanding() {
  return (
    <svg viewBox="0 0 260 140" style={{ width: '100%', maxWidth: 300 }} aria-hidden="true">
      {/* Outer rings */}
      {[55, 42, 30].map((r, i) => (
        <motion.circle key={r} cx="130" cy="70" r={r}
          fill="none" stroke="rgba(232,185,49,0.15)" strokeWidth="1"
          animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.03, 1] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }} />
      ))}
      {/* Center */}
      <circle cx="130" cy="70" r="18" fill="rgba(232,185,49,0.15)" stroke="rgba(232,185,49,0.6)" strokeWidth="1.5" />
      <circle cx="130" cy="70" r="7" fill="rgba(232,185,49,0.8)" />
      {/* Labels at ring positions */}
      {[
        { x: 130, y: 7, label: 'Findings' },
        { x: 198, y: 40, label: 'Sources' },
        { x: 198, y: 105, label: 'Report' },
        { x: 62, y: 105, label: 'Gaps' },
        { x: 62, y: 40, label: 'Context' },
      ].map((item, i) => (
        <motion.text key={item.label} x={item.x} y={item.y} textAnchor="middle"
          fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="DM Sans,sans-serif"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }}>
          {item.label}
        </motion.text>
      ))}
      {/* Connecting spokes */}
      {[[130,16],[190,46],[190,98],[70,98],[70,46]].map(([x,y], i) => (
        <motion.line key={i} x1="130" y1="70" x2={x} y2={y}
          stroke="rgba(232,185,49,0.2)" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }} />
      ))}
    </svg>
  );
}

const STEPS = [
  {
    step: '01', title: 'Question',
    description: 'You begin with a research objective — not just a query, but a genuine intent to explore and understand. The more precise, the better.',
    Illustration: IllustrationQuestion,
  },
  {
    step: '02', title: 'Explore',
    description: 'REACH decomposes the objective into dimensions, generating up to 7 targeted search queries to systematically cover the research space.',
    Illustration: IllustrationExplore,
  },
  {
    step: '03', title: 'Sources',
    description: 'Across papers, GitHub repositories, documentation, tools, and more — candidates are discovered, deduplicated, classified, and ranked.',
    Illustration: IllustrationSources,
  },
  {
    step: '04', title: 'Evidence',
    description: 'Selected sources are fetched and analyzed with schema-validated structured output. A bad source never kills a session — failure tolerance is built in.',
    Illustration: IllustrationEvidence,
  },
  {
    step: '05', title: 'Context',
    description: 'Findings are synthesized across sources with full provenance. Similarities, differences, and contradictions are surfaced explicitly.',
    Illustration: IllustrationContext,
  },
  {
    step: '06', title: 'Understanding',
    description: 'You receive a compact research workspace — findings, open questions, a full report, and direct links back to every original source.',
    Illustration: IllustrationUnderstanding,
  },
];

export function ResearchJourneySection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' });

  return (
    <section id="research-journey" aria-labelledby="journey-heading"
      style={{ padding: '6rem 1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <motion.div ref={headerRef}
        initial={{ opacity: 0, y: 24 }} animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div className="section-label" aria-hidden="true">The Research Journey</div>
        <h2 id="journey-heading" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1rem' }}>
          From question to understanding
        </h2>
        <p style={{ fontSize: '1.0625rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.65 }}>
          A bounded, structured process — not an infinite crawler. Explore each step of the pipeline.
        </p>
      </motion.div>

      {/* Stepper Card */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <Stepper
          initialStep={1}
          backButtonText="Previous"
          nextButtonText="Next Step"
          onFinalStepCompleted={() => {
            // Scroll to the next section when done exploring the steps
            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {STEPS.map((step) => {
            const { Illustration } = step;
            return (
              <Step key={step.step}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '3rem',
                  alignItems: 'center',
                }}>
                  {/* Text Content */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em' }}>
                        PHASE {step.step}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '1rem' }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: '1.0625rem', lineHeight: 1.65, color: 'var(--text-muted)' }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Illustration Area */}
                  <div style={{
                    padding: '2rem',
                    borderRadius: '14px',
                    border: '1px solid var(--border-strong)',
                    background: 'rgba(0,0,0,0.2)',
                    minHeight: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <Illustration />
                  </div>
                </div>
              </Step>
            );
          })}
        </Stepper>
      </motion.div>
    </section>
  );
}
