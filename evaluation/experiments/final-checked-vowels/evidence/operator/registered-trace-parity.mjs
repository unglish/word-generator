import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createGenerator,englishConfig,createSeededRng} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/src/index.ts';
import {treePins,executionEnvironment} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/evaluation/experiments/following-letter-conditions/freeze-capture.mjs';
import {installedDependencies} from '/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator/evaluation/experiments/phoneme-aware-doubling/dependency-closure.mjs';
const root='/Users/ryanbetts/.codex/worktrees/linguistic-q02-publication/word-generator';
const sha=b=>createHash('sha256').update(b).digest('hex');
const registrationBytes=await readFile(`${root}/evaluation/experiments/final-checked-vowels/measurement.json`);
const registration=JSON.parse(registrationBytes),protocolBytes=await readFile(`${root}/${registration.protocolPath}`);
assert.equal(sha(protocolBytes),registration.protocolSha256);
const protocol=JSON.parse(protocolBytes),policyBytes=await readFile(`${root}/${registration.activePolicyRegistration.path}`);
assert.equal(sha(policyBytes),registration.activePolicyRegistration.sha256);
const active=JSON.parse(policyBytes).configuration;
const frozen=JSON.parse(await readFile('/private/tmp/q10b2-configured-final-vowel-contract-default-v1-freeze/before.json'));
assert.equal(sha(registrationBytes),frozen.registration.registrationSha256);
const before=await treePins(`${root}/src`);assert.deepEqual(before,frozen.before.files.src);
const dependencies=await installedDependencies(root);assert.deepEqual(dependencies,frozen.before.dependencies);
const environment=executionEnvironment();const streams=[];let comparisons=0,draws=0;
for(const policy of ['default','active']){
 const configuration=structuredClone(policy==='default'?englishConfig:{...englishConfig,splitVowels:active.splitVowels,followingLetters:active.followingLetters});
 const traced=createGenerator(configuration),plain=createGenerator(configuration);
 for(const profile of protocol.profiles)for(const seed of profile.seeds.development){
  const a=createSeededRng(seed),b=createSeededRng(seed);let ac=0,bc=0;
  const ar=()=>{ac++;return a()},br=()=>{bc++;return b()};
  for(let index=0;index<500;index++){
   const word=traced.generateWord({...profile.options,rand:ar,trace:true});
   const {trace,...withoutTrace}=word;
   assert.deepEqual(plain.generateWord({...profile.options,rand:br}),withoutTrace);
   comparisons++;
  }
  assert.equal(ac,bc);assert.equal(a(),b());draws+=ac;
  streams.push({policy,profile:profile.id,seed,comparisons:500,draws:ac,nextProbeEqual:true});
 }
}
assert.deepEqual(await treePins(`${root}/src`),before);assert.deepEqual(await installedDependencies(root),dependencies);assert.deepEqual(executionEnvironment(),environment);
await writeFile('/private/tmp/q10b2-registered-trace-parity.json',JSON.stringify({passed:true,sourceCommit:frozen.expectedCommit,registrationSha256:sha(registrationBytes),protocolSha256:sha(protocolBytes),scriptSha256:sha(await readFile(new URL(import.meta.url))),comparisons,publicCalls:comparisons*2,draws,nextRngProbes:streams.length,streams,scope:'First 500 successive words in each registered development stream under both policies; complete nontrace public output, draw-count and next-probe equality. Not full archived-corpus RNG reconstruction.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,comparisons,publicCalls:comparisons*2,draws,nextRngProbes:streams.length}));
