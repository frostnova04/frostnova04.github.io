'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocaleStore } from '@/lib/stores/localeStore';

interface StatItem {
  value: number;
  decimals: number;
  suffix: string;
  zh: string;
  en: string;
}

const STATS: StatItem[] = [
  { value: 5, decimals: 0, suffix: ' dan', zh: '围棋业余段位', en: 'Weiqi amateur dan' },
  { value: 8.0, decimals: 1, suffix: '', zh: 'IELTS 总分', en: 'IELTS overall' },
  { value: 10, decimals: 0, suffix: 'A', zh: 'CFA Level I 全科', en: 'CFA Level I all-A' },
  { value: 1, decimals: 0, suffix: '/48', zh: '本科年级排名', en: 'Undergrad class rank' },
];

function StatTile({ stat, started, locale }: { stat: StatItem; started: boolean; locale: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const t0 = performance.now();
    const DURATION = 1100;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(stat.value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, stat.value]);

  const text = display.toFixed(stat.decimals);

  return (
    <div className="card-bg rounded-xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
      <div className="font-mono text-2xl font-bold text-accent sm:text-3xl">
        {started ? text : (0).toFixed(stat.decimals)}
        <span className="text-lg sm:text-xl">{stat.suffix}</span>
      </div>
      <div className="mt-1 text-xs text-neutral-500">
        {locale === 'zh' ? stat.zh : stat.en}
      </div>
    </div>
  );
}

/** Terminal-styled stats strip; numbers count up when scrolled into view. */
export default function StatsStrip() {
  const locale = useLocaleStore((s) => s.locale);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {STATS.map((stat) => (
        <StatTile key={stat.en} stat={stat} started={started} locale={locale} />
      ))}
    </div>
  );
}
