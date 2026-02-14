#!/usr/bin/env node

import { generateWords } from '../dist/index.js';

// Target bigrams from issue #180
const targetBigrams = ['he', 'in', 'on', 'an', 'er', 'st', 'is', 'or'];

// English baseline frequencies (from corpus analysis)
const englishFreq = {
  'he': 3.07,  // 2nd most common
  'in': 2.43,  // 3rd
  'er': 2.05,  // 4th
  'an': 1.99,  // 5th
  'on': 1.76,  // 7th
  'st': 1.2,   // approximate (not in top 20)
  'is': 1.13,  // 13th
  'or': 1.28   // 9th
};

console.log('Generating 200k words...');
const words = generateWords(200000, { mode: 'text' });
console.log('✓ Generated');

// Count bigrams
const bigramCounts = {};
let totalBigrams = 0;

for (const word of words) {
  const text = word.written.clean.toLowerCase();
  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text[i] + text[i + 1];
    if (/^[a-z]{2}$/.test(bigram)) {
      bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
      totalBigrams++;
    }
  }
}

console.log('\n=== COMMON BIGRAM ANALYSIS ===\n');
console.log('Bigram  |  Unglish%  |  English%  |   Ratio  | Status');
console.log('--------|------------|------------|----------|--------');

const results = [];
for (const bigram of targetBigrams) {
  const count = bigramCounts[bigram] || 0;
  const unglishPct = (count / totalBigrams * 100);
  const englishPct = englishFreq[bigram];
  const ratio = unglishPct / englishPct;
  const status = ratio < 0.5 ? '⚠️ LOW' : ratio > 2 ? '⚠️ HIGH' : '✓';
  
  results.push({ bigram, unglishPct, englishPct, ratio, count });
  
  console.log(
    `${bigram.padEnd(7)} | ${unglishPct.toFixed(2).padStart(9)}% | ${englishPct.toFixed(2).padStart(9)}% | ${ratio.toFixed(2).padStart(7)}× | ${status}`
  );
}

console.log('\n=== SAMPLE WORDS ===\n');

// Show 10 random words containing each under-represented bigram
for (const { bigram, ratio } of results) {
  if (ratio < 0.7) {
    const samples = words
      .filter(w => w.written.clean.toLowerCase().includes(bigram))
      .slice(0, 10)
      .map(w => w.written.clean);
    
    console.log(`${bigram}: ${samples.join(', ')}`);
  }
}

console.log('\n✓ Analysis complete');
