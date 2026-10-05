import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createGenerator, englishConfig } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
import { englishSplitVowelSupports } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/elements/graphemes/split-vowels.ts';
import { createFollowingObserver } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/evaluation/experiments/following-letter-conditions/observe-following.ts';
const config = { ...englishConfig, splitVowels: { supports: englishSplitVowelSupports, routes: {
  syllable: { forms: ['ae','ie','oe','ue','ye'], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
}}, followingLetters: { targets: [{ phoneme:'s',form:'c' },{phoneme:'s',form:'sc'},{phoneme:'dʒ',form:'g'}] } };
const generator=createGenerator(config), observe=createFollowingObserver(config);
const counts:Record<string,number>={}, rows=[];
for(let seed=1;seed<=2000;seed++) {
  const word=generator.generateWord({seed,trace:true});
  const observation=observe(word);
  for(const [key,value] of Object.entries(observation.counts)) counts[key]=(counts[key]??0)+value;
  rows.push({seed,word,observation});
  if(seed%100===0) console.log(JSON.stringify({completed:seed}));
}
writeFileSync('/private/tmp/q14b-initial-pilot-v1.jsonl.gz',gzipSync(rows.map(row=>JSON.stringify(row)).join('\n')+'\n'));
writeFileSync('/private/tmp/q14b-initial-pilot-v1.json',JSON.stringify({scope:'Exploratory seed 1–2000 pilot; not the registered full candidate corpus',configuration:config,counts},null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(counts).filter(([key,value])=>value && (key.includes('soft') || key.includes('productive'))))));
