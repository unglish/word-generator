import assert from 'node:assert/strict';
import * as candidate from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/dist/index.js';
import * as control from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/dist/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
const protocol = JSON.parse(readFileSync('/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/evaluation/quality/protocol.json','utf8'));
const disabled = candidate.createGenerator({...candidate.englishConfig,finalNucleus:undefined});
let pairedWords=0,draws=0,probes=0;
for(const profile of protocol.profiles) for(const seed of profile.seeds.development){
  const a=candidate.createSeededRng(seed),b=control.createSeededRng(seed);
  let ac=0,bc=0;
  const ar=()=>{ac++;return a()},br=()=>{bc++;return b()};
  for(let i=0;i<500;i++){
    assert.deepEqual(disabled.generateWord({...profile.options,rand:ar,trace:true}),control.generateWord({...profile.options,rand:br,trace:true}));
    pairedWords++;
  }
  assert.equal(ac,bc);draws+=ac;assert.equal(a(),b());probes++;
}
const result={passed:true,scope:'default policy; final restriction disabled in candidate',pairedWords,publicCalls:pairedWords*2,draws,nextRngProbes:probes};
writeFileSync('/private/tmp/q10b2-disabled-parity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
