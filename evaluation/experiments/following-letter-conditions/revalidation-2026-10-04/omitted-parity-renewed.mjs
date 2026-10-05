import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as parent from '/private/tmp/q14a-closure-audit-v1/committed/src/index.ts';
import * as candidate from '/private/tmp/q14b-closure-audit-v1/frozen-runtime/src/index.ts';
const root='/private/tmp/q14b-closure-audit-v1/frozen-runtime';
const frozen=JSON.parse(await readFile('/private/tmp/q14b-closure-audit-v1/original-capture-before.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function verify(){for(const [name,pin] of Object.entries(frozen.before.files.src))assert.equal(hash(await readFile(root+'/src/'+name)),pin.sha256,name);}
await verify();
const registration=JSON.parse(await readFile(root+'/evaluation/experiments/following-letter-conditions/measurement.json'));
let comparisons=0,calls=0,rngCalls=0,probes=0;
for(const split of [false,true]){
 const a=parent.createGenerator({...parent.englishConfig,...(split?{splitVowels:registration.splitVowels}:{})});
 const b=candidate.createGenerator({...candidate.englishConfig,...(split?{splitVowels:registration.splitVowels}:{})});
 for(const trace of [false,true])for(let seed=1;seed<=500;seed++){
  const ar=parent.createSeededRng(seed),br=candidate.createSeededRng(seed);let ac=0,bc=0;
  const options={mode:seed%2?'lexicon':'text',trace};
  const aw=a.generateWord({...options,rand:()=>{ac++;return ar();}});
  const bw=b.generateWord({...options,rand:()=>{bc++;return br();}});
  assert.deepEqual(bw,aw,`word split=${split} trace=${trace} seed=${seed}`);
  assert.equal(bc,ac); assert.equal(br(),ar());
  comparisons++;calls+=2;rngCalls+=ac;probes++;
 }
}
await verify();
const report={passed:true,parentRevision:'f284fb8c3321606f2a1cc3d61a5aad029c7f018f',candidateSourcePins:frozen.before.files.src,comparisons,publicCalls:calls,parentRngCalls:rngCalls,nextRngProbes:probes,scope:'Omitted followingLetters policy; default/split configurations, trace on/off, seeds 1–500, alternating lexicon/text. Deep equality covers complete returned words and traces.'};
await writeFile('/private/tmp/q14b-closure-audit-v1/omitted-parity-renewed.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,comparisons,publicCalls:calls,parentRngCalls:rngCalls,nextRngProbes:probes}));
