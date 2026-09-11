'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'tianyi-boot-v1';
const LINE_DELAY = 165;

const LINES: string[] = [
  '[ 0.000 ] frostnova-os v5.2 booting ...',
  '[ 0.112 ] cpu: juris-master @ tsinghua ........ OK',
  '[ 0.287 ] gpu: weiqi-5dan engine ............. OK',
  "[ 0.401 ] loading int'l arbitration modules .. OK",
  '[ 0.518 ] mounting /work /awards /cv ......... OK',
  '[ 0.677 ] cfa-l1 / ielts-8.0 drivers ......... OK',
  '[ 0.792 ] starting display server ...',
];

/**
 * One-shot terminal boot splash (~1.6s of lines + fade-out). Plays once
 * per tab session, never for prefers-reduced-motion users, skippable by
 * any click / tap / keypress. Decorative only — the page beneath renders
 * normally in the HTML, so SEO and slow connections are unaffected.
 */
export default function BootAnimation() {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);

  const finish = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode — splash may replay next load, harmless */
    }
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        sessionStorage.setItem(STORAGE_KEY, '1');
        return;
      }
    } catch {
      return;
    }

    setVisible(true);

    const timers: number[] = [];
    LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setCount(i + 1), 120 + i * LINE_DELAY));
    });
    timers.push(window.setTimeout(finish, 120 + LINES.length * LINE_DELAY + 500));

    const skip = () => finish();
    window.addEventListener('keydown', skip);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('keydown', skip);
    };
  }, [finish]);

  // lock scroll while the splash is up
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="boot-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeOut' } }}
          onClick={finish}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0f16] font-mono cursor-pointer select-none"
          aria-hidden="true"
        >
          <div className="w-full max-w-md px-6 text-[11px] leading-6 sm:text-xs sm:leading-7">
            {LINES.slice(0, count).map((line, i) => (
              <p key={i} className="text-neutral-400">
                <span className="text-neutral-600">{line.slice(0, 10)}</span>
                {line.endsWith('OK') ? (
                  <>
                    {line.slice(10, -3)}
                    <span className="text-accent">OK</span>
                  </>
                ) : (
                  line.slice(10)
                )}
              </p>
            ))}
            <p className="mt-1">
              <span className="cursor-blink text-accent">▊</span>
            </p>
          </div>
          <p className="absolute bottom-8 inset-x-0 text-center text-[10px] text-neutral-700">
            点击任意处跳过 · click to skip
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
