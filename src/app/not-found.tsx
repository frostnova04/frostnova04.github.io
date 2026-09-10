import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl card-bg rounded-2xl border shadow-xl overflow-hidden font-mono">
        {/* terminal title bar */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 px-5 py-3.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-neutral-500">
            tianyi@frostnova: ~/404
          </span>
        </div>

        <div className="p-6 sm:p-10 space-y-4 text-sm sm:text-base">
          <p>
            <span className="text-accent">$</span>{' '}
            <span className="text-foreground">curl -I https://frostnova04.github.io&lt;this-page&gt;</span>
          </p>
          <p className="text-error">HTTP/2 404 — file not found</p>
          <p className="text-neutral-500">segmentation fault (core dumped)</p>

          <div className="pt-6 pb-2 text-center">
            <span className="text-7xl sm:text-8xl font-bold text-accent tracking-tight">
              404
            </span>
            <p className="mt-4 text-neutral-500 text-xs sm:text-sm">
              // 这个页面像被打劫的棋局一样消失了
              <br />
              &mdash; this page has vanished from the board &mdash;
            </p>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-5 py-2.5 text-accent transition-colors hover:bg-accent/20"
            >
              <span className="text-accent">$</span> cd /home
              <span className="cursor-blink text-accent">▊</span>
            </Link>
            <Link
              href="/cv"
              className="text-neutral-500 transition-colors hover:text-accent underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700"
            >
              <span className="text-accent">$</span> cat ~/cv.md
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
