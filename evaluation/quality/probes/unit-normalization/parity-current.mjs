import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { regularFile, protectOutput, verifyAnalyzerFreeze } from "./analyze-current.mjs";
import { canonical, digest } from "../../serialization.ts";

const BASE = "569adf516a7fa03a77124d3515c9e1a17a8f71ac";
const root = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));
const production = path => /\.(ts|js|mjs|json)$/.test(path) && !/\.(test|bench)\./.test(path);
const sha = value => createHash("sha256").update(value).digest("hex");
const json = value => JSON.stringify(value) + "\n";
const git = args => execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });

export function assertSameLive(actual, expected) {
  assert.deepStrictEqual(actual, expected);
  const seen = new WeakMap();
  function own(a, b) {
    if (a === null || typeof a !== "object" || seen.get(a) === b) return;
    seen.set(a, b); assert.deepStrictEqual(Reflect.ownKeys(a), Reflect.ownKeys(b));
    for (const key of Reflect.ownKeys(a)) {
      const left = Object.getOwnPropertyDescriptor(a, key); const right = Object.getOwnPropertyDescriptor(b, key);
      assert.deepStrictEqual({ ...left, value: undefined }, { ...right, value: undefined }); own(left.value, right.value);
    }
  }
  own(actual, expected); assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}
const withoutTrace = word => { const result = { ...word }; delete result.trace; return result; };
/** Peeking buffers one source value; it never adds a logical generator draw. */
export function observedRng(source) {
  let buffered; let hasBuffered = false; let calls = 0; let sourceCalls = 0;
  const hash = createHash("sha256");
  const read = () => { sourceCalls++; return source(); };
  return {
    rand: () => {
      const value = hasBuffered ? buffered : read(); hasBuffered = false; calls++;
      const bytes = Buffer.allocUnsafe(8); bytes.writeDoubleLE(value); hash.update(bytes); return value;
    },
    snapshot: () => {
      if (!hasBuffered) { buffered = read(); hasBuffered = true; }
      return { calls, next: buffered, consumedBytesSha256: hash.copy().digest("hex"), sourceCalls };
    },
  };
}
async function sourcePaths(parent, directory = "src") {
  const paths = [];
  for (const entry of await readdir(join(parent, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    assert(!entry.isSymbolicLink());
    if (entry.isDirectory()) paths.push(...await sourcePaths(parent, path));
    else { assert(entry.isFile()); if (production(path)) paths.push(path); }
  }
  return paths.sort();
}
async function controlSnapshot(original) {
  const expected = git(["ls-tree", "-r", "--name-only", BASE, "src"]).toString().trim().split("\n").filter(production).sort();
  assert.deepStrictEqual(await sourcePaths(original), expected);
  const result = [];
  for (const path of [...expected, "package.json", "package-lock.json", "tsconfig.json"].sort()) {
    await regularFile(original, path); const bytes = await readFile(join(original, path));
    assert.equal(sha(bytes), sha(git(["show", `${BASE}:${path}`])), path);
    result.push({ path, bytes: bytes.length, sha256: sha(bytes) });
  }
  for (const path of ["package.json", "package-lock.json", "tsconfig.json"]) assert.deepStrictEqual(await readFile(join(original, path)), await readFile(join(root, path)));
  return result;
}
function config(api, active = false) {
  const value = structuredClone(api.englishConfig);
  if (!active && value.writtenFormConstraints) delete value.writtenFormConstraints.policy;
  if (active) assert.equal(value.writtenFormConstraints?.policy, "preserve-phones");
  return value;
}
/** Eight supplemental public calls, reported apart from the registered stream schedule. */
export function mutationChecks(baseline, candidate, count) {
  const configs = [config(baseline), config(candidate)];
  const apis = [baseline.createGenerator(configs[0]), candidate.createGenerator(configs[1])];
  const generate = api => { count(); return api.generateWord({ seed: 137, morphology: false, trace: true }); };
  const outcome = api => {
    try { return { status: "returned", word: generate(api) }; }
    catch (error) { return { status: "threw", error: { name: error.name, message: error.message } }; }
  };
  const first = apis.map(generate); assertSameLive(first[1], first[0]);
  const saved = structuredClone(first[0]);
  for (const word of first) { word.written.clean = "mutated"; word.syllables[0].nucleus[0].sound = "mutated"; word.trace.stages.length = 0; }
  const repeated = apis.map(outcome); assertSameLive(repeated[1], repeated[0]);
  const isolation = repeated[0].status === "returned" && isDeepStrictEqual(repeated[0].word, saved);
  // Fresh generators keep a returned-value alias defect from masking the separate
  // between-call configuration check. Both actual outcomes remain in the report.
  const freshConfigs = [config(baseline), config(candidate)];
  const fresh = [baseline.createGenerator(freshConfigs[0]), candidate.createGenerator(freshConfigs[1])];
  const beforeConfigurationMutation = fresh.map(outcome);
  assertSameLive(beforeConfigurationMutation[1], beforeConfigurationMutation[0]);
  for (const value of freshConfigs) {
    value.generationWeights.probability.finalS = 100;
    value.writtenFormConstraints.maxConsonantLetters = 2;
  }
  const changed = fresh.map(outcome); assertSameLive(changed[1], changed[0]);
  return { compatibilityPassed: true, returnedValueIsolation: isolation,
    beforeReturnedMutation: saved, afterReturnedMutation: repeated, beforeConfigurationMutation, afterConfigurationMutation: changed };
}

export async function runParity({ original, freeze, expectedFreeze, out, progress = () => {} }) {
  original = resolve(original); out = resolve(out);
  await protectOutput(out, [root, original]); await protectOutput(`${out}.inputs.json`, [root, original]);
  const { frozen } = await verifyAnalyzerFreeze(freeze, expectedFreeze);
  const before = await controlSnapshot(original);
  const protocol = JSON.parse(await readFile(join(root, "evaluation/quality/probes/unit-normalization/protocol.json")));
  assert.equal(protocol.control.commit, BASE);
  const schedule = JSON.parse(await readFile(join(root, "evaluation/quality/protocol.json")));
  assert.equal(digest(schedule), protocol.control.protocolDigest);
  const baseline = await import(pathToFileURL(join(original, "src/index.ts")));
  const candidate = await import(pathToFileURL(join(root, "src/index.ts")));
  const definitions = [
    { name: "control-omitted", api: baseline, active: false },
    { name: "candidate-omitted", api: candidate, active: false },
    { name: "candidate-preserve-phones", api: candidate, active: true },
  ];
  const inputs = { version: 1, baseCommit: BASE, analyzerFreezeSha256: expectedFreeze, original, controlSources: before,
    node: process.version, configs: definitions.map(definition => ({ name: definition.name, config: canonical(config(definition.api, definition.active)) })), schedule };
  assert.deepStrictEqual(inputs.configs[0].config, inputs.configs[1].config);
  assert.deepStrictEqual(inputs.configs[2].config, frozen.effectiveConfig);
  await writeFile(`${out}.inputs.json`, json(inputs), { flag: "wx" });
  const result = { version: 1, inputsSha256: sha(Buffer.from(json(inputs))), passed: false, generationPassed: false, sourceIntegrityPassed: false,
    scheduledGenerationCalls: 0, omittedPolicyCalls: 0, activeTraceParityCalls: 0, supplementalMutationCalls: 0, mutationChecks: null, coordinates: 0, streams: [], at: null, error: null, integrityError: null };
  try {
    for (const profile of schedule.profiles) for (const seed of profile.seeds.development) {
      const paths = definitions.map(definition => ({ name: definition.name, modes: [false, true].map(trace => ({ trace,
        api: definition.api.createGenerator(config(definition.api, definition.active)), rng: observedRng(definition.api.createSeededRng(seed)), words: createHash("sha256") })) }));
      const boundaries = createHash("sha256");
      for (let index = 0; index < 1000; index++) {
        const words = paths.map((path, pathIndex) => path.modes.map(mode => {
          result.at = { phase: "generation", profile: profile.id, seed, index, path: path.name, trace: mode.trace };
          result.scheduledGenerationCalls++; if (pathIndex < 2) result.omittedPolicyCalls++; else result.activeTraceParityCalls++;
          const word = mode.api.generateWord({ ...profile.options, rand: mode.rng.rand, trace: mode.trace }); mode.words.update(json(word)); return word;
        }));
        const snapshots = paths.map(path => path.modes.map(mode => mode.rng.snapshot()));
        for (let path = 0; path < paths.length; path++) {
          result.at = { phase: "own-trace-comparison", profile: profile.id, seed, index, path: paths[path].name };
          assertSameLive(words[path][0], withoutTrace(words[path][1]));
          assert.deepStrictEqual(snapshots[path][0], snapshots[path][1]);
        }
        for (let mode = 0; mode < 2; mode++) {
          result.at = { phase: "omitted-policy-comparison", profile: profile.id, seed, index, trace: !!mode };
          assertSameLive(words[1][mode], words[0][mode]); assert.deepStrictEqual(snapshots[1][mode], snapshots[0][mode]);
        }
        boundaries.update(json({ index, snapshots })); result.coordinates++;
      }
      result.streams.push({ profile: profile.id, seed, coordinates: 1000, boundariesSha256: boundaries.digest("hex"), paths: paths.map(path => ({ name: path.name,
        modes: path.modes.map(mode => ({ trace: mode.trace, rng: mode.rng.snapshot(), wordBytesSha256: mode.words.digest("hex") })) })) });
      progress(`${result.streams.length}/20 streams: ${profile.id}/${seed}`);
    }
    assert.equal(result.omittedPolicyCalls, 80000); assert.equal(result.activeTraceParityCalls, 40000);
    assert.equal(result.scheduledGenerationCalls, 120000); assert.equal(result.coordinates, 20000); assert.equal(result.streams.length, 20);
    result.mutationChecks = mutationChecks(baseline, candidate, () => {
      result.supplementalMutationCalls++; result.at = { phase: "supplemental-mutation", call: result.supplementalMutationCalls };
    }); assert.equal(result.supplementalMutationCalls, 8);
    result.generationPassed = true;
  } catch (error) { result.error = { name: error.name, message: error.message, stack: error.stack }; }
  try {
    await verifyAnalyzerFreeze(freeze, expectedFreeze); assert.deepStrictEqual(await controlSnapshot(original), before); result.sourceIntegrityPassed = true;
  } catch (error) { result.integrityError = { name: error.name, message: error.message, stack: error.stack }; }
  result.passed = result.generationPassed && result.sourceIntegrityPassed;
  await writeFile(out, json(result), { flag: "wx" }); return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [original, freeze, expectedFreeze, out] = process.argv.slice(2);
  assert(original && freeze && expectedFreeze && out && process.argv.length === 6, "Usage: parity-current.mjs CONTROL FREEZE FREEZE_SHA OUT");
  const result = await runParity({ original, freeze: resolve(freeze), expectedFreeze, out, progress: line => process.stderr.write(line + "\n") });
  console.log({ passed: result.passed, calls: result.scheduledGenerationCalls, error: result.error?.message }); if (!result.passed) process.exitCode = 1;
}
