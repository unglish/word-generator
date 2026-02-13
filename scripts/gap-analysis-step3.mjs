/**
 * Issue #162 Step 3: Trigram disambiguation + ND deep dive
 * Pinpoint exact pipeline stages responsible for top outliers.
 */

import { generateWord } from '../dist/index.js';

const SAMPLE_SIZE = 200_000;
const MODE = 'lexicon';

console.log(`Generating ${SAMPLE_SIZE} words for trigram + structural analysis...\n`);
const start = Date.now();

// Counters
const trigramCounts = {};
let totalTrigrams = 0;

// Structural analysis
let ndCodaCount = 0;        // words with /n/+/d/ in any coda
let twoPlusCodaCount = 0;   // syllables with 2+ coda consonants
let totalSyllables = 0;
let totalWords = 0;

// Y position analysis
let yInitial = 0, yMedial = 0, yFinal = 0, yTotal = 0;

// Vowel reduction tracking
let ɪTotal = 0, ɪReduced = 0;

// Coda length distribution
const codaLengths = [0, 0, 0, 0, 0]; // 0,1,2,3,4+

// AT context analysis
const atContexts = {}; // trigram around AT

// ET context analysis  
const etContexts = {};

// CE investigation - why zero?
let sBeforeECount = 0;
let sFinalCount = 0;
let cGraphemeAttempts = 0;

// finalS tracking
let finalSWords = 0;
let finalSTAfterT = 0;

for (let i = 0; i < SAMPLE_SIZE; i++) {
  const word = generateWord({ mode: MODE });
  const written = word.written.clean.toLowerCase();
  const syllables = word.syllables;
  totalWords++;
  
  // Trigrams
  for (let j = 0; j < written.length - 2; j++) {
    const tg = written.slice(j, j + 3);
    trigramCounts[tg] = (trigramCounts[tg] || 0) + 1;
    totalTrigrams++;
  }
  
  // AT/ET trigram context
  for (let j = 0; j < written.length - 1; j++) {
    const bg = written.slice(j, j + 2);
    if (bg === 'at') {
      const before = j > 0 ? written[j-1] : '^';
      const after = j + 2 < written.length ? written[j+2] : '$';
      const ctx = `${before}_at_${after}`;
      atContexts[ctx] = (atContexts[ctx] || 0) + 1;
    }
    if (bg === 'et') {
      const before = j > 0 ? written[j-1] : '^';
      const after = j + 2 < written.length ? written[j+2] : '$';
      const ctx = `${before}_et_${after}`;
      etContexts[ctx] = (etContexts[ctx] || 0) + 1;
    }
  }
  
  // Y position
  for (let j = 0; j < written.length; j++) {
    if (written[j] === 'y') {
      yTotal++;
      if (j === 0) yInitial++;
      else if (j === written.length - 1) yFinal++;
      else yMedial++;
    }
  }
  
  // Structural: coda analysis
  let hasNdCoda = false;
  for (const syl of syllables) {
    totalSyllables++;
    const codaLen = syl.coda.length;
    codaLengths[Math.min(codaLen, 4)]++;
    if (codaLen >= 2) twoPlusCodaCount++;
    
    // Check for /n/+/d/ in coda
    for (let c = 0; c < syl.coda.length - 1; c++) {
      if (syl.coda[c].sound === 'n' && syl.coda[c+1].sound === 'd') {
        hasNdCoda = true;
      }
    }
    
    // Check vowel reduction
    for (const p of syl.nucleus) {
      if (p.sound === 'ɪ' || p.sound === 'ə') {
        // Can't directly tell if it was reduced, but we can count
      }
    }
    
    // Check for final /s/ after /t/
    if (syl.coda.length >= 2) {
      const last = syl.coda[syl.coda.length - 1];
      const prev = syl.coda[syl.coda.length - 2];
      if (last.sound === 's' && prev.sound === 't') {
        finalSTAfterT++;
      }
      if (last.sound === 's') finalSWords++;
    }
  }
  if (hasNdCoda) ndCodaCount++;
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`Done in ${elapsed}s\n`);

// === TRIGRAM ANALYSIS FOR AT ===
console.log('═══════════════════════════════════════════════════════════');
console.log('AT TRIGRAM CONTEXTS (what surrounds "at"?)');
console.log('═══════════════════════════════════════════════════════════');
const atSorted = Object.entries(atContexts).sort((a, b) => b[1] - a[1]).slice(0, 20);
const atTotal = atSorted.reduce((s, [, c]) => s + c, 0);
for (const [ctx, count] of atSorted) {
  console.log(`  ${ctx.padEnd(15)} ${count.toString().padStart(6)} (${((count/atTotal)*100).toFixed(1)}%)`);
}

// === TRIGRAM ANALYSIS FOR ET ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('ET TRIGRAM CONTEXTS (what surrounds "et"?)');
console.log('═══════════════════════════════════════════════════════════');
const etSorted = Object.entries(etContexts).sort((a, b) => b[1] - a[1]).slice(0, 20);
const etTotal = etSorted.reduce((s, [, c]) => s + c, 0);
for (const [ctx, count] of etSorted) {
  console.log(`  ${ctx.padEnd(15)} ${count.toString().padStart(6)} (${((count/etTotal)*100).toFixed(1)}%)`);
}

// === Y POSITION ANALYSIS ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('Y POSITION ANALYSIS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Total Y: ${yTotal}`);
console.log(`  Initial: ${yInitial} (${((yInitial/yTotal)*100).toFixed(1)}%)`);
console.log(`  Medial:  ${yMedial} (${((yMedial/yTotal)*100).toFixed(1)}%)`);
console.log(`  Final:   ${yFinal} (${((yFinal/yTotal)*100).toFixed(1)}%)`);

// === CODA STRUCTURE ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('CODA LENGTH DISTRIBUTION');
console.log('═══════════════════════════════════════════════════════════');
for (let i = 0; i < codaLengths.length; i++) {
  const label = i === 4 ? '4+' : `${i}`;
  console.log(`  ${label} consonants: ${codaLengths[i]} (${((codaLengths[i]/totalSyllables)*100).toFixed(1)}%)`);
}
console.log(`  2+ consonant codas: ${twoPlusCodaCount} (${((twoPlusCodaCount/totalSyllables)*100).toFixed(1)}% of syllables)`);
console.log(`  Words with /nd/ coda: ${ndCodaCount} (${((ndCodaCount/totalWords)*100).toFixed(2)}% of words)`);

// === TS / FINAL-S ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('FINAL-S ANALYSIS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  Syllables ending in /s/ (after another consonant): ${finalSWords}`);
console.log(`  Of those, /t/+/s/ specifically: ${finalSTAfterT} (${finalSWords > 0 ? ((finalSTAfterT/finalSWords)*100).toFixed(1) : 0}%)`);

// === TOP TRIGRAMS (over-generated) ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('TOP OVER-GENERATED TRIGRAMS (not common in English)');
console.log('═══════════════════════════════════════════════════════════');

// English common trigrams for reference
const ENGLISH_COMMON = new Set([
  'the','and','ing','her','hat','his','tha','ere','for','ent',
  'ion','ter','was','you','ith','ver','all','wit','thi','tin',
  'ate','ati','con','are','ess','not','ive','ons','ste','man',
  'ers','est','rea','ted','oun','ome','eve','nce','ine','one',
  'hen','res','ght','rin','ore','han','our','igh','ove','ell',
  'out','end','ble','ill','com','ect','ard','int','age',
  'str','ble','ght','tion','ness','ment','able'
]);

const overgenTrigrams = Object.entries(trigramCounts)
  .filter(([tg]) => !ENGLISH_COMMON.has(tg))
  .map(([tg, count]) => ({ trigram: tg, freq: (count / totalTrigrams) * 100 }))
  .sort((a, b) => b.freq - a.freq)
  .slice(0, 30);

for (const { trigram, freq } of overgenTrigrams) {
  console.log(`  ${trigram}: ${freq.toFixed(3)}%`);
}

// === TOP UNDER-GENERATED TRIGRAMS ===
console.log('\n═══════════════════════════════════════════════════════════');
console.log('TOP UNDER-GENERATED TRIGRAMS (common in English but rare here)');
console.log('═══════════════════════════════════════════════════════════');

const ENGLISH_TRIGRAM_FREQ = {
  the: 3.51, and: 1.59, ing: 1.47, her: 0.82, hat: 0.65,
  his: 0.60, tha: 0.59, ere: 0.56, for: 0.55, ent: 0.53,
  ion: 0.51, ter: 0.46, was: 0.46, you: 0.44, ith: 0.43,
  ver: 0.43, all: 0.42, wit: 0.40, thi: 0.39, tin: 0.38
};

const undergenTrigrams = Object.entries(ENGLISH_TRIGRAM_FREQ)
  .map(([tg, engFreq]) => {
    const genFreq = ((trigramCounts[tg] || 0) / totalTrigrams) * 100;
    return { trigram: tg, engFreq, genFreq, ratio: genFreq / engFreq };
  })
  .sort((a, b) => a.ratio - b.ratio);

console.log('Trigram | Gen%    | Eng%    | Ratio');
console.log('--------|---------|---------|------');
for (const { trigram, genFreq, engFreq, ratio } of undergenTrigrams) {
  console.log(`  ${trigram.padEnd(5)} | ${genFreq.toFixed(3).padStart(6)} | ${engFreq.toFixed(3).padStart(6)} | ${ratio.toFixed(2)}`);
}

// === ROOT CAUSE CATEGORIZATION ===
console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('STEP 4: ROOT CAUSE CATEGORIZATION');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Category 1: GRAPHEME FREQUENCY (wrong spelling preference)');
console.log('  • Y overgen: /i:/→y final (freq 100), /eɪ/→ay (freq 10 × endWord 100)');
console.log('  • CE at 0%: /s/→ce endWord grapheme has freq 3, condition may block');
console.log('  • UH: /ʌ/→uh freq 30 — too high for rare English digraph');
console.log('  • KE: /k/→k fires before front vowels instead of /k/→c');
console.log('');
console.log('Category 2: PHONEME WEIGHT (sound over/under-generated)');
console.log('  • /t/ onset=350 coda=350 — highest consonant, drives AT/ET/TS');
console.log('  • /æ/ nucleus=220 — high, drives A overgen');
console.log('  • /n/ onset=350 coda=350 — weight is fine, problem is structural');
console.log('  • /ɪ/ nucleus=230 — high but reduced away before becoming "i"');
console.log('');
console.log('Category 3: STRUCTURAL (syllable shape, codas, repair)');
console.log('  • ND: 2-consonant codas only ' + ((twoPlusCodaCount/totalSyllables)*100).toFixed(1) + '% of syllables');
console.log('  • Low multi-consonant codas suppress ND, NT, NS, NG+stop');
console.log('  • finalS=15 adds /ts/ to 15% of t-final words → TS bigram');
console.log('');
console.log('Category 4: SPELLING RULES (post-processing)');
console.log('  • Magic-e moves vowel after consonant → inflates ET, ATE patterns');
console.log('  • no-final-i → y rule creates more final Y');
console.log('');
console.log('Category 5: VOWEL REDUCTION');
console.log('  • /ɪ/→/ə/ reduction means "i" grapheme underproduced');
console.log('  • /ə/→"e" then creates more E where I should be');

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('STEP 5: PRIORITIZED FIX LIST');
console.log('(ranked by impact = |deviation| × frequency)');
console.log('═══════════════════════════════════════════════════════════\n');

const fixes = [
  { rank: 1, impact: 'HIGH', target: 'Y grapheme frequencies', 
    action: 'Reduce /i:/→y endWord from 100→30, /eɪ/→ay endWord from 100→40, /aɪ/→y endWord from 50→20',
    affects: 'Y 3.84×→~2×, ay/yn/yt/ty bigrams', category: 'Grapheme freq' },
  { rank: 2, impact: 'HIGH', target: 'Multi-consonant coda probability',
    action: 'Increase polysyllabicNonzero weights for length 2+; check codaLength monosyllabic weights',
    affects: 'ND 0.10×, IN 0.24×, NT, NS all under', category: 'Structural' },
  { rank: 3, impact: 'HIGH', target: '/t/ phoneme weight',
    action: 'Reduce /t/ onset from 350→280, coda from 350→280',
    affects: 'T 1.24×, AT 1.95×, ET 7.22×, TS', category: 'Phoneme weight' },
  { rank: 4, impact: 'MED', target: '/s/→ce grapheme',
    action: 'Debug why ce never fires — likely condition/position filter blocks it. Enable or increase freq.',
    affects: 'CE 0%, C at 0.39×', category: 'Grapheme freq' },
  { rank: 5, impact: 'MED', target: '/ʌ/→uh grapheme',
    action: 'Reduce uh freq from 30→5 or eliminate',
    affects: 'UH 0.49% novel bigram', category: 'Grapheme freq' },
  { rank: 6, impact: 'MED', target: 'finalS probability',
    action: 'Reduce from 15→8, or make it weighted by coda-final phoneme',
    affects: 'TS 1.31% novel bigram', category: 'Structural' },
  { rank: 7, impact: 'MED', target: 'Vowel reduction /ɪ/ rate',
    action: 'Reduce /ɛ/→/ɪ/ probability from 70→50 to preserve more I graphemes',
    affects: 'IN 0.24×, I letter 0.71×', category: 'Vowel reduction' },
  { rank: 8, impact: 'LOW', target: 'no-final-i spelling rule',
    action: 'Already correct for English, but compounds Y problem. Consider only applying to true /ɪ/',
    affects: 'Y final position', category: 'Spelling rules' },
  { rank: 9, impact: 'LOW', target: '/æ/ nucleus weight',
    action: 'Reduce from 220→180 to bring A closer to English',
    affects: 'A 1.39×, AT bigram', category: 'Phoneme weight' },
  { rank: 10, impact: 'LOW', target: 'O/I nucleus weights',
    action: 'Increase /ɔ/ from 180→220, /ɪ/ midWord from 8→12',
    affects: 'O 0.70×, I 0.71×', category: 'Phoneme weight' },
];

for (const f of fixes) {
  console.log(`${f.rank}. [${f.impact}] ${f.target} (${f.category})`);
  console.log(`   Action: ${f.action}`);
  console.log(`   Affects: ${f.affects}\n`);
}
