import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const commit='2144c816efaec4005911e774288258c0ed25f77a';
const arm=process.argv[2];assert(['control','candidate'].includes(arm));
const archive=`/private/tmp/q19-${arm}-capture-v1`,out=`/private/tmp/q19-${arm}-replay-v1`;
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function pin(path){const bytes=await readFile(path);return {bytes:bytes.length,sha256:hash(bytes)};}
async function seal(){
 assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 return {commit,tracked:Object.fromEntries(await Promise.all(git('ls-files','-z').split('\0').filter(Boolean)
   .map(async path=>[path,await pin(root+'/'+path)]))),dependencies:await installedDependencies(root),node:await pin(process.execPath),
 runner:await pin(fileURLToPath(import.meta.url)),closureTool:await pin(fileURLToPath(new URL('./dependency-closure.mjs',import.meta.url))),
 environment:Object.fromEntries(Object.entries(process.env).map(([key,value])=>[key,hash(value)]))};
}
await mkdir(out);
const complete=JSON.parse(await readFile(archive+'/complete.json','utf8'));
assert(complete.passed);assert.equal(complete.words,200000);assert.deepEqual(await pin(archive+'/manifest.json'),complete.manifest);
const manifest=JSON.parse(await readFile(archive+'/manifest.json','utf8'));
assert.equal(manifest.arm,arm);assert.equal(manifest.commit,commit);assert.equal(manifest.words,200000);
const frozen=JSON.parse(await readFile(archive+'/before.json','utf8'));
assert.deepEqual(await pin(archive+'/before.json'),manifest.before);assert.deepEqual(await pin(archive+'/after.json'),manifest.after);
assert.deepEqual(frozen,JSON.parse(await readFile(archive+'/after.json','utf8')));
const before=await seal();
for(const key of ['tracked','commit','dependencies','node'])assert.deepEqual(before[key],frozen[key]);
assert.equal(manifest.protocol.wordsPerReplicate,10000);assert.equal(manifest.protocol.profiles.length,4);
const protocol=JSON.parse(await readFile(new URL('../capture-tools/protocol.json',import.meta.url),'utf8'));
assert.deepEqual(manifest.protocol,protocol);assert.deepEqual(await pin(fileURLToPath(new URL('../capture-tools/protocol.json',import.meta.url))),frozen.protocol);
await writeFile(out+'/before.json',JSON.stringify(before,null,2)+'\n',{flag:'wx'});
const api=await import(pathToFileURL(root+'/src/index.ts'));
const {createFrequencyTextConfig}=await import(pathToFileURL(root+'/evaluation/corpus/frequency-runtime.ts'));
const fitPath='/private/tmp/q19-registered-fit-v1/artifact.json';assert.deepEqual(await pin(fitPath),frozen.fit);
const fit=JSON.parse(await readFile(fitPath,'utf8'));
const adapted=createFrequencyTextConfig(api.englishConfig,fit.models.candidate);
const configuration=arm==='candidate'?adapted.config:api.englishConfig;
assert.deepEqual(await pin(archive+'/configuration.json'),manifest.configuration);
assert.deepEqual(JSON.parse(await readFile(archive+'/configuration.json','utf8')),JSON.parse(JSON.stringify({arm,configuration,
 targetAccounting:arm==='candidate'?adapted.targets:null})));
const generator=api.createGenerator(configuration);
const expected=protocol.profiles.flatMap(p=>p.seeds.development.map(seed=>`${p.id}-${seed}.jsonl.gz`));
assert.equal(manifest.files.length,20);assert.deepEqual(new Set(manifest.files.map(f=>f.file)),new Set(expected));
let words=0;const streams=[];
for(const profile of protocol.profiles)for(const seed of profile.seeds.development){
 const file=`${profile.id}-${seed}.jsonl.gz`,path=archive+'/'+file;
 const record=manifest.files.find(item=>item.file===file);assert.equal(record.profile,profile.id);assert.equal(record.seed,seed);assert.equal(record.words,10000);
 assert.deepEqual(await pin(path),{bytes:record.bytes,sha256:record.sha256});
 const rand=api.createSeededRng(seed);let count=0;
 const input=createReadStream(path),unzip=createGunzip();input.on('error',error=>unzip.destroy(error));
 const lines=createInterface({input:input.pipe(unzip),crlfDelay:Infinity});
 for await(const line of lines){
  const row=JSON.parse(line);assert.equal(row.profile,profile.id);assert.equal(row.seed,seed);assert.equal(row.drawIndex,count);
  const word=generator.generateWord({...profile.options,rand,trace:true});
  assert.deepEqual(JSON.parse(JSON.stringify(word)),row.word,`${profile.id}/${seed}/${count}`);count++;words++;
 }
 assert.equal(count,10000);assert.equal(rand(),record.nextRngProbe);
 assert.deepEqual(await pin(path),{bytes:record.bytes,sha256:record.sha256});
 streams.push({profile:profile.id,seed,words:count,nextRngProbe:record.nextRngProbe});console.log(`${arm} ${profile.id}/${seed}: ${count} full records replayed`);
}
assert.equal(words,200000);assert.deepEqual(await pin(archive+'/manifest.json'),complete.manifest);assert.deepEqual(await pin(fitPath),frozen.fit);
const after=await seal();assert.deepEqual(after,before);
await writeFile(out+'/after.json',JSON.stringify(after,null,2)+'\n',{flag:'wx'});
await writeFile(out+'/complete.json',JSON.stringify({passed:true,words,streams,manifest:complete.manifest,
 scope:'All public words and traces, 20 next-state probes, effective configuration/fit, complete source and installed loader pins authenticated; independent distribution recount remains separate.'},null,2)+'\n',{flag:'wx'});
