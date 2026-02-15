import { generateWord } from '../dist/index.js';

const sampleSize = 10000;
const categories = {
  'e_plus_t_coda': [],           // /e/ or /ɛ/ → "e" + /t/ coda
  'schwa_plus_t': [],             // /ə/ → "e" + /t/
  'magic_e': [],                  // vowel+"e" graphemes (ee, ie, ue, etc.) + /t/
  'centering_diphthong': [],      // /ɪə/, /ʊə/, /eə/ → "e"-ending graphemes
  'morphology_et': [],            // -et suffix
  'other': []
};

for (let i = 0; i < sampleSize; i++) {
  const word = generateWord({ seed: i });
  const written = word.written.clean.toLowerCase();
  const phonemes = word.pronunciation;
  
  if (!written.includes('et')) continue;
  
  // Find "et" positions
  let idx = written.indexOf('et');
  while (idx !== -1) {
    const before = written[idx - 1] || '';
    const after = written[idx + 2] || '';
    const context = before + 'ET' + after;
    
    // Categorize based on phoneme pattern
    if (/eet|iet|uet/.test(written.substring(idx-2, idx+3))) {
      categories.magic_e.push({ written, phonemes, context });
    } else if (phonemes.includes('ɪə') || phonemes.includes('ʊə') || phonemes.includes('eə')) {
      categories.centering_diphthong.push({ written, phonemes, context });
    } else if (phonemes.includes('ə') && written.substring(idx, idx+2) === 'et') {
      categories.schwa_plus_t.push({ written, phonemes, context });
    } else if (/[^aeiouy]et/.test(written.substring(idx-1, idx+2))) {
      categories.e_plus_t_coda.push({ written, phonemes, context });
    } else {
      categories.other.push({ written, phonemes, context });
    }
    
    idx = written.indexOf('et', idx + 1);
  }
}

console.log('ET bigram categorization:\n');
Object.entries(categories).forEach(([cat, words]) => {
  console.log(`${cat}: ${words.length} instances`);
  if (words.length > 0) {
    console.log('  Examples:');
    words.slice(0, 5).forEach(w => {
      console.log(`    ${w.written.padEnd(20)} ${w.phonemes.padEnd(20)} ...${w.context}...`);
    });
  }
  console.log();
});
const total = Object.values(categories).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Total ET instances in ${sampleSize} words: ${total}`);
console.log(`Scaled to 200k: ~${Math.round(total * (200000/sampleSize))} (actual was 13220)\n`);

console.log('Breakdown:');
Object.entries(categories).forEach(([cat, words]) => {
  const pct = (words.length / total * 100).toFixed(1);
  console.log(`  ${cat.padEnd(25)} ${words.length.toString().padStart(4)} (${pct}%)`);
});
