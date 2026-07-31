'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/solid';
import type { SgfGame } from '@/lib/sgf-shared';
import { gameTitle } from '@/lib/sgf-shared';

/* ---------------- capture-aware state engine ---------------- */

function neighbors(i: number, size: number): number[] {
  const x = i % size;
  const y = Math.floor(i / size);
  const r: number[] = [];
  if (x > 0) r.push(i - 1);
  if (x < size - 1) r.push(i + 1);
  if (y > 0) r.push(i - size);
  if (y < size - 1) r.push(i + size);
  return r;
}

function groupLiberties(board: Int8Array, start: number, size: number) {
  const color = board[start];
  const stack = [start];
  const seen = new Set<number>([start]);
  const group: number[] = [start];
  const libs = new Set<number>();
  while (stack.length) {
    const i = stack.pop() as number;
    for (const nb of neighbors(i, size)) {
      if (board[nb] === 0) libs.add(nb);
      else if (board[nb] === color && !seen.has(nb)) {
        seen.add(nb);
        group.push(nb);
        stack.push(nb);
      }
    }
  }
  return { group, libCount: libs.size };
}

interface LastMove { x: number; y: number; color: number }

function buildStates(
  size: number,
  setupBlack: [number, number][],
  setupWhite: [number, number][],
  moves: SgfGame['moves']
) {
  const boards: Int8Array[] = [];
  const lasts: (LastMove | null)[] = [];
  const cur = new Int8Array(size * size);
  for (const [x, y] of setupBlack) cur[y * size + x] = 1;
  for (const [x, y] of setupWhite) cur[y * size + x] = 2;
  boards.push(cur.slice());
  lasts.push(null);

  for (const mv of moves) {
    if (!mv.pass) {
      const i = mv.y * size + mv.x;
      cur[i] = mv.color;
      const opp = mv.color === 1 ? 2 : 1;
      for (const nb of neighbors(i, size)) {
        if (cur[nb] === opp) {
          const { group, libCount } = groupLiberties(cur, nb, size);
          if (libCount === 0) for (const g of group) cur[g] = 0;
        }
      }
      const { libCount: ownLibs } = groupLiberties(cur, i, size);
      if (ownLibs === 0) cur[i] = 0; // suicide — ignore for invalid kifu
      lasts.push({ x: mv.x, y: mv.y, color: mv.color });
    } else {
      lasts.push(null);
    }
    boards.push(cur.slice());
  }
  return { boards, lasts };
}

/* ---------------- board rendering ---------------- */

const COLS = 'ABCDEFGHJKLMNOPQRST'; // standard Go columns skip 'I'

function coordLabel(x: number, y: number, size: number): string {
  return `${COLS[x] ?? '?'}${size - y}`;
}

function starPoints(size: number): number[][] {
  if (size === 19) return [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
  if (size === 13) return [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]];
  if (size === 9) return [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
  const edge = size >= 13 ? 3 : 2;
  const mid = Math.floor(size / 2);
  const pts = [
    [edge, edge], [edge, size - 1 - edge],
    [size - 1 - edge, edge], [size - 1 - edge, size - 1 - edge],
  ];
  if (size % 2 === 1) pts.push([mid, mid]);
  return pts;
}

function GoBoard({
  size,
  board,
  last,
}: {
  size: number;
  board: Int8Array;
  last: LastMove | null;
}) {
  const m = 0.9;
  const span = size - 1;
  const vb = span + m * 2;
  const stars = starPoints(size);

  return (
    <svg
      viewBox={`${-m} ${-m} ${vb} ${vb}`}
      width="100%"
      style={{ maxWidth: 460, display: 'block', margin: '0 auto' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="bstone" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#6b6b6b" />
          <stop offset="55%" stopColor="#222222" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="wstone" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#c8c8c8" />
        </radialGradient>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ecc46a" />
          <stop offset="100%" stopColor="#d6a14a" />
        </linearGradient>
      </defs>

      <rect x={-m} y={-m} width={vb} height={vb} rx="0.5" fill="url(#wood)" />

      <g stroke="#3a2a16" strokeWidth={0.04} strokeLinecap="round">
        {Array.from({ length: size }).map((_, i) => (
          <g key={i}>
            <line x1={0} y1={i} x2={span} y2={i} />
            <line x1={i} y1={0} x2={i} y2={span} />
          </g>
        ))}
      </g>

      <g fill="#3a2a16">
        {stars.map(([sx, sy], i) => (
          <circle key={i} cx={sx} cy={sy} r={0.11} />
        ))}
      </g>

      {Array.from(board).map((v, i) => {
        if (v === 0) return null;
        const x = i % size;
        const y = Math.floor(i / size);
        const isLast = !!last && last.x === x && last.y === y;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={0.47}
              fill={v === 1 ? 'url(#bstone)' : 'url(#wstone)'}
              stroke={v === 2 ? '#9a9a9a' : 'none'}
              strokeWidth={0.02}
            />
            {isLast && (
              <circle cx={x} cy={y} r={0.15} fill={v === 1 ? '#ffffff' : '#111111'} opacity={0.85} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- main viewer ---------------- */

export default function KifuViewer({ game }: { game: SgfGame }) {
  const { boards, lasts } = useMemo(
    () => buildStates(game.size, game.setupBlack, game.setupWhite, game.moves),
    [game]
  );
  const total = boards.length - 1;
  const [cur, setCur] = useState(0);
  const board = boards[cur];
  const last = lasts[cur];
  const step = (d: number) => setCur((c) => Math.max(0, Math.min(total, c + d)));

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'Home') { e.preventDefault(); setCur(0); }
    else if (e.key === 'End') { e.preventDefault(); setCur(total); }
  };

  const title = gameTitle(game.meta, game.id);
  const lastMove = cur > 0 ? game.moves[cur - 1] : null;
  const lastLabel = lastMove && !lastMove.pass
    ? `${lastMove.color === 1 ? '黑' : '白'} ${coordLabel(lastMove.x, lastMove.y, game.size)}`
    : lastMove ? (lastMove.color === 1 ? '黑' : '白') + ' 虚手' : '起始局面';

  const btn =
    'inline-flex items-center justify-center h-9 w-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-accent hover:text-white dark:hover:bg-accent disabled:opacity-40 disabled:hover:bg-neutral-100 dark:disabled:hover:bg-neutral-800 dark:disabled:hover:text-neutral-300 transition-colors';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      tabIndex={0}
      onKeyDown={onKey}
      className="outline-none"
    >
      <h1 className="text-3xl font-serif font-bold text-primary mb-1">{title}</h1>
      <div className="text-sm text-neutral-500 mb-6">
        {game.meta.black || '黑'}{game.meta.blackRank ? ` (${game.meta.blackRank})` : ''}
        {' vs '}
        {game.meta.white || '白'}{game.meta.whiteRank ? ` (${game.meta.whiteRank})` : ''}
        {game.meta.result ? ` · ${game.meta.result}` : ''}
        {game.meta.date ? ` · ${game.meta.date}` : ''}
        {' · '}{game.size}×{game.size}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4">
        <GoBoard size={game.size} board={board} last={last} />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2">
          <button className={btn} onClick={() => setCur(0)} disabled={cur === 0} aria-label="first">
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          </button>
          <button className={btn} onClick={() => step(-1)} disabled={cur === 0} aria-label="prev">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="px-3 py-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 min-w-[6.5rem] text-center">
            第 {cur} / {total} 手
          </div>
          <button className={btn} onClick={() => step(1)} disabled={cur === total} aria-label="next">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <button className={btn} onClick={() => setCur(total)} disabled={cur === total} aria-label="last">
            <ChevronDoubleRightIcon className="h-5 w-5" />
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={total}
          value={cur}
          onChange={(e) => setCur(Number(e.target.value))}
          className="w-full accent-accent cursor-pointer"
          aria-label="move progress"
        />

        <div className="text-center text-xs text-neutral-500">
          {lastLabel}
          <span className="mx-2 opacity-40">·</span>
          ← / → 键也可步进
        </div>
      </div>
    </motion.div>
  );
}
