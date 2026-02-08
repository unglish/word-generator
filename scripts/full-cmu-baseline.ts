import { ARPABET_BIGRAM_COUNTS, ARPABET_TOTAL_COUNTS, ALL_ARPABET_PHONEMES } from '../src/phonotactic/arpabet-bigrams.js';

function getBigramLogProb(first: string, second: string): number {
  const bigramCounts = ARPABET_BIGRAM_COUNTS[first] || {};
  const bigramCount = bigramCounts[second] || 0;
  const totalCount = ARPABET_TOTAL_COUNTS[first] || 0;
  const vocabularySize = ALL_ARPABET_PHONEMES.size;
  return Math.log2((bigramCount + 1) / (totalCount + vocabularySize));
}

function scoreArpabet(arpabet: string): number {
  const phonemes = arpabet.trim().split(/\s+/);
  if (!phonemes.length) return -Infinity;
  const withBounds = ['#', ...phonemes, '#'];
  let total = 0;
  for (let i = 1; i < withBounds.length; i++) {
    total += getBigramLogProb(withBounds[i-1], withBounds[i]);
  }
  return total;
}

async function main() {
  const resp = await fetch('https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict');
  const text = await resp.text();
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith(';;;'));
  
  const scores: { word: string; score: number; perBigram: number; phonemeCount: number }[] = [];
  
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const word = parts[0].replace(/\(\d+\)$/, '');
    const arpabet = parts.slice(1).map(p => p.replace(/[0-9]/g, '')).join(' ');
    const phonemes = arpabet.split(' ');
    const score = scoreArpabet(arpabet);
    if (isFinite(score)) {
      scores.push({ word, score, perBigram: score / (phonemes.length + 1), phonemeCount: phonemes.length });
    }
  }
  
  scores.sort((a, b) => a.score - b.score);
  const vals = scores.map(s => s.score);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const median = vals[Math.floor(vals.length / 2)];
  const stddev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  
  const perBigram = scores.map(s => s.perBigram).sort((a, b) => a - b);
  const meanPerBigram = perBigram.reduce((a, b) => a + b, 0) / perBigram.length;
  
  console.log(`\n📊 Full CMU Dictionary Baseline (${scores.length} words)\n`);
  console.log(`  Total score:`);
  console.log(`    Mean:   ${mean.toFixed(2)}`);
  console.log(`    Median: ${median.toFixed(2)}`);
  console.log(`    Min:    ${vals[0].toFixed(2)}`);
  console.log(`    Max:    ${vals[vals.length-1].toFixed(2)}`);
  console.log(`    StdDev: ${stddev.toFixed(2)}`);
  
  console.log(`\n  Per-bigram (length-normalized):`);
  console.log(`    Mean:   ${meanPerBigram.toFixed(2)}`);
  console.log(`    Median: ${perBigram[Math.floor(perBigram.length/2)].toFixed(2)}`);
  console.log(`    Min:    ${perBigram[0].toFixed(2)}`);
  console.log(`    Max:    ${perBigram[perBigram.length-1].toFixed(2)}`);
  
  console.log(`\n  📉 10 worst-scoring words:`);
  for (const s of scores.slice(0, 10)) {
    console.log(`    ${s.score.toFixed(2)} (${s.perBigram.toFixed(2)}/bigram, ${s.phonemeCount} phonemes) — ${s.word}`);
  }
  
  console.log(`\n  📈 10 best-scoring words:`);
  for (const s of scores.slice(-10)) {
    console.log(`    ${s.score.toFixed(2)} (${s.perBigram.toFixed(2)}/bigram, ${s.phonemeCount} phonemes) — ${s.word}`);
  }
  
  // Distribution
  const buckets = new Map<number, number>();
  for (const v of vals) {
    const b = Math.floor(v / 10) * 10;
    buckets.set(b, (buckets.get(b) || 0) + 1);
  }
  console.log(`\n  📊 Distribution:`);
  for (const [b, count] of [...buckets.entries()].sort((a, b) => a - b)) {
    const pct = ((count / scores.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.max(1, Math.round(count / scores.length * 150)));
    console.log(`    ${(b + ' to ' + (b+10)).padStart(14)}: ${count.toString().padStart(6)} (${pct.padStart(5)}%) ${bar}`);
  }
}

main();
