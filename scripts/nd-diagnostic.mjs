import { generateWords } from '../dist/index.js';

const N = 50000;
const words = generateWords(N, { seed: 42 });

// Count bigrams
const bigramCounts = {};
let totalBigrams = 0;

for (const w of words) {
  const text = w.written.clean.toLowerCase();
  for (let i = 0; i < text.length - 1; i++) {
    const bg = text[i] + text[i+1];
    bigramCounts[bg] = (bigramCounts[bg] || 0) + 1;
    totalBigrams++;
  }
}

const nd = bigramCounts['nd'] || 0;
console.log(`ND: ${nd}/${totalBigrams} = ${(nd/totalBigrams*100).toFixed(3)}%`);

// Also check syllable structure
let codaLen2Plus = 0;
let codaStartsN = 0;
let codaNd = 0;
let totalSyllables = 0;

for (const w of words) {
  for (const syl of w.syllables) {
    totalSyllables++;
    if (syl.coda.length >= 2) {
      codaLen2Plus++;
      if (syl.coda[0].sound === 'n') {
        codaStartsN++;
        if (syl.coda.length >= 2 && syl.coda[1].sound === 'd') {
          codaNd++;
        }
      }
    }
  }
}

console.log(`Total syllables: ${totalSyllables}`);
console.log(`Coda len >= 2: ${codaLen2Plus} (${(codaLen2Plus/totalSyllables*100).toFixed(2)}%)`);
console.log(`Coda starts /n/: ${codaStartsN} (${(codaStartsN/codaLen2Plus*100).toFixed(2)}% of len>=2)`);
console.log(`Coda /nd/: ${codaNd} (${(codaNd/codaStartsN*100).toFixed(2)}% of /n/-initial codas)`);

// Check what follows /n/ in codas
const nFollowers = {};
for (const w of words) {
  for (const syl of w.syllables) {
    if (syl.coda.length >= 2 && syl.coda[0].sound === 'n') {
      const next = syl.coda[1].sound;
      nFollowers[next] = (nFollowers[next] || 0) + 1;
    }
  }
}
console.log('\nWhat follows /n/ in codas:', nFollowers);

// Check boundary drops - how many mid-word nd codas survive
let midWordNd = 0;
let endWordNd = 0;
for (const w of words) {
  for (let i = 0; i < w.syllables.length; i++) {
    const syl = w.syllables[i];
    const isEnd = i === w.syllables.length - 1;
    if (syl.coda.length >= 2 && syl.coda[0].sound === 'n' && syl.coda[1].sound === 'd') {
      if (isEnd) endWordNd++;
      else midWordNd++;
    }
  }
}
console.log(`\n/nd/ codas: end-of-word=${endWordNd}, mid-word=${midWordNd}`);
