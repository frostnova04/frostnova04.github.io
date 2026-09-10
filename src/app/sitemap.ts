import type { MetadataRoute } from 'next';
import { listSgfGames } from '@/lib/sgf';

const BASE = 'https://frostnova04.github.io';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/education', '/work', '/awards', '/cv', '/message', '/weiqi'];
  const kifuRoutes = listSgfGames().map((g) => `/weiqi/${g.id}`);

  return [...routes, ...kifuRoutes].map((path) => ({
    url: path === '' ? `${BASE}/` : `${BASE}${path}/`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : path === '/cv' ? 0.8 : 0.6,
  }));
}
