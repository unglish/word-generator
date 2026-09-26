import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {open, readFile, realpath} from 'node:fs/promises';
import {basename, dirname, relative, resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePath = fileURLToPath(import.meta.url);
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator';
const original = '/private/tmp/q09-runtime-control-9e772f2-v1';
const freeze = '/private/tmp/q09-runtime-capture-freeze-v1.json';
const expectedFreeze = 'c217a04a03b0613e1121283b95f5d16396d23182bc32a1e647e34728aa517b38';
export const PROTECTED_ROOTS = [root, original, '/private/tmp/q09-runtime-control-raw-v1', '/private/tmp/q09-runtime-active-raw-v1'];
const failure = error => ({name: error.name, message: error.message, stack: error.stack});
const accounting = () => ({attemptedWords: 0, completedWords: 0, attemptedApiCalls: 0, completedApiCalls: 0});

export async function measure(api, trace, clock = () => performance.now()) {
  const report = {...accounting(), trials: []};
  const batch = (count, options) => {
    report.attemptedWords += count;
    report.attemptedApiCalls++;
    const words = api.generateWords(count, options);
    assert.equal(words.length, count);
    report.completedWords += words.length;
    report.completedApiCalls++;
    return words;
  };
  const one = options => {
    report.attemptedWords++;
    report.attemptedApiCalls++;
    const word = api.generateWord(options);
    report.completedWords++;
    report.completedApiCalls++;
    return word;
  };
  try {
    const firstStart = clock();
    batch(50, {seed: 0, trace});
    const start = clock();
    const words = batch(10000, {seed: 42, trace});
    report.batchMs = clock() - start;
    assert(Number.isFinite(report.batchMs) && report.batchMs > 0);
    report.wordsPerSecond = 10000000 / report.batchMs;
    report.firstTestMs = clock() - firstStart;
    report.wordBytesSha256 = sha(JSON.stringify(words));
    const secondStart = clock();
    for (let i = 0; i < 50; i++) one({seed: 900000 + i, trace});
    for (let trial = 0; trial < 3; trial++) {
      const observed = {batchMs: [], variance: null, completed: false};
      report.trials.push(observed);
      for (let batchIndex = 0; batchIndex < 5; batchIndex++) {
        const start = clock();
        for (let i = 0; i < 200; i++) one({seed: trial * 100000 + batchIndex * 200 + i, trace});
        const elapsed = clock() - start;
        assert(Number.isFinite(elapsed) && elapsed > 0);
        observed.batchMs.push(elapsed);
      }
      observed.variance = Math.max(...observed.batchMs) / Math.min(...observed.batchMs);
      observed.completed = true;
    }
    report.secondTestMs = clock() - secondStart;
    report.medianVariance = report.trials.map(trial => trial.variance).sort((a, b) => a - b)[1];
    assert.equal(report.completedWords, 13100);
    assert.equal(report.completedApiCalls, 3052);
    report.gates = trace ? {status: 'not-applicable-to-existing-untraced-gates'} : {
      status: 'evaluated', throughput: report.wordsPerSecond >= 4500,
      medianVariance: report.medianVariance < 3,
      firstTestDeadline: report.firstTestMs <= 20000, secondTestDeadline: report.secondTestMs <= 20000,
    };
    return {...report, completed: true};
  } catch (error) {
    return {...report, completed: false, error: failure(error)};
  }
}

/** Resolve aliases before reserving; an occupied or unsafe path is never opened. */
export async function reserveOutput(out, protectedRoots = PROTECTED_ROOTS) {
  const target = resolve(out);
  const destination = resolve(await realpath(dirname(target)), basename(target));
  for (const input of protectedRoots) {
    const path = relative(await realpath(input), destination);
    assert(path === '..' || path.startsWith('../'), 'Timing output overlaps a protected source/archive tree');
  }
  return {path: destination, handle: await open(destination, 'wx', 0o600)};
}

async function loadTools() {
  const capture = await import(pathToFileURL(`${root}/evaluation/experiments/conditional-root-stress-runtime/capture.mjs`));
  const serialization = await import(pathToFileURL(`${root}/evaluation/quality/serialization.ts`));
  return {trustedInputs: capture.trustedInputs, canonical: serialization.canonical};
}

async function loadRuntime(variant) {
  return import(pathToFileURL(`${variant === 'control' ? original : root}/src/index.ts`));
}

/** Overrides support synthetic failure tests only; the CLI always uses pinned real inputs. */
export async function run({variant, trace, out, expectedSelf}, overrides = {}) {
  const reserved = await reserveOutput(out);
  const report = {
    schema: 'q09-configured-timing-v1', variant, trace, sourceFreezeSha256: expectedFreeze,
    benchmarkSha256: expectedSelf, sourceIntegrityPassed: false, integrityError: null,
    ...accounting(), trials: [], completed: false, phase: 'preflight',
  };
  try {
    assert(['control', 'active'].includes(variant));
    assert(typeof trace === 'boolean');
    assert.notEqual(process.env.CI, 'true');
    assert.equal(sha(await readFile(sourcePath)), expectedSelf);
    const tools = await (overrides.loadTools ?? loadTools)();
    const options = {root, original, freeze, expectedFreeze};
    const frozen = await tools.trustedInputs(options);
    report.engine = frozen.engine;
    report.phase = 'runtime-import';
    const runtime = await (overrides.loadRuntime ?? loadRuntime)(variant);
    report.phase = 'configuration';
    const config = structuredClone(runtime.englishConfig);
    if (variant === 'control') delete config.pronunciation.stress.rootPattern;
    else config.pronunciation.stress.rootPattern = structuredClone(frozen.protocol.policy.active);
    assert.deepStrictEqual(tools.canonical(config), frozen.configs[variant]);
    report.config = tools.canonical(config);
    report.configurationDigest = sha(JSON.stringify(report.config));
    report.phase = 'factory-construction';
    const api = runtime.createGenerator(config);
    report.phase = 'measurement';
    Object.assign(report, await measure(api, trace, overrides.clock));
    report.phase = 'postflight';
    try {
      await tools.trustedInputs(options);
      assert.deepStrictEqual(tools.canonical(config), frozen.configs[variant]);
      assert.equal(sha(await readFile(sourcePath)), expectedSelf);
      report.sourceIntegrityPassed = true;
    } catch (error) {
      report.integrityError = failure(error);
    }
    report.phase = 'finished';
  } catch (error) {
    report.error = failure(error);
    report.completed = false;
  }
  try {
    await reserved.handle.writeFile(JSON.stringify(report) + '\n');
  } finally {
    await reserved.handle.close();
  }
  return report;
}

export function outcomePassed(result) {
  return result.completed && result.sourceIntegrityPassed
    && (result.gates?.status === 'not-applicable-to-existing-untraced-gates'
      || result.gates?.status === 'evaluated' && Object.entries(result.gates).every(([key, value]) => key === 'status' || value === true));
}

if (process.argv[1] && resolve(process.argv[1]) === sourcePath) {
  const [variant, mode, out, expectedSelf] = process.argv.slice(2);
  assert.equal(process.argv.length, 6);
  assert(['false', 'true'].includes(mode));
  const result = await run({variant, trace: mode === 'true', out: resolve(out), expectedSelf});
  console.log({variant, trace: result.trace, completed: result.completed, sourceIntegrityPassed: result.sourceIntegrityPassed,
    wordsPerSecond: result.wordsPerSecond, gates: result.gates, phase: result.phase, error: result.error});
  if (!outcomePassed(result)) process.exitCode = 1;
}
