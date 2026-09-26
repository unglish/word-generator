import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sourcePath = fileURLToPath(import.meta.url);
const captureFreezePin = Object.freeze({
  path: '/private/tmp/q09-runtime-capture-freeze-v1.json',
  sha256: 'c217a04a03b0613e1121283b95f5d16396d23182bc32a1e647e34728aa517b38',
});
const pinNames = ['matrix', 'benchmark', 'benchmarkTests', 'contract', 'matrixTests', 'tsx'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const errorRecord = error => ({ name: error.name, message: error.message, stack: error.stack });

export function matrixSchedule() {
  const variants = ['control', 'active', 'active', 'control', 'control', 'active',
    'active', 'control', 'control', 'active', 'active', 'control'];
  return [false, true].flatMap((trace, modeIndex) => variants.map((variant, index) => ({
    ordinal: modeIndex * 12 + index + 1,
    modeId: `trace-${trace}`,
    trace,
    modeOrdinal: index + 1,
    pairId: `trace-${trace}-pair-${Math.floor(index / 2) + 1}`,
    pairPosition: index % 2 + 1,
    variant,
  })));
}

function validPin(pin) {
  assert(pin && isAbsolute(pin.path), 'pin requires an absolute path');
  assert.match(pin.sha256, /^[a-f0-9]{64}$/, `invalid SHA for ${pin.path}`);
}

async function verifyPin(pin) {
  validPin(pin);
  const bytes = await readFile(pin.path);
  assert.equal(sha(bytes), pin.sha256, `source authority changed: ${pin.path}`);
  return bytes;
}

function isWithin(path, root) {
  const child = relative(root, path);
  return child === '' || (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child));
}

async function canonicalPath(path) {
  assert(isAbsolute(path), 'output and protected paths must be absolute');
  try {
    return await realpath(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return resolve(await canonicalPath(dirname(path)), basename(path));
  }
}

async function freshOutput(path, protectedRoots) {
  const canonical = await canonicalPath(path);
  assert(!protectedRoots.some(root => isWithin(canonical, root)), `protected output: ${path}`);
  try {
    await lstat(path);
    assert.fail(`output already exists: ${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return canonical;
}

async function loadAuthority(options, dependencies) {
  const manifestPin = { path: options.reviewManifestPath, sha256: options.expectedReviewManifestSha256 };
  const manifest = JSON.parse(await verifyPin(manifestPin));
  assert.equal(manifest.schema, 'q09-runtime-timing-review-v1');
  for (const name of pinNames) validPin(manifest.pins[name]);
  assert.equal(await realpath(manifest.pins.matrix.path), await realpath(sourcePath), 'matrix pin must identify this module');
  const expectedFreeze = dependencies.captureFreezePin ?? captureFreezePin;
  if (dependencies.captureFreezePin) assert(dependencies.launch, 'synthetic authority requires an injected launcher');
  assert.deepStrictEqual(manifest.captureFreeze, expectedFreeze, 'capture freeze must match external authority');
  const frozen = JSON.parse(await verifyPin(manifest.captureFreeze));
  assert.equal(frozen.schemaVersion, 'q09-configured-capture-freeze-v1');
  assert(frozen.configs.control && frozen.configs.active, 'frozen configs required');
  const enginePin = { path: frozen.engine.executable, sha256: frozen.engine.sha256 };
  validPin(enginePin);
  assert(Array.isArray(manifest.rawArchiveRoots) && manifest.rawArchiveRoots.length > 0, 'raw archive roots required');
  const protectedRoots = await Promise.all([frozen.root, frozen.original, ...manifest.rawArchiveRoots].map(canonicalPath));
  const pins = [manifestPin, manifest.captureFreeze, ...pinNames.map(name => manifest.pins[name]), enginePin];
  const verify = async () => { for (const pin of pins) await verifyPin(pin); };
  await verify();
  return { manifest, frozen, protectedRoots, verify };
}

function launchProcess({ executable, args, cwd, env }) {
  return new Promise(resolveLaunch => {
    const stdout = [];
    const stderr = [];
    let spawnError;
    const child = spawn(executable, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', bytes => stdout.push(bytes));
    child.stderr.on('data', bytes => stderr.push(bytes));
    child.on('error', error => { spawnError = errorRecord(error); });
    child.on('close', (exitCode, signal) => resolveLaunch({
      exitCode, signal, spawnError, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr),
    }));
  });
}

function validateReport(report, slot, authority) {
  const { manifest, frozen } = authority;
  const issues = [];
  const check = (name, action, isAuthority = false) => {
    try { action(); } catch (error) { issues.push({ name, authority: isAuthority, error: errorRecord(error) }); }
  };
  check('schema', () => assert.equal(report.schema, 'q09-configured-timing-v1'));
  check('variant', () => assert.equal(report.variant, slot.variant), true);
  check('trace', () => assert.equal(report.trace, slot.trace), true);
  check('freeze', () => assert.equal(report.sourceFreezeSha256, manifest.captureFreeze.sha256), true);
  check('benchmark', () => assert.equal(report.benchmarkSha256, manifest.pins.benchmark.sha256), true);
  check('sourceIntegrity', () => assert.equal(report.sourceIntegrityPassed, true), true);
  check('config', () => assert.deepStrictEqual(report.config, frozen.configs[slot.variant]), true);
  check('engine', () => assert.deepStrictEqual(report.engine, frozen.engine), true);
  check('completed', () => assert.equal(typeof report.completed, 'boolean'));
  check('counts', () => {
    for (const [attempted, completed, maximum] of [
      ['attemptedWords', 'completedWords', 13100],
      ['attemptedApiCalls', 'completedApiCalls', 3052],
    ]) {
      assert(Number.isSafeInteger(report[attempted]) && report[attempted] >= 0 && report[attempted] <= maximum);
      assert(Number.isSafeInteger(report[completed]) && report[completed] >= 0 && report[completed] <= report[attempted]);
      if (report.completed) { assert.equal(report[attempted], maximum); assert.equal(report[completed], maximum); }
    }
  });
  check('timings', () => {
    if (!report.completed) return;
    const positive = value => assert(typeof value === 'number' && Number.isFinite(value) && value > 0);
    for (const key of ['batchMs', 'wordsPerSecond', 'firstTestMs', 'secondTestMs', 'medianVariance']) positive(report[key]);
    assert.equal(report.wordsPerSecond, 10000000 / report.batchMs);
    assert.equal(report.trials.length, 3);
    for (const trial of report.trials) {
      assert.equal(trial.completed, true);
      assert.equal(trial.batchMs.length, 5);
      for (const elapsed of trial.batchMs) positive(elapsed);
      positive(trial.variance);
      assert.equal(trial.variance, Math.max(...trial.batchMs) / Math.min(...trial.batchMs));
    }
    assert.equal(report.medianVariance, report.trials.map(trial => trial.variance).sort((a, b) => a - b)[1]);
    assert.match(report.wordBytesSha256, /^[a-f0-9]{64}$/);
  });
  check('gates', () => {
    if (!report.completed) return;
    const expected = slot.trace ? { status: 'not-applicable-to-existing-untraced-gates' } : {
      status: 'evaluated', throughput: report.wordsPerSecond >= 4500,
      medianVariance: report.medianVariance < 3,
      firstTestDeadline: report.firstTestMs <= 20000, secondTestDeadline: report.secondTestMs <= 20000,
    };
    assert.deepStrictEqual(report.gates, expected);
  });
  return issues;
}

async function readReport(path, slot, authority) {
  let digest;
  try {
    const bytes = await readFile(path);
    digest = sha(bytes);
    const report = JSON.parse(bytes);
    return { sha256: digest, report, issues: validateReport(report, slot, authority) };
  } catch (error) {
    return { sha256: digest, report: null, issues: [{ name: 'report', authority: false, error: errorRecord(error) }] };
  }
}

function outcomeStatus(processResult, reportResult, authorityError) {
  if (authorityError || reportResult.issues.some(issue => issue.authority)) return 'authority-failed';
  if (reportResult.issues.length > 0) return 'report-invalid';
  const { report } = reportResult;
  if (!report.completed) return 'incomplete';
  if (!report.trace && Object.values(report.gates).includes(false)) return 'gate-failed';
  if (processResult.exitCode !== 0 || processResult.signal || processResult.spawnError) return 'process-failed';
  return 'completed';
}

function descriptiveRatios(entries) {
  const values = entries.map(entry => entry.ratio).filter(value => value !== null).sort((a, b) => a - b);
  if (values.length === 0) return { availableCount: 0, median: null, range: null };
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[middle] : values[middle - 1] / 2 + values[middle] / 2;
  return { availableCount: values.length, median, range: [values[0], values.at(-1)] };
}

function ratioUnavailable(outcome) {
  if (!outcome) return 'not-run';
  if (!['completed', 'gate-failed', 'process-failed'].includes(outcome.status)) return outcome.status;
  if (!outcome.report?.completed || outcome.report.sourceIntegrityPassed !== true) return 'incomplete-or-untrusted-report';
  if (!Array.isArray(outcome.reportIssues) || outcome.reportIssues.length > 0) return 'unvalidated-report';
  return null;
}

function pairedRatio(numerator, denominator, field, numeratorLabel, denominatorLabel) {
  const reasons = [];
  for (const [label, outcome] of [[numeratorLabel, numerator], [denominatorLabel, denominator]]) {
    const unavailable = ratioUnavailable(outcome);
    if (unavailable) reasons.push(`${label}: ${unavailable}`);
  }
  if (reasons.length) return { ratio: null, reason: reasons.join('; ') };
  const top = numerator.report[field];
  const bottom = denominator.report[field];
  const ratio = top / bottom;
  if (![top, bottom, ratio].every(value => typeof value === 'number' && Number.isFinite(value) && value > 0)) {
    return { ratio: null, reason: 'nonpositive-or-nonfinite-ratio-input' };
  }
  return { ratio, reason: null };
}

export function summarizeTiming(outcomes) {
  const byOrdinal = new Map(outcomes.map(outcome => [outcome.ordinal, outcome]));
  assert.equal(byOrdinal.size, outcomes.length, 'duplicate matrix outcome ordinal');
  const schedule = matrixSchedule();
  const throughputByMode = [false, true].map(trace => {
    const slots = schedule.filter(slot => slot.trace === trace);
    const pairs = Array.from({ length: 6 }, (_, index) => {
      const pair = slots.slice(index * 2, index * 2 + 2);
      const control = pair.find(slot => slot.variant === 'control');
      const active = pair.find(slot => slot.variant === 'active');
      return { pairId: control.pairId, pairOrdinal: index + 1, controlOrdinal: control.ordinal, activeOrdinal: active.ordinal,
        ...pairedRatio(byOrdinal.get(active.ordinal), byOrdinal.get(control.ordinal), 'wordsPerSecond', 'active', 'control') };
    });
    return { modeId: `trace-${trace}`, trace, ratioDefinition: 'active.wordsPerSecond / control.wordsPerSecond',
      pairs, ...descriptiveRatios(pairs) };
  });
  const traceOverhead = schedule.filter(slot => !slot.trace).map(slot => ({
    pairOrdinal: Math.floor((slot.modeOrdinal - 1) / 2) + 1, variant: slot.variant,
    traceOffOrdinal: slot.ordinal, traceOnOrdinal: slot.ordinal + 12,
    ...pairedRatio(byOrdinal.get(slot.ordinal + 12), byOrdinal.get(slot.ordinal), 'batchMs', 'trace-on', 'trace-off'),
  }));
  const gateFailures = outcomes.flatMap(outcome => {
    if (outcome.report?.gates?.status !== 'evaluated') return [];
    return Object.entries(outcome.report.gates).filter(([, passed]) => passed === false).map(([gate]) => ({
      ordinal: outcome.ordinal, modeId: outcome.modeId, pairId: outcome.pairId, variant: outcome.variant,
      gate, outcomeStatus: outcome.status, validated: ratioUnavailable(outcome) === null,
    }));
  });
  return { throughputByMode, traceOverhead: { ratioDefinition: 'trace-on.batchMs / trace-off.batchMs',
    pairs: traceOverhead, ...descriptiveRatios(traceOverhead) }, gateFailureCount: gateFailures.length, gateFailures };
}

export async function executeMatrix(options, dependencies = {}) {
  const authority = await loadAuthority(options, dependencies);
  const outputDirectory = await freshOutput(options.outputDirectory, authority.protectedRoots);
  const ledgerPath = await freshOutput(options.ledgerPath, authority.protectedRoots);
  assert(!isWithin(outputDirectory, ledgerPath) && !isWithin(ledgerPath, outputDirectory),
    'ledger and output directory must be separate paths');
  await mkdir(outputDirectory, { mode: 0o700 });
  const ledger = await open(ledgerPath, 'ax', 0o600);
  const append = async record => { await ledger.appendFile(`${JSON.stringify(record)}\n`); await ledger.sync(); };
  const schedule = matrixSchedule();
  const outcomes = [];
  let authorityFailure = null;
  try {
    await append({ type: 'matrix-start', schema: 'q09-runtime-timing-matrix-v1',
      reviewManifestPath: options.reviewManifestPath, reviewManifestSha256: options.expectedReviewManifestSha256,
      outputDirectory, ledgerPath, schedule, pins: authority.manifest.pins,
      captureFreeze: authority.manifest.captureFreeze, engine: authority.frozen.engine });
    for (const slot of schedule) {
      const stem = `${String(slot.ordinal).padStart(2, '0')}-${slot.modeId}-${slot.variant}`;
      const paths = { report: resolve(outputDirectory, `${stem}.json`),
        stdout: resolve(outputDirectory, `${stem}.stdout`), stderr: resolve(outputDirectory, `${stem}.stderr`) };
      try { await authority.verify(); } catch (error) {
        authorityFailure = errorRecord(error);
        await append({ type: 'authority-failure', phase: 'before-invocation', slot, error: authorityFailure });
        break;
      }
      const command = { executable: authority.frozen.engine.executable,
        args: ['--import', pathToFileURL(authority.manifest.pins.tsx.path).href, '--', authority.manifest.pins.benchmark.path,
          slot.variant, String(slot.trace), paths.report, authority.manifest.pins.benchmark.sha256],
        cwd: authority.frozen.root, env: { ...process.env } };
      delete command.env.NODE_OPTIONS;
      await append({ type: 'invocation-start', ...slot, paths, executable: command.executable, args: command.args });
      let processResult;
      try { processResult = await (dependencies.launch ?? launchProcess)(command, slot); }
      catch (error) { processResult = { exitCode: null, signal: null, stdout: '', stderr: '', spawnError: errorRecord(error) }; }
      await writeFile(paths.stdout, processResult.stdout ?? '', { flag: 'wx', mode: 0o600 });
      await writeFile(paths.stderr, processResult.stderr ?? '', { flag: 'wx', mode: 0o600 });
      let authorityError = null;
      try { await authority.verify(); } catch (error) { authorityError = errorRecord(error); }
      const reportResult = await readReport(paths.report, slot, authority);
      const status = outcomeStatus(processResult, reportResult, authorityError);
      const outcome = { type: 'invocation-outcome', ...slot, status, paths,
        exitCode: processResult.exitCode ?? null, signal: processResult.signal ?? null,
        spawnError: processResult.spawnError ?? null, authorityError, reportSha256: reportResult.sha256 ?? null,
        stdoutSha256: sha(processResult.stdout ?? ''), stderrSha256: sha(processResult.stderr ?? ''),
        reportIssues: reportResult.issues, report: reportResult.report };
      await append(outcome);
      outcomes.push(outcome);
      if (status === 'authority-failed') { authorityFailure = authorityError ?? reportResult.issues; break; }
    }
    const summary = { type: 'matrix-end', scheduled: 24, attempted: outcomes.length,
      scheduleCompleted: outcomes.length === 24, allPassed: outcomes.length === 24 && outcomes.every(x => x.status === 'completed'),
      authorityFailure, remainingSlots: schedule.slice(outcomes.length), timingSummary: summarizeTiming(outcomes) };
    await append(summary);
    return { ...summary, ledgerPath, outputDirectory, outcomes };
  } finally { await ledger.close(); }
}

if (process.argv[1] && resolve(process.argv[1]) === sourcePath) {
  const [mode, reviewManifestPath, expectedReviewManifestSha256, outputDirectory, ledgerPath] = process.argv.slice(2);
  assert.equal(mode, '--run', 'explicit --run required; importing this module never launches timing');
  assert.equal(process.argv.length, 7);
  const result = await executeMatrix({ reviewManifestPath, expectedReviewManifestSha256, outputDirectory, ledgerPath });
  console.log(JSON.stringify({ ledgerPath: result.ledgerPath, attempted: result.attempted,
    scheduleCompleted: result.scheduleCompleted, allPassed: result.allPassed }));
  if (!result.allPassed) process.exitCode = 1;
}
