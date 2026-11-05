import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const modules=await Promise.all(['/tmp/pr313-main',process.cwd()].map(root=>import(pathToFileURL(root+'/src/index.ts'))));
const generators=modules.map(api=>{
 const base=api.englishConfig;
 const replacements=new Map(base.phonemes.map(p=>[p,p.sound==='n'?{...p,coda:460}:p.sound==='z'?{...p,coda:88}:p]));
 const phonemeMaps=Object.fromEntries(Object.entries(base.phonemeMaps).map(([pos,map])=>[pos,new Map([...map].map(([key,list])=>[key,list.map(p=>replacements.get(p))]))]));
 return api.createGenerator({...base,phonemes:[...replacements.values()],phonemeMaps,generationWeights:{...base.generationWeights,probability:{...base.generationWeights.probability,finalS:0,nasalStopExtension:0}}});
});
let words=0;
for(const mode of ['text','lexicon']) for(const morphology of [false,true]) {
 const rngs=modules.map(api=>api.createSeededRng(313));
 for(let draw=0;draw<2500;draw++) {
  const pair=generators.map((g,i)=>g.generateWord({rand:rngs[i],mode,morphology,trace:true}));
  assert.deepEqual(pair[0],pair[1],`${mode} ${morphology} ${draw}`);words++;
 }
 assert.equal(rngs[0](),rngs[1]());
}
writeFileSync('/tmp/pr313-weight-adopt/disabled-extension-parity.json',JSON.stringify({words,seed:313,profiles:4,fullTracedWordEquality:true,nextRngEquality:true}));
console.log('Full trace and next-RNG parity:',words);
