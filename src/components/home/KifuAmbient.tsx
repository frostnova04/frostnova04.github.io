'use client';

import { useEffect, useRef } from 'react';
import type { SgfMove } from '@/lib/sgf-shared';

interface KifuAmbientProps {
  moves: SgfMove[];
  size?: number;
  caption?: string;
}

const LOGICAL = 640; // canvas logical resolution (CSS-scaled responsively)
const TEAL = '100, 255, 218';

/**
 * Ambient hero background: a real kifu slowly replaying itself behind the
 * homepage content. Decorative only (aria-hidden, pointer-events-none);
 * renders a static mid-game position when the user prefers reduced motion.
 */
export default function KifuAmbient({ moves, size = 19, caption }: KifuAmbientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || moves.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL * dpr;
    canvas.height = LOGICAL * dpr;
    ctx.scale(dpr, dpr);

    const N = size;
    const pad = LOGICAL / (N + 1);
    const cell = (LOGICAL - 2 * pad) / (N - 1);
    const r = cell * 0.47;
    const starPts = N === 19 ? [3, 9, 15] : [];

    const STEP = 1250;      // ms between moves
    const FADE = 320;       // stone fade-in
    const HOLD = 2600;      // pause after the last move
    const CYCLE_FADE = 900; // board fade-out before replay
    const total = STEP * (moves.length - 1) + FADE + HOLD + CYCLE_FADE;

    const drawStone = (color: 1 | 2, x: number, y: number, alpha: number, scale: number) => {
      const px = pad + x * cell;
      const py = pad + y * cell;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, r * scale, 0, Math.PI * 2);
      if (color === 1) {
        ctx.fillStyle = '#0b1220';
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(214,226,240,0.42)';
        ctx.stroke();
      } else {
        ctx.fillStyle = '#cfdcee';
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(10,15,22,0.45)';
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, LOGICAL, LOGICAL);

      const fadeStart = STEP * (moves.length - 1) + FADE + HOLD;
      const boardAlpha = t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / CYCLE_FADE) : 1;
      if (boardAlpha <= 0) return;

      // grid
      ctx.save();
      ctx.globalAlpha = boardAlpha;
      ctx.strokeStyle = 'rgba(158,183,212,0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        const p = pad + i * cell;
        ctx.beginPath();
        ctx.moveTo(pad, p);
        ctx.lineTo(LOGICAL - pad, p);
        ctx.moveTo(p, pad);
        ctx.lineTo(p, LOGICAL - pad);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(158,183,212,0.28)';
      for (const sx of starPts) {
        for (const sy of starPts) {
          ctx.beginPath();
          ctx.arc(pad + sx * cell, pad + sy * cell, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // stones
      const placed = Math.min(moves.length, Math.floor(t / STEP) + 1);
      for (let i = 0; i < placed; i++) {
        const m = moves[i];
        const age = t - i * STEP;
        const a = Math.min(1, age / FADE);
        const scale = 0.7 + 0.3 * (1 - Math.pow(1 - a, 2));
        drawStone(m.color, m.x, m.y, boardAlpha * a, scale);
      }

      // last move: teal marker + expanding ripple
      if (placed > 0) {
        const last = moves[placed - 1];
        const age = t - (placed - 1) * STEP;
        const a = Math.min(1, age / FADE);
        const px = pad + last.x * cell;
        const py = pad + last.y * cell;

        ctx.save();
        ctx.globalAlpha = boardAlpha * a;
        ctx.strokeStyle = `rgba(${TEAL}, 0.95)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r + 2.5, 0, Math.PI * 2);
        ctx.stroke();

        if (age < 520) {
          const p = age / 520;
          ctx.globalAlpha = boardAlpha * (1 - p) * 0.5;
          ctx.strokeStyle = `rgba(${TEAL}, 1)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, r * (1 + 1.4 * p), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    // reduced motion: static mid-game position, no loop
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(STEP * Math.min(moves.length - 1, 60));
      return;
    }

    let start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      let t = now - start;
      if (t > total) {
        start = now;
        t = 0;
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [moves, size]);

  if (moves.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 select-none">
      <div
        className="absolute -top-14 right-[-150px] opacity-[0.10] sm:-top-10 sm:right-[-90px] sm:opacity-[0.16]"
        style={{
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 96%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 96%)',
        }}
      >
        <canvas ref={canvasRef} className="h-[430px] w-[430px] sm:h-[580px] sm:w-[580px]" />
        {caption && (
          <p className="mt-1 pr-6 text-right font-mono text-[10px] text-neutral-500">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
