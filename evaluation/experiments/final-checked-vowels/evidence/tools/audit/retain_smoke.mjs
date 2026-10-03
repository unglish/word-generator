import { createSeededRng, generateWord } from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/index.ts';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const selected = new Map(); let generated = 0;
for (const morphology of [false,true]) {
  const rand = createSeededRng(42);
  for (let i=0;i<1000;i++) {
    const word = generateWord({rand,mode:'lexicon',morphology,trace:true}); generated++;
    const last=word.syllables.at(-1);const repairs=word.trace.finalNucleus.repairs.filter(r=>r.rule==='repairFinalCheckedVowel');
    const checked=['ɪ','ɛ','æ','ʌ','ʊ'];
    const category=repairs.length ? `repaired:${last.stress ?? 'unstressed'}` : `legal:${last.coda.length ? 'closed' : 'open'}:${word.trace.morphology?.template ?? 'no-plan'}`;
    if (!selected.has(category)) selected.set(category,word);
  }
}
writeFileSync('/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator/.local-evidence/final-checked-vowels/audit/smoke-words.json.gz',gzipSync(JSON.stringify({scope:'fresh public API smoke fixtures, not formal corpus results',generated,fixtures:Object.fromEntries(selected)})));
console.log(JSON.stringify({generated,selected:[...selected.keys()]}));
