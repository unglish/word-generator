/**
 * Issue #162 Step 2: Trace bigrams to phoneme→grapheme sources
 * For each top outlier bigram, identify which phoneme combinations produce it.
 * 
 * Approach: generate words, capture both written and phoneme data,
 * align grapheme spans to phonemes, then count bigram origins.
 */

import { generateWord } from '../dist/index.js';

const SAMPLE_SIZE = 200_000;
const MODE = 'lexicon';

// Target bigrams to trace (top outliers from Step 1)
const TARGET_BIGRAMS = new Set([
  'he', 'et', 'ay', 'th', 'in', 'at', 'on', 'an', 'nd', 'ts',
  'ie', 'tr', 'ta', 'ey', 'ye', 'yn', 'yt', 'ty', 'ke', 'ak',
  'ow', 'ha', 'ra', 'ot', 'ea', 'ce', 'io', 'or', 'er', 'ar',
  'uh', 'iy'
]);

console.log(`Generating ${SAMPLE_SIZE} words and tracing bigram origins...\n`);
const start = Date.now();

// Track: for each bigram, which phoneme pair(s) produced it
// bigramSources[bigram] = Map<"phoneme1→grapheme1 + phoneme2→grapheme2", count>
const bigramSources = {};
for (const bg of TARGET_BIGRAMS) bigramSources[bg] = new Map();

// Also track total bigram counts for frequency
const bigramCounts = {};
let totalBigrams = 0;

for (let i = 0; i < SAMPLE_SIZE; i++) {
  const word = generateWord({ mode: MODE });
  const written = word.written.clean.toLowerCase();
  const syllables = word.syllables;
  
  // Build phoneme→grapheme alignment
  // Each syllable has onset/nucleus/coda phonemes, and the written form
  // We need to figure out which letters came from which phonemes
  // 
  // Strategy: walk through syllables, reconstruct the grapheme sequence
  // Each phoneme maps to one grapheme form. We can approximate by
  // tracking the phoneme sequence and matching against written output.
  
  // Collect the full phoneme→grapheme sequence
  const phonemeSeq = []; // [{sound, grapheme, position}]
  
  for (const syl of syllables) {
    for (const p of syl.onset) {
      phonemeSeq.push({ sound: p.sound, position: 'onset' });
    }
    for (const p of syl.nucleus) {
      phonemeSeq.push({ sound: p.sound, position: 'nucleus' });
    }
    for (const p of syl.coda) {
      phonemeSeq.push({ sound: p.sound, position: 'coda' });
    }
  }
  
  // Count bigrams in written form
  for (let j = 0; j < written.length - 1; j++) {
    const bg = written.slice(j, j + 2);
    bigramCounts[bg] = (bigramCounts[bg] || 0) + 1;
    totalBigrams++;
  }
  
  // For target bigrams, try to trace to phoneme origins
  // We'll use the pronunciation string to correlate
  const pron = word.pronunciation;
  
  // Simple approach: for each target bigram found in the word,
  // record the full phoneme sequence as context
  for (let j = 0; j < written.length - 1; j++) {
    const bg = written.slice(j, j + 2);
    if (!TARGET_BIGRAMS.has(bg)) continue;
    
    // Record a simplified source: the phoneme context
    // Use the phoneme sequence and approximate position
    const approxPhonemeIdx = Math.floor((j / written.length) * phonemeSeq.length);
    const nearPhonemes = phonemeSeq.slice(
      Math.max(0, approxPhonemeIdx - 1),
      Math.min(phonemeSeq.length, approxPhonemeIdx + 3)
    );
    const ctx = nearPhonemes.map(p => `/${p.sound}/`).join(' ');
    
    const map = bigramSources[bg];
    map.set(ctx, (map.get(ctx) || 0) + 1);
  }
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Generated in ${elapsed}s\n`);

// The phoneme alignment above is approximate. Let's do a better analysis:
// Generate a smaller sample with detailed grapheme tracking.

console.log('═══════════════════════════════════════════════════════════');
console.log('STEP 2: DETAILED GRAPHEME TRACING (10k sample)');
console.log('═══════════════════════════════════════════════════════════\n');

// For the detailed trace, we need to look at the actual grapheme forms
// chosen for each phoneme. The word object doesn't expose this directly,
// so we'll infer from the written form + phoneme sequence.

// Better approach: analyze the CONFIG to understand which phonemes can
// produce which letter sequences, then match against observed bigrams.

// Let's map: for each letter pair, which phoneme→grapheme combos can produce it
console.log('PHONEME→GRAPHEME MAPPING ANALYSIS');
console.log('Which phoneme/grapheme combinations can produce each target bigram?\n');

// Import the grapheme data from the built module
// We already have the full grapheme list from the bundle analysis
// Let's just analyze the phoneme sequence patterns

// Simpler, more accurate approach: 
// Generate 50k words, for each word reconstruct the grapheme sequence
// by walking the hyphenated form (which has &shy; syllable breaks)

const TRACE_SIZE = 50_000;
const detailedSources = {};
for (const bg of TARGET_BIGRAMS) detailedSources[bg] = new Map();

console.log(`Tracing ${TRACE_SIZE} words with phoneme detail...\n`);

for (let i = 0; i < TRACE_SIZE; i++) {
  const word = generateWord({ mode: MODE });
  const written = word.written.clean.toLowerCase();
  const pron = word.pronunciation;
  
  // Parse pronunciation into phoneme list
  // Format: ˈCVCC.ˌCVC or similar
  const phonemes = pron
    .replace(/[ˈˌ.]/g, '')  // strip stress/syllable markers
    .match(/tʃ|dʒ|eɪ|aɪ|ɔɪ|aʊ|əʊ|ɪə|eə|ʊə|aɪə|aʊə|eɪə|ɔɪə|əʊə|i:|ɚ|[a-zæɑɔəɛɜʊʌðθŋʃʒ]ʰ?/gi) || [];
  
  // For each bigram in the written form, find nearby phoneme context
  for (let j = 0; j < written.length - 1; j++) {
    const bg = written.slice(j, j + 2);
    if (!TARGET_BIGRAMS.has(bg)) continue;
    
    // Estimate which phonemes correspond to position j
    // Rough: map letter position to phoneme position proportionally
    const ratio = phonemes.length / Math.max(written.length, 1);
    const pIdx = Math.min(Math.floor(j * ratio), phonemes.length - 1);
    const pIdx2 = Math.min(pIdx + 1, phonemes.length - 1);
    
    // Get 2-3 phonemes around the bigram
    const p1 = phonemes[Math.max(0, pIdx)] || '?';
    const p2 = phonemes[Math.min(pIdx2, phonemes.length - 1)] || '?';
    
    const key = `/${p1}/ + /${p2}/`;
    const map = detailedSources[bg];
    map.set(key, (map.get(key) || 0) + 1);
  }
}

// Print results for each target bigram
const sortedBigrams = [...TARGET_BIGRAMS].sort((a, b) => {
  const aCount = bigramCounts[a] || 0;
  const bCount = bigramCounts[b] || 0;
  return bCount - aCount;
});

for (const bg of sortedBigrams) {
  const totalCount = bigramCounts[bg] || 0;
  const freq = ((totalCount / totalBigrams) * 100).toFixed(3);
  
  console.log(`\n── ${bg.toUpperCase()} (${freq}%, ${totalCount} occurrences in 200k) ──`);
  
  const sources = detailedSources[bg];
  const sorted = [...sources.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, c]) => s + c, 0);
  
  for (const [key, count] of sorted.slice(0, 8)) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${pct.padStart(5)}%  ${key} (${count})`);
  }
}

// Summary: top actionable findings
console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('SUMMARY: TOP ACTIONABLE FINDINGS');
console.log('═══════════════════════════════════════════════════════════\n');

// Y-related bigrams
const yBigrams = ['ay', 'ey', 'ye', 'yn', 'yt', 'ty', 'iy'];
let yTotal = 0;
for (const bg of yBigrams) yTotal += bigramCounts[bg] || 0;
const yPct = ((yTotal / totalBigrams) * 100).toFixed(2);
console.log(`Y-RELATED BIGRAMS: ${yPct}% of all bigrams (${yTotal} occurrences)`);
for (const bg of yBigrams) {
  const c = bigramCounts[bg] || 0;
  if (c > 0) console.log(`  ${bg}: ${((c / totalBigrams) * 100).toFixed(3)}%`);
}

console.log(`\nET: ${((bigramCounts['et'] || 0) / totalBigrams * 100).toFixed(3)}% — likely magic-e pattern`);
console.log(`AT: ${((bigramCounts['at'] || 0) / totalBigrams * 100).toFixed(3)}% — /æ/ and /ɑ/ both → 'a'`);
console.log(`ND: ${((bigramCounts['nd'] || 0) / totalBigrams * 100).toFixed(3)}% — cluster suppression`);
console.log(`TS: ${((bigramCounts['ts'] || 0) / totalBigrams * 100).toFixed(3)}% — finalS or /t/+/s/ coda`);
