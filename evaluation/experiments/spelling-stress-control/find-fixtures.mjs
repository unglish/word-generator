import { createGenerator, createSeededRng, englishConfig } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
import { writeFileSync } from 'node:fs';
const config={...englishConfig,sharedSpellings:undefined,doubling:{...englishConfig.doubling,realizations:undefined},writtenFormConstraints:{...englishConfig.writtenFormConstraints,policy:undefined}};
const generator=createGenerator(config),rand=createSeededRng(1304238451),found={};
for(let i=0;i<20000;i++){
 const word=generator.generateWord({rand,morphology:false,trace:true});
 const b=word.trace.baseSpelling;
 const tests={partialTh:b.edits.some(e=>e.rule==='repairConsonantLetters'&&e.input.some(c=>c.origin.kind==='selection'&&b.units[c.origin.unitId].selected==='th')),
 join:b.edits.some(e=>e.rule==='deduplicateSyllableJoin'),
 vowelCap:b.edits.some(e=>e.rule==='postJoinVowelCap'),
 emptyEmission:b.edits.some(e=>e.rule==='deduplicateAdjacentLetters'),
 silentE:b.edits.some(e=>e.rule==='silentE:marker')};
 for(const [k,v] of Object.entries(tests))if(v&&!found[k])found[k]={index:i,word};
 if(Object.keys(found).length===5)break;
}
writeFileSync('/private/tmp/q02-current-fixtures.json',JSON.stringify(found));
console.log(JSON.stringify(Object.fromEntries(Object.entries(found).map(([k,v])=>[k,{index:v.index,word:v.word.written.clean,edits:v.word.trace.baseSpelling.edits.map(e=>({rule:e.rule,before:e.before,after:e.after}))}]))));
