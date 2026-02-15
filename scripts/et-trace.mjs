import { generateWord } from '../dist/index.js';

// Trace specific seeds to see grapheme mappings
const seeds = [6880, 8852, 63472, 72965, 54196, 9377, 9404, 2101, 100000, 73672];

console.log('Tracing ET instances to phoneme→grapheme mappings:\n');

seeds.forEach(seed => {
  const word = generateWord({ seed });
  const written = word.written.clean.toLowerCase();
  
  if (!written.includes('et')) return;
  
  console.log(`\n${word.written.clean} (${word.pronunciation})`);
  console.log('Syllables:');
  
  let graphemePos = 0;
  word.syllables.forEach((syll, idx) => {
    const onset = syll.onset || [];
    const nucleus = syll.nucleus || [];
    const coda = syll.coda || [];
    
    console.log(`  Syl ${idx}:`);
    [...onset, ...nucleus, ...coda].forEach(phoneme => {
      // We'd need the actual grapheme output here
      // For now, let's just show the phoneme
      console.log(`    ${phoneme.sound}`);
    });
  });
});
