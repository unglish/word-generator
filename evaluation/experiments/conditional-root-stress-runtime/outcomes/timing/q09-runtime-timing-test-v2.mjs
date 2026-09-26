import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm, symlink} from 'node:fs/promises';
import {join} from 'node:path';
import test from 'node:test';
import {createWorkload, measure, outcomePassed, PROTECTED_ROOTS, reserveOutput, run} from './q09-runtime-timing-v2.mjs';
const clock = step => { let value = 0; return () => value += step; };
function fixture(failure) {
 const calls = [];
 const rngs = [];
 const failAt = failure === 'batch' ? 1 : failure === 'single' ? 10051 : failure;
 const createSeededRng = seed => {
  const record = {seed, draws: 0};
  const rand = () => { record.draws++; return record.draws / 100000; };
  rngs.push({...record, rand, record});
  return rand;
 };
 const api = {generateWord: options => {
  calls.push(options);
  if (calls.length === failAt) throw new Error('generation failure');
  if (options.rand) options.rand();
  return {written: {clean: 'fixture'}};
 }};
 return {api, createSeededRng, calls, rngs};
}

test('exact workload uses one shared public RNG per batch and only the real factory generateWord method', async () => {
 const {api, createSeededRng, calls, rngs} = fixture();
 assert.equal(api.generateWords, undefined);
 const result = await measure(api, createSeededRng, false, clock(1));
 assert.equal(result.completed, true);
 for (const key of ['completedWords', 'attemptedWords', 'completedApiCalls', 'attemptedApiCalls']) assert.equal(result[key], 13100, key);
 for (const key of ['completedLogicalCalls', 'attemptedLogicalCalls']) assert.equal(result[key], 3052, key);
 for (const key of ['completedRngFactoryCalls', 'attemptedRngFactoryCalls']) assert.equal(result[key], 2, key);
 assert.deepStrictEqual(rngs.map(r => [r.seed, r.record.draws]), [[0, 50], [42, 10000]]);
 assert(calls.slice(0, 50).every(options => options.rand === rngs[0].rand && !('seed' in options)));
 assert(calls.slice(50, 10050).every(options => options.rand === rngs[1].rand && !('seed' in options)));
 assert.notEqual(rngs[0].rand, rngs[1].rand);
 assert.deepStrictEqual(calls.slice(10050, 10100).map(x => x.seed), Array.from({length: 50}, (_, i) => 900000+i));
 assert.deepStrictEqual(calls.slice(10100).map(x => x.seed), Array.from({length: 3}, (_, t) => Array.from({length: 1000}, (_, i) => t*100000+i)).flat());
 assert(calls.every(x => x.trace === false));
 assert.equal(result.trials.length, 3);
 assert(result.trials.every(x => x.batchMs.length === 5));
 assert.equal(result.wordBytesSha256.length, 64);
 assert.deepStrictEqual(result.gates, {status: 'evaluated', throughput: true, medianVariance: true, firstTestDeadline: true, secondTestDeadline: true});
});

test('trace workload is identical but cannot pass invented existing trace gates', async () => {
 const {api, createSeededRng, calls} = fixture();
 const result = await measure(api, createSeededRng, true, clock(10000));
 assert.equal(result.completed, true);
 assert.equal(calls.length, 13100);
 assert(calls.every(x => x.trace === true));
 assert.deepStrictEqual(result.gates, {status: 'not-applicable-to-existing-untraced-gates'});
});

test('unchanged untraced floor and deadlines retain slow outcomes', async () => {
 const {api, createSeededRng} = fixture();
 const result = await measure(api, createSeededRng, false, clock(10001));
 assert.equal(result.completed, true);
 assert.equal(result.gates.throughput, false);
 assert.equal(result.gates.firstTestDeadline, false);
 assert.equal(result.gates.secondTestDeadline, false);
});

test('first and mid-batch failures count actual word/API attempts without counting unattempted batch words', async () => {
 for (const [failAt, logicalAttempted, logicalCompleted, rngs] of [[1, 1, 0, 1], [25, 1, 0, 1], [51, 2, 1, 2], [5432, 2, 1, 2], [10051, 3, 2, 2]]) {
  const f = fixture(failAt);
  const result = await measure(f.api, f.createSeededRng, false, clock(1));
  assert.equal(result.completed, false);
  assert.equal(result.attemptedWords, failAt);
  assert.equal(result.completedWords, failAt-1);
  assert.equal(result.attemptedApiCalls, failAt);
  assert.equal(result.completedApiCalls, failAt-1);
  assert.equal(result.attemptedLogicalCalls, logicalAttempted);
  assert.equal(result.completedLogicalCalls, logicalCompleted);
  assert.equal(result.attemptedRngFactoryCalls, rngs);
  assert.equal(result.completedRngFactoryCalls, rngs);
 }
});

test('RNG factory failure is separate from generation and retains the in-progress logical operation', async () => {
 for (const failAt of [1, 2]) {
  const f = fixture(); let constructed = 0;
  const makeRng = seed => { if (++constructed === failAt) throw new Error('RNG construction'); return f.createSeededRng(seed); };
  const result = await measure(f.api, makeRng, false, clock(1));
  assert.equal(result.completed, false);
  assert.equal(result.attemptedRngFactoryCalls, failAt);
  assert.equal(result.completedRngFactoryCalls, failAt-1);
  assert.equal(result.attemptedLogicalCalls, failAt);
  assert.equal(result.completedLogicalCalls, failAt-1);
  assert.equal(result.attemptedWords, failAt === 1 ? 0 : 50);
  assert.equal(result.completedWords, result.attemptedWords);
  assert.equal(result.attemptedApiCalls, result.attemptedWords);
 }
});

test('mid-trial failures retain completed batches and partial generation/logical counts', async () => {
 const f = fixture(10507);
 const report = await measure(f.api, f.createSeededRng, false, clock(1));
 assert.equal(report.completed, false);
 assert.equal(report.completedWords, 10506);
 assert.equal(report.attemptedWords, 10507);
 assert.equal(report.completedApiCalls, 10506);
 assert.equal(report.attemptedApiCalls, 10507);
 assert.equal(report.completedLogicalCalls, 458);
 assert.equal(report.attemptedLogicalCalls, 459);
 assert.deepStrictEqual(report.trials, [{batchMs: [1, 1], variance: null, completed: false}]);
 assert.equal(report.error.message, 'generation failure');
});

test('local batch helper and counters are separate from the public factory object', () => {
 const f = fixture();
 const work = createWorkload(f.api, f.createSeededRng, false);
 assert.deepStrictEqual(Object.keys(f.api), ['generateWord']);
 assert.equal(work.batch(3, 42).length, 3);
 assert.equal(work.report.completedApiCalls, 3);
 assert.equal(work.report.completedLogicalCalls, 1);
 const other = createWorkload(f.api, f.createSeededRng, true);
 assert.equal(other.report.attemptedWords, 0);
 assert.throws(() => work.batch(-1, 42));
 assert.equal(work.report.attemptedLogicalCalls, 1);
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
   return {englishConfig, createSeededRng: fixture().createSeededRng, createGenerator: () => {
    if (failingPhase === 'factory-construction') throw new Error('factory failure');
    return fixture(failingPhase === 'measurement' ? 'single' : undefined).api;
   }};
  },
 };
 return {operations, checks: () => checks};
}

const selfHash = async () => createHash('sha256').update(await readFile(new URL('./q09-runtime-timing-v2.mjs', import.meta.url))).digest('hex');

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
 const slow = {...await measure(fixture().api, fixture().createSeededRng, false, clock(10001)), sourceIntegrityPassed: true};
 assert.equal(slow.completed, true);
 assert.equal(outcomePassed(slow), false);
 const traced = {...await measure(fixture().api, fixture().createSeededRng, true, clock(10001)), sourceIntegrityPassed: true};
 assert.equal(outcomePassed(traced), true);
});
