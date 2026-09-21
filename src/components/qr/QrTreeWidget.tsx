'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/stores/localeStore';

/** three.js chunk only downloads when the visitor actually opens the card */
const QrTreeScene = dynamic(() => import('./QrTreeScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 font-mono text-xs text-neutral-400 dark:bg-neutral-900">
      growing tree ...
    </div>
  ),
});

/**
 * Corner mini-tree; click opens a contact card where a 3D tree grows and
 * settles into the owner's scannable WeChat QR code.
 */
export default function QrTreeWidget() {
  const locale = useLocaleStore((s) => s.locale);
  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en);

  const [open, setOpen] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <motion.button
        type="button"
        aria-label={t('微信联系方式', 'WeChat contact')}
        title={t('微信联系', 'WeChat')}
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4, duration: 0.5, ease: 'easeOut' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-background/85 text-accent shadow-lg backdrop-blur transition-colors hover:border-accent hover:bg-accent/10"
      >
        <motion.span
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          className="block"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path d="M12 3l3.6 4.6h-2l3.2 4.3h-2.3l3.5 4.6H6l3.5-4.6H7.2l3.2-4.3h-2z" />
            <path d="M12 16.5V21" />
          </svg>
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t('微信联系方式', 'WeChat contact')}
              initial={{ scale: 0.82, opacity: 0, y: 18 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 27 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-background p-5 shadow-2xl dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-accent">
                  <span className="text-neutral-500">$</span> scan --add-wechat
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('关闭', 'Close')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 transition-colors hover:border-accent/50 hover:text-accent dark:border-neutral-700"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 aspect-square w-full overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <QrTreeScene key={replayKey} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-mono text-xs leading-relaxed text-neutral-500">
                  {t('树叶落定后即为微信二维码，扫码添加好友', 'Leaves settle into a scannable WeChat QR')}
                </p>
                <button
                  type="button"
                  onClick={() => setReplayKey((k) => k + 1)}
                  className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 font-mono text-xs text-neutral-600 transition-colors hover:border-accent/40 hover:text-accent dark:border-neutral-700 dark:text-neutral-400"
                >
                  ↺ {t('重播', 'Replay')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
