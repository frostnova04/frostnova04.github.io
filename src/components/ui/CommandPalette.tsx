'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/lib/stores/themeStore';
import { useLocaleStore } from '@/lib/stores/localeStore';
import type { SiteConfig } from '@/lib/config';

/** Custom event other components (e.g. the navbar button) use to open the palette. */
export const OPEN_PALETTE_EVENT = 'tianyi:open-palette';
/** Custom event that triggers the bird easter egg (listened by BirdMascot). */
export const BIRD_DETONATE_EVENT = 'tianyi:bird-detonate';

interface CommandItem {
  id: string;
  title: string;
  hint?: string;
  group: 'pages' | 'actions';
  href?: string;
  run?: () => void;
}

interface CommandPaletteProps {
  items: SiteConfig['navigation'];
  itemsByLocale?: Record<string, SiteConfig['navigation']>;
  email?: string;
}

export default function CommandPalette({ items, itemsByLocale, email }: CommandPaletteProps) {
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = (zh: string, en: string) => (locale === 'zh' ? zh : en);

  const commands = useMemo<CommandItem[]>(() => {
    const navSource = itemsByLocale?.[locale] || items;
    const navCommands: CommandItem[] = navSource
      .filter((item) => item.href)
      .map((item) => ({
        id: `nav-${item.target}`,
        title: item.title,
        hint: item.href,
        group: 'pages' as const,
        href: item.href,
      }));

    const actionCommands: CommandItem[] = [
      {
        id: 'action-theme',
        title: t('切换 亮色 / 暗色主题', 'Toggle light / dark theme'),
        hint: 'theme',
        group: 'actions',
        run: () => toggleTheme(),
      },
      ...(email
        ? [{
            id: 'action-email',
            title: t('复制邮箱地址', 'Copy email address'),
            hint: email,
            group: 'actions' as const,
            run: () => navigator.clipboard?.writeText(email),
          }]
        : []),
      {
        id: 'action-bird',
        title: t('炸毛小鸟 🐦（彩蛋）', 'Detonate the bird 🐦 (easter egg)'),
        hint: 'easter egg',
        group: 'actions',
        run: () => window.dispatchEvent(new Event(BIRD_DETONATE_EVENT)),
      },
    ];

    return [...navCommands, ...actionCommands];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, itemsByLocale, locale, email, toggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q)
    );
  }, [commands, query]);

  // keep selection in range when the filtered list shrinks
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const openPalette = () => {
    setQuery('');
    setActive(0);
    setOpen(true);
  };

  // global hotkeys: Ctrl/Cmd+K toggle, custom open event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    };
    const onOpen = () => openPalette();
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, [open]);

  // focus input when opened
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const runItem = (item: CommandItem) => {
    setOpen(false);
    if (item.run) {
      window.setTimeout(() => item.run?.(), 80);
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[active];
      if (item) runItem(item);
    }
  };

  const groups: { key: CommandItem['group']; label: string }[] = [
    { key: 'pages', label: t('页面', 'Pages') },
    { key: 'actions', label: t('命令', 'Actions') },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mx-4 mt-24 max-w-lg sm:mx-auto overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0d1420] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* prompt input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="font-mono text-accent select-none">›</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder={t('输入页面名或命令…', 'Type a page or command…')}
                className="w-full bg-transparent outline-none text-sm font-mono text-primary placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                aria-label={t('命令面板', 'Command palette')}
              />
              <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-500">ESC</kbd>
            </div>

            {/* results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center font-mono text-sm text-neutral-500">
                  {t('没有匹配结果', 'No matching results')}
                </div>
              )}
              {groups.map(({ key, label }) => {
                const groupItems = filtered.filter((c) => c.group === key);
                if (groupItems.length === 0) return null;
                return (
                  <div key={key}>
                    <div className="px-4 pt-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                      {label}
                    </div>
                    {groupItems.map((item) => {
                      const idx = filtered.indexOf(item);
                      const isActive = idx === active;
                      return (
                        <button
                          key={item.id}
                          ref={isActive ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => runItem(item)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? 'bg-accent/10 text-primary'
                              : 'text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`font-mono text-xs ${isActive ? 'text-accent' : 'text-neutral-400 dark:text-neutral-600'}`}>
                              {isActive ? '▸' : ' '}
                            </span>
                            <span className="truncate">{item.title}</span>
                          </span>
                          {item.hint && (
                            <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-600 truncate max-w-[40%]">
                              {item.hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* footer hints */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 font-mono text-[10px] text-neutral-500">
              <span>↑↓ {t('选择', 'navigate')}</span>
              <span>↵ {t('打开', 'open')}</span>
              <span>esc {t('关闭', 'close')}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
