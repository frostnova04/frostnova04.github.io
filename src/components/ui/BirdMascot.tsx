'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocaleStore } from '@/lib/stores/localeStore';

type Stage = 'idle' | 'bomb' | 'chaos';

/* ---------- chaos: scramble text & images, then restore ---------- */

function getTargets(): HTMLElement[] {
    const roots = Array.from(document.querySelectorAll<HTMLElement>('main, footer'));
    const out: HTMLElement[] = [];
    roots.forEach((root) => {
        out.push(...Array.from(root.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, li, a, blockquote, img, figcaption, td')));
    });
    return out;
}

function applyChaos() {
    getTargets().forEach((el) => {
        const isImg = el.tagName === 'IMG';
        const rx = (Math.random() - 0.5) * (isImg ? 720 : 560);
        const ry = (Math.random() - 0.5) * (isImg ? 620 : 460);
        const rot = (Math.random() - 0.5) * (isImg ? 130 : 72);
        const sc = isImg ? 0.6 + Math.random() * 0.9 : 0.75 + Math.random() * 0.6;
        el.style.transition = 'transform 0.75s cubic-bezier(.2,.8,.2,1)';
        el.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(2)})`;
    });
}

function clearChaos() {
    const els = getTargets();
    els.forEach((el) => {
        el.style.transform = '';
    });
    window.setTimeout(() => {
        els.forEach((el) => {
            el.style.transition = '';
        });
    }, 800);
}

/* ---------- component ---------- */

export default function BirdMascot() {
    const pupilA = useRef<SVGCircleElement>(null);
    const pupilB = useRef<SVGCircleElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const [chirp, setChirp] = useState(false);
    const [stage, setStage] = useState<Stage>('idle');
    const [centered, setCentered] = useState(false);
    const [boom, setBoom] = useState(false);

    const locale = useLocaleStore((s) => s.locale);
    const clicks = useRef(0);
    const lastClick = useRef(0);
    const timers = useRef<number[]>([]);

    const after = (ms: number, fn: () => void) => {
        const id = window.setTimeout(fn, ms);
        timers.current.push(id);
        return id;
    };
    const clearTimers = () => {
        timers.current.forEach((id) => window.clearTimeout(id));
        timers.current = [];
    };

    const restore = () => {
        clearTimers();
        clearChaos();
        setStage('idle');
        setCentered(false);
        setBoom(false);
        clicks.current = 0;
    };

    const detonate = () => {
        setCentered(true); // bird flies to center
        after(560, () => setStage('bomb')); // morph into a bomb
        after(560 + 1050, () => {
            // explode
            setStage('chaos');
            setBoom(true);
            applyChaos();
            after(320, () => setBoom(false));
        });
        after(560 + 1050 + 6500, () => restore()); // auto-restore
    };

    // eye tracking (only meaningful when the bird is shown)
    useEffect(() => {
        let raf = 0;
        let mx = -9999;
        let my = -9999;
        const update = () => {
            raf = 0;
            const svg = svgRef.current;
            if (!svg || mx < 0) return;
            const r = svg.getBoundingClientRect();
            const u = r.width / 64 || 1;
            const ex = r.left + r.width * (41 / 64);
            const ey = r.top + r.height * (26 / 64);
            const dxv = (mx - ex) / u;
            const dyv = (my - ey) / u;
            const dist = Math.hypot(dxv, dyv);
            const max = 2.4;
            const k = dist > 0 ? Math.min(1, dist / 36) : 0;
            const ox = dist > 0 ? (dxv / dist) * max * k : 0;
            const oy = dist > 0 ? (dyv / dist) * max * k : 0;
            const t = `translate(${ox.toFixed(2)} ${oy.toFixed(2)})`;
            pupilA.current?.setAttribute('transform', t);
            pupilB.current?.setAttribute('transform', t);
        };
        const onMove = (e: MouseEvent) => {
            mx = e.clientX;
            my = e.clientY;
            if (!raf) raf = requestAnimationFrame(update);
        };
        window.addEventListener('mousemove', onMove);
        return () => {
            window.removeEventListener('mousemove', onMove);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    // restore shortcuts while chaos is active
    useEffect(() => {
        if (stage !== 'chaos') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') restore();
        };
        const onDocClick = () => restore();
        window.addEventListener('keydown', onKey);
        document.addEventListener('click', onDocClick, { once: true });
        return () => {
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('click', onDocClick);
        };
    }, [stage]);

    useEffect(() => () => clearTimers(), []);

    const onClickBird = () => {
        if (stage !== 'idle') {
            restore();
            return;
        }
        const now = Date.now();
        if (now - lastClick.current > 1200) clicks.current = 0;
        clicks.current += 1;
        lastClick.current = now;

        setChirp(true);
        window.setTimeout(() => setChirp(false), 1200);

        if (clicks.current >= 3) {
            clicks.current = 0;
            detonate();
        }
    };

    const containerTransform = centered
        ? 'translate(calc(50vw - 32px), calc(50vh - 32px))'
        : 'translate(calc(100vw - 80px), calc(100vh - 80px))';

    const chirpText = locale === 'zh' ? '叽！🐤' : 'Peep! 🐤';
    const restoreText = locale === 'zh' ? '🔄 恢复页面' : '🔄 Restore';
    const hint = locale === 'zh' ? '（按 Esc 或点击任意处恢复）' : '(press Esc or click to restore)';

    return (
        <>
            <div
                aria-hidden="true"
                className="pointer-events-none fixed top-0 left-0 z-40 hidden md:block"
                style={{ transform: containerTransform, transition: 'transform 0.55s cubic-bezier(.2,.8,.2,1)' }}
            >
                <motion.div
                    className="pointer-events-auto cursor-pointer relative"
                    animate={stage === 'idle' ? { y: [0, -8, 0] } : { y: 0 }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    whileTap={{ scale: 0.88 }}
                    onClick={onClickBird}
                    title="🐦"
                >
                    <AnimatePresence>
                        {chirp && stage === 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.8 }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-full bg-neutral-800 text-white text-xs font-medium px-2.5 py-1 shadow-lg"
                            >
                                {chirpText}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {stage === 'idle' && (
                        <svg ref={svgRef} width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="30" cy="36" r="20" fill="#f7d51d" />
                            <circle cx="28" cy="42" r="13" fill="#fff2a8" />
                            <motion.ellipse
                                cx="23"
                                cy="40"
                                rx="6"
                                ry="10"
                                fill="#e0a800"
                                animate={{ ry: [10, 6, 10] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <circle cx="36" cy="27" r="6" fill="#fff" />
                            <circle cx="46" cy="26" r="6" fill="#fff" />
                            <circle ref={pupilA} cx="37" cy="27" r="2.6" fill="#2a2a2a" />
                            <circle ref={pupilB} cx="47" cy="26" r="2.6" fill="#2a2a2a" />
                            <path d="M49 33 L60 36 L49 39 Z" fill="#f6671e" />
                        </svg>
                    )}

                    {stage === 'bomb' && (
                        <motion.div
                            className="text-[64px] leading-none origin-center"
                            animate={{ rotate: [0, -10, 10, -10, 8, 0], x: [0, -4, 4, -4, 3, 0] }}
                            transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            💣
                        </motion.div>
                    )}
                </motion.div>
            </div>

            {/* explosion flash + burst */}
            <AnimatePresence>
                {boom && (
                    <>
                        <motion.div
                            key="flash"
                            className="fixed inset-0 z-[60] bg-white pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        />
                        <motion.div
                            key="burst"
                            className="fixed top-1/2 left-1/2 z-[60] pointer-events-none text-[150px]"
                            style={{ x: '-50%', y: '-50%' }}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: [0, 1.8, 1.8], opacity: [1, 1, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.85, ease: 'easeOut' }}
                        >
                            💥
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* restore button while chaos is active */}
            <AnimatePresence>
                {stage === 'chaos' && (
                    <motion.div
                        key="restore"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center pointer-events-auto"
                    >
                        <button
                            onClick={restore}
                            className="rounded-full bg-neutral-900 text-white text-sm font-medium px-4 py-2 shadow-lg hover:bg-neutral-700 transition-colors"
                        >
                            {restoreText}
                        </button>
                        <span className="mt-1 text-xs text-neutral-500">{hint}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
