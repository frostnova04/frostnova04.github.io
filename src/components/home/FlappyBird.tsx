'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMessages } from '@/lib/i18n/useMessages';

// Game constants (canvas is drawn in a fixed coordinate space, then scaled by CSS)
const W = 400;
const H = 560;
const GROUND_H = 14;
const GRAVITY = 1500;      // px / s^2
const FLAP_V = -440;       // upward velocity on flap
const PIPE_W = 72;
const PIPE_GAP = 175;
const PIPE_SPEED = 150;    // px / s
const PIPE_INTERVAL = 1.55;// s between pipes
const BIRD_X = 110;
const BIRD_R = 15;

type Status = 'ready' | 'playing' | 'over';

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

interface GameState {
  birdY: number;
  vel: number;
  pipes: Pipe[];
  spawn: number;
  score: number;
  status: Status;
  last: number;
  raf: number;
}

export default function FlappyBird({ title }: { title?: string }) {
  const messages = useMessages();
  const resolvedTitle = title || messages.game.title;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const state = useRef<GameState>({
    birdY: H / 2,
    vel: 0,
    pipes: [],
    spawn: 0,
    score: 0,
    status: 'ready',
    last: 0,
    raf: 0,
  });

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<Status>('ready');

  const endGame = useCallback(() => {
    const s = state.current;
    if (s.status !== 'playing') return;
    s.status = 'over';
    setStatus('over');
    setBest((b) => Math.max(b, s.score));
  }, []);

  const reset = useCallback(() => {
    const s = state.current;
    s.birdY = H / 2;
    s.vel = 0;
    s.pipes = [];
    s.spawn = 0;
    s.score = 0;
    setScore(0);
  }, []);

  const start = useCallback(() => {
    reset();
    const s = state.current;
    s.status = 'playing';
    s.vel = FLAP_V;
    setStatus('playing');
  }, [reset]);

  const flap = useCallback(() => {
    const s = state.current;
    if (s.status !== 'playing') {
      start();
      return;
    }
    s.vel = FLAP_V;
  }, [start]);

  const draw = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = state.current;

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#4ec0ca');
    sky.addColorStop(1, '#9be0e6');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    cloud(ctx, 80, 110, 30);
    cloud(ctx, 305, 75, 26);

    // pipes
    for (const p of s.pipes) {
      drawPipe(ctx, p.x, p.gapY, true);
      drawPipe(ctx, p.x, p.gapY + PIPE_GAP, false);
    }

    // ground
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.fillStyle = '#c9b86a';
    ctx.fillRect(0, H - GROUND_H, W, 4);

    // bird (gentle bob while waiting)
    const by = s.status === 'ready' ? H / 2 + Math.sin(t / 300) * 8 : s.birdY;
    const rot = s.status === 'ready' ? Math.sin(t / 300) * 0.12 : Math.max(-0.45, Math.min(1.1, s.vel / 520));
    drawBird(ctx, BIRD_X, by, rot);

    // live score
    if (s.status === 'playing') {
      ctx.font = 'bold 42px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeText(String(s.score), W / 2, 72);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(s.score), W / 2, 72);
    }
  }, []);

  // main loop
  useEffect(() => {
    const loop = (t: number) => {
      const s = state.current;
      if (!s.last) s.last = t;
      let dt = (t - s.last) / 1000;
      s.last = t;
      if (dt > 0.05) dt = 0.05; // clamp big gaps (tab switches)

      if (s.status === 'playing') {
        s.vel += GRAVITY * dt;
        s.birdY += s.vel * dt;

        s.spawn -= dt;
        if (s.spawn <= 0) {
          s.spawn = PIPE_INTERVAL;
          const margin = 70;
          const gapY = margin + Math.random() * (H - 2 * margin - PIPE_GAP - GROUND_H);
          s.pipes.push({ x: W + 10, gapY, scored: false });
        }

        for (const p of s.pipes) p.x -= PIPE_SPEED * dt;
        s.pipes = s.pipes.filter((p) => p.x + PIPE_W > -20);

        for (const p of s.pipes) {
          if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
            p.scored = true;
            s.score += 1;
            setScore(s.score);
          }
        }

        // bounds
        if (s.birdY - BIRD_R <= 0) {
          s.birdY = BIRD_R;
          endGame();
        }
        if (s.birdY + BIRD_R >= H - GROUND_H) {
          s.birdY = H - GROUND_H - BIRD_R;
          endGame();
        }

        // pipes collision
        for (const p of s.pipes) {
          if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
            if (s.birdY - BIRD_R < p.gapY || s.birdY + BIRD_R > p.gapY + PIPE_GAP) {
              endGame();
              break;
            }
          }
        }
      }

      draw(t);
      s.raf = requestAnimationFrame(loop);
    };

    state.current.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(state.current.raf);
  }, [draw, endGame]);

  // keyboard control (when the game area is focused)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        flap();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [flap]);

  const onPointer = useCallback(() => {
    flap();
    wrapRef.current?.focus();
  }, [flap]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35 }}
    >
      <h2 data-eyebrow="MINI GAME" className="section-title text-2xl font-serif font-bold text-primary mb-4 tracking-tight">{resolvedTitle}</h2>
      <div
        ref={wrapRef}
        tabIndex={0}
        role="button"
        aria-label={resolvedTitle}
        onPointerDown={onPointer}
        className="relative mx-auto select-none rounded-2xl overflow-hidden shadow-lg focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
        style={{ width: '100%', maxWidth: 400, touchAction: 'manipulation' }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block w-full h-auto"
        />

        {status !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white text-center px-4">
            {status === 'ready' ? (
              <>
                <div className="text-4xl mb-2">🐦</div>
                <p className="text-sm font-medium opacity-90">{messages.game.tapToStart}</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-serif font-bold mb-1">{messages.game.gameOver}</div>
                <p className="text-sm opacity-90 mb-3">
                  {messages.game.score}: <span className="font-semibold">{score}</span>
                  {' · '}
                  {messages.game.best}: <span className="font-semibold">{best}</span>
                </p>
                <p className="text-sm opacity-90">{messages.game.tapToRestart}</p>
              </>
            )}
          </div>
        )}

        {status === 'playing' && (
          <div className="absolute top-2 right-3 text-xs text-white/80">
            {messages.game.best}: {best}
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-500 mt-2 text-center">{messages.game.hint}</p>
    </motion.section>
  );
}

/* ---------- drawing helpers ---------- */

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x - r, y, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x, y - r * 0.4, r, 0, Math.PI * 2);
  ctx.arc(x + r, y, r * 0.8, 0, Math.PI * 2);
  ctx.arc(x, y + r * 0.3, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, top: number, isTop: boolean) {
  const bodyH = isTop ? top : H - top - GROUND_H;
  const y = isTop ? 0 : top;
  // body
  ctx.fillStyle = '#74bf2e';
  ctx.fillRect(x, y, PIPE_W, bodyH);
  ctx.fillStyle = '#9be04a';
  ctx.fillRect(x + 8, y, 10, bodyH);
  ctx.fillStyle = '#5a9e22';
  ctx.fillRect(x + PIPE_W - 6, y, 6, bodyH);
  // cap
  const capY = isTop ? top - 22 : top;
  ctx.fillStyle = '#74bf2e';
  ctx.fillRect(x - 4, capY, PIPE_W + 8, 22);
  ctx.fillStyle = '#9be04a';
  ctx.fillRect(x - 4, capY, PIPE_W + 8, 6);
  ctx.fillStyle = '#5a9e22';
  ctx.fillRect(x - 4, capY + 16, PIPE_W + 8, 6);
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // body
  ctx.fillStyle = '#f7d51d';
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0a800';
  ctx.beginPath();
  ctx.arc(-2, 4, BIRD_R - 4, 0, Math.PI * 2);
  ctx.fill();
  // wing
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.ellipse(-4, 4, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(7, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(8.5, -5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = '#f6671e';
  ctx.beginPath();
  ctx.moveTo(BIRD_R - 3, -3);
  ctx.lineTo(BIRD_R + 9, 0);
  ctx.lineTo(BIRD_R - 3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
