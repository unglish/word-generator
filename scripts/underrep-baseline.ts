/**
 * Establish under-representation thresholds for n-gram quality gates.
 * 
 * Generates 5 × 200k word samples, compares to CMU baseline,
 * finds worst under-representation ratio across all runs,
 * subtracts 10% margin → initial threshold.
 */
import { generateWords } from '../src/core/generate.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEEDS = [42, 123, 456, 789, 1337];
const SAMPLE_SIZE = 200_000;
const MIN_BIGRAM_BASELINE_FREQ = 0.001;   // 0.1%
const MIN_TRIGRAM_BASELINE_FREQ = 0.0005;  // 0.05%

function loadCmuFreqs(filename: string): Record<string, number> {
  const raw = JSON.parse(readFileSync(join(__dirname, '..', 'memory', filename), 'utf8'));
  const total = Object.values(raw as Record<string, number>).reduce((a, b) => a + b, 0);
  const freq: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, number>)) {
    freq[k] = v / total;
  }
  return freq;
}

const cmuBigrams = loadCmuFreqs('cmu-lexicon-bigrams.json');
const cmuTrigrams = loadCmuFreqs('cmu-lexicon-trigrams.json');

// Filter to common patterns only
const commonBigrams = Object.entries(cmuBigrams).filter(([, f]) => f > MIN_BIGRAM_BASELINE_FREQ);
const commonTrigrams = Object.entries(cmuTrigrams).filter(([, f]) => f > MIN_TRIGRAM_BASELINE_FREQ);

console.log(`Common bigrams (>${MIN_BIGRAM_BASELINE_FREQ}): ${commonBigrams.length}`);
console.log(`Common trigrams (>${MIN_TRIGRAM_BASELINE_FREQ}): ${commonTrigrams.length}`);

interface RunResult {
  seed: number;
  worstBigram: { ngram: string; ratio: number };
  worstTrigram: { ngram: string; ratio: number };
  top10Bigrams: { ngram: string; ratio: number; cmuFreq: number; genFreq: number }[];
  top10Trigrams: { ngram: string; ratio: number; cmuFreq: number; genFreq: number }[];
}

const results: RunResult[] = [];

for (const seed of SEEDS) {
  console.log(`\n--- Seed ${seed} ---`);
  const words = generateWords(SAMPLE_SIZE, { seed });

  const bigramCounts: Record<string, number> = {};
  const trigramCounts: Record<string, number> = {};
  let bigramTotal = 0;
  let trigramTotal = 0;

  for (const w of words) {
    const text = w.written.clean.toLowerCase();
    for (let i = 0; i < text.length - 1; i++) {
      const bi = text.slice(i, i + 2);
      bigramCounts[bi] = (bigramCounts[bi] || 0) + 1;
      bigramTotal++;
    }
    for (let i = 0; i < text.length - 2; i++) {
      const tri = text.slice(i, i + 3);
      trigramCounts[tri] = (trigramCounts[tri] || 0) + 1;
      trigramTotal++;
    }
  }

  // Under-representation: generated/CMU ratio — lower = more under-represented
  const bigramRatios: { ngram: string; ratio: number; cmuFreq: number; genFreq: number }[] = [];
  for (const [bi, cmuFreq] of commonBigrams) {
    const genCount = bigramCounts[bi] || 0;
    const genFreq = genCount / bigramTotal;
    const ratio = genFreq / cmuFreq;
    bigramRatios.push({ ngram: bi, ratio, cmuFreq, genFreq });
  }
  bigramRatios.sort((a, b) => a.ratio - b.ratio);

  const trigramRatios: { ngram: string; ratio: number; cmuFreq: number; genFreq: number }[] = [];
  for (const [tri, cmuFreq] of commonTrigrams) {
    const genCount = trigramCounts[tri] || 0;
    const genFreq = genCount / trigramTotal;
    const ratio = genFreq / cmuFreq;
    trigramRatios.push({ ngram: tri, ratio, cmuFreq, genFreq });
  }
  trigramRatios.sort((a, b) => a.ratio - b.ratio);

  const worstBi = bigramRatios[0];
  const worstTri = trigramRatios[0];

  console.log(`Worst bigram: "${worstBi.ngram}" ratio=${worstBi.ratio.toFixed(4)} (gen=${worstBi.genFreq.toFixed(5)}, cmu=${worstBi.cmuFreq.toFixed(5)})`);
  console.log(`Worst trigram: "${worstTri.ngram}" ratio=${worstTri.ratio.toFixed(4)} (gen=${worstTri.genFreq.toFixed(5)}, cmu=${worstTri.cmuFreq.toFixed(5)})`);

  console.log('Top 10 under-represented bigrams:');
  for (const r of bigramRatios.slice(0, 10)) {
    console.log(`  "${r.ngram}" ratio=${r.ratio.toFixed(4)} gen=${r.genFreq.toFixed(5)} cmu=${r.cmuFreq.toFixed(5)}`);
  }
  console.log('Top 10 under-represented trigrams:');
  for (const r of trigramRatios.slice(0, 10)) {
    console.log(`  "${r.ngram}" ratio=${r.ratio.toFixed(4)} gen=${r.genFreq.toFixed(5)} cmu=${r.cmuFreq.toFixed(5)}`);
  }

  results.push({
    seed,
    worstBigram: { ngram: worstBi.ngram, ratio: worstBi.ratio },
    worstTrigram: { ngram: worstTri.ngram, ratio: worstTri.ratio },
    top10Bigrams: bigramRatios.slice(0, 10),
    top10Trigrams: trigramRatios.slice(0, 10),
  });
}

// Find global worst (lowest ratio) across all seeds
const globalWorstBi = results.reduce((min, r) => r.worstBigram.ratio < min.ratio ? { ...r.worstBigram, seed: r.seed } : min, { ngram: '', ratio: Infinity, seed: 0 });
const globalWorstTri = results.reduce((min, r) => r.worstTrigram.ratio < min.ratio ? { ...r.worstTrigram, seed: r.seed } : min, { ngram: '', ratio: Infinity, seed: 0 });

// Threshold = worst ratio - 10% margin (more lenient)
const bigramThreshold = +(globalWorstBi.ratio * 0.9).toFixed(4);
const trigramThreshold = +(globalWorstTri.ratio * 0.9).toFixed(4);

console.log(`\n=== RESULTS ===`);
console.log(`Global worst bigram: "${globalWorstBi.ngram}" ratio=${globalWorstBi.ratio.toFixed(4)} (seed ${globalWorstBi.seed})`);
console.log(`Global worst trigram: "${globalWorstTri.ngram}" ratio=${globalWorstTri.ratio.toFixed(4)} (seed ${globalWorstTri.seed})`);
console.log(`Thresholds (worst - 10%): bigram=${bigramThreshold}, trigram=${trigramThreshold}`);

// Save baseline data
const report = `# N-gram Under-Representation Threshold Baseline

Generated: ${new Date().toISOString()}

## Parameters
- Seeds: ${SEEDS.join(', ')}
- Sample size: ${SAMPLE_SIZE.toLocaleString()} words per seed
- Min bigram baseline freq: ${MIN_BIGRAM_BASELINE_FREQ} (${commonBigrams.length} common bigrams)
- Min trigram baseline freq: ${MIN_TRIGRAM_BASELINE_FREQ} (${commonTrigrams.length} common trigrams)

## Results per seed

${results.map(r => `### Seed ${r.seed}
- Worst bigram: "${r.worstBigram.ngram}" ratio=${r.worstBigram.ratio.toFixed(4)}
- Worst trigram: "${r.worstTrigram.ngram}" ratio=${r.worstTrigram.ratio.toFixed(4)}

Top 10 under-represented bigrams:
${r.top10Bigrams.map(b => `| ${b.ngram} | ${b.ratio.toFixed(4)} | gen=${b.genFreq.toFixed(5)} | cmu=${b.cmuFreq.toFixed(5)} |`).join('\n')}

Top 10 under-represented trigrams:
${r.top10Trigrams.map(t => `| ${t.ngram} | ${t.ratio.toFixed(4)} | gen=${t.genFreq.toFixed(5)} | cmu=${t.cmuFreq.toFixed(5)} |`).join('\n')}
`).join('\n')}

## Global worst
- Bigram: "${globalWorstBi.ngram}" ratio=${globalWorstBi.ratio.toFixed(4)} (seed ${globalWorstBi.seed})
- Trigram: "${globalWorstTri.ngram}" ratio=${globalWorstTri.ratio.toFixed(4)} (seed ${globalWorstTri.seed})

## Thresholds (worst × 0.9)
- minBigramRepresentation: ${bigramThreshold}
- minTrigramRepresentation: ${trigramThreshold}
`;

writeFileSync(join(__dirname, '..', 'memory', 'ngram-underrep-threshold-baseline.md'), report);
console.log('\nSaved to memory/ngram-underrep-threshold-baseline.md');

// Output JSON for easy copy
console.log('\nJSON for ngram-thresholds.json:');
console.log(JSON.stringify({
  minBigramRepresentation: bigramThreshold,
  minTrigramRepresentation: trigramThreshold,
  minBigramBaselineFreq: MIN_BIGRAM_BASELINE_FREQ,
  minTrigramBaselineFreq: MIN_TRIGRAM_BASELINE_FREQ,
}, null, 2));
