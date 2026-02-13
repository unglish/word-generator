/**
 * C-adjacent bigram and trigram analysis for PR #167 review
 */
import { generateWord } from '../dist/index.js';

const SAMPLE_SIZE = 200_000;

// English bigram freqs for c-adjacent pairs (from Norvig + supplementary)
const ENG_BIGRAMS = {
  // c as first letter
  ca: 0.53, ce: 0.65, ch: 0.60, ci: 0.20, ck: 0.31, cl: 0.15, co: 0.79,
  cr: 0.15, ct: 0.38, cu: 0.12,
  // c as second letter
  ac: 0.35, ec: 0.43, ic: 0.70, nc: 0.41, oc: 0.12, rc: 0.08, sc: 0.12, uc: 0.10,
};

// English trigram freqs for c-related (approximate, from corpus data)
const ENG_TRIGRAMS = {
  che: 0.15, cha: 0.12, chi: 0.08, cho: 0.05,
  ach: 0.10, ech: 0.05, ich: 0.08, uch: 0.06,
  con: 0.30, com: 0.20, cou: 0.12, cal: 0.10,
  cer: 0.08, ces: 0.08, ced: 0.06, cel: 0.04,
  ace: 0.14, ice: 0.12, nce: 0.24, ect: 0.20,
  act: 0.10, ick: 0.10, ock: 0.08, ack: 0.12,
  tic: 0.12, ric: 0.08, nic: 0.06,
  anc: 0.08, enc: 0.06, inc: 0.05,
  uce: 0.04, uce: 0.04,
};

console.log(`Generating ${SAMPLE_SIZE} words...\n`);
const start = Date.now();

const bigramCounts = {};
const trigramCounts = {};
let totalBigrams = 0;
let totalTrigrams = 0;

// Also track k-adjacent for comparison
for (let i = 0; i < SAMPLE_SIZE; i++) {
  const w = generateWord({ mode: 'lexicon' }).written.clean.toLowerCase();
  for (let j = 0; j < w.length - 1; j++) {
    const bg = w.slice(j, j + 2);
    if (bg.includes('c') || bg.includes('k')) {
      bigramCounts[bg] = (bigramCounts[bg] || 0) + 1;
    }
    totalBigrams++;
    if (j < w.length - 2) {
      const tg = w.slice(j, j + 3);
      if (tg.includes('c') || tg.includes('k')) {
        trigramCounts[tg] = (trigramCounts[tg] || 0) + 1;
      }
      totalTrigrams++;
    }
  }
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Done in ${elapsed}s\n`);

// C-ADJACENT BIGRAMS
console.log('═══════════════════════════════════════════════════════');
console.log('C-ADJACENT BIGRAMS');
console.log('═══════════════════════════════════════════════════════');
console.log('Bigram | Gen%    | Eng%    | Ratio  | Note');
console.log('-------|---------|---------|--------|------');

const allCBigrams = new Set([...Object.keys(ENG_BIGRAMS)]);
for (const [bg] of Object.entries(bigramCounts)) {
  if (bg.includes('c')) allCBigrams.add(bg);
}

const cBigramRows = [];
for (const bg of allCBigrams) {
  const genFreq = ((bigramCounts[bg] || 0) / totalBigrams) * 100;
  const engFreq = ENG_BIGRAMS[bg] || 0;
  const ratio = engFreq > 0 ? genFreq / engFreq : (genFreq > 0.01 ? 999 : 0);
  cBigramRows.push({ bg, genFreq, engFreq, ratio });
}
cBigramRows.sort((a, b) => Math.abs(b.genFreq - b.engFreq) - Math.abs(a.genFreq - a.engFreq));

for (const { bg, genFreq, engFreq, ratio } of cBigramRows) {
  if (genFreq < 0.01 && engFreq === 0) continue;
  const note = ratio > 2 ? '⚠️ OVER' : ratio < 0.3 ? '⚠️ UNDER' : ratio < 0.5 ? 'low' : ratio > 1.5 ? 'high' : '';
  console.log(`  ${bg.padEnd(4)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio.toFixed(2).padStart(6)} | ${note}`);
}

// K-ADJACENT BIGRAMS
console.log('\n═══════════════════════════════════════════════════════');
console.log('K-ADJACENT BIGRAMS (for comparison)');
console.log('═══════════════════════════════════════════════════════');

const ENG_K_BIGRAMS = { ke: 0.15, ki: 0.08, kn: 0.05, ck: 0.31, ak: 0.05, ek: 0.02, ik: 0.02, ok: 0.05, uk: 0.02 };
const kBigrams = [];
for (const [bg, count] of Object.entries(bigramCounts)) {
  if (bg.includes('k')) {
    const genFreq = (count / totalBigrams) * 100;
    const engFreq = ENG_K_BIGRAMS[bg] || 0;
    kBigrams.push({ bg, genFreq, engFreq });
  }
}
kBigrams.sort((a, b) => b.genFreq - a.genFreq);
console.log('Bigram | Gen%    | Eng%    | Ratio');
console.log('-------|---------|---------|------');
for (const { bg, genFreq, engFreq } of kBigrams.slice(0, 15)) {
  const ratio = engFreq > 0 ? (genFreq / engFreq).toFixed(2) : (genFreq > 0.01 ? '∞' : '0');
  console.log(`  ${bg.padEnd(4)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio}`);
}

// C-ADJACENT TRIGRAMS
console.log('\n═══════════════════════════════════════════════════════');
console.log('C-ADJACENT TRIGRAMS (top 25 by frequency)');
console.log('═══════════════════════════════════════════════════════');
console.log('Trigram | Gen%    | Eng%    | Ratio  | Note');
console.log('--------|---------|---------|--------|------');

const cTrigramRows = [];
const allCTrigrams = new Set([...Object.keys(ENG_TRIGRAMS)]);
for (const [tg] of Object.entries(trigramCounts)) {
  if (tg.includes('c')) allCTrigrams.add(tg);
}
for (const tg of allCTrigrams) {
  const genFreq = ((trigramCounts[tg] || 0) / totalTrigrams) * 100;
  const engFreq = ENG_TRIGRAMS[tg] || 0;
  if (genFreq < 0.01 && engFreq === 0) continue;
  const ratio = engFreq > 0 ? genFreq / engFreq : (genFreq > 0.01 ? 999 : 0);
  cTrigramRows.push({ tg, genFreq, engFreq, ratio });
}
cTrigramRows.sort((a, b) => b.genFreq - a.genFreq);

for (const { tg, genFreq, engFreq, ratio } of cTrigramRows.slice(0, 25)) {
  const note = ratio > 2 ? '⚠️ OVER' : ratio < 0.3 ? '⚠️ UNDER' : ratio < 0.5 ? 'low' : ratio > 1.5 ? 'high' : '';
  console.log(`  ${tg.padEnd(5)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio.toFixed(2).padStart(6)} | ${note}`);
}

// CH specifically
console.log('\n═══════════════════════════════════════════════════════');
console.log('CH DEEP DIVE');
console.log('═══════════════════════════════════════════════════════');
const chTrigrams = Object.entries(trigramCounts)
  .filter(([tg]) => tg.includes('ch'))
  .map(([tg, count]) => ({ tg, freq: (count / totalTrigrams) * 100 }))
  .sort((a, b) => b.freq - a.freq)
  .slice(0, 15);
for (const { tg, freq } of chTrigrams) {
  console.log(`  ${tg}: ${freq.toFixed(3)}%`);
}
