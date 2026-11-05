import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createGenerator, createSeededRng, englishConfig, generateWords } from '../../src/index.ts';
import assert from 'node:assert/strict';
const [output] = process.argv.slice(2);
const protocol=JSON.parse(readFileSync(new URL('../../evaluation/quality/protocol.json',import.meta.url)));
const generator=createGenerator({...englishConfig,codaConstraints:{...englishConfig.codaConstraints,bannedNucleusCodaCombinations:[]}});
const parity=[];
for(const profile of protocol.profiles) for(const seed of profile.seeds.development) {
  const random=createSeededRng(seed); let calls=0;
  const rand=()=>{calls++;return random();}; const hash=createHash('sha256');
  for(let i=0;i<1000;i++) hash.update(JSON.stringify(generator.generateWord({...profile.options,rand}))+ '\n');
  parity.push({profile:profile.id,seed,words:1000,calls,next:random(),sha256:hash.digest('hex')});
}
const defaultGenerator=createGenerator(englishConfig);
let traceParityWords=0;
for(const profile of protocol.profiles) {
  const a=createSeededRng(profile.seeds.development[0]),b=createSeededRng(profile.seeds.development[0]); let ca=0,cb=0;
  for(let i=0;i<1000;i++) {
    const plain=defaultGenerator.generateWord({...profile.options,rand:()=>{ca++;return a();}});
    const {trace,...traced}=defaultGenerator.generateWord({...profile.options,rand:()=>{cb++;return b();},trace:true});
    assert.ok(trace); assert.deepEqual(plain,traced); traceParityWords++;
  }
  assert.equal(ca,cb);assert.equal(a(),b());
}
// Seeded repeated batches; run serially with no test/capture process competing.
generateWords(5000,{seed:901});
const performanceTrials=[];
for(let trial=0;trial<7;trial++) {
  const start=performance.now();const words=generateWords(20000,{seed:10000+trial});
  const elapsedMs=performance.now()-start;
  performanceTrials.push({seed:10000+trial,words:words.length,elapsedMs,wordsPerSecond:words.length*1000/elapsedMs});
}
writeFileSync(output,JSON.stringify({parity,traceParityWords,performanceTrials,node:process.version},null,2));
console.log(JSON.stringify({traceParityWords,performanceTrials},null,2));
