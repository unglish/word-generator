import { createGenerator, englishConfig } from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
import {writeFileSync} from 'node:fs';
const legacy={...englishConfig,sharedSpellings:undefined,doubling:{...englishConfig.doubling,realizations:undefined},writtenFormConstraints:{...englishConfig.writtenFormConstraints,policy:undefined}};
const a=createGenerator(legacy);
const weights={bare:0,prefixed:1,suffixed:0,both:0};
const b=createGenerator({...englishConfig,morphology:{...englishConfig.morphology,prefixes:[englishConfig.morphology.prefixes.find(p=>p.written==='re')],templateWeights:{text:weights,lexicon:weights}}});
const found={};
for(let seed=0;seed<20000;seed++){
 if(!found.silent){const w=a.generateWord({seed,morphology:true,trace:true});const t=w.trace.baseSpelling;const e=t.edits.find(e=>e.rule==='silentE:marker');if(e&&t.surface.endsWith('ne')&&w.trace.morphology?.realization)found.silent={seed,word:w};}
 if(!found.bridge){const w=b.generateWord({seed,syllableCount:3,morphology:true,trace:true});if(w.lexical.root[0].onset.length===0&&w.lexical.root[1]?.onset[0]?.sound==='h'&&w.trace.structural.some(e=>e.event==='morphPrefixHiatusFallback'))found.bridge={seed,word:w};}
 if(found.silent&&found.bridge)break;
}
writeFileSync('/private/tmp/q02-affix-fixtures.json',JSON.stringify(found));
console.log(JSON.stringify(Object.fromEntries(Object.entries(found).map(([k,v])=>[k,{seed:v.seed,word:v.word.written.clean,base:v.word.trace.baseSpelling.surface}]))));
