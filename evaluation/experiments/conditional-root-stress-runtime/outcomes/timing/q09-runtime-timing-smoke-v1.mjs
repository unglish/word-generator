/** Small real public-API correctness check; no measured workload or performance claim. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createWorkload, reserveOutput} from './q09-runtime-timing-v2.mjs';

const sourcePath = fileURLToPath(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const root = '/Users/ryanbetts/.codex/worktrees/linguistic-diagnostics/word-generator';
const original = '/private/tmp/q09-runtime-control-9e772f2-v1';
const freeze = '/private/tmp/q09-runtime-capture-freeze-v1.json';
const expectedFreeze = 'c217a04a03b0613e1121283b95f5d16396d23182bc32a1e647e34728aa517b38';
const keys = ['matrix', 'benchmark', 'benchmarkTests', 'contract', 'matrixTests', 'smoke', 'preservation', 'tsx'];

export async function smoke(manifestPath, expectedManifest, out) {
  const reserved = await reserveOutput(out);
  const report = {schema: 'q09-runtime-timing-api-smoke-v1', passed: false,
    interpretation: 'Correctness and interface smoke only; no elapsed measurements or benchmark outcomes',
    reviewManifestSha256: expectedManifest, sourceFreezeSha256: expectedFreeze,
    sourceIntegrityPassed: false, attemptedFactoryWords: 0, completedFactoryWords: 0,
    attemptedReferenceBatchCalls: 0, completedReferenceBatchCalls: 0, completedReferenceWords: 0, cases: []};
  try {
    const manifestBytes = await readFile(manifestPath);
    assert.equal(sha(manifestBytes), expectedManifest);
    const manifest = JSON.parse(manifestBytes);
    assert.equal(manifest.schema, 'q09-runtime-timing-review-v2');
    assert.deepStrictEqual(manifest.captureFreeze, {path: freeze, sha256: expectedFreeze});
    assert.equal(resolve(manifest.pins.smoke.path), sourcePath);
    const verifyPins = async () => {
      assert.equal(sha(await readFile(manifestPath)), expectedManifest);
      for (const key of keys) assert.equal(sha(await readFile(manifest.pins[key].path)), manifest.pins[key].sha256, key);
    };
    await verifyPins();
    const {trustedInputs} = await import(pathToFileURL(`${root}/evaluation/experiments/conditional-root-stress-runtime/capture.mjs`));
    const {canonical} = await import(pathToFileURL(`${root}/evaluation/quality/serialization.ts`));
    const options = {root, original, freeze, expectedFreeze};
    const frozen = await trustedInputs(options);
    report.engine = frozen.engine;
    const configs = [];
    for (const variant of ['control', 'active']) {
      const runtime = await import(pathToFileURL(`${variant === 'control' ? original : root}/src/index.ts`));
      for (const trace of [false, true]) {
        const config = structuredClone(runtime.englishConfig);
        if (variant === 'control') delete config.pronunciation.stress.rootPattern;
        else config.pronunciation.stress.rootPattern = structuredClone(frozen.protocol.policy.active);
        assert.deepStrictEqual(canonical(config), frozen.configs[variant]);
        configs.push({variant, config});
        const api = runtime.createGenerator(config);
        assert.equal(typeof api.generateWord, 'function');
        assert.equal(api.generateWords, undefined, 'Factory has no batch method; never fabricate one');
        const observedApi = {generateWord: options => {
          report.attemptedFactoryWords++;
          const word = api.generateWord(options);
          report.completedFactoryWords++;
          return word;
        }};
        const work = createWorkload(observedApi, runtime.createSeededRng, trace);
        const observed = {variant, trace, factoryKeys: Object.keys(api), batches: [], serial: [], completed: false};
        report.cases.push(observed);
        for (const [count, seed] of [[5, 0], [7, 42]]) {
          const actual = JSON.stringify(work.batch(count, seed));
          const batch = {count, seed, sha256: sha(actual), legacyPublicBatchEqual: null};
          observed.batches.push(batch);
          if (variant === 'control') {
            assert.deepStrictEqual(canonical(runtime.englishConfig), frozen.configs.control, 'Reference default configuration must match control');
            report.attemptedReferenceBatchCalls++;
            const expected = runtime.generateWords(count, {seed, trace});
            report.completedReferenceBatchCalls++;
            report.completedReferenceWords += expected.length;
            assert.equal(actual, JSON.stringify(expected), 'Factory batch differs from matching public generateWords');
            batch.legacyPublicBatchEqual = true;
          }
        }
        for (const seed of [900000, 0, 100000]) {
          const word = work.one(seed);
          assert.equal(typeof word.written.clean, 'string');
          if (trace) assert(word.trace, 'Trace-on call must return trace data');
          else assert.equal(word.trace, undefined);
          observed.serial.push({seed, sha256: sha(JSON.stringify(word))});
        }
        observed.accounting = structuredClone(work.report);
        assert.equal(work.report.completedWords, 15);
        assert.equal(work.report.completedApiCalls, 15);
        assert.equal(work.report.completedLogicalCalls, 5);
        assert.equal(work.report.completedRngFactoryCalls, 2);
        observed.completed = true;
      }
    }
    await trustedInputs(options);
    await verifyPins();
    for (const {variant, config} of configs) assert.deepStrictEqual(canonical(config), frozen.configs[variant]);
    report.sourceIntegrityPassed = true;
    assert.equal(report.completedFactoryWords, 60);
    assert.equal(report.completedReferenceBatchCalls, 4);
    assert.equal(report.completedReferenceWords, 24);
    report.passed = true;
  } catch (error) {
    report.error = {name: error.name, message: error.message, stack: error.stack};
  }
  try { await reserved.handle.writeFile(JSON.stringify(report, null, 2) + '\n'); }
  finally { await reserved.handle.close(); }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === sourcePath) {
  assert.equal(process.argv.length, 5, 'MANIFEST EXPECTED_SHA FRESH_OUTPUT required');
  const report = await smoke(...process.argv.slice(2));
  console.log(JSON.stringify({passed: report.passed, sourceIntegrityPassed: report.sourceIntegrityPassed,
    completedFactoryWords: report.completedFactoryWords, completedReferenceWords: report.completedReferenceWords, error: report.error}));
  if (!report.passed) process.exitCode = 1;
}
