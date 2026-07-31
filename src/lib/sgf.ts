import fs from 'fs';
import path from 'path';
import { parseSgf } from './sgf-shared';

/**
 * Server-only SGF file listing (uses fs; runs at build time).
 * Pure parsing logic + types live in ./sgf-shared so the client viewer
 * never imports 'fs'.
 */

export {
  parseSgf,
  gameTitle,
} from './sgf-shared';
export type {
  SgfGame,
  SgfListItem,
  SgfMove,
  SgfMeta,
  Stone,
} from './sgf-shared';

const SGF_DIR = path.join(process.cwd(), 'sgf');

export function listSgfGames(): import('./sgf-shared').SgfListItem[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(SGF_DIR).filter((f) => f.toLowerCase().endsWith('.sgf'));
  } catch {
    return []; // folder missing or unreadable -> empty (build still succeeds)
  }
  files.sort();

  const items: import('./sgf-shared').SgfListItem[] = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(SGF_DIR, f), 'utf8');
      const parsed = parseSgf(raw);
      items.push({
        id: f.replace(/\.sgf$/i, ''),
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

export function getSgfGame(id: string): import('./sgf-shared').SgfGame | null {
  const safe = id.replace(/[\/\\]/g, '');
  try {
    const f = `${safe}.sgf`;
    const raw = fs.readFileSync(path.join(SGF_DIR, f), 'utf8');
    const parsed = parseSgf(raw);
    return { id: safe, filename: f, ...parsed };
  } catch {
    return null;
  }
}
