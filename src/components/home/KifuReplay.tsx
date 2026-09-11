'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/stores/localeStore';
import type { SgfMove } from '@/lib/sgf-shared';

interface KifuReplayProps {
  title?: string;
  moves: SgfMove[];
  size?: number;
  caption?: string;
  setupBlack?: [number, number][];
  setupWhite?: [number, number][];
  handicap?: string;
}

const LOGICAL = 440;
const STEP = 1250;      // ms between moves
const FADE = 260;       // stone pop-in
const HOLD = 2600;      // pause after the final move
const CYCLE_GAP = 400;  // blank beat before replay

/**
 * Full-visibility self-playing kifu section (took over the old game slot).
 * High-contrast board that adapts to light/dark theme; pause / replay
 * controls; auto-restarts from the top after the game ends.
 */
export default function KifuReplay({
  title,
  moves,
  size = 19,
  caption,
  setupBlack,
  setupWhite,
  handicap,
}: KifuReplayProps) {
  const locale = useLocaleStore((s) => s.locale);
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<number>(0);      // effective playback start (ms timeline)
  const pausedRef = useRef<boolean>(false);
  const pausedAtRef = useRef<number>(0);   // elapsed when paused
  const countRef = useRef<number>(0);

  const [paused, setPaused] = useState(false);
  const [moveNo, setMoveNo] = useState(0);

  const resolvedTitle = title || t('棋局回放', 'Kifu Replay');
  const total = moves.length > 0 ? STEP * (moves.length - 1) + FADE + HOLD + CYCLE_GAP : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || moves.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGICAL * dpr;
    canvas.height = LOGICAL * dpr;
    ctx.scale(dpr, dpr);

    startRef.current = performance.now();
    countRef.current = 0;

    const N = size;
    const pad = LOGICAL / (N + 1);
    const cell = (LOGICAL - 2 * pad) / (N - 1);
    const r = cell * 0.47;
    const starPts = N === 19 ? [3, 9, 15] : [];

    const palette = () =>
      document.documentElement.classList.contains('dark')
        ? {
            bg: '#0d1421',
            line: 'rgba(163,190,220,0.42)',
            star: 'rgba(163,190,220,0.55)',
            blackFill: '#101b2d',
            blackRim: 'rgba(214,226,240,0.55)',
            whiteFill: '#e7eef7',
            whiteRim: 'rgba(13,20,33,0.4)',
            marker: '#64ffda',
            shadow: 'rgba(0,0,0,0.5)',
          }
        : {
            bg: '#f3f0e9',
            line: 'rgba(71,85,105,0.5)',
            star: 'rgba(71,85,105,0.65)',
            blackFill: '#1e293b',
            blackRim: 'rgba(255,255,255,0.35)',
            whiteFill: '#fbfcfe',
            whiteRim: 'rgba(51,65,85,0.5)',
            marker: '#0d9488',
            shadow: 'rgba(15,23,42,0.25)',
          };

    const drawStone = (
      p: ReturnType<typeof palette>,
      color: 1 | 2,
      x: number,
      y: number,
      alpha: number,
      scale: number
    ) => {
      const px = pad + x * cell;
      const py = pad + y * cell;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.shadow;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(px, py, r * scale, 0, Math.PI * 2);
      ctx.fillStyle = color === 1 ? p.blackFill : p.whiteFill;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = color === 1 ? p.blackRim : p.whiteRim;
      ctx.stroke();
      ctx.restore();
    };

    const draw = (t: number) => {
      const p = palette();
      ctx.clearRect(0, 0, LOGICAL, LOGICAL);
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, LOGICAL, LOGICAL);

      // grid + star points
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        const q = pad + i * cell;
        ctx.beginPath();
        ctx.moveTo(pad, q);
        ctx.lineTo(LOGICAL - pad, q);
        ctx.moveTo(q, pad);
        ctx.lineTo(q, LOGICAL - pad);
        ctx.stroke();
      }
      ctx.fillStyle = p.star;
      for (const sx of starPts) {
        for (const sy of starPts) {
          ctx.beginPath();
          ctx.arc(pad + sx * cell, pad + sy * cell, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // handicap setup stones — on the board from move zero
      for (const [x, y] of setupBlack || []) drawStone(p, 1, x, y, 1, 1);
      for (const [x, y] of setupWhite || []) drawStone(p, 2, x, y, 1, 1);

      // timed moves (fully opaque once placed — this section is meant to be read)
      const placed = Math.min(moves.length, Math.floor(t / STEP) + 1);
      for (let i = 0; i < placed; i++) {
        const m = moves[i];
        const age = t - i * STEP;
        const a = Math.min(1, age / FADE);
        const scale = 0.75 + 0.25 * (1 - Math.pow(1 - a, 2));
        drawStone(p, m.color, m.x, m.y, a, scale);
      }

      // last move marker
      if (placed > 0) {
        const last = moves[placed - 1];
        const age = t - (placed - 1) * STEP;
        const a = Math.min(1, age / FADE);
        const px = pad + last.x * cell;
        const py = pad + last.y * cell;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.marker;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r + 2.5, 0, Math.PI * 2);
        ctx.stroke();
        if (age < 480) {
          const k = age / 480;
          ctx.globalAlpha = (1 - k) * 0.5;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, r * (1 + 1.3 * k), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (placed !== countRef.current) {
        countRef.current = placed;
        setMoveNo(placed);
      }
    };

    // reduced motion: show a static mid-game position, no auto-advance
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(STEP * Math.min(moves.length - 1, 60));
      setMoveNo(Math.min(moves.length, 61));
      return;
    }

    let raf = 0;
    const loop = (now: number) => {
      let elapsed: number;
      if (pausedRef.current) {
        elapsed = pausedAtRef.current;
      } else {
        elapsed = now - startRef.current;
        if (elapsed > total) {
          startRef.current = now;
          elapsed = 0;
        }
      }
      draw(elapsed);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [moves, size, total, setupBlack, setupWhite]);

  if (moves.length === 0) return null;

  const togglePause = () => {
    if (!pausedRef.current) {
      pausedAtRef.current = performance.now() - startRef.current;
    } else {
      startRef.current = performance.now() - pausedAtRef.current;
    }
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const restart = () => {
    startRef.current = performance.now();
    pausedAtRef.current = 0;
    pausedRef.current = false;
    setPaused(false);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-serif font-bold text-primary mb-1">{resolvedTitle}</h2>
      {caption && (
        <p className="font-mono text-xs text-accent mb-4">
          <span className="text-neutral-500">$</span> watch {caption}
          {handicap && handicap !== '0' && (
            <span className="text-neutral-500">
              {' · '}
              {t(`让${handicap}子`, `${handicap}-stone handicap`)}
            </span>
          )}
        </p>
      )}

      <div className="relative mx-auto w-full max-w-[440px] select-none overflow-hidden rounded-2xl border border-neutral-200 shadow-lg dark:border-neutral-800">
        <canvas ref={canvasRef} className="block aspect-square w-full" aria-label={resolvedTitle} />
      </div>

      <div className="mx-auto mt-3 flex max-w-[440px] items-center justify-center gap-3 font-mono text-xs">
        <button
          onClick={togglePause}
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-accent transition-colors hover:bg-accent/20"
        >
          {paused ? `▶ ${t('继续', 'Resume')}` : `⏸ ${t('暂停', 'Pause')}`}
        </button>
        <button
          onClick={restart}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-600 transition-colors hover:border-accent/40 hover:text-accent dark:border-neutral-700 dark:text-neutral-400"
        >
          ↺ {t('重播', 'Replay')}
        </button>
        <span className="text-neutral-500">
          {t(`第 ${moveNo} 手`, `Move ${moveNo}`)} / {moves.length}
        </span>
      </div>
    </motion.section>
  );
}
