import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm, symlink} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';
import {measure, outcomePassed, PROTECTED_ROOTS, reserveOutput, run} from './q09-runtime-timing-v1.mjs';
const clock=step=>{let value=0;return()=>value+=step;};
function fixture(failure){
 const calls=[];const word={written:{clean:'fixture'}};
 const api={generateWords:(count,options)=>{calls.push({count,...options});if(failure==='batch')throw new Error('batch failure');return Array.from({length:count},()=>word);},
 generateWord:options=>{calls.push({count:1,...options});if(failure==='single')throw new Error('single failure');return word;}};
 return {api,calls};
}
test('exact frozen seed schedule, batch sizes, logical calls and word totals',async()=>{
 const {api,calls}=fixture();const result=await measure(api,false,clock(1));
 assert.equal(result.completed,true);assert.equal(result.completedWords,13100);assert.equal(result.attemptedWords,13100);
 assert.equal(result.completedApiCalls,3052);assert.equal(result.attemptedApiCalls,3052);
 assert.deepStrictEqual(calls.slice(0,2),[{count:50,seed:0,trace:false},{count:10000,seed:42,trace:false}]);
 assert.deepStrictEqual(calls.slice(2,52).map(x=>x.seed),Array.from({length:50},(_,i)=>900000+i));
 assert.deepStrictEqual(calls.slice(52).map(x=>x.seed),Array.from({length:3},(_,t)=>Array.from({length:1000},(_,i)=>t*100000+i)).flat());
 assert(calls.every(x=>x.trace===false));assert.equal(result.trials.length,3);assert(result.trials.every(x=>x.batchMs.length===5));
 assert.equal(result.wordBytesSha256.length,64);assert.deepStrictEqual(result.gates,{status:'evaluated',throughput:true,medianVariance:true,firstTestDeadline:true,secondTestDeadline:true});
});
test('trace workload is identical but cannot pass invented existing trace gates',async()=>{
 const {api,calls}=fixture();const result=await measure(api,true,clock(10000));
 assert.equal(result.completed,true);assert.equal(calls.length,3052);assert(calls.every(x=>x.trace===true));
 assert.deepStrictEqual(result.gates,{status:'not-applicable-to-existing-untraced-gates'});
});
test('unchanged untraced floor and deadlines retain slow outcomes',async()=>{
 const {api}=fixture();const result=await measure(api,false,clock(10001));
 assert.equal(result.completed,true);assert.equal(result.gates.throughput,false);assert.equal(result.gates.firstTestDeadline,false);assert.equal(result.gates.secondTestDeadline,false);
});
test('failed public calls retain attempted and completed accounting separately',async()=>{
 const first=await measure(fixture('batch').api,false,clock(1));
 assert.equal(first.completed,false);assert.equal(first.attemptedWords,50);assert.equal(first.completedWords,0);assert.equal(first.attemptedApiCalls,1);assert.equal(first.completedApiCalls,0);
 const next=await measure(fixture('single').api,false,clock(1));
 assert.equal(next.completed,false);assert.equal(next.attemptedWords,10051);assert.equal(next.completedWords,10050);assert.equal(next.attemptedApiCalls,3);assert.equal(next.completedApiCalls,2);
});

test('mid-trial failures retain every completed batch and partial call accounting', async () => {
 let singles = 0;
 const api = {
  generateWords: count => Array.from({length: count}, () => ({written: {clean: 'hand'}})),
  generateWord: () => { if (++singles === 457) throw new Error('partial trial'); return {written: {clean: 'hand'}}; },
 };
 const report = await measure(api, false, clock(1));
 assert.equal(report.completed, false);
 assert.equal(report.completedWords, 10506);
 assert.equal(report.attemptedWords, 10507);
 assert.equal(report.trials.length, 1);
 assert.deepStrictEqual(report.trials[0], {batchMs: [1, 1], variance: null, completed: false});
 assert.equal(report.error.message, 'partial trial');
});

function fakeOperations(failingPhase, out) {
 const control = {pronunciation: {stress: {}}};
 const active = structuredClone(control);
 active.pronunciation.stress.rootPattern = {type: 'count-conditioned', lambda: Math.log(2)};
 const frozen = {engine: {version: 'synthetic'}, configs: {control, active}, protocol: {policy: {active: active.pronunciation.stress.rootPattern}}};
 let checks = 0;
 const operations = {
  clock: clock(1),
  loadTools: async () => {
   assert.equal((await readFile(out)).length, 0, 'Report must be reserved before imports');
   if (failingPhase === 'tools') throw new Error('tools failure');
   return {
    canonical: value => structuredClone(value),
    trustedInputs: async () => {
     checks++;
     if (failingPhase === 'preflight' || failingPhase === 'postflight' && checks === 2) throw new Error(`${failingPhase} failure`);
     return frozen;
    },
   };
  },
  loadRuntime: async () => {
   if (failingPhase === 'runtime-import') throw new Error('runtime import failure');
   const englishConfig = structuredClone(control);
   if (failingPhase === 'configuration') englishConfig.changed = true;
   return {englishConfig, createGenerator: () => {
    if (failingPhase === 'factory-construction') throw new Error('factory failure');
    return fixture(failingPhase === 'measurement' ? 'single' : undefined).api;
   }};
  },
 };
 return {operations, checks: () => checks};
}

const selfHash = async () => createHash('sha256').update(await readFile(new URL('./q09-runtime-timing-v1.mjs', import.meta.url))).digest('hex');

for (const phase of ['tools', 'preflight', 'runtime-import', 'configuration', 'factory-construction']) {
 test(`${phase} failure retains exclusive JSON with zero completed accounting`, async () => {
  const directory = await mkdtemp('/private/tmp/q09-timing-failure-test-');
  try {
   const out = join(directory, 'report.json');
   const {operations} = fakeOperations(phase, out);
   const result = await run({variant: 'control', trace: false, out, expectedSelf: await selfHash()}, operations);
   assert.equal(result.completed, false);
   assert.equal(result.completedWords, 0);
   assert.equal(result.completedApiCalls, 0);
   assert.equal(result.sourceIntegrityPassed, false);
   assert(result.error);
   assert.deepStrictEqual(JSON.parse(await readFile(out, 'utf8')), result);
   const original = await readFile(out);
   await assert.rejects(run({variant: 'control', trace: false, out, expectedSelf: await selfHash()}, operations), /EEXIST/);
   assert.deepStrictEqual(await readFile(out), original);
  } finally { await rm(directory, {recursive: true, force: true}); }
 });
}

test('bad self hash fails before tool imports but preserves its reserved report', async () => {
 const directory = await mkdtemp('/private/tmp/q09-timing-self-test-');
 try {
  const out = join(directory, 'report.json');
  let imported = false;
  const result = await run({variant: 'active', trace: true, out, expectedSelf: '0'.repeat(64)}, {loadTools: async () => { imported = true; }});
  assert.equal(imported, false);
  assert.equal(result.completed, false);
  assert.equal(result.phase, 'preflight');
  assert.deepStrictEqual(JSON.parse(await readFile(out, 'utf8')), result);
 } finally { await rm(directory, {recursive: true, force: true}); }
});

test('measurement failures retain counts and still perform final integrity verification', async () => {
 const directory = await mkdtemp('/private/tmp/q09-timing-measurement-test-');
 try {
  const out = join(directory, 'report.json');
  const fake = fakeOperations('measurement', out);
  const result = await run({variant: 'active', trace: true, out, expectedSelf: await selfHash()}, fake.operations);
  assert.equal(result.completed, false);
  assert.equal(result.completedWords, 10050);
  assert.equal(result.attemptedWords, 10051);
  assert.equal(result.sourceIntegrityPassed, true);
  assert.equal(fake.checks(), 2);
  assert.equal(outcomePassed(result), false);
 } finally { await rm(directory, {recursive: true, force: true}); }
});

test('postflight failure cannot publish a successful authority result', async () => {
 const directory = await mkdtemp('/private/tmp/q09-timing-postflight-test-');
 try {
  const out = join(directory, 'report.json');
  const fake = fakeOperations('postflight', out);
  const result = await run({variant: 'control', trace: false, out, expectedSelf: await selfHash()}, fake.operations);
  assert.equal(result.completed, true);
  assert.equal(result.completedWords, 13100);
  assert.equal(result.sourceIntegrityPassed, false);
  assert.equal(result.integrityError.message, 'postflight failure');
  assert.equal(outcomePassed(result), false);
 } finally { await rm(directory, {recursive: true, force: true}); }
});

test('protected raw archives and source aliases cannot receive a timing output', async () => {
 assert(PROTECTED_ROOTS.includes('/private/tmp/q09-runtime-control-raw-v1'));
 assert(PROTECTED_ROOTS.includes('/private/tmp/q09-runtime-active-raw-v1'));
 const directory = await mkdtemp('/private/tmp/q09-timing-path-test-');
 try {
  const input = join(directory, 'raw-input');
  await mkdir(input);
  await symlink(input, join(directory, 'alias'));
  await assert.rejects(reserveOutput(join(input, 'new.json'), [input]), /overlaps/);
  await assert.rejects(reserveOutput(join(directory, 'alias/new.json'), [input]), /overlaps/);
  await assert.rejects(readFile(join(input, 'new.json')), /ENOENT/);
  const reserved = await reserveOutput(join(directory, 'fresh.json'), [input]);
  await reserved.handle.writeFile('preserved');
  await reserved.handle.close();
  await assert.rejects(reserveOutput(join(directory, 'fresh.json'), [input]), /EEXIST/);
  assert.equal(await readFile(join(directory, 'fresh.json'), 'utf8'), 'preserved');
 } finally { await rm(directory, {recursive: true, force: true}); }
});

test('gate failures remain completed outcomes but yield a failing process classification', async () => {
 const slow = {...await measure(fixture().api, false, clock(10001)), sourceIntegrityPassed: true};
 assert.equal(slow.completed, true);
 assert.equal(outcomePassed(slow), false);
 const traced = {...await measure(fixture().api, true, clock(10001)), sourceIntegrityPassed: true};
 assert.equal(outcomePassed(traced), true);
});
