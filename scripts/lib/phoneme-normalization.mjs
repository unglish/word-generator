import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_PATH = join(process.cwd(), 'memory', 'phoneme-normalization.json');

const PHONEME_TOKEN_RE = /^[a-z:\u0250-\u02af\u02c8\u02cc\u02d0]+$/i;

export function loadPhonemeNormalization() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

export function normalizeGeneratedPhoneme(sound) {
  if (typeof sound !== 'string' || sound.length === 0) return null;
  const normalized = sound.replace(/\u02B0/g, '');
  return PHONEME_TOKEN_RE.test(normalized) ? normalized : null;
}

export function normalizeArpabetToIpa(token, normalization) {
  const base = String(token).replace(/[0-9]/g, '').toUpperCase();
  return normalization.arpabetToIpa[base] ?? null;
}

export function toPercentMap(rawCounts) {
  const total = Object.values(rawCounts).reduce((a, b) => a + b, 0);
  const out = {};
  for (const [k, count] of Object.entries(rawCounts)) {
    out[k] = total > 0 ? (count / total) * 100 : 0;
  }
  return out;
}

export function sortByValueDesc(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
  );
}

export function pearson(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return 0;
  return num / Math.sqrt(dx2 * dy2);
}
