'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { CardPageConfig } from '@/types/page';

/** Stable 7-char hex "commit hash" from a string (FNV-1a). */
function commitHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

const md = {
  p: ({ children }: React.ComponentProps<'p'>) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: React.ComponentProps<'ul'>) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  li: ({ children }: React.ComponentProps<'li'>) => <li className="mb-1">{children}</li>,
  a: ({ ...props }: React.ComponentProps<'a'>) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent font-medium hover:underline"
    />
  ),
  strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
  em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
  code: ({ children }: React.ComponentProps<'code'>) => (
    <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em]">{children}</code>
  ),
};

/**
 * Renders a card page's items as a `git log` style commit graph:
 * a rail of commit nodes, each item a commit with hash / date / message.
 */
export default function GitTimeline({ config, embedded = false }: { config: CardPageConfig; embedded?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div className={embedded ? 'mb-4' : 'mb-8'}>
        <h1 className={`${embedded ? 'text-2xl' : 'text-4xl'} font-serif font-bold text-primary mb-4`}>{config.title}</h1>
        {config.description && (
          <p className={`${embedded ? 'text-base' : 'text-lg'} text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed mb-4`}>
            {config.description}
          </p>
        )}
        <div className="font-mono text-xs sm:text-sm text-neutral-500 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <span className="text-accent">$</span>
          <span>git log --graph --oneline experience</span>
          <span className="cursor-blink text-accent" aria-hidden="true">▊</span>
        </div>
      </div>

      <div className="relative">
        {config.items.map((item, index) => {
          const hash = commitHash(`${item.title}|${item.date || ''}`);
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.12 * index }}
              className="relative flex gap-4 sm:gap-5 pb-10 last:pb-0"
            >
              {/* rail + node */}
              <div className="relative flex flex-col items-center w-3.5 flex-shrink-0">
                <span className="z-10 mt-1.5 h-3.5 w-3.5 rounded-full bg-accent ring-4 ring-accent/20" />
                {index < config.items.length - 1 && (
                  <span className="flex-1 w-px bg-neutral-300 dark:bg-neutral-600 mt-1.5" />
                )}
              </div>

              {/* commit body */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-1.5">
                  <span className="font-mono text-sm font-bold text-accent select-all">{hash}</span>
                  {item.date && (
                    <span className="font-mono text-xs text-neutral-500">{item.date}</span>
                  )}
                  {index === 0 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-accent/40 text-accent">
                      HEAD → main
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-primary leading-snug">
                  {item.title}
                  {item.subtitle && (
                    <span className="block sm:inline text-neutral-500 font-normal font-mono text-sm sm:ml-2">
                      @ {item.subtitle}
                    </span>
                  )}
                </h3>

                {item.content && (
                  <div
                    className={`text-sm text-neutral-600 dark:text-neutral-500 leading-relaxed mt-2 pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 ${config.justify ? 'text-justify' : ''}`}
                  >
                    <ReactMarkdown components={md}>{item.content}</ReactMarkdown>
                  </div>
                )}

                {item.tags && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {item.tags.map((tag) => (
                      <span key={tag} className="font-mono text-[10px] text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
