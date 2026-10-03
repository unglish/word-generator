import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const [archive,out]=process.argv.slice(2);
assert.equal(process.argv.length,4);
assert(['/private/tmp/q18-candidate-default-v1','/private/tmp/q18-candidate-active-v1'].includes(archive));
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator';
const commit='11bdf6a90ed28e1aba09c40b3901c54c6308437f';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pin=async path=>{const bytes=await readFile(path);return {bytes:bytes.length,sha256:sha(bytes)};};
async function archivePin(path){
 const hash=createHash("sha256");let bytes=0;
 for await(const chunk of createReadStream(path)){hash.update(chunk);bytes+=chunk.length;}
 return {bytes,sha256:hash.digest("hex")};
}
async function tree(directory){
 const files={};
 async function walk(relative=''){
  for(const entry of await readdir(join(directory,relative),{withFileTypes:true})){
   assert(!entry.isSymbolicLink(),'Aliased source input');
   const name=relative?relative+'/'+entry.name:entry.name;
   if(entry.isDirectory())await walk(name);else files[name]=await pin(join(directory,name));
  }
 }
 await walk();return files;
}
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
async function snapshot(){
 assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 const files={};for(const name of ['src','evaluation','data/cmu','scripts'])files[name]=await tree(join(root,name));
 for(const name of ['package.json','package-lock.json','tsconfig.json','vitest.perf.config.ts'])files[name]=await pin(join(root,name));
 const overrides=['NODE_OPTIONS','NODE_PATH','ESBUILD_BINARY_PATH','TSX_TSCONFIG_PATH'];for(const key of overrides)assert(!process.env[key],key);
 return {files,dependencies:await installedDependencies(root),node:await pin(process.execPath),
  environment:Object.fromEntries(['PATH','LANG','LC_ALL','TZ','CI',...overrides].map(key=>[key,process.env[key]??null]))};
}
const seal=JSON.parse(await readFile(archive+'-freeze/complete.json'));
assert.equal(seal.passed,true);assert.equal(seal.words,200000);
const beforeBytes=await readFile(archive+'-freeze/before.json');assert.equal(sha(beforeBytes),seal.beforeSha256);
const freeze=JSON.parse(beforeBytes);assert.deepEqual(freeze.before,seal.after);assert.equal(freeze.root,root);assert.equal(freeze.expectedCommit,commit);
const manifestBytes=await readFile(join(archive,'manifest.json'));
assert.deepEqual({sha256:sha(manifestBytes),bytes:manifestBytes.length},seal.manifest);
const manifest=JSON.parse(manifestBytes).manifest;assert.equal(manifest.generator.commit,commit);assert.equal(manifest.generator.dirty,false);
assert.deepEqual(manifest.protocol,freeze.registration.protocol);
const before=await snapshot();assert.deepEqual(before.files,freeze.before.files);assert.deepEqual(before.dependencies,freeze.before.dependencies);
assert.equal(before.node.sha256,freeze.before.node.sha256);
const api=await import(pathToFileURL(join(root,'src/index.ts')).href);
const {canonical}=await import(pathToFileURL(join(root,'evaluation/quality/serialization.ts')).href);
const configuration=structuredClone(api.englishConfig);
const registration=freeze.registration.registration;
if(freeze.policy==='active'){
 const bytes=await readFile(join(root,registration.activePolicyRegistration.path));assert.equal(sha(bytes),registration.activePolicyRegistration.sha256);
 const active=JSON.parse(bytes).configuration;configuration.splitVowels=active.splitVowels;configuration.followingLetters=active.followingLetters;
}else assert.equal(freeze.policy,'default');
const profileBytes=await readFile(join(root,registration.categoryProfile.path));assert.equal(sha(profileBytes),registration.categoryProfile.sha256);
configuration.morphology.categories=JSON.parse(profileBytes).model;
const generator=api.createGenerator(configuration);assert.deepEqual(canonical(configuration),manifest.generator.effectiveConfig);
const artifacts=new Map(manifest.artifacts.map(artifact=>[artifact.file,artifact]));assert.equal(artifacts.size,manifest.artifacts.length);
const expected=new Set(manifest.protocol.profiles.flatMap(profile=>profile.seeds.development.map(seed=>`words/${profile.id}-${seed}.jsonl.gz`)));
assert.deepEqual(new Set([...artifacts.keys()].filter(name=>name.startsWith('words/'))),expected);
const streams=[];let words=0;
for(const profile of manifest.protocol.profiles)for(const seed of profile.seeds.development){
 const name=`words/${profile.id}-${seed}.jsonl.gz`,path=join(archive,name),record=artifacts.get(name);
 const hash=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(path)){hash.update(chunk);bytes+=chunk.length;}
 assert.equal(hash.digest('hex'),record.sha256);assert.equal(bytes,record.bytes);
 const rand=api.createSeededRng(seed);let count=0;
 const lines=createInterface({input:createReadStream(path).pipe(createGunzip()),crlfDelay:Infinity});
 for await(const line of lines){
  const row=JSON.parse(line);assert.equal(row.profile,profile.id);assert.equal(row.seed,seed);assert.equal(row.drawIndex,count);
  const fresh=generator.generateWord({...profile.options,rand,trace:true});
  assert.deepEqual(JSON.parse(JSON.stringify(fresh)),row.word,`${profile.id}/${seed}/${count}`);count++;words++;
 }
 assert.equal(count,10000);assert.deepEqual(await archivePin(path),{bytes:record.bytes,sha256:record.sha256});streams.push({profile:profile.id,seed,words:count});console.log(`${profile.id}/${seed}: ${count} complete public words/traces replayed`);
}
assert.equal(words,200000);assert.deepEqual(await readFile(join(archive,"manifest.json")),manifestBytes);const after=await snapshot();assert.deepEqual(after,before);
await writeFile(out,JSON.stringify({passed:true,words,streams,policy:freeze.policy,sourceCommit:commit,manifestSha256:sha(manifestBytes),before,after,
 scope:'Complete public-API regenerated word/trace equality for every registered archived record, with source/configuration/dependency identity and before/after execution seals. Independent category and lineage reconstruction remains separate.'},null,2)+'\n',{flag:'wx'});
