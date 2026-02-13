import { generateWords } from '../dist/index.js';

const N = 50000;
const words = generateWords(N, { seed: 42 });

// Count single-phoneme codas at end of word
let endWordCodaLen1 = {};
let endWordCodaLen1Total = 0;

for (const w of words) {
  const lastSyl = w.syllables[w.syllables.length - 1];
  if (lastSyl.coda.length === 1) {
    const s = lastSyl.coda[0].sound;
    endWordCodaLen1[s] = (endWordCodaLen1[s] || 0) + 1;
    endWordCodaLen1Total++;
  }
}

// Sort by count
const sorted = Object.entries(endWordCodaLen1).sort((a,b) => b[1] - a[1]);
console.log(`End-of-word coda len=1 total: ${endWordCodaLen1Total}`);
console.log('Top sounds:');
for (const [s, c] of sorted.slice(0, 15)) {
  console.log(`  ${s}: ${c} (${(c/endWordCodaLen1Total*100).toFixed(1)}%)`);
}

// How many /n/ len-1 codas at end of word?
const nCount = endWordCodaLen1['n'] || 0;
console.log(`\n/n/ singleton codas at end-of-word: ${nCount}`);
console.log(`If 30% of these extended to /nd/, that adds ${Math.round(nCount * 0.3)} /nd/ codas`);
