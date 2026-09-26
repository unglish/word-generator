import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SCHEDULE_SHA256 = "70d661acae4605ae064d7a194f76a405b452c0124c9e2651e96c666e86b03df9";
const BASE = "9e772f257def91b4370462e17156f71b8f54575d";
const HERE = "evaluation/experiments/conditional-root-stress-runtime";
const TOOLS = ["parity.mjs", "parity.test.mjs", "protocol-v1.json", "registration-v1.json", "design-v1.md", "fixture-plan-v1.md", "implementation-notes-v1.md", "parity-contract-v1.md"].map(name => `${HERE}/${name}`);
const PACKAGES = ["package.json", "package-lock.json", "tsconfig.json"];
const sourcePath = path => /\.(ts|js|mjs|json)$/.test(path) && !/\.(test|bench)\./.test(path);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const json = value => `${JSON.stringify(value)}\n`;

/** Include missing-vs-undefined, nonenumerable own keys and property descriptors. */
export function assertSameLive(actual, expected) {
  assert.deepStrictEqual(actual, expected);
  const seen = new WeakMap();
  function own(a, b) {
    if (a === null || typeof a !== "object") return;
    if (seen.get(a) === b) return;
    seen.set(a, b);
    assert.deepStrictEqual(Reflect.ownKeys(a), Reflect.ownKeys(b));
    for (const key of Reflect.ownKeys(a)) {
      const left = Object.getOwnPropertyDescriptor(a, key);
      const right = Object.getOwnPropertyDescriptor(b, key);
      assert.deepStrictEqual({ ...left, value: undefined }, { ...right, value: undefined });
      own(left.value, right.value);
    }
  }
  own(actual, expected);
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}
export function withoutTrace(word) {
  const copy = { ...word };
  delete copy.trace;
  return copy;
}
async function regularPath(root, path, directory = false) {
  assert.equal((await lstat(root)).isDirectory(), true, "Declared source root must be a regular directory");
  const parts = path.split("/");
  assert(parts.every(part => part && part !== "." && part !== ".."), "Source paths must be relative without traversal");
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index]);
    const entry = await lstat(current);
    const expectedDirectory = directory || index < parts.length - 1;
    assert.equal(expectedDirectory ? entry.isDirectory() : entry.isFile(), true, path);
  }
}
export async function files(root, directory) {
  await regularPath(root, directory, true);
  const result = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Source symlink is not admitted: ${path}`);
    if (entry.isDirectory()) result.push(...await files(root, path));
    else if (entry.isFile() && sourcePath(path)) result.push(path);
  }
  return result.sort();
}
async function snapshot(root, paths) {
  return Promise.all([...paths].sort().map(async path => {
    await regularPath(root, path);
    const bytes = await readFile(join(root, path));
    return { path, bytes: bytes.length, sha256: sha(bytes) };
  }));
}
export async function absent(path) {
  try { await lstat(path); } catch (error) { if (error.code === "ENOENT") return; throw error; }
  throw new Error(`Output already exists: ${path}`);
}
/** Pin the exact original #307 bytes, including all options, seeds and order. */
export function validateSchedule(bytes, delegation) {
  assert.equal(sha(bytes), SCHEDULE_SHA256, "Original #307 schedule bytes differ");
  const schedule = JSON.parse(bytes);
  assert.equal(schedule.wordsPerReplicate, 10000);
  assert.deepStrictEqual(schedule.profiles.map(profile => profile.id), delegation.profiles);
  const seeds = schedule.profiles.flatMap(profile => profile.seeds.development);
  assert.equal(seeds.length, 20); assert.equal(new Set(seeds).size, 20);
  assert(seeds.every(seed => Number.isSafeInteger(seed) && seed >= 0 && seed <= 0xffffffff));
  assert(schedule.profiles.every(profile => profile.seeds.development.length === 5));
  return schedule;
}
export async function assertPinnedFiles(root, records) {
  for (const record of records) {
    const path = join(root, record.path);
    await regularPath(root, record.path);
    assert.equal(sha(await readFile(path)), record.sha256, record.path);
  }
}
function git(root, args) {
  return execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
}
function effectiveConfig(api, policy) {
  const config = structuredClone(api.englishConfig);
  if (policy) config.pronunciation.stress.rootPattern = policy;
  else delete config.pronunciation.stress.rootPattern;
  return config;
}
function rngState(api, seed) {
  const rng = api.createSeededRng(seed);
  const hash = createHash("sha256");
  const state = { calls: 0, rand: () => {
    const value = rng();
    const bytes = Buffer.allocUnsafe(8); bytes.writeDoubleLE(value);
    hash.update(bytes); state.calls++;
    return value;
  }, finish: () => hash.digest("hex") };
  return state;
}

export async function runParity({ root, original, schedulePath, out, progress = () => {} }) {
  root = resolve(root); original = resolve(original); schedulePath = resolve(schedulePath); out = resolve(out);
  await absent(out); await absent(`${out}.inputs.json`);
  const registration = JSON.parse(await readFile(join(root, HERE, "registration-v1.json"), "utf8"));
  const protocol = JSON.parse(await readFile(join(root, HERE, "protocol-v1.json"), "utf8"));
  assert.equal(registration.baseCommit, BASE); assert.equal(protocol.base.commit, BASE);
  assert.equal(protocol.delegation.publicApiCalls, 160000);
  for (const record of registration.documents) {
    assert.equal(sha(await readFile(join(root, HERE, record.path))), record.sha256, record.path);
  }
  await assertPinnedFiles(root, registration.immutablePublishedFiles);
  const oldPaths = git(root, ["ls-tree", "-r", "--name-only", BASE, "src"]).toString().trim().split("\n").filter(sourcePath).sort();
  assert.deepStrictEqual(await files(original, "src"), oldPaths);
  const originalSnapshot = await snapshot(original, [...oldPaths, ...PACKAGES]);
  for (const record of originalSnapshot) {
    assert.equal(record.sha256, sha(git(root, ["show", `${BASE}:${record.path}`])), `Original source differs from ${BASE}: ${record.path}`);
  }
  const candidatePaths = await files(root, "src");
  const candidateSnapshot = await snapshot(root, [...candidatePaths, ...PACKAGES]);
  const toolSnapshot = await snapshot(root, TOOLS);
  const scheduleBytes = await readFile(schedulePath);
  const schedule = validateSchedule(scheduleBytes, protocol.delegation);
  const engine = { executable: process.execPath, sha256: sha(await readFile(process.execPath)), version: process.version,
    versions: process.versions, platform: process.platform, arch: process.arch };
  const inputs = { schemaVersion: 1, baseCommit: BASE, root, original, schedule: { path: schedulePath, sha256: sha(scheduleBytes) },
    engine, originalSources: originalSnapshot, candidateSources: candidateSnapshot, tools: toolSnapshot,
    protocol: { path: `${HERE}/protocol-v1.json`, sha256: sha(await readFile(join(root, HERE, "protocol-v1.json"))) } };
  await writeFile(`${out}.inputs.json`, json(inputs), { flag: "wx" });
  const result = { schemaVersion: 1, inputsSha256: sha(Buffer.from(json(inputs))), passed: false,
    primaryGenerationCalls: 0, supplementaryNextRngCalls: 0, completedCoordinates: 0, streams: [], at: null, generationPassed: false, sourceIntegrityPassed: false, error: null, integrityError: null };
  try {
    const baseline = await import(pathToFileURL(join(original, "src/index.ts")));
    const candidate = await import(pathToFileURL(join(root, "src/index.ts")));
    const definitions = [
      { name: "published-control", api: baseline }, { name: "candidate-omitted", api: candidate },
      { name: "candidate-explicit-legacy", api: candidate, policy: { type: "legacy" } },
      { name: "candidate-zero", api: candidate, policy: { type: "count-conditioned", lambda: 0 } },
    ];
    for (const profile of schedule.profiles) for (const seed of profile.seeds.development) {
      const paths = definitions.map(definition => ({ name: definition.name, modes: [false, true].map(trace => ({ trace,
        generator: definition.api.createGenerator(effectiveConfig(definition.api, definition.policy)),
        rng: rngState(definition.api, seed), hash: createHash("sha256") })) }));
      const rngBoundaries = createHash("sha256");
      for (let drawIndex = 0; drawIndex < 1000; drawIndex++) {
        const words = paths.map(path => path.modes.map(mode => {
          result.at = { profile: profile.id, seed, drawIndex, path: path.name, trace: mode.trace, phase: "generation" };
          result.primaryGenerationCalls++;
          const generated = mode.generator.generateWord({ ...profile.options, rand: mode.rng.rand, trace: mode.trace });
          mode.hash.update(json(generated));
          return generated;
        }));
        for (let index = 0; index < paths.length; index++) {
          result.at = { profile: profile.id, seed, drawIndex, path: paths[index].name, phase: "comparison" };
          assertSameLive(words[index][0], withoutTrace(words[index][1]));
          for (let mode = 0; mode < 2; mode++) {
            assertSameLive(words[index][mode], words[0][mode]);
            assert.equal(paths[index].modes[mode].rng.calls, paths[0].modes[0].rng.calls,
              `${profile.id}/${seed}/${drawIndex}/${paths[index].name}/trace:${mode}`);
          }
        }
        rngBoundaries.update(json({ drawIndex, calls: paths[0].modes[0].rng.calls }));
        result.completedCoordinates++;
      }
      const streamPaths = paths.map(path => ({ name: path.name, modes: path.modes.map(mode => {
        const calls = mode.rng.calls; const next = mode.rng.rand(); result.supplementaryNextRngCalls++;
        return { trace: mode.trace, generationRngCalls: calls, next, rngBytesSha256: mode.rng.finish(), wordBytesSha256: mode.hash.digest("hex") };
      }) }));
      const expected = streamPaths[0].modes[0];
      for (const path of streamPaths) for (const mode of path.modes) {
        assert.equal(mode.next, expected.next); assert.equal(mode.rngBytesSha256, expected.rngBytesSha256);
      }
      result.streams.push({ profile: profile.id, seed, coordinates: 1000, rngBoundariesSha256: rngBoundaries.digest("hex"), paths: streamPaths });
      progress(`${result.streams.length}/20 streams: ${profile.id}/${seed}`);
    }
    assert.equal(result.primaryGenerationCalls, 160000);
    assert.equal(result.completedCoordinates, 20000);
    assert.equal(result.supplementaryNextRngCalls, 160);
    result.generationPassed = true;
  } catch (error) {
    result.error = { name: error.name, message: error.message, stack: error.stack };
  }
  try {
    await assertPinnedFiles(root, registration.immutablePublishedFiles);
    assert.deepStrictEqual(await files(original, "src"), oldPaths);
    assert.deepStrictEqual(await files(root, "src"), candidatePaths);
    assert.deepStrictEqual(await snapshot(original, [...oldPaths, ...PACKAGES]), originalSnapshot);
    assert.deepStrictEqual(await snapshot(root, [...candidatePaths, ...PACKAGES]), candidateSnapshot);
    assert.deepStrictEqual(await snapshot(root, TOOLS), toolSnapshot);
    assert.equal(sha(await readFile(schedulePath)), inputs.schedule.sha256);
    assert.equal(sha(await readFile(process.execPath)), engine.sha256);
    result.sourceIntegrityPassed = true;
  } catch (error) {
    result.integrityError = { name: error.name, message: error.message, stack: error.stack };
  }
  result.passed = result.generationPassed && result.sourceIntegrityPassed;
  await writeFile(out, json(result), { flag: "wx" });
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, original, schedulePath, out] = process.argv.slice(2);
  if (!root || !original || !schedulePath || !out || process.argv.length !== 6) throw new Error("Usage: node --import tsx parity.mjs ROOT ORIGINAL_RUNTIME SCHEDULE_JSON FRESH_OUTPUT_JSON");
  const result = await runParity({ root, original, schedulePath, out, progress: line => process.stderr.write(`${line}\n`) });
  process.stdout.write(json({ passed: result.passed, calls: result.primaryGenerationCalls, coordinates: result.completedCoordinates, error: result.error?.message }));
  if (!result.passed) process.exitCode = 1;
}
