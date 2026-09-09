'use client';

import { useEffect, useState } from 'react';

interface TypewriterProps {
  words: string[];
  className?: string;
  prefix?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  holdTime?: number;
}

/**
 * Cycles through `words` with a terminal-style type/hold/delete loop and a
 * blinking block cursor. Renders a single <span> (plus cursor span).
 */
export default function Typewriter({
  words,
  className,
  prefix = '',
  typeSpeed = 75,
  deleteSpeed = 40,
  holdTime = 1700,
}: TypewriterProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;
    const word = words[index % words.length];
    let timer = 0;

    if (!deleting && text === word) {
      // finished typing — hold, then start deleting
      timer = window.setTimeout(() => setDeleting(true), holdTime);
    } else if (deleting && text === '') {
      // finished deleting — next word
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
    } else {
      timer = window.setTimeout(
        () => setText(word.slice(0, text.length + (deleting ? -1 : 1))),
        deleting ? deleteSpeed : typeSpeed
      );
    }
    return () => window.clearTimeout(timer);
  }, [text, deleting, index, words, typeSpeed, deleteSpeed, holdTime]);

  if (words.length === 0) return null;

  return (
    <span className={className}>
      {prefix}
      {text}
      <span className="cursor-blink" aria-hidden="true">▊</span>
    </span>
  );
}
