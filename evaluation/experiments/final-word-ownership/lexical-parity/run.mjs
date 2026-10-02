import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as parent from '/private/tmp/q02-parent-905ba3e/src/index.ts';
import * as candidate from '/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator/src/index.ts';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-spelling/word-generator';
const out=new URL('./lexical-parity-result.json',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
async function pins(base,dir='src') {
 const result={};
 for(const entry of (await readdir(base+'/'+dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
  const name=dir+'/'+entry.name;
  if(entry.isDirectory()) Object.assign(result,await pins(base,name));
  else if(entry.isFile())result[name]=sha(await readFile(base+'/'+name));
 }
 return result;
}
const before=await pins(root);
const parentBefore=await pins('/private/tmp/q02-parent-905ba3e');
const retained=JSON.parse(await readFile(new URL('./lexical-parent-source.json',import.meta.url)));
assert.deepEqual(parentBefore,retained.files);
const registrationBytes=await readFile(root+'/evaluation/experiments/following-letter-conditions/measurement.json');
const registration=JSON.parse(registrationBytes);
function generator(api,enabled) {
 return api.createGenerator({...api.englishConfig,...(enabled?{splitVowels:registration.splitVowels,followingLetters:registration.followingLetters}:{})});
}
function legacy(word) {
 const result=structuredClone(word);
 if(result.trace) {
  for(const key of ['finalWord','writerInput','writerOutput','gapSpellingPass','morphologyPass','pronunciationPasses','morphologyPreparation','morphologyWriting','finalNucleus'])delete result.trace[key];
  const realized=result.trace.morphology?.realization;
  if(realized)for(const key of ['rootEdits','finalSpelling','phoneAssembly','finalPhones','selectionPhones','configurationIndices'])delete realized[key];
 }
 return result;
}
let comparisons=0,publicCalls=0,draws=0,finalRecords=0;
const strata=[];
for(const enabled of [false,true]) {
 const old=generator(parent,enabled), current=generator(candidate,enabled);
 for(const mode of ['lexicon','text'])for(const trace of [false,true]) {
  let stratumDraws=0;
  for(let seed=1;seed<=500;seed++) {
   const oldRng=parent.createSeededRng(seed),newRng=candidate.createSeededRng(seed);
   let oldCalls=0,newCalls=0;
   const options={mode,trace,morphology:seed%3!==0};
   const expected=old.generateWord({...options,rand:()=>{oldCalls++;return oldRng();}});
   const actual=current.generateWord({...options,rand:()=>{newCalls++;return newRng();}});
   assert.equal(expected.trace?.finalWord,undefined);
   assert.deepEqual(legacy(actual),expected,JSON.stringify({enabled,mode,trace,seed}));
   assert.equal(newCalls,oldCalls);assert.equal(newRng(),oldRng());
   if(trace){assert(actual.trace.finalWord);finalRecords++;}
   comparisons++;publicCalls+=2;draws+=oldCalls;stratumDraws+=oldCalls;
  }
  strata.push({enabled,mode,trace,comparisons:500,draws:stratumDraws});
  console.log(JSON.stringify(strata.at(-1)));
 }
}
assert.deepEqual(await pins(root),before);
assert.deepEqual(await pins('/private/tmp/q02-parent-905ba3e'),parentBefore);
const report={passed:true,comparisons,publicCalls,parentDraws:draws,nextValueProbes:comparisons,finalRecords,strata,
 parentCommit:retained.commit,parentSource:parentBefore,candidateSource:before,registrationSha256:sha(registrationBytes),
 node:process.version,runnerSha256:sha(await readFile(new URL(import.meta.url))),scope:'Development parity probe; not a frozen quality corpus or independent provenance authentication.'};
await writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,comparisons,publicCalls,draws,finalRecords}));
