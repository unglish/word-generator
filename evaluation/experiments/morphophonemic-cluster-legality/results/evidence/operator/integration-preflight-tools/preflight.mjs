import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const arms={control:'/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator',
 candidate:'/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator'};
const commits={control:'1159465fe6c10f55a97e8c5851e8a75c604450e7',candidate:'c0ff9c8cd7c512056832ec4863c78bc701e63e9e'};
const out='/private/tmp/q11b-integrated-preflight-v1';
const registrationPath='/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/evaluation/experiments/morphophonemic-cluster-legality/treatment-measurement.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function pin(path){const bytes=await readFile(path);return {bytes:bytes.length,sha256:hash(bytes)};}
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function snapshot(){
 const state={};
 for(const [arm,root] of Object.entries(arms)){
  assert.equal(git(root,'rev-parse','HEAD'),commits[arm]);assert.equal(git(root,'status','--porcelain','--untracked-files=no'),'');
  const files={};for(const name of git(root,'ls-files').split('\n'))files[name]=await pin(join(root,name));
  state[arm]={commit:commits[arm],files,dependencies:await installedDependencies(root)};
 }
 for(const key of ['NODE_OPTIONS','NODE_PATH','ESBUILD_BINARY_PATH','TSX_TSCONFIG_PATH'])assert(!process.env[key],key);
 return {state,node:{version:process.version,...await pin(process.execPath)},registration:await pin(registrationPath),
  tools:{runner:await pin(fileURLToPath(import.meta.url)),dependencies:await pin(fileURLToPath(new URL('./dependency-closure.mjs',import.meta.url)))},
  environment:Object.fromEntries(['PATH','LANG','LC_ALL','TZ','CI'].map(key=>[key,process.env[key]??null]))};
}
await mkdir(out);const save=(name,value)=>writeFile(join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
try{
 const before=await snapshot();await save('before.json',before);
 const registration=JSON.parse(await readFile(registrationPath,'utf8'));
 assert.equal(registration.version,'q11b-morphophonemic-legality-treatment-v1');
 assert.equal(registration.controlCommit,commits.control);
 assert.equal(registration.wordsPerArm,400000);
 assert.equal(before.registration.sha256,'b3941b99564a4cbb6e5a3b97962ae06cf6d0d97c5646e4419760de404ae6985a');
 const modules={};for(const [arm,root]of Object.entries(arms))modules[arm]=await import(pathToFileURL(join(root,'src/index.ts')).href);
 const {createSeededRng}=await import(pathToFileURL(join(arms.control,'src/utils/random.ts')).href);
 const activePin=registration.activePolicyRegistration;
 const activeBytes=await readFile(join(arms.control,activePin.path));assert.equal(hash(activeBytes),activePin.sha256);
 const active=JSON.parse(activeBytes).configuration;
 let comparisons=0,draws=0,probes=0;const streams=[];let enabledComparisons=0,enabledDraws=0,enabledProbes=0;const enabledStreams=[];
 for(const policy of ['default','active']){
  const generators={};for(const arm of Object.keys(arms)){
   const config=structuredClone(modules[arm].englishConfig);
   delete config.morphology.morphophonemicPolicy;
   if(policy==='active'){config.splitVowels=active.splitVowels;config.followingLetters=active.followingLetters;}
   generators[arm]=modules[arm].createGenerator(config);
  }
  for(const profile of registration.profiles)for(const seed of profile.seeds.development){
   const calls={control:0,candidate:0};const rngs={};
   for(const arm of Object.keys(arms)){const rng=createSeededRng(seed);rngs[arm]=()=>{calls[arm]++;return rng();};}
   for(let index=0;index<250;index++){
    const control=generators.control.generateWord({...profile.options,rand:rngs.control,trace:true});
    const candidate=generators.candidate.generateWord({...profile.options,rand:rngs.candidate,trace:true});
    assert.deepEqual(candidate,control,`${policy}/${profile.id}/${seed}/${index}`);assert.deepEqual(calls,{control:calls.control,candidate:calls.control});comparisons++;
   }
   assert.equal(rngs.control(),rngs.candidate());probes++;draws+=calls.control;
   streams.push({policy,profile:profile.id,seed,comparisons:250,draws:calls.control,nextRngEquality:true});
   console.log(`omitted/${policy}/${profile.id}/${seed}: 250 comparisons complete`);
  }
 }
 for(const policy of ['default','active']){
  const config=structuredClone(modules.candidate.englishConfig);
  assert.equal(config.morphology.morphophonemicPolicy.preserveClusterLegality,true);
  if(policy==='active'){config.splitVowels=active.splitVowels;config.followingLetters=active.followingLetters;}
  const generator=modules.candidate.createGenerator(config);
  for(const profile of registration.profiles)for(const seed of profile.seeds.development){
   const rawPlain=createSeededRng(seed),rawTrace=createSeededRng(seed);let plainCalls=0,traceCalls=0;
   const plainRng=()=>{plainCalls++;return rawPlain();},traceRng=()=>{traceCalls++;return rawTrace();};
   for(let index=0;index<250;index++){
    const plain=generator.generateWord({...profile.options,rand:plainRng,trace:false});
    const traced=generator.generateWord({...profile.options,rand:traceRng,trace:true});
    const withoutTrace={...traced};delete withoutTrace.trace;
    assert.deepEqual(plain,withoutTrace,`enabled/${policy}/${profile.id}/${seed}/${index}`);
    assert.equal(plainCalls,traceCalls);enabledComparisons++;
   }
   assert.equal(rawPlain(),rawTrace());enabledProbes++;enabledDraws+=plainCalls;
   enabledStreams.push({policy,profile:profile.id,seed,comparisons:250,draws:plainCalls,nextRngEquality:true});
   console.log(`enabled/${policy}/${profile.id}/${seed}: 250 comparisons complete`);
  }
 }
 assert.equal(enabledComparisons,10000);assert.equal(enabledProbes,40);
 assert.equal(comparisons,10000);const after=await snapshot();assert.deepEqual(after,before);
 await save('complete.json',{passed:true,omitted:{comparisons,publicCalls:2*comparisons,draws,probes,streams},enabled:{comparisons:enabledComparisons,publicCalls:2*enabledComparisons,draws:enabledDraws,probes:enabledProbes,streams:enabledStreams},after,
 scope:'Frozen integrated treatment preflight: complete public output/trace and RNG parity for omitted policy against exact composed control; enabled trace/plain complete output and draw-count/next-state parity. Both spelling policies and all registered profile/seed coordinates, 250 words per stream. Not full treatment corpus evidence.'});
 console.log(JSON.stringify({passed:true,omittedComparisons:comparisons,enabledComparisons,probes:probes+enabledProbes}));
}catch(error){await save('failure.json',{error:String(error),stack:error.stack});throw error;}
