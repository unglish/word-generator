/**
 * Issue #162 Step 1: Full bigram/trigram gap analysis
 * Generate 200k lexicon words, compute letter + bigram + trigram frequencies,
 * compare to English reference data from the filtered CMU spelling reference.
 */

import { generateWord } from '../dist/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data', 'cmu', 'ordinary');

function referencePercentages(name) {
  const counts = JSON.parse(readFileSync(join(dataDir, name + '.json'), 'utf8'));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(counts).map(([gram, count]) => [gram, 100 * count / total]));
}

const ENGLISH_LETTER_FREQ = referencePercentages('letters');
const ENGLISH_BIGRAM_FREQ = referencePercentages('bigrams');
const ENGLISH_TRIGRAM_FREQ = referencePercentages('trigrams');
console.log('Spelling reference: CMU × SCOWL size 60');

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

// Trigram correlation
const engTrigramKeys = Object.keys(ENGLISH_TRIGRAM_FREQ);
const engTrigramVals = engTrigramKeys.map(t => ENGLISH_TRIGRAM_FREQ[t]);
const genTrigramVals = engTrigramKeys.map(t => trigramFreqs[t] || 0);
console.log(`\nTrigram correlation (r): ${pearson(engTrigramVals, genTrigramVals).toFixed(4)}`);

// === MOST OVER-REPRESENTED TRIGRAMS ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('MOST OVER-REPRESENTED TRIGRAMS (ratio > 3, min 0.05% gen)');
console.log('═══════════════════════════════════════════════════════════');

const overTrigrams = trigramGaps
  .filter(t => t.genFreq >= 0.05 && t.ratio > 3)
  .sort((a, b) => b.ratio - a.ratio)
  .slice(0, 20);

console.log('Trigram | Gen%    | Eng%    | Ratio');
console.log('--------|---------|---------|------');
for (const { trigram, genFreq, engFreq, ratio } of overTrigrams) {
  console.log(`  ${trigram.padEnd(5)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio.toFixed(1).padStart(5)}`);
}

// === MOST UNDER-REPRESENTED TRIGRAMS ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('MOST UNDER-REPRESENTED TRIGRAMS (ratio < 0.3, min 0.1% eng)');
console.log('═══════════════════════════════════════════════════════════');

const underTrigrams = trigramGaps
  .filter(t => t.engFreq >= 0.1 && t.ratio < 0.3 && t.ratio > 0)
  .sort((a, b) => a.ratio - b.ratio)
  .slice(0, 20);

console.log('Trigram | Gen%    | Eng%    | Ratio');
console.log('--------|---------|---------|------');
for (const { trigram, genFreq, engFreq, ratio } of underTrigrams) {
  console.log(`  ${trigram.padEnd(5)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio.toFixed(2).padStart(5)}`);
}

// === MOST OVER-REPRESENTED BIGRAMS (by ratio, min 0.1% generated) ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('MOST OVER-REPRESENTED BIGRAMS (ratio > 2, min 0.1% gen)');
console.log('═══════════════════════════════════════════════════════════');

const overBigrams = bigramGaps
  .filter(b => b.genFreq >= 0.1 && b.ratio > 2)
  .sort((a, b) => b.ratio - a.ratio)
  .slice(0, 20);

console.log('Bigram | Gen%    | Eng%    | Ratio');
console.log('-------|---------|---------|------');
for (const { bigram, genFreq, engFreq, ratio } of overBigrams) {
  console.log(`  ${bigram.padEnd(4)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio.toFixed(1).padStart(5)}`);
}

// === MOST UNDER-REPRESENTED BIGRAMS (by ratio, min 0.1% English) ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('MOST UNDER-REPRESENTED BIGRAMS (ratio < 0.5, min 0.1% eng)');
console.log('═══════════════════════════════════════════════════════════');

const underBigrams = bigramGaps
  .filter(b => b.engFreq >= 0.1 && b.ratio < 0.5 && b.ratio > 0)
  .sort((a, b) => a.ratio - b.ratio)
  .slice(0, 20);

console.log('Bigram | Gen%    | Eng%    | Ratio');
console.log('-------|---------|---------|------');
for (const { bigram, genFreq, engFreq, ratio } of underBigrams) {
  console.log(`  ${bigram.padEnd(4)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio.toFixed(2).padStart(5)}`);
}

