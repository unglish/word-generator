import { createGenerator, englishConfig, createSeededRng } from './dist/index.js';

const gen = createGenerator(englishConfig);
const rng = createSeededRng(42);
const N = 200000;
const cons = new Set('bcdfghjklmnpqrstvwxyz'.split(''));
const hits = new Map();
const exMap = new Map();

for (let i = 0; i < N; i++) {
  const w = gen.generateWord({ mode: 'text', rng });
  const c = w.written.clean.toLowerCase();
  // Find any "w" followed by 1+ consonants (w-consonant cluster)
  for (let j = 0; j < c.length; j++) {
    if (c[j] === 'w' && j > 0 && cons.has(c[j+1])) {
      // Get the preceding char to understand context
      const prev = c[j-1];
      const after = c.substring(j+1, Math.min(c.length, j+4));
      const ctx = c[j-1] + 'w' + after;
      const key = prev + 'w' + c[j+1]; // 3-char pattern
      if (!exMap.has(key)) exMap.set(key, []);
      if (exMap.get(key).length < 2) exMap.get(key).push({word: c, pron: w.pronunciation});
      hits.set(key, (hits.get(key) || 0) + 1);
    }
  }
}

const sorted = [...hits.entries()].sort((a, b) => b[1] - a[1]);
console.log('Top "Vw+C" patterns (vowel + w + consonant):');
console.log('─'.repeat(80));
for (const [tri, count] of sorted.slice(0, 30)) {
  const ex = exMap.get(tri)?.[0];
  const ex2 = exMap.get(tri)?.[1];
  console.log(`${tri}  ${String(count).padStart(5)}  ${ex ? ex.word.padEnd(25) + ' [' + ex.pron + ']' : ''}`);
  if (ex2) console.log(`${' '.repeat(13)}${ex2.word.padEnd(25)} [${ex2.pron}]`);
}
