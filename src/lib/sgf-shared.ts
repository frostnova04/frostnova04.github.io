/**
 * Pure, client-safe SGF parsing + types (no Node/fs imports).
 * Shared by the server-side file lister (src/lib/sgf.ts) and the
 * client-side viewer (which must not pull in 'fs').
 */

export type Stone = 0 | 1 | 2; // 0 empty, 1 black, 2 white

export interface SgfMove {
  color: 1 | 2;
  x: number;
  y: number;
  pass: boolean;
}

export interface SgfMeta {
  black?: string;
  white?: string;
  blackRank?: string;
  whiteRank?: string;
  result?: string;
  date?: string;
  event?: string;
  gameName?: string;
  komi?: string;
  handicap?: string;
}

export interface SgfGame {
  id: string;
  filename: string;
  size: number;
  setupBlack: [number, number][];
  setupWhite: [number, number][];
  moves: SgfMove[];
  meta: SgfMeta;
}

export interface SgfListItem {
  id: string;
  filename: string;
  size: number;
  moveCount: number;
  meta: SgfMeta;
}

/** Extract the node property-strings along the mainline (follows the first branch). */
function extractMainlineNodes(sgf: string): string[] {
  const nodes: string[] = [];
  const n = sgf.length;
  let i = 0;
  while (i < n && sgf[i] !== '(') i++;

  const traverse = (start: number): number => {
    let j = start;
    let buf = '';
    const flush = () => {
      const t = buf.trim();
      if (t) nodes.push(t);
      buf = '';
    };
    while (j < n) {
      const c = sgf[j];
      if (c === '(') {
        flush();
        return traverse(j + 1); // mainline continues into the first variation
      }
      if (c === ')') {
        flush();
        return j + 1;
      }
      if (c === ';') {
        flush();
        j++;
        continue;
      }
      if (c === '[') {
        buf += c;
        j++;
        while (j < n && sgf[j] !== ']') {
          buf += sgf[j];
          j++;
        }
        if (j < n) {
          buf += sgf[j];
          j++;
        }
        continue;
      }
      buf += c;
      j++;
    }
    flush();
    return j;
  };

  traverse(i + 1);
  return nodes;
}

function parseProperties(node: string): { key: string; values: string[] }[] {
  const props: { key: string; values: string[] }[] = [];
  const re = /([A-Z]+)((?:\s*\[[^\]]*\]\s*)+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(node)) !== null) {
    const values = [...m[2].matchAll(/\[([^\]]*)\]/g)].map((x) => x[1]);
    props.push({ key: m[1], values });
  }
  return props;
}

function parseCoord(v: string, size: number): [number, number] | null {
  if (!v || v.length < 2) return null;
  const x = v.charCodeAt(0) - 97;
  const y = v.charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return [x, y];
}

export function parseSgf(raw: string): Omit<SgfGame, 'id' | 'filename'> {
  const nodes = extractMainlineNodes(raw);
  let size = 19;
  const setupBlack: [number, number][] = [];
  const setupWhite: [number, number][] = [];
  const moves: SgfMove[] = [];
  const meta: SgfMeta = {};

  for (const node of nodes) {
    for (const { key, values } of parseProperties(node)) {
      switch (key) {
        case 'SZ': {
          const s = parseInt(values[0] || '', 10);
          if (!Number.isNaN(s) && s > 0 && s <= 26) size = s;
          break;
        }
        case 'AB':
          for (const v of values) {
            const c = parseCoord(v, size);
            if (c) setupBlack.push(c);
          }
          break;
        case 'AW':
          for (const v of values) {
            const c = parseCoord(v, size);
            if (c) setupWhite.push(c);
          }
          break;
        case 'B':
        case 'W': {
          const color = key === 'B' ? 1 : 2;
          const c = parseCoord(values[0] || '', size);
          if (c) moves.push({ color, x: c[0], y: c[1], pass: false });
          else moves.push({ color, x: -1, y: -1, pass: true });
          break;
        }
        case 'PB': meta.black = values[0]; break;
        case 'PW': meta.white = values[0]; break;
        case 'BR': meta.blackRank = values[0]; break;
        case 'WR': meta.whiteRank = values[0]; break;
        case 'RE': meta.result = values[0]; break;
        case 'DT': meta.date = values[0]; break;
        case 'EV': meta.event = values[0]; break;
        case 'GN': meta.gameName = values[0]; break;
        case 'KM': meta.komi = values[0]; break;
        case 'HA': meta.handicap = values[0]; break;
        default:
          break;
      }
    }
  }

  return { size, setupBlack, setupWhite, moves, meta };
}

export function gameTitle(meta: SgfMeta, fallback: string): string {
  if (meta.gameName) return meta.gameName;
  if (meta.event) return meta.event;
  if (meta.black && meta.white) return `${meta.black} vs ${meta.white}`;
  if (meta.black) return meta.black;
  if (meta.white) return meta.white;
  return fallback;
}
