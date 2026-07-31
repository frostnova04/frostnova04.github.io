import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listSgfGames, getSgfGame, gameTitle } from '@/lib/sgf';
import KifuViewer from '@/components/weiqi/KifuViewer';

export function generateStaticParams() {
  return listSgfGames().map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const game = getSgfGame(id);
  return { title: game ? gameTitle(game.meta, id) : '围棋棋谱' };
}

export default async function KifuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = getSgfGame(id);
  if (!game) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/weiqi"
        className="inline-flex items-center text-sm text-accent font-medium mb-6 hover:underline"
      >
        ← 返回棋谱列表
      </Link>
      <KifuViewer game={game} />
    </div>
  );
}
