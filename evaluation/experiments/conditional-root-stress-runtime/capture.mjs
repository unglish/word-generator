import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonical, digest } from "../../quality/serialization.ts";
import { absent, assertPinnedFiles, files, validateSchedule } from "./parity.mjs";
import { PRODUCER_KIND, RAW_SCHEMA, rescoreRawCapture, writeRawCapture } from "./capture-core.mjs";

const EXECUTING_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const BASE = "9e772f257def91b4370462e17156f71b8f54575d";
const HERE = "evaluation/experiments/conditional-root-stress-runtime";
const PACKAGES = ["package.json", "package-lock.json", "tsconfig.json"];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const json = value => `${JSON.stringify(value)}\n`;
const sourcePath = path => /\.(ts|js|mjs|json)$/.test(path) && !/\.(test|bench)\./.test(path);
const git = (root, args) => execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const progress = text => process.stderr.write(`${text}\n`);
async function snapshot(root, paths) {
  const records = await Promise.all([...paths].sort().map(async path => {
    const bytes = await readFile(join(root, path)); return { path, bytes: bytes.length, sha256: sha(bytes) };
  }));
  await assertPinnedFiles(root, records); return records;
}
async function toolPaths(root, directory = HERE) {
  const paths = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (directory === HERE && ["outcomes", "evidence"].includes(entry.name)) continue;
    assert(!entry.isSymbolicLink(), `Aliased tool input ${path}`);
    if (entry.isDirectory()) paths.push(...await toolPaths(root, path));
    else { assert(entry.isFile()); paths.push(path); }
  }
  return paths.sort();
}
async function evaluatorPaths(root) {
  return (await readdir(join(root, "evaluation/quality"), { withFileTypes: true }))
    .filter(entry => sourcePath(entry.name)).map(entry => `evaluation/quality/${entry.name}`).sort();
}
function protectOutputLocation(root, original, out) {
  for (const checkout of [root, original]) {
    const path = relative(checkout, resolve(out)).split("\\").join("/");
    assert(path !== "" && !["src", "data", "evaluation/quality", "evaluation/experiments/conditional-root-stress"].some(prefix => path === prefix || path.startsWith(`${prefix}/`)), "Output overlaps pinned input tree");
    if (path === HERE || path.startsWith(`${HERE}/`)) assert(path.startsWith(`${HERE}/outcomes/`), "Output overlaps live adapter source closure");
  }
}
async function resolvedDestination(path) {
  try { return await realpath(path); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = dirname(path);
    assert.notEqual(parent, path, "Cannot resolve publication ancestor");
    return join(await resolvedDestination(parent), basename(path));
  }
}
export async function validateOutputLocation(root, original, out) {
  protectOutputLocation(root, original, out);
  protectOutputLocation(await realpath(root), await realpath(original), await resolvedDestination(resolve(out)));
}
function effectiveConfig(api, variant, protocol) {
  const config = structuredClone(api.englishConfig);
  if (variant === "control") delete config.pronunciation.stress.rootPattern;
  else { assert.equal(variant, "active"); config.pronunciation.stress.rootPattern = structuredClone(protocol.policy.active); }
  return config;
}
async function engine() {
  return { executable: process.execPath, sha256: sha(await readFile(process.execPath)), version: process.version,
    versions: process.versions, platform: process.platform, arch: process.arch };
}
async function inputs(root, original) {
  assert.equal(resolve(root), EXECUTING_ROOT, "Declared source root must contain the executing adapter");
  assert.equal((await lstat(root)).isDirectory(), true); assert.equal((await lstat(original)).isDirectory(), true);
  const registration = JSON.parse(await readFile(join(root, HERE, "registration-v1.json")));
  const protocol = JSON.parse(await readFile(join(root, HERE, "protocol-v1.json")));
  assert.equal(registration.baseCommit, BASE); assert.equal(protocol.base.commit, BASE);
  await assertPinnedFiles(root, registration.immutablePublishedFiles);
  await assertPinnedFiles(root, registration.documents.map(record => ({ ...record, path: `${HERE}/${record.path}` })));
  const pinnedEvaluator = JSON.parse(await readFile(join(root, HERE, "frozen-quality-v1.json"))).files;
  await assertPinnedFiles(root, pinnedEvaluator);
  const dependencies = JSON.parse(await readFile(join(root, HERE, "observer-dependencies-v1.json"))).files;
  await assertPinnedFiles(root, dependencies);
  for (const record of dependencies) assert.equal(record.sha256, sha(git(root, ["show", `${BASE}:${record.path}`])), record.path);
  assert.deepStrictEqual(await evaluatorPaths(root), pinnedEvaluator.map(record => record.path).sort());
  const oldPaths = git(root, ["ls-tree", "-r", "--name-only", BASE, "src"]).toString().trim().split("\n").filter(sourcePath).sort();
  assert.deepStrictEqual(await files(original, "src"), oldPaths);
  const originalSources = await snapshot(original, [...oldPaths, ...PACKAGES]);
  for (const record of originalSources) assert.equal(record.sha256, sha(git(root, ["show", `${BASE}:${record.path}`])), record.path);
  const refs = await snapshot(root, await files(root, "data/cmu"));
  for (const record of refs) assert.equal(record.sha256, sha(git(root, ["show", `${BASE}:${record.path}`])), record.path);
  const schedule = validateSchedule(await readFile(join(root, "evaluation/quality/protocol.json")), protocol.delegation);
  const baseline = await import(pathToFileURL(join(original, "src/index.ts")));
  const candidate = await import(pathToFileURL(join(root, "src/index.ts")));
  return { schemaVersion: "q09-configured-capture-freeze-v1", baseCommit: BASE, root, original,
    candidateSources: await snapshot(root, [...await files(root, "src"), ...PACKAGES]), originalSources,
    tools: await snapshot(root, await toolPaths(root)), evaluator: await snapshot(root, pinnedEvaluator.map(record => record.path)),
    dependencies: await snapshot(root, dependencies.map(record => record.path)), references: refs, immutablePublishedFiles: registration.immutablePublishedFiles, engine: await engine(), protocol, schedule,
    configs: { control: canonical(effectiveConfig(baseline, "control", protocol)), active: canonical(effectiveConfig(candidate, "active", protocol)) } };
}
export async function freezeCapture({ root, original, out }) {
  root = resolve(root); original = resolve(original); out = resolve(out);
  await validateOutputLocation(root, original, out); await absent(out);
  const value = await inputs(root, original); await writeFile(out, json(value), { flag: "wx" });
  return { path: out, sha256: sha(Buffer.from(json(value))) };
}
async function trustedInputs({ root, original, freeze, expectedFreeze }) {
  const bytes = await readFile(freeze); assert.match(expectedFreeze, /^[a-f0-9]{64}$/);
  assert.equal(sha(bytes), expectedFreeze, "Capture freeze differs from externally reviewed digest");
  const pinned = JSON.parse(bytes);
  assert.deepStrictEqual(await inputs(root, original), pinned, "Source/config/engine differs from reviewed capture freeze");
  return pinned;
}
async function contents(root, records) {
  await assertPinnedFiles(root, records);
  return Promise.all(records.map(async ({ path }) => ({ path, content: await readFile(join(root, path), "utf8") })));
}
function producer(frozen, expectedFreeze, variant) {
  return { kind: PRODUCER_KIND, rawSummarySchema: RAW_SCHEMA, metricStatus: "not-evaluated", variant,
    sourceFreezeSha256: expectedFreeze, engine: frozen.engine, configurationDigest: digest(frozen.configs[variant]),
    scheduleDigest: digest(frozen.schedule), adapterSourceDigest: digest(frozen.tools) };
}
async function archiveSources(frozen, root, original, variant) {
  const generatorRoot = variant === "control" ? original : root;
  const records = variant === "control" ? frozen.originalSources : frozen.candidateSources;
  return { generator: await contents(generatorRoot, records.filter(record => record.path.startsWith("src/"))),
    evaluator: await contents(root, [...frozen.tools, ...frozen.evaluator, ...frozen.dependencies]), references: await contents(root, frozen.references),
    packageFiles: await contents(generatorRoot, records.filter(record => ["package.json", "package-lock.json"].includes(record.path))) };
}
export async function captureConfigured(options) {
  const { root, original, freeze, expectedFreeze, variant, out, id } = options;
  assert(["control", "active"].includes(variant)); await validateOutputLocation(root, original, out); await absent(out);
  const frozen = await trustedInputs(options);
  const generatorRoot = variant === "control" ? original : root;
  const api = await import(pathToFileURL(join(generatorRoot, "src/index.ts")));
  const config = effectiveConfig(api, variant, frozen.protocol);
  assert.deepStrictEqual(canonical(config), frozen.configs[variant]);
  const sources = await archiveSources(frozen, root, original, variant);
  const generator = { commit: variant === "control" ? BASE : git(root, ["rev-parse", "HEAD"]).toString().trim(),
    dirty: variant === "control" ? false : git(root, ["status", "--porcelain", "--", "src"]).length > 0,
    sourceDigest: digest(sources.generator), effectiveConfig: canonical(config), patch: variant === "control" ? "" : git(root, ["diff", "HEAD", "--", "src"]).toString() };
  const accounting = { schemaVersion: "q09-generation-accounting-v1", attemptedGenerationCalls: 0, completedGenerationCalls: 0, streams: [] };
  const source = async function* (profile, seed) {
    const rng = api.createSeededRng(seed); const rngHash = createHash("sha256"); const boundaryHash = createHash("sha256"); let calls = 0;
    const rand = () => { const value = rng(); const bytes = Buffer.allocUnsafe(8); bytes.writeDoubleLE(value); rngHash.update(bytes); calls++; return value; };
    const generator = api.createGenerator(config);
    for (let drawIndex = 0; drawIndex < frozen.schedule.wordsPerReplicate; drawIndex++) {
      const before = calls; accounting.at = { profile: profile.id, seed, drawIndex }; accounting.attemptedGenerationCalls++;
      const word = generator.generateWord({ ...profile.options, rand, trace: true }); accounting.completedGenerationCalls++;
      assert.equal(word.trace.stressPattern.version, variant === "control" ? 1 : 2);
      if (variant === "active") assert.equal(Object.hasOwn(word.trace, "stressWeight"), false);
      boundaryHash.update(json({ drawIndex, before, after: calls }));
      yield { profile: profile.id, seed, drawIndex, rng: { before, after: calls }, word };
    }
    accounting.streams.push({ profile: profile.id, seed, generationRngCalls: calls, rngBytesSha256: rngHash.digest("hex"), boundariesSha256: boundaryHash.digest("hex") });
  };
  return writeRawCapture({ out, id, protocol: frozen.schedule, sources, generator, producer: producer(frozen, expectedFreeze, variant), source,
    accounting: () => accounting, progress, after: async () => {
      assert.equal(accounting.attemptedGenerationCalls, 200000); assert.equal(accounting.completedGenerationCalls, 200000); assert.equal(accounting.streams.length, 20);
      assert.deepStrictEqual(canonical(config), frozen.configs[variant]); await trustedInputs({ root, original, freeze, expectedFreeze });
    } });
}
export async function rescoreConfigured(options) {
  const { root, original, freeze, expectedFreeze, variant, input, out, id } = options;
  assert(["control", "active"].includes(variant)); await validateOutputLocation(root, original, out); await absent(out);
  const frozen = await trustedInputs(options);
  return rescoreRawCapture({ root, input, out, id, expectedProducer: producer(frozen, expectedFreeze, variant),
    expectedConfig: frozen.configs[variant], expectedSources: await archiveSources(frozen, root, original, variant), progress, after: () => trustedInputs({ root, original, freeze, expectedFreeze }) });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, rootArg, originalArg, ...rest] = process.argv.slice(2);
  const root = resolve(rootArg ?? "."); const original = resolve(originalArg ?? "."); let result;
  if (command === "freeze" && rest.length === 1) result = await freezeCapture({ root, original, out: resolve(rest[0]) });
  else if (command === "capture" && rest.length === 5) {
    const [freeze, expectedFreeze, variant, out, id] = rest;
    result = await captureConfigured({ root, original, freeze: resolve(freeze), expectedFreeze, variant, out: resolve(out), id });
  } else if (command === "rescore" && rest.length === 6) {
    const [freeze, expectedFreeze, variant, input, out, id] = rest;
    result = await rescoreConfigured({ root, original, freeze: resolve(freeze), expectedFreeze, variant, input: resolve(input), out: resolve(out), id });
  } else throw new Error("Usage: capture.mjs freeze ROOT ORIGINAL FRESH_FREEZE | capture ROOT ORIGINAL FREEZE SHA VARIANT OUT ID | rescore ROOT ORIGINAL FREEZE SHA VARIANT INPUT OUT ID");
  process.stdout.write(json(result.path ? result : { id: result.manifest.id, summarySchema: result.summary.schemaVersion }));
}

export { trustedInputs, archiveSources, producer };
