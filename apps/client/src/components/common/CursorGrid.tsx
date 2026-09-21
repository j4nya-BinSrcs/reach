import { useRef, useEffect } from 'react';

interface CursorGridProps {
  cellSize?: number;
  color?: string;
  radius?: number;
  falloff?: 'smooth' | 'linear';
  holdTime?: number;
  fadeDuration?: number;
  lineWidth?: number;
  maxOpacity?: number;
  fillOpacity?: number;
  gridOpacity?: number;
  cellRadius?: number;
  clickPulse?: boolean;
  pulseSpeed?: number;
  style?: React.CSSProperties;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function drawCellPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(x, y, w, h);
  } else {
    ctx.roundRect(x, y, w, h, r);
  }
}

export function CursorGrid({
  cellSize = 70,
  color = '#e8b931',
  radius = 140,
  falloff = 'smooth',
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1.2,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0,
  cellRadius = 0,
  clickPulse = false,
  pulseSpeed = 600,
  style,
}: CursorGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const [cr, cg, cb] = hexToRgb(color);
    let raf = 0;
    let mouseX = -9999;
    let mouseY = -9999;

    // Cell state maps
    const cellPeak = new Map<string, number>();
    const cellHoldUntil = new Map<string, number>();
    const cellFadeStart = new Map<string, number>();
    const pulses: { x: number; y: number; t: number }[] = [];

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = parent.offsetWidth * dpr;
      canvas!.height = parent.offsetHeight * dpr;
      canvas!.style.width = `${parent.offsetWidth}px`;
      canvas!.style.height = `${parent.offsetHeight}px`;
      const ctx = canvas!.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    function loop() {
      const ctx = canvas!.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(loop); return; }

      const dpr = window.devicePixelRatio || 1;
      const W = canvas!.width / dpr;
      const H = canvas!.height / dpr;
      const now = performance.now();

      ctx.clearRect(0, 0, W, H);

      const cols = Math.ceil(W / cellSize) + 1;
      const rows = Math.ceil(H / cellSize) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * cellSize;
          const cy = row * cellSize;
          const key = `${col},${row}`;

          // Cursor proximity
          const dx = cx - mouseX;
          const dy = cy - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let cursorOp = 0;
          if (dist < radius) {
            const t = dist / radius;
            cursorOp = falloff === 'smooth'
              ? maxOpacity * (1 - t * t * (3 - 2 * t))
              : maxOpacity * (1 - t);
          }

          // Update state
          if (cursorOp > 0.001) {
            cellPeak.set(key, Math.max(cellPeak.get(key) ?? 0, cursorOp));
            cellHoldUntil.set(key, now + holdTime);
            cellFadeStart.delete(key);
          }

          // Compute final opacity from hold/fade state
          let opacity = 0;
          const peak = cellPeak.get(key);
          if (peak !== undefined) {
            const holdUntil = cellHoldUntil.get(key) ?? 0;
            if (now < holdUntil) {
              opacity = peak;
            } else {
              let fs = cellFadeStart.get(key);
              if (fs === undefined) {
                fs = now;
                cellFadeStart.set(key, fs);
              }
              const frac = Math.max(0, 1 - (now - fs) / fadeDuration);
              opacity = peak * frac;
              if (frac < 0.001) {
                cellPeak.delete(key);
                cellHoldUntil.delete(key);
                cellFadeStart.delete(key);
              }
            }
          }

          // Pulse overlay
          for (const pulse of pulses) {
            const elapsed = now - pulse.t;
            if (elapsed > pulseSpeed) continue;
            const prog = elapsed / pulseSpeed;
            const waveR = prog * radius * 2.5;
            const cd = Math.sqrt((cx - pulse.x) ** 2 + (cy - pulse.y) ** 2);
            const diff = Math.abs(cd - waveR);
            if (diff < cellSize * 1.5) {
              opacity = Math.max(opacity, maxOpacity * (1 - diff / (cellSize * 1.5)) * (1 - prog));
            }
          }

          // Draw
          if (opacity > 0.008) {
            if (fillOpacity > 0) {
              ctx.fillStyle = `rgba(${cr},${cg},${cb},${opacity * fillOpacity})`;
              drawCellPath(ctx, cx, cy, cellSize, cellSize, cellRadius);
              ctx.fill();
            }
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${opacity})`;
            ctx.lineWidth = lineWidth;
            drawCellPath(ctx, cx, cy, cellSize, cellSize, cellRadius);
            ctx.stroke();
          } else if (gridOpacity > 0) {
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${gridOpacity})`;
            ctx.lineWidth = 0.4;
            drawCellPath(ctx, cx, cy, cellSize, cellSize, cellRadius);
            ctx.stroke();
          }
        }
      }

      // Cleanup expired pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        if (now - pulses[i].t > pulseSpeed) pulses.splice(i, 1);
      }

      raf = requestAnimationFrame(loop);
    }

    const parent = canvas.parentElement!;

    const onMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onLeave = () => { mouseX = -9999; mouseY = -9999; };
    const onClick = (e: MouseEvent) => {
      if (!clickPulse) return;
      const rect = canvas!.getBoundingClientRect();
      pulses.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() });
    };

    parent.addEventListener('mousemove', onMove);
    parent.addEventListener('mouseleave', onLeave);
    parent.addEventListener('click', onClick);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('mouseleave', onLeave);
      parent.removeEventListener('click', onClick);
      ro.disconnect();
    };
  }, [cellSize, color, radius, falloff, holdTime, fadeDuration, lineWidth, maxOpacity, fillOpacity, gridOpacity, cellRadius, clickPulse, pulseSpeed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  );
}
