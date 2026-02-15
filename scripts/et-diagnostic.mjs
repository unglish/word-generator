import { generateWord } from '../dist/index.js';

const sampleSize = 200000;
const etWords = [];

for (let i = 0; i < sampleSize; i++) {
  const word = generateWord({ seed: i });
  if (word.written.clean.toLowerCase().includes('et')) {
    etWords.push({
      written: word.written.clean,
      phonemes: word.syllables.flatMap(s => 
        [...(s.onset || []), ...s.nucleus, ...(s.coda || [])]
      ).map(p => p.sound).join(' '),
      seed: i
    });
  }
}

console.log(`ET bigram occurrences: ${etWords.length}/${sampleSize} (${(etWords.length/sampleSize*100).toFixed(2)}%)`);

// Sample 50 random examples for analysis
const sample = etWords.sort(() => Math.random() - 0.5).slice(0, 50);
console.log('\nSample instances:');
sample.forEach(w => {
  console.log(`${w.written.padEnd(20)} | ${w.phonemes} | seed:${w.seed}`);
});
