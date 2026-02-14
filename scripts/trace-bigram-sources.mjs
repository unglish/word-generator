#!/usr/bin/env node

import { generateWord } from '../dist/index.js';

const targetBigrams = ['or', 'is', 'in', 'he', 'er', 'on'];

console.log('Tracing 20k words to find bigram sources...\n');

const results = {};
for (const bigram of targetBigrams) {
  results[bigram] = {
    count: 0,
    graphemePairs: {},
    phonemePairs: {},
    positions: { start: 0, middle: 0, end: 0 }
  };
}

for (let i = 0; i < 20000; i++) {
  const word = generateWord({ mode: 'text', trace: true });
  const text = word.written.clean.toLowerCase();
  
  for (let pos = 0; pos < text.length - 1; pos++) {
    const bigram = text[pos] + text[pos + 1];
    
    if (results[bigram]) {
      results[bigram].count++;
      
      // Find which grapheme selections produced this bigram
      const trace = word.trace;
      if (trace && trace.graphemeSelections) {
        // Try to map letter positions back to grapheme selections
        let letterIdx = 0;
        for (const gs of trace.graphemeSelections) {
          const gLen = gs.selected.length;
          if (letterIdx === pos) {
            const key1 = `${gs.phoneme}→${gs.selected}`;
            results[bigram].graphemePairs[key1] = (results[bigram].graphemePairs[key1] || 0) + 1;
          }
          if (letterIdx === pos + 1) {
            const key2 = `${gs.phoneme}→${gs.selected}`;
            results[bigram].graphemePairs[key2] = (results[bigram].graphemePairs[key2] || 0) + 1;
          }
          letterIdx += gLen;
        }
      }
      
      // Position in word
      if (pos === 0) results[bigram].positions.start++;
      else if (pos === text.length - 2) results[bigram].positions.end++;
      else results[bigram].positions.middle++;
    }
  }
}

console.log('=== BIGRAM SOURCE ANALYSIS ===\n');

for (const bigram of targetBigrams) {
  const r = results[bigram];
  console.log(`\n### ${bigram.toUpperCase()} (found ${r.count} times)`);
  
  console.log('\nPositions:');
  console.log(`  Start: ${r.positions.start}, Middle: ${r.positions.middle}, End: ${r.positions.end}`);
  
  console.log('\nTop grapheme sources:');
  const sorted = Object.entries(r.graphemePairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  for (const [pair, count] of sorted) {
    console.log(`  ${pair}: ${count}`);
  }
}

console.log('\n✓ Trace analysis complete');
