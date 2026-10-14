import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PHONEME_NORMALIZATION } from './phoneme-normalization-defaults.mjs';

const CONFIG_PATH = join(process.cwd(), 'data', 'cmu', 'phoneme-normalization.json');

let cachedNormalization = null;

export function loadPhonemeNormalization() {
  if (!cachedNormalization) {
    cachedNormalization = existsSync(CONFIG_PATH)
      ? JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
      : DEFAULT_PHONEME_NORMALIZATION;
  }
  return cachedNormalization;
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
