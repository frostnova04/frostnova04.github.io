'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useMessages } from '@/lib/i18n/useMessages';
import type { MessagePageConfig } from '@/types/page';

export default function MessagePage({ config }: { config: MessagePageConfig }) {
    const messages = useMessages();
    const m = messages.message;
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        setStatus('submitting');
        try {
            const formData = new FormData(form);
            // auto-stamp the submission date
            formData.append('Submitted at', new Date().toLocaleString());
            const res = await fetch(config.endpoint, {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                setStatus('success');
                form.reset();
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl"
        >
            <h1 data-eyebrow="GET IN TOUCH" className="section-title tracking-tight text-4xl font-serif font-bold text-primary mb-4">{config.title}</h1>
            {config.description && (
                <p className="text-lg text-neutral-600 dark:text-neutral-500 mb-8">{config.description}</p>
            )}

            {status === 'success' ? (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8 text-center">
                    <div className="text-4xl mb-3">💌</div>
                    <h2 className="text-xl font-serif font-bold text-primary mb-2">{m.successTitle}</h2>
                    <p className="text-neutral-600 dark:text-neutral-500">{m.successBody}</p>
                </div>
            ) : (
                <form
                    onSubmit={onSubmit}
                    className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 space-y-4"
                >
                    <input type="hidden" name="_subject" value={config.title} />
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            {m.name}
                        </label>
                        <input
                            name="name"
                            type="text"
                            placeholder={m.namePlaceholder}
                            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            {m.content}
                        </label>
                        <textarea
                            name="message"
                            required
                            rows={5}
                            placeholder={m.contentPlaceholder}
                            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                        />
                    </div>
                    {status === 'error' && (
                        <p className="text-sm text-red-600 dark:text-red-400">{m.error}</p>
                    )}
                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-accent hover:bg-accent-dark text-white font-medium transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {status === 'submitting' ? m.sending : m.submit}
                    </button>
                </form>
            )}
        </motion.div>
    );
}
