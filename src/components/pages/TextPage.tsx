'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { TextPageConfig } from '@/types/page';
import { useLocaleStore } from '@/lib/stores/localeStore';

interface TextPageProps {
    config: TextPageConfig;
    content: string;
    embedded?: boolean;
    jsonContent?: string;
}

/* ---------- json syntax highlight (static, build-time content only) ---------- */

function highlightJson(src: string): string {
  const esc = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = 'text-amber-700 dark:text-amber-300'; // numbers
      if (m.startsWith('"')) {
        cls = m.trimEnd().endsWith(':')
          ? 'text-sky-700 dark:text-sky-400' // keys
          : 'text-emerald-700 dark:text-emerald-400'; // strings
      } else if (m === 'true' || m === 'false') {
        cls = 'text-purple-700 dark:text-purple-400';
      } else if (m === 'null') {
        cls = 'text-neutral-500';
      }
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

function JsonViewer({ json, fileName }: { json: string; fileName: string }) {
  const html = useMemo(() => {
    try {
      return highlightJson(JSON.stringify(JSON.parse(json), null, 2));
    } catch {
      return null;
    }
  }, [json]);

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-lg bg-white dark:bg-[#0d1420]">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <span className="ml-2 font-mono text-xs text-neutral-500">{fileName}</span>
      </div>
      <pre className="p-4 overflow-auto text-xs sm:text-sm font-mono leading-relaxed max-h-[70vh] text-neutral-700 dark:text-neutral-300">
        {html ? (
          <code dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{json}</code>
        )}
      </pre>
    </div>
  );
}

/* ---------- page ---------- */

export default function TextPage({ config, content, embedded = false, jsonContent }: TextPageProps) {
    const locale = useLocaleStore((s) => s.locale);
    const [view, setView] = useState<'md' | 'json'>('md');

    const tab = (v: 'md' | 'json', label: string) => (
      <button
        type="button"
        onClick={() => setView(v)}
        className={`px-3 py-1.5 rounded-md font-mono text-xs border transition-colors ${
          view === v
            ? 'border-accent/50 bg-accent/10 text-accent'
            : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-primary'
        }`}
      >
        {label}
      </button>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={embedded ? "" : "max-w-3xl mx-auto"}
        >
            <h1 className={`${embedded ? "text-2xl" : "text-4xl"} font-serif font-bold text-primary mb-4`}>{config.title}</h1>
            {config.description && (
                <p className={`${embedded ? "text-base" : "text-lg"} text-neutral-600 dark:text-neutral-500 mb-4 max-w-2xl`}>
                    {config.description}
                </p>
            )}
            {jsonContent && (
                <div className="flex items-center gap-2 mb-8">
                    {tab('md', 'README.md')}
                    {tab('json', locale === 'zh' ? '简历.json' : 'cv.json')}
                </div>
            )}
            {view === 'json' && jsonContent ? (
                <JsonViewer json={jsonContent} fileName={locale === 'zh' ? '简历.json' : 'cv.json'} />
            ) : (
                <div className="text-neutral-700 dark:text-neutral-600 leading-relaxed">
                    <ReactMarkdown
                        components={{
                            h1: ({ children }) => <h1 className="text-3xl font-serif font-bold text-primary mt-8 mb-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-2xl font-serif font-bold text-primary mt-8 mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-xl font-semibold text-primary mt-6 mb-3">{children}</h3>,
                            p: ({ children }) => <p className="mb-4 last:mb-0 text-justify">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1 ml-4">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">{children}</ol>,
                            li: ({ children }) => <li className="mb-1 text-justify">{children}</li>,
                            a: ({ ...props }) => (
                                <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent font-medium transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
                                />
                            ),
                            blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-accent/50 pl-4 italic my-4 text-neutral-600 dark:text-neutral-500">
                                    {children}
                                </blockquote>
                            ),
                            strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                            em: ({ children }) => <em className="italic text-neutral-600 dark:text-neutral-500">{children}</em>,
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            )}
        </motion.div>
    );
}
