import Link from 'next/link';
import { listSgfGames, gameTitle } from '@/lib/sgf';

export default function WeiqiIndex() {
  const games = listSgfGames();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-serif font-bold text-primary mb-2">
        围棋棋谱 <span className="text-2xl text-neutral-400">Weiqi Kifu</span>
      </h1>
      <p className="text-neutral-500 mb-8">点击棋谱进入复盘 · 用下方进度条或左右按钮逐步回放</p>

      {games.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8 text-center text-neutral-500">
          <div className="text-4xl mb-3">♟️</div>
          <p className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">还没有棋谱</p>
          <p className="text-sm">
            把 <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">.sgf</code> 文件放进项目的{' '}
            <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">sgf/</code> 文件夹并推送，
            下次构建后会自动出现在这里。
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {games.map((g) => {
            const title = gameTitle(g.meta, g.id);
            return (
              <Link
                key={g.id}
                href={`/weiqi/${g.id}`}
                className="block bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 hover:shadow-lg hover:border-accent transition-all duration-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-primary truncate">{title}</h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      {g.meta.black || '黑'}
                      {g.meta.white ? ` vs ${g.meta.white}` : ''}
                      {g.meta.result ? ` · ${g.meta.result}` : ''}
                      {g.meta.date ? ` · ${g.meta.date}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-neutral-500 flex-shrink-0">
                    <div>{g.size}×{g.size}</div>
                    <div>{g.moveCount} 手</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
