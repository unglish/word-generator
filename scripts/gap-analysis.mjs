/**
 * Issue #162 Step 1: Full bigram/trigram gap analysis
 * Generate 200k lexicon words, compute letter + bigram + trigram frequencies,
 * compare to English reference data, rank by |gap| × english_frequency.
 */

import { generateWord } from '../dist/index.js';

// English letter frequencies (from Norvig/Google Books, lowercase)
const ENGLISH_LETTER_FREQ = {
  e: 12.49, t: 9.28, a: 8.04, o: 7.64, i: 7.57, n: 7.23,
  s: 6.51, r: 6.28, h: 5.05, l: 4.07, d: 3.82, c: 3.34,
  u: 2.73, m: 2.51, f: 2.40, p: 2.14, g: 1.87, w: 1.68,
  y: 1.66, b: 1.48, v: 1.05, k: 0.54, x: 0.23, j: 0.16,
  q: 0.12, z: 0.09
};

// English bigram frequencies (from Norvig, % of all bigrams)
const ENGLISH_BIGRAM_FREQ = {
  th: 3.56, he: 3.07, in: 2.43, er: 2.05, an: 1.99, re: 1.85,
  on: 1.76, at: 1.49, en: 1.45, nd: 1.35, ti: 1.34, es: 1.34,
  or: 1.28, te: 1.27, of: 1.17, ed: 1.17, is: 1.13, it: 1.12,
  al: 1.09, ar: 1.07, st: 1.05, to: 1.05, nt: 1.04, ng: 0.95,
  se: 0.93, ha: 0.93, as: 0.87, ou: 0.87, io: 0.83, le: 0.83,
  ve: 0.83, co: 0.79, me: 0.79, de: 0.76, hi: 0.73, ri: 0.73,
  ro: 0.73, ic: 0.70, ne: 0.69, ea: 0.69, ra: 0.69, ce: 0.65,
  li: 0.62, ch: 0.60, ll: 0.58, be: 0.58, ma: 0.57, si: 0.55,
  om: 0.55, ur: 0.54, ca: 0.53, el: 0.53, ta: 0.53, la: 0.53,
  ns: 0.51, ge: 0.51, ha: 0.93, di: 0.50, ol: 0.47, ly: 0.47,
  no: 0.45, pe: 0.44, us: 0.44, ss: 0.44, ec: 0.43, un: 0.43,
  lo: 0.43, ni: 0.43, ut: 0.43, il: 0.42, rs: 0.41, em: 0.41,
  nc: 0.41, so: 0.40, rt: 0.40, sh: 0.39, ie: 0.39, ai: 0.39,
  ct: 0.38, ot: 0.38, tr: 0.38, fo: 0.37, wh: 0.36, ho: 0.35,
  ac: 0.35, tu: 0.35, et: 0.35, su: 0.33, pr: 0.32, ck: 0.31,
  oo: 0.31, ad: 0.31, wi: 0.31, po: 0.30, we: 0.30, na: 0.30,
  ee: 0.30, ow: 0.29, tt: 0.29, da: 0.29, id: 0.28, th: 3.56
};

// English trigram frequencies (top ones, % of all trigrams)
const ENGLISH_TRIGRAM_FREQ = {
  the: 3.51, and: 1.59, ing: 1.47, her: 0.82, hat: 0.65,
  his: 0.60, tha: 0.59, ere: 0.56, for: 0.55, ent: 0.53,
  ion: 0.51, ter: 0.46, was: 0.46, you: 0.44, ith: 0.43,
  ver: 0.43, all: 0.42, wit: 0.40, thi: 0.39, tin: 0.38,
  ate: 0.36, ati: 0.35, tion: 0.31, con: 0.30, are: 0.30,
  ess: 0.30, not: 0.29, ive: 0.29, ons: 0.28, ste: 0.27,
  man: 0.27, ers: 0.27, est: 0.26, rea: 0.26, ted: 0.25,
  oun: 0.25, ome: 0.25, eve: 0.25, nce: 0.24, ine: 0.24,
  one: 0.24, hou: 0.24, hen: 0.23, res: 0.23, ght: 0.23,
  rin: 0.23, ore: 0.22, han: 0.22, our: 0.22, igh: 0.22,
  ove: 0.22, ell: 0.22, out: 0.21, end: 0.21, ble: 0.21,
  ine: 0.24, ill: 0.21, com: 0.20, ect: 0.20, ard: 0.20,
  int: 0.20, igh: 0.22, age: 0.20
};

const SAMPLE_SIZE = 200_000;
const MODE = 'lexicon';

console.log(`Generating ${SAMPLE_SIZE} ${MODE} words...`);
const startTime = Date.now();

const words = [];
for (let i = 0; i < SAMPLE_SIZE; i++) {
  const w = generateWord({ mode: MODE });
  words.push(w.written.clean.toLowerCase());
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`Generated in ${elapsed}s (${Math.round(SAMPLE_SIZE / ((Date.now() - startTime) / 1000))} words/sec)\n`);

// Count frequencies
const letterCounts = {};
const bigramCounts = {};
const trigramCounts = {};
let totalLetters = 0;
let totalBigrams = 0;
let totalTrigrams = 0;

for (const word of words) {
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    letterCounts[ch] = (letterCounts[ch] || 0) + 1;
    totalLetters++;

    if (i < word.length - 1) {
      const bg = word.slice(i, i + 2);
      bigramCounts[bg] = (bigramCounts[bg] || 0) + 1;
      totalBigrams++;
    }
    if (i < word.length - 2) {
      const tg = word.slice(i, i + 3);
      trigramCounts[tg] = (trigramCounts[tg] || 0) + 1;
      totalTrigrams++;
    }
  }
}

// Convert to percentages
const letterFreqs = {};
for (const [ch, count] of Object.entries(letterCounts)) {
  letterFreqs[ch] = (count / totalLetters) * 100;
}

const bigramFreqs = {};
for (const [bg, count] of Object.entries(bigramCounts)) {
  bigramFreqs[bg] = (count / totalBigrams) * 100;
}

const trigramFreqs = {};
for (const [tg, count] of Object.entries(trigramCounts)) {
  trigramFreqs[tg] = (count / totalTrigrams) * 100;
}

// === LETTER ANALYSIS ===
console.log('═══════════════════════════════════════════════════════');
console.log('LETTER FREQUENCY GAPS (sorted by |gap| × english_freq)');
console.log('═══════════════════════════════════════════════════════');

const letterGaps = Object.entries(ENGLISH_LETTER_FREQ).map(([letter, engFreq]) => {
  const genFreq = letterFreqs[letter] || 0;
  const gap = genFreq - engFreq;
  const ratio = genFreq / engFreq;
  const impact = Math.abs(gap) * engFreq;
  return { letter, engFreq, genFreq: +genFreq.toFixed(2), gap: +gap.toFixed(2), ratio: +ratio.toFixed(2), impact: +impact.toFixed(1) };
});
letterGaps.sort((a, b) => b.impact - a.impact);

console.log('Letter | Gen%   | Eng%   | Gap    | Ratio | Impact');
console.log('-------|--------|--------|--------|-------|-------');
for (const { letter, genFreq, engFreq, gap, ratio, impact } of letterGaps) {
  const dir = gap > 0 ? '+' : '';
  console.log(`  ${letter}    | ${genFreq.toFixed(2).padStart(5)} | ${engFreq.toFixed(2).padStart(5)} | ${dir}${gap.toFixed(2).padStart(5)} | ${ratio.toFixed(2).padStart(5)} | ${impact.toFixed(1).padStart(5)}`);
}

// Correlation
const engLetterVals = Object.keys(ENGLISH_LETTER_FREQ).map(l => ENGLISH_LETTER_FREQ[l]);
const genLetterVals = Object.keys(ENGLISH_LETTER_FREQ).map(l => letterFreqs[l] || 0);
console.log(`\nLetter correlation (r): ${pearson(engLetterVals, genLetterVals).toFixed(4)}`);

// === BIGRAM ANALYSIS ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('BIGRAM FREQUENCY GAPS (sorted by |gap| × english_freq)');
console.log('Top 50 by impact');
console.log('═══════════════════════════════════════════════════════════');

// Collect ALL bigrams (from both generated and English reference)
const allBigrams = new Set([...Object.keys(ENGLISH_BIGRAM_FREQ), ...Object.keys(bigramFreqs)]);
const bigramGaps = [];
for (const bg of allBigrams) {
  const engFreq = ENGLISH_BIGRAM_FREQ[bg] || 0;
  const genFreq = bigramFreqs[bg] || 0;
  const gap = genFreq - engFreq;
  const impact = Math.abs(gap) * Math.max(engFreq, genFreq);
  bigramGaps.push({ bigram: bg, engFreq, genFreq: +genFreq.toFixed(3), gap: +gap.toFixed(3), ratio: engFreq > 0 ? +(genFreq / engFreq).toFixed(2) : 999, impact: +impact.toFixed(3) });
}
bigramGaps.sort((a, b) => b.impact - a.impact);

console.log('Bigram | Gen%    | Eng%    | Gap     | Ratio | Impact');
console.log('-------|---------|---------|---------|-------|-------');
for (const { bigram, genFreq, engFreq, gap, ratio, impact } of bigramGaps.slice(0, 50)) {
  const dir = gap > 0 ? '+' : '';
  console.log(`  ${bigram.padEnd(4)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${dir}${gap.toFixed(3).padStart(6)} | ${ratio.toFixed(2).padStart(5)} | ${impact.toFixed(3).padStart(6)}`);
}

// Bigram correlation (only for bigrams in English reference)
const engBigramKeys = Object.keys(ENGLISH_BIGRAM_FREQ);
const engBigramVals = engBigramKeys.map(b => ENGLISH_BIGRAM_FREQ[b]);
const genBigramVals = engBigramKeys.map(b => bigramFreqs[b] || 0);
console.log(`\nBigram correlation (r): ${pearson(engBigramVals, genBigramVals).toFixed(4)}`);

// === TRIGRAM ANALYSIS ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('TRIGRAM FREQUENCY GAPS (sorted by |gap| × english_freq)');
console.log('Top 30 by impact');
console.log('═══════════════════════════════════════════════════════════');

const allTrigrams = new Set([...Object.keys(ENGLISH_TRIGRAM_FREQ), ...Object.keys(trigramFreqs)]);
const trigramGaps = [];
for (const tg of allTrigrams) {
  const engFreq = ENGLISH_TRIGRAM_FREQ[tg] || 0;
  const genFreq = trigramFreqs[tg] || 0;
  const gap = genFreq - engFreq;
  const impact = Math.abs(gap) * Math.max(engFreq, genFreq);
  if (engFreq > 0 || genFreq > 0.05) {
    trigramGaps.push({ trigram: tg, engFreq, genFreq: +genFreq.toFixed(3), gap: +gap.toFixed(3), ratio: engFreq > 0 ? +(genFreq / engFreq).toFixed(2) : 999, impact: +impact.toFixed(3) });
  }
}
trigramGaps.sort((a, b) => b.impact - a.impact);

console.log('Trigram | Gen%    | Eng%    | Gap     | Ratio | Impact');
console.log('--------|---------|---------|---------|-------|-------');
for (const { trigram, genFreq, engFreq, gap, ratio, impact } of trigramGaps.slice(0, 30)) {
  const dir = gap > 0 ? '+' : '';
  console.log(`  ${trigram.padEnd(5)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${dir}${gap.toFixed(3).padStart(6)} | ${ratio.toFixed(2).padStart(5)} | ${impact.toFixed(3).padStart(6)}`);
}

// === OVER-GENERATED BIGRAMS (not in English top list) ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('TOP GENERATED BIGRAMS NOT IN ENGLISH TOP-100');
console.log('═══════════════════════════════════════════════════════════');

const novelBigrams = Object.entries(bigramFreqs)
  .filter(([bg]) => !ENGLISH_BIGRAM_FREQ[bg])
  .map(([bg, freq]) => ({ bigram: bg, freq: +freq.toFixed(3) }))
  .sort((a, b) => b.freq - a.freq)
  .slice(0, 20);

for (const { bigram, freq } of novelBigrams) {
  console.log(`  ${bigram}: ${freq.toFixed(3)}%`);
}

// Pearson correlation
function pearson(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx, yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  return num / Math.sqrt(dx * dy);
}
