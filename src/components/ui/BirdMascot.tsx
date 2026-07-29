'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/stores/localeStore';

/**
 * A small bird mascot (same look as the Flappy Bird game) that lives in the
 * bottom-right corner on desktop. Its eyes follow the cursor, it gently floats
 * and flaps its wing, and chirps when clicked. Purely decorative.
 */
export default function BirdMascot() {
    const pupilA = useRef<SVGCircleElement>(null);
    const pupilB = useRef<SVGCircleElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [chirp, setChirp] = useState(false);
    const locale = useLocaleStore((s) => s.locale);

    useEffect(() => {
        let raf = 0;
        let mx = -9999;
        let my = -9999;

        const update = () => {
            raf = 0;
            const svg = svgRef.current;
            if (!svg || mx < 0) return;
            const r = svg.getBoundingClientRect();
            const u = r.width / 64 || 1; // pixels per viewBox unit
            // midpoint between the two eyes, in viewport coords
            const ex = r.left + r.width * (41 / 64);
            const ey = r.top + r.height * (26 / 64);
            const dxv = (mx - ex) / u;
            const dyv = (my - ey) / u;
            const dist = Math.hypot(dxv, dyv);
            const max = 2.4; // max pupil travel in viewBox units
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

    const onChirp = () => {
        setChirp(true);
        window.setTimeout(() => setChirp(false), 1200);
    };

    const chirpText = locale === 'zh' ? '叽！🐤' : 'Peep! 🐤';

    return (
        <div aria-hidden="true" className="pointer-events-none fixed bottom-4 right-4 z-40 hidden md:block">
            <motion.div
                className="pointer-events-auto cursor-pointer relative"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                whileTap={{ scale: 0.88 }}
                onClick={onChirp}
                title="🐦"
            >
                {chirp && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-full bg-neutral-800 text-white text-xs font-medium px-2.5 py-1 shadow-lg"
                    >
                        {chirpText}
                    </motion.div>
                )}
                <svg ref={svgRef} width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    {/* body */}
                    <circle cx="30" cy="36" r="20" fill="#f7d51d" />
                    <circle cx="28" cy="42" r="13" fill="#fff2a8" />
                    {/* wing (flaps) */}
                    <motion.ellipse
                        cx="23"
                        cy="40"
                        rx="6"
                        ry="10"
                        fill="#e0a800"
                        animate={{ ry: [10, 6, 10] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* eyes */}
                    <circle cx="36" cy="27" r="6" fill="#fff" />
                    <circle cx="46" cy="26" r="6" fill="#fff" />
                    <circle ref={pupilA} cx="37" cy="27" r="2.6" fill="#2a2a2a" />
                    <circle ref={pupilB} cx="47" cy="26" r="2.6" fill="#2a2a2a" />
                    {/* beak */}
                    <path d="M49 33 L60 36 L49 39 Z" fill="#f6671e" />
                </svg>
            </motion.div>
        </div>
    );
}
