import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { executeMatrix, matrixSchedule, summarizeTiming } from './q09-runtime-timing-matrix-v1.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const matrixPath = fileURLToPath(new URL('./q09-runtime-timing-matrix-v1.mjs', import.meta.url));
const matrixTestsPath = fileURLToPath(import.meta.url);

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'q09-matrix-synthetic-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, 'active');
  const original = join(directory, 'control');
  const archive = join(directory, 'archive');
  for (const path of [root, original, archive]) await mkdir(path);
  const pin = async (name, bytes) => {
    const path = join(directory, name);
    await writeFile(path, bytes, { flag: 'wx' });
    return { path, sha256: sha(bytes) };
  };
  const enginePin = await pin('node-fixture', 'not an executable; never launched');
  const frozen = { schemaVersion: 'q09-configured-capture-freeze-v1', root, original,
    configs: { control: { policy: 'control' }, active: { policy: 'active' } },
    engine: { executable: enginePin.path, sha256: enginePin.sha256, version: 'synthetic' } };
  const captureFreeze = await pin('capture-freeze.json', JSON.stringify(frozen));
  const manifest = { schema: 'q09-runtime-timing-review-v1', captureFreeze, rawArchiveRoots: [archive], pins: {
    matrix: { path: matrixPath, sha256: sha(await readFile(matrixPath)) },
    matrixTests: { path: matrixTestsPath, sha256: sha(await readFile(matrixTestsPath)) },
    benchmark: await pin('benchmark.mjs', 'synthetic benchmark bytes; never imported'),
    benchmarkTests: await pin('benchmark-test.mjs', 'synthetic tests'),
    contract: await pin('contract.md', 'synthetic contract'),
    tsx: await pin('tsx.mjs', 'synthetic loader; never imported'),
  } };
  const manifestPin = await pin('review.json', JSON.stringify(manifest));
  const options = { reviewManifestPath: manifestPin.path, expectedReviewManifestSha256: manifestPin.sha256,
    outputDirectory: join(directory, 'output'), ledgerPath: join(directory, 'ledger.jsonl') };
  const report = slot => ({ schema: 'q09-configured-timing-v1', variant: slot.variant, trace: slot.trace,
    sourceFreezeSha256: captureFreeze.sha256, benchmarkSha256: manifest.pins.benchmark.sha256,
    sourceIntegrityPassed: true, config: frozen.configs[slot.variant], engine: frozen.engine,
    batchMs: 1000, wordsPerSecond: 10000, firstTestMs: 1100, secondTestMs: 3100, medianVariance: 1,
    wordBytesSha256: sha('synthetic output'),
    trials: Array.from({ length: 3 }, () => ({ batchMs: [200, 200, 200, 200, 200], variance: 1, completed: true })),
    completed: true, attemptedWords: 13100, completedWords: 13100, attemptedApiCalls: 3052, completedApiCalls: 3052,
    gates: slot.trace ? { status: 'not-applicable-to-existing-untraced-gates' } : {
      status: 'evaluated', throughput: true, medianVariance: true, firstTestDeadline: true, secondTestDeadline: true,
    } });
  const calls = [];
  const launch = async (command, slot) => {
    calls.push({ command, slot });
    await writeFile(command.args.at(-2), JSON.stringify(report(slot)), { flag: 'wx' });
    return { exitCode: 0, signal: null, stdout: Buffer.from([0, slot.ordinal, 255]), stderr: `stderr-${slot.ordinal}\n` };
  };
  return { directory, root, original, archive, frozen, manifest, options, report, calls, launch,
    dependencies: { launch, captureFreezePin: captureFreeze } };
}

async function ledgerRecords(path) {
  return (await readFile(path, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
}

test('fixed 24-slot schedule preserves six adjacent AB/BA pairs in each trace mode', () => {
  const schedule = matrixSchedule();
  const expected = ['control', 'active', 'active', 'control', 'control', 'active',
    'active', 'control', 'control', 'active', 'active', 'control'];
  assert.equal(schedule.length, 24);
  for (const mode of [false, true]) {
    const slots = schedule.filter(slot => slot.trace === mode);
    assert.deepStrictEqual(slots.map(slot => slot.variant), expected);
    assert.deepStrictEqual(slots.map(slot => slot.modeOrdinal), Array.from({ length: 12 }, (_, index) => index + 1));
    assert.equal(new Set(slots.map(slot => slot.pairId)).size, 6);
    for (let index = 0; index < 12; index += 2) {
      assert.equal(slots[index].pairId, slots[index + 1].pairId);
      assert.deepStrictEqual([slots[index].pairPosition, slots[index + 1].pairPosition], [1, 2]);
      assert.notEqual(slots[index].variant, slots[index + 1].variant);
    }
  }
  assert.deepStrictEqual(schedule.map(slot => slot.ordinal), Array.from({ length: 24 }, (_, index) => index + 1));
  assert(schedule.slice(0, 12).every(slot => slot.trace === false));
  assert(schedule.slice(12).every(slot => slot.trace === true));
  schedule[0].variant = 'mutated';
  assert.equal(matrixSchedule()[0].variant, 'control');
});

test('24 injected invocations are sequential, use exact commands, and preserve raw output and append-only events', async t => {
  const f = await fixture(t);
  let running = false;
  const launch = async (command, slot) => {
    assert.equal(running, false); running = true;
    await Promise.resolve();
    const result = await f.launch(command, slot);
    running = false; return result;
  };
  const result = await executeMatrix(f.options, { ...f.dependencies, launch });
  assert.equal(result.allPassed, true);
  assert.equal(result.attempted, 24);
  assert.equal(result.remainingSlots.length, 0);
  assert.deepStrictEqual(f.calls.map(call => call.slot), matrixSchedule());
  for (const { command, slot } of f.calls) {
    assert.equal(command.executable, f.frozen.engine.executable);
    assert.equal(command.cwd, f.root);
    assert.equal(command.env.NODE_OPTIONS, undefined);
    assert.deepStrictEqual(command.args.slice(0, 6), ['--import', new URL(`file://${f.manifest.pins.tsx.path}`).href,
      '--', f.manifest.pins.benchmark.path, slot.variant, String(slot.trace)]);
    assert.equal(command.args.at(-1), f.manifest.pins.benchmark.sha256);
  }
  const records = await ledgerRecords(f.options.ledgerPath);
  assert.equal(records.length, 50);
  assert.equal(records[0].type, 'matrix-start');
  assert.equal(records.at(-1).type, 'matrix-end');
  for (const outcome of result.outcomes) {
    assert.deepStrictEqual(await readFile(outcome.paths.stdout), Buffer.from([0, outcome.ordinal, 255]));
    assert.equal(await readFile(outcome.paths.stderr, 'utf8'), `stderr-${outcome.ordinal}\n`);
    assert.equal(outcome.reportSha256, sha(await readFile(outcome.paths.report)));
    assert.equal(records[outcome.ordinal * 2 - 1].type, 'invocation-start');
    assert.equal(records[outcome.ordinal * 2].type, 'invocation-outcome');
  }
});

test('slow gates, partial workload failure, process crash, and launcher rejection keep their scheduled slots without retries', async t => {
  const f = await fixture(t);
  const calls = [];
  const launch = async (command, slot) => {
    calls.push(slot.ordinal);
    if (slot.ordinal === 3) return { exitCode: null, signal: 'SIGTERM', stdout: 'crashed', stderr: 'killed' };
    if (slot.ordinal === 4) throw new Error('synthetic spawn failure');
    const report = f.report(slot);
    if (slot.ordinal === 1) {
      Object.assign(report, { batchMs: 2500, wordsPerSecond: 4000, firstTestMs: 2600 });
      report.gates.throughput = false;
    }
    if (slot.ordinal === 2) Object.assign(report, { completed: false, attemptedWords: 10051,
      completedWords: 10050, attemptedApiCalls: 3, completedApiCalls: 2, batchMs: 2,
      trials: [{ batchMs: [1] }], error: { message: 'synthetic generator failure' } });
    await writeFile(command.args.at(-2), JSON.stringify(report), { flag: 'wx' });
    return { exitCode: slot.ordinal <= 2 ? 1 : 0, signal: null, stdout: `out-${slot.ordinal}`, stderr: '' };
  };
  const result = await executeMatrix(f.options, { ...f.dependencies, launch });
  assert.equal(result.scheduleCompleted, true);
  assert.equal(result.allPassed, false);
  assert.deepStrictEqual(calls, Array.from({ length: 24 }, (_, index) => index + 1));
  assert.deepStrictEqual(result.outcomes.slice(0, 4).map(outcome => outcome.status),
    ['gate-failed', 'incomplete', 'report-invalid', 'report-invalid']);
  assert.equal(result.outcomes[1].report.completedWords, 10050);
  assert.deepStrictEqual(result.outcomes[1].report.trials, [{ batchMs: [1] }]);
  assert.equal(await readFile(result.outcomes[2].paths.stdout, 'utf8'), 'crashed');
  assert.match(result.outcomes[3].spawnError.message, /synthetic spawn/);
});

test('incorrect completed accounting is retained as invalid and does not replace the run', async t => {
  const f = await fixture(t);
  const launch = async (command, slot) => {
    const result = await f.launch(command, slot);
    if (slot.ordinal === 1) {
      const report = f.report(slot); report.completedWords = 13099;
      await writeFile(command.args.at(-2), JSON.stringify(report));
    }
    return result;
  };
  const result = await executeMatrix(f.options, { ...f.dependencies, launch });
  assert.equal(result.attempted, 24);
  assert.equal(result.outcomes[0].status, 'report-invalid');
  assert.equal(result.outcomes[0].reportIssues[0].name, 'counts');
});

test('every reviewed pin is checked before any launch or output creation', async t => {
  for (const name of ['benchmark', 'benchmarkTests', 'contract', 'tsx']) {
    const f = await fixture(t);
    await writeFile(f.manifest.pins[name].path, 'changed source');
    await assert.rejects(executeMatrix(f.options, f.dependencies), /source authority changed/);
    assert.equal(f.calls.length, 0);
    assert(!(await readdir(f.directory)).includes('output'));
  }
});

test('post-process benchmark, contract, loader and frozen engine mutation aborts with the failed invocation preserved', async t => {
  for (const name of ['benchmark', 'contract', 'tsx', 'engine']) {
    const f = await fixture(t);
    const launch = async (command, slot) => {
      const result = await f.launch(command, slot);
      const path = name === 'engine' ? f.frozen.engine.executable : f.manifest.pins[name].path;
      await writeFile(path, 'source mutated during invocation');
      return result;
    };
    const result = await executeMatrix(f.options, { ...f.dependencies, launch });
    assert.equal(result.attempted, 1);
    assert.equal(result.scheduleCompleted, false);
    assert.equal(result.outcomes[0].status, 'authority-failed');
    assert.equal(result.remainingSlots.length, 23);
    assert.equal((await ledgerRecords(f.options.ledgerPath)).at(-1).type, 'matrix-end');
    assert.deepStrictEqual(await readFile(result.outcomes[0].paths.stdout), Buffer.from([0, 1, 255]));
  }
});

test('child source, config, trace, variant, engine and freeze mismatch abort instead of accepting a timing', async t => {
  for (const field of ['sourceIntegrityPassed', 'config', 'trace', 'variant', 'engine', 'sourceFreezeSha256', 'benchmarkSha256']) {
    const f = await fixture(t);
    const launch = async (command, slot) => {
      const report = f.report(slot);
      report[field] = field === 'sourceIntegrityPassed' ? false : 'incorrect';
      await writeFile(command.args.at(-2), JSON.stringify(report), { flag: 'wx' });
      return { exitCode: 1, stdout: 'preserved', stderr: '' };
    };
    const result = await executeMatrix(f.options, { ...f.dependencies, launch });
    assert.equal(result.attempted, 1, field);
    assert.equal(result.outcomes[0].status, 'authority-failed', field);
    assert.equal(result.outcomes[0].report[field], field === 'sourceIntegrityPassed' ? false : 'incorrect');
  }
});

test('fresh exclusive output and ledger paths protect both source roots, raw archives, and symlink aliases', async t => {
  const f = await fixture(t);
  const alias = join(f.directory, 'archive-alias');
  await symlink(f.archive, alias);
  for (const root of [f.root, f.original, f.archive, alias]) {
    for (const field of ['outputDirectory', 'ledgerPath']) {
      await assert.rejects(executeMatrix({ ...f.options, [field]: join(root, 'new-output') }, f.dependencies), /protected output/);
    }
  }
  const existingDirectory = join(f.directory, 'existing-directory');
  const existingLedger = join(f.directory, 'existing-ledger');
  await mkdir(existingDirectory);
  await writeFile(existingLedger, 'retain me');
  await assert.rejects(executeMatrix({ ...f.options, outputDirectory: existingDirectory }, f.dependencies), /already exists/);
  await assert.rejects(executeMatrix({ ...f.options, ledgerPath: existingLedger }, f.dependencies), /already exists/);
  assert.equal(await readFile(existingLedger, 'utf8'), 'retain me');
  assert.equal(f.calls.length, 0);
});

test('manifest, matrix identity, and production freeze authority cannot silently drift', async t => {
  const f = await fixture(t);
  await assert.rejects(executeMatrix({ ...f.options, expectedReviewManifestSha256: '0'.repeat(64) }, f.dependencies), /source authority changed/);
  await assert.rejects(executeMatrix(f.options, { launch: f.launch }), /capture freeze must match/);
  await assert.rejects(executeMatrix(f.options, { captureFreezePin: f.manifest.captureFreeze }), /injected launcher/);
  f.manifest.pins.matrix = f.manifest.pins.benchmark;
  const bytes = JSON.stringify(f.manifest);
  await writeFile(f.options.reviewManifestPath, bytes);
  await assert.rejects(executeMatrix({ ...f.options, expectedReviewManifestSha256: sha(bytes) }, f.dependencies), /matrix pin must identify/);
  assert.equal(f.calls.length, 0);
});

test('matrix and test pin byte mismatches are rejected without changing those actual files', async t => {
  for (const name of ['matrix', 'matrixTests']) {
    const f = await fixture(t);
    f.manifest.pins[name].sha256 = '0'.repeat(64);
    const bytes = JSON.stringify(f.manifest);
    await writeFile(f.options.reviewManifestPath, bytes);
    await assert.rejects(executeMatrix({ ...f.options, expectedReviewManifestSha256: sha(bytes) }, f.dependencies), /source authority changed/);
    assert.equal(f.calls.length, 0);
  }
});

test('malformed reports remain raw outcomes and completed reports with a failing exit remain process failures', async t => {
  const f = await fixture(t);
  const launch = async (command, slot) => {
    const result = await f.launch(command, slot);
    if (slot.ordinal === 1) await writeFile(command.args.at(-2), '{invalid json');
    if (slot.ordinal === 2) result.exitCode = 3;
    return result;
  };
  const result = await executeMatrix(f.options, { ...f.dependencies, launch });
  assert.equal(result.attempted, 24);
  assert.equal(result.outcomes[0].status, 'report-invalid');
  assert.equal(await readFile(result.outcomes[0].paths.report, 'utf8'), '{invalid json');
  assert.equal(result.outcomes[0].reportSha256, sha('{invalid json'));
  assert.equal(result.outcomes[1].status, 'process-failed');
  assert.equal(result.outcomes[1].exitCode, 3);
});

test('forged or incomplete completed timing fields and gate claims are rejected while preserving all 24 slots', async t => {
  const mutations = [
    report => { report.batchMs = true; },
    report => { report.batchMs = null; },
    report => { report.firstTestMs = -1; },
    report => { report.secondTestMs = 0; },
    report => { report.wordsPerSecond = 10001; },
    report => { report.trials.pop(); },
    report => { report.trials[0].batchMs.pop(); },
    report => { report.trials[0].completed = false; },
    report => { report.trials[0].batchMs[0] = true; },
    report => { report.trials[0].variance = 2; },
    report => { report.medianVariance = 2; },
    report => { report.wordBytesSha256 = 'not-a-hash'; },
    report => { report.gates = { status: 'evaluated', throughput: true }; },
    report => { report.batchMs = Infinity; },
    report => { report.gates = { status: 'not-applicable-to-existing-untraced-gates', invented: true }; },
  ];
  const f = await fixture(t);
  const launch = async (command, slot) => {
    const report = f.report(slot);
    mutations[slot.ordinal - 1]?.(report);
    await writeFile(command.args.at(-2), JSON.stringify(report), { flag: 'wx' });
    return { exitCode: 0, stdout: '', stderr: '' };
  };
  const result = await executeMatrix(f.options, { ...f.dependencies, launch });
  assert.equal(result.attempted, 24);
  assert(result.outcomes.slice(0, mutations.length).every(outcome => outcome.status === 'report-invalid'));
  assert(result.outcomes.slice(mutations.length).every(outcome => outcome.status === 'completed'));
});

test('a forged untraced gate is rejected from the retained raw timings', async t => {
  const f = await fixture(t);
  const launch = async (command, slot) => {
    const report = f.report(slot);
    if (slot.ordinal === 1) report.gates.throughput = false;
    await writeFile(command.args.at(-2), JSON.stringify(report), { flag: 'wx' });
    return { exitCode: 0, stdout: '', stderr: '' };
  };
  const result = await executeMatrix(f.options, { ...f.dependencies, launch });
  assert.equal(result.attempted, 24);
  assert.equal(result.outcomes[0].status, 'report-invalid');
  assert.equal(result.outcomes[0].reportIssues[0].name, 'gates');
});

test('ledger cannot occupy the output directory or any scheduled child output path', async t => {
  const f = await fixture(t);
  for (const path of [f.options.outputDirectory, join(f.options.outputDirectory, '01-trace-false-control.json')]) {
    await assert.rejects(executeMatrix({ ...f.options, ledgerPath: path }, f.dependencies), /must be separate paths/);
  }
  assert.equal(f.calls.length, 0);
});

test('pure timing summary keeps slow gate-failed pairs, all six positions, and exact trace overhead ratios', () => {
  const outcomes = matrixSchedule().map(slot => {
    const batchMs = slot.variant === 'control' ? 100 : 50;
    return { ...slot, status: 'completed', reportIssues: [], report: { completed: true, sourceIntegrityPassed: true,
      batchMs: batchMs * (slot.trace ? 3 : 1), wordsPerSecond: 10000000 / (batchMs * (slot.trace ? 3 : 1)),
      gates: slot.trace ? { status: 'not-applicable-to-existing-untraced-gates' } : {
        status: 'evaluated', throughput: true, medianVariance: true, firstTestDeadline: true, secondTestDeadline: true,
      } } };
  });
  outcomes[1].status = 'gate-failed';
  outcomes[1].report.gates.throughput = false;
  outcomes[1].report.batchMs = 4000;
  outcomes[1].report.wordsPerSecond = 2500;
  const result = summarizeTiming(outcomes);
  const off = result.throughputByMode[0];
  assert.equal(off.pairs.length, 6);
  assert.equal(off.pairs[0].ratio, 0.025);
  assert.equal(off.pairs[0].reason, null);
  assert.equal(off.availableCount, 6);
  assert.equal(off.median, 2);
  assert.deepStrictEqual(off.range, [0.025, 2]);
  assert.equal(result.throughputByMode[1].pairs.length, 6);
  assert.equal(result.traceOverhead.pairs.length, 12);
  assert.equal(result.traceOverhead.pairs.find(pair => pair.traceOffOrdinal === 2).ratio, 0.0375);
  assert(result.traceOverhead.pairs.filter(pair => pair.traceOffOrdinal !== 2).every(pair => pair.ratio === 3));
  assert.equal(result.gateFailureCount, 1);
  assert.deepStrictEqual(result.gateFailures[0], { ordinal: 2, modeId: 'trace-false', pairId: 'trace-false-pair-1',
    variant: 'active', gate: 'throughput', outcomeStatus: 'gate-failed', validated: true });
});

test('summary reports null and reasons for missing, invalid and incomplete slots without compressing the schedule', () => {
  const slots = matrixSchedule();
  const outcomes = [
    { ...slots[0], status: 'incomplete', reportIssues: [], report: { completed: false } },
    { ...slots[1], status: 'report-invalid', reportIssues: [{ name: 'timings' }], report: { completed: true } },
    { ...slots[2], status: 'completed', reportIssues: [], report: { completed: true, sourceIntegrityPassed: true,
      batchMs: 10, wordsPerSecond: 1000000 } },
  ];
  const result = summarizeTiming(outcomes);
  assert.equal(result.throughputByMode[0].pairs.length, 6);
  assert.equal(result.throughputByMode[0].pairs[0].ratio, null);
  assert.match(result.throughputByMode[0].pairs[0].reason, /active: report-invalid/);
  assert.match(result.throughputByMode[0].pairs[0].reason, /control: incomplete/);
  assert.match(result.throughputByMode[0].pairs[1].reason, /control: not-run/);
  assert.deepStrictEqual(result.throughputByMode.map(mode => [mode.availableCount, mode.median, mode.range]),
    [[0, null, null], [0, null, null]]);
  assert.equal(result.traceOverhead.pairs.length, 12);
  assert(result.traceOverhead.pairs.every(pair => pair.ratio === null));
  assert.throws(() => summarizeTiming([outcomes[0], outcomes[0]]), /duplicate matrix outcome/);
});
