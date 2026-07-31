import fs from 'fs';
import path from 'path';
import { parseSgf, slugify } from './sgf-shared';
import type { SgfGame, SgfListItem } from './sgf-shared';

/**
 * Server-only SGF file listing (uses fs; runs at build time).
 * Pure parsing logic + types live in ./sgf-shared so the client viewer
 * never imports 'fs'.
 */

export {
  parseSgf,
  gameTitle,
  describeGame,
  parseFilename,
  resultLabel,
  slugify,
} from './sgf-shared';
export type {
  SgfGame,
  SgfListItem,
  SgfMove,
  SgfMeta,
  Stone,
  GameDescriptor,
} from './sgf-shared';

const SGF_DIR = path.join(process.cwd(), 'sgf');

function listSgfFiles(): string[] {
  try {
    return fs.readdirSync(SGF_DIR).filter((f) => f.toLowerCase().endsWith('.sgf')).sort();
  } catch {
    return [];
  }
}

export function listSgfGames(): SgfListItem[] {
  const items: SgfListItem[] = [];
  for (const f of listSgfFiles()) {
    try {
      const raw = fs.readFileSync(path.join(SGF_DIR, f), 'utf8');
      const parsed = parseSgf(raw);
      items.push({
        id: slugify(f.replace(/\.sgf$/i, '')),
        filename: f,
        size: parsed.size,
        moveCount: parsed.moves.length,
        meta: parsed.meta,
      });
    } catch (e) {
      console.error(`[sgf] failed to parse ${f}:`, e);
    }
  }
  return items;
}

export function getSgfGame(slug: string): SgfGame | null {
  const safe = slug.replace(/[\/\\]/g, '');
  const target = listSgfFiles().find((f) => slugify(f.replace(/\.sgf$/i, '')) === safe);
  if (!target) return null;
  try {
    const raw = fs.readFileSync(path.join(SGF_DIR, target), 'utf8');
    const parsed = parseSgf(raw);
    return { id: safe, filename: target, ...parsed };
  } catch {
    return null;
  }
}
