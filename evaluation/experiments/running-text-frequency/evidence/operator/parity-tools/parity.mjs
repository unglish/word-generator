import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const commit='2144c816efaec4005911e774288258c0ed25f77a';
const out='/private/tmp/q19-public-parity-v1';
const fitPath='/private/tmp/q19-registered-fit-v1/artifact.json';
const protocolPath=fileURLToPath(new URL('../capture-tools/protocol.json',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function pin(path){const bytes=await readFile(path);return {bytes:bytes.length,sha256:hash(bytes)};}
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function snapshot(){
 assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 return {commit,tracked:Object.fromEntries(await Promise.all(git('ls-files','-z').split('\0').filter(Boolean)
  .map(async path=>[path,await pin(root+'/'+path)]))),dependencies:await installedDependencies(root),node:await pin(process.execPath),
  fit:await pin(fitPath),protocol:await pin(protocolPath),runner:await pin(fileURLToPath(import.meta.url)),
  dependencyTool:await pin(fileURLToPath(new URL('./dependency-closure.mjs',import.meta.url))),
  environment:Object.fromEntries(Object.entries(process.env).map(([key,value])=>[key,hash(value)]))};
}
await mkdir(out);const before=await snapshot();await writeFile(out+'/before.json',JSON.stringify(before,null,2)+'\n',{flag:'wx'});
const api=await import(pathToFileURL(root+'/src/index.ts'));
const {createFrequencyTextConfig}=await import(pathToFileURL(root+'/evaluation/corpus/frequency-runtime.ts'));
const fit=JSON.parse(await readFile(fitPath,'utf8'));
const complete=JSON.parse(await readFile('/private/tmp/q19-registered-fit-v1/complete.json','utf8'));
assert(complete.passed);assert.deepEqual(before.fit,complete.artifact);
const candidate=api.createGenerator(createFrequencyTextConfig(api.englishConfig,fit.models.candidate).config);
const control=api.createGenerator(api.englishConfig);
const protocol=JSON.parse(await readFile(protocolPath,'utf8'));
const streams=[];let comparisons=0,draws=0,probes=0;
for(const contract of ['enabled-trace-plain','lexicon-unchanged']){
 for(const profile of protocol.profiles)for(const seed of profile.seeds.development){
  const counts={left:0,right:0},rngs={};
  for(const arm of ['left','right']){const rng=api.createSeededRng(seed);rngs[arm]=()=>{counts[arm]++;return rng();};}
  for(let index=0;index<500;index++){
   const options=contract==='lexicon-unchanged'?{...profile.options,mode:'lexicon'}:profile.options;
   const left=(contract==='lexicon-unchanged'?control:candidate).generateWord({...options,rand:rngs.left,trace:true});
   const right=candidate.generateWord({...options,rand:rngs.right,trace:contract==='lexicon-unchanged'});
   const comparable={...left};if(contract==='enabled-trace-plain')delete comparable.trace;
   assert.deepEqual(right,comparable,`${contract}/${profile.id}/${seed}/${index}`);
   assert.equal(counts.left,counts.right);comparisons++;
  }
  assert.equal(rngs.left(),rngs.right());probes++;draws+=counts.left;
  streams.push({contract,profile:profile.id,seed,comparisons:500,draws:counts.left,nextRngEquality:true});
  console.log(`${contract} ${profile.id}/${seed}: 500 comparisons`);
 }
}
assert.equal(comparisons,20000);assert.equal(probes,40);const after=await snapshot();assert.deepEqual(after,before);
await writeFile(out+'/after.json',JSON.stringify(after,null,2)+'\n',{flag:'wx'});
await writeFile(out+'/complete.json',JSON.stringify({passed:true,comparisons,publicCalls:comparisons*2,draws,probes,streams,
 scope:'10,000 enabled trace/plain complete nontrace-output comparisons plus 10,000 lexicon control/candidate complete word/trace comparisons, matched RNG counts after every word and 40 next-state probes. Original profile coordinates retained; text profile explicitly converted to lexicon only for the lexicon-preservation contract.'},null,2)+'\n',{flag:'wx'});
