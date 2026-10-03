import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const arms={traced:'/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator',
 plain:'/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator'};
const commits={traced:'11bdf6a90ed28e1aba09c40b3901c54c6308437f',plain:'11bdf6a90ed28e1aba09c40b3901c54c6308437f'};
const out='/private/tmp/q18-trace-plain-parity-v1';
const registrationPath='/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator/evaluation/experiments/stem-affix-compatibility/execution-registration.json';
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
 assert.equal(before.registration.sha256,'a1ec6eca07a0e8c87d51e14e673bce9810964908927eefadb1f554dd8062fa1b');
 const modules={};for(const [arm,root]of Object.entries(arms))modules[arm]=await import(pathToFileURL(join(root,'src/index.ts')).href);
 const {createSeededRng}=await import(pathToFileURL(join(arms.traced,'src/utils/random.ts')).href);
 const activePin=registration.activePolicyRegistration;
 const activeBytes=await readFile(join(arms.traced,activePin.path));assert.equal(hash(activeBytes),activePin.sha256);
 const active=JSON.parse(activeBytes).configuration;
 let comparisons=0,draws=0,probes=0;const streams=[];
 for(const policy of ['default','active']){
  const generators={};for(const arm of Object.keys(arms)){
   const config=structuredClone(modules[arm].englishConfig);
   assert.equal(config.morphology.categories,undefined);
   const profileBytes=await readFile(arms[arm]+'/evaluation/experiments/stem-affix-compatibility/experimental-profile.json');
   assert.equal(hash(profileBytes),'51750a29cbfe89d6d9cc6c7b9fd5ab67ee9e8ec0d9203f00f2b52e3a6c0ee266');
   config.morphology.categories=JSON.parse(profileBytes).model;
   if(policy==='active'){config.splitVowels=active.splitVowels;config.followingLetters=active.followingLetters;}
   generators[arm]=modules[arm].createGenerator(config);
  }
  for(const profile of registration.profiles)for(const seed of profile.seeds.development){
   const calls={traced:0,plain:0};const rngs={};
   for(const arm of Object.keys(arms)){const rng=createSeededRng(seed);rngs[arm]=()=>{calls[arm]++;return rng();};}
   for(let index=0;index<250;index++){
    const traced=generators.traced.generateWord({...profile.options,rand:rngs.traced,trace:true});
    const plain=generators.plain.generateWord({...profile.options,rand:rngs.plain,trace:false});
    delete traced.trace;assert.deepEqual(plain,traced,`${policy}/${profile.id}/${seed}/${index}`);assert.equal(calls.traced,calls.plain);comparisons++;
   }
   assert.equal(rngs.traced(),rngs.plain());probes++;draws+=calls.traced;
   streams.push({policy,profile:profile.id,seed,comparisons:250,draws:calls.traced,nextRngEquality:true});
  }
 }
 assert.equal(comparisons,10000);const after=await snapshot();assert.deepEqual(after,before);
 await save('complete.json',{passed:true,comparisons,publicCalls:2*comparisons,draws,probes,streams,after,
 scope:'Enabled category policy traced/plain complete public words and RNG stream parity from the exact candidate, both spelling policies and all registered profile/seed coordinates; 250 words per stream.'});
 console.log(JSON.stringify({passed:true,comparisons,draws,probes}));
}catch(error){await save('failure.json',{error:String(error),stack:error.stack});throw error;}
