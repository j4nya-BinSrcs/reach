import { useEffect, useRef } from 'react';

const GRID_GAP = 64;
const WARP_RADIUS = 300;
const WARP_STRENGTH = 18;
const FADE_MS = 150;
const LINE_COLOR = 'rgba(232,185,49,0.13)';
const GLOW_COLOR = 'rgba(232,185,49,0.14)';

interface Pt { x: number; y: number }
interface NodePt { gx: number; gy: number; cx: number; cy: number }

/**
 * Non-null-alias pattern: the canvas ref and 2d context are guarded once by
 * the runtime (cheap, honest) and immediately rebound into non-null consts
 * that narrow permanently. Every closure below references only the aliases,
 * so tsc can never report a possible-null capture inside a hoisted function.
 * The grid warps toward the cursor with gaussian falloff and freezes FADE_MS
 * after the last move so the rAF loop never spins idle. Respects reduced
 * motion.
 */
export function GridWarp() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const maybeEl = canvasElRef.current;
    if (!maybeEl) return;
    const el: HTMLCanvasElement = maybeEl;

    const maybeCtx = el.getContext('2d');
    if (!maybeCtx) return;
    const g: CanvasRenderingContext2D = maybeCtx;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let running = false;
    let lastMove = 0;
    let w = 0;
    let h = 0;
    let cursor: Pt | null = null;
    let nodes: NodePt[][] = [];

    function buildNodes() {
      const cols = Math.ceil(w / GRID_GAP) + 2;
      const rows = Math.ceil(h / GRID_GAP) + 2;
      const out: NodePt[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: NodePt[] = [];
        for (let c = 0; c < cols; c++) {
          const gx = c * GRID_GAP;
          const gy = r * GRID_GAP;
          row.push({ gx, gy, cx: gx, cy: gy });
        }
        out.push(row);
      }
      return out;
    }

    function paint(n: NodePt[][], cur: Pt) {
      g.clearRect(0, 0, w, h);
      g.lineWidth = 1;
      g.strokeStyle = LINE_COLOR;

      for (const row of n) {
        for (const node of row) {
          const dx = cur.x - node.gx;
          const dy = cur.y - node.gy;
          const d = Math.hypot(dx, dy);
          const f = Math.exp(-(d * d) / (WARP_RADIUS * WARP_RADIUS));
          node.cx = node.gx + (dx / (d || 1)) * f * WARP_STRENGTH;
          node.cy = node.gy + (dy / (d || 1)) * f * WARP_STRENGTH;
        }
      }

      for (const row of n) {
        g.beginPath();
        g.moveTo(row[0].cx, row[0].cy);
        for (let i = 1; i < row.length; i++) g.lineTo(row[i].cx, row[i].cy);
        g.stroke();
      }

      for (let c = 0; c < n[0].length; c++) {
        g.beginPath();
        g.moveTo(n[0][c].cx, n[0][c].cy);
        for (let r = 1; r < n.length; r++) g.lineTo(n[r][c].cx, n[r][c].cy);
        g.stroke();
      }

      const glow = g.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, WARP_RADIUS);
      glow.addColorStop(0, GLOW_COLOR);
      glow.addColorStop(1, 'rgba(232,185,49,0)');
      g.fillStyle = glow;
      g.beginPath();
      g.arc(cur.x, cur.y, WARP_RADIUS, 0, Math.PI * 2);
      g.fill();
    }

    function frame() {
      raf = 0;
      if (!cursor) {
        running = false;
        return;
      }
      if (Date.now() - lastMove > FADE_MS) {
        running = false;
        return;
      }
      paint(nodes, cursor);
      raf = requestAnimationFrame(() => frame());
    }

    function kick() {
      lastMove = Date.now();
      if (running) return;
      running = true;
      frame();
    }

    function onResize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = buildNodes();
      if (cursor) kick();
    }

    function onMove(e: MouseEvent) {
      cursor = { x: e.clientX, y: e.clientY };
      kick();
    }

    function onLeave() {
      cursor = null;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      g.clearRect(0, 0, w, h);
    }

    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasElRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
