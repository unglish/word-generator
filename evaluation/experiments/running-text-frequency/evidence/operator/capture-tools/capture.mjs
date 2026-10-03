import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installedDependencies } from './dependency-closure.mjs';
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-q19-frequency/word-generator';
const expected = '2144c816efaec4005911e774288258c0ed25f77a';
const arm = process.argv[2];
assert(['control','candidate'].includes(arm));
const out = `/private/tmp/q19-${arm}-capture-v1`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function pin(path) { const bytes = await readFile(path); return {bytes:bytes.length,sha256:hash(bytes)}; }
const git = (...args) => execFileSync('git', args, {cwd:root,encoding:'utf8'}).trim();
const protocolPath = fileURLToPath(new URL('./protocol.json', import.meta.url));
const fitPath = '/private/tmp/q19-registered-fit-v1/artifact.json';
async function seal() {
  assert.equal(git('rev-parse','HEAD'),expected);
  assert.equal(git('status','--porcelain','--untracked-files=no'),'');
  const tracked = Object.fromEntries(await Promise.all(git('ls-files','-z').split('\0').filter(Boolean)
    .map(async path => [path,await pin(root+'/'+path)])));
  return {tracked,commit:expected,fit:await pin(fitPath),protocol:await pin(protocolPath),
    runner:await pin(fileURLToPath(import.meta.url)),closureTool:await pin(fileURLToPath(new URL('./dependency-closure.mjs',import.meta.url))),
    dependencies:await installedDependencies(root),node:await pin(process.execPath),nodeVersion:process.version,
    environment:Object.fromEntries(Object.entries(process.env).map(([key,value])=>[key,hash(value)]))};
}
await mkdir(out);
const before = await seal();
await writeFile(out+'/before.json',JSON.stringify(before,null,2)+'\n',{flag:'wx'});
const protocol = JSON.parse(await readFile(protocolPath,'utf8'));
assert.equal(protocol.wordsPerReplicate,10000);
assert.equal(protocol.profiles.length,4);
assert.equal(protocol.profiles.reduce((n,p)=>n+p.seeds.development.length,0),20);
const {createGenerator,createSeededRng,englishConfig} = await import(pathToFileURL(root+'/src/index.ts'));
const {createFrequencyTextConfig} = await import(pathToFileURL(root+'/evaluation/corpus/frequency-runtime.ts'));
const fit = JSON.parse(await readFile(fitPath,'utf8'));
const complete = JSON.parse(await readFile('/private/tmp/q19-registered-fit-v1/complete.json','utf8'));
assert(complete.passed); assert.deepEqual(complete.artifact,before.fit);
const adapted = createFrequencyTextConfig(englishConfig,fit.models.candidate);
const config = arm==='candidate'?adapted.config:englishConfig;
const generator = createGenerator(config);
await writeFile(out+'/configuration.json',JSON.stringify({arm,configuration:config,
  targetAccounting:arm==='candidate'?adapted.targets:null},null,2)+'\n',{flag:'wx'});
const files = [];
let words = 0;
for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
  const rand = createSeededRng(seed);
  const name = `${profile.id}-${seed}.jsonl.gz`;
  async function* records() {
    for (let drawIndex=0;drawIndex<protocol.wordsPerReplicate;drawIndex++) {
      const word=generator.generateWord({...profile.options,rand,trace:true});
      words++;
      yield JSON.stringify({profile:profile.id,seed,drawIndex,word})+'\n';
    }
  }
  await pipeline(Readable.from(records()),createGzip(),createWriteStream(out+'/'+name,{flags:'wx'}));
  files.push({file:name,...await pin(out+'/'+name),profile:profile.id,seed,words:10000,nextRngProbe:rand()});
  console.log(`${arm} ${profile.id} seed ${seed}: 10,000 words archived`);
}
assert.equal(words,200000);
const after=await seal(); assert.deepEqual(after,before);
await writeFile(out+'/after.json',JSON.stringify(after,null,2)+'\n',{flag:'wx'});
await writeFile(out+'/manifest.json',JSON.stringify({arm,commit:expected,words,protocol,files,
  configuration:await pin(out+'/configuration.json'),before:await pin(out+'/before.json'),after:await pin(out+'/after.json')},null,2)+'\n',{flag:'wx'});
await writeFile(out+'/complete.json',JSON.stringify({passed:true,words,manifest:await pin(out+'/manifest.json')},null,2)+'\n',{flag:'wx'});
console.log(`${arm} complete: ${words} words; all execution pins unchanged.`);
