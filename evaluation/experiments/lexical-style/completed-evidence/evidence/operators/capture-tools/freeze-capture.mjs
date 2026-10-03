import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { installedDependencies } from "./dependency-closure.mjs";

const tools = dirname(fileURLToPath(import.meta.url));
const bindingPath = join(tools, "execution-registration.json");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function pin(path) {
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest("hex") };
}
const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }).trim();
async function sourcePins(root, commit) {
  assert.equal(git(root, "rev-parse", "HEAD"), commit);
  assert.equal(git(root, "status", "--porcelain", "--untracked-files=no"), "");
  const files = {};
  for (const name of git(root, "ls-files", "-z").split("\0").filter(Boolean)) files[name] = await pin(join(root, name));
  return { commit, files, dependencies: await installedDependencies(root) };
}
// The structured uncertainty annotations are the sole metadata difference allowed in omission mode.
function withoutAssessments(value) {
  if (Array.isArray(value)) return value.map(withoutAssessments);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== "originAssessment").map(([key, item]) => [key, withoutAssessments(item)]));
  return value;
}
assert([3, 4].includes(process.argv.length), "Provide registered policy and optional --preflight");
const preflightOnly = process.argv.length === 4;
if (preflightOnly) assert.equal(process.argv[3], "--preflight");
const policy = process.argv[2]; assert(["default", "active"].includes(policy));
const binding = JSON.parse(await readFile(bindingPath, "utf8"));
const root = binding.candidateRoot; const control = binding.controlRoot;
const out = `/private/tmp/q20-candidate-${policy}-v1`;
const evidence = preflightOnly ? `${out}-preflight` : `${out}-freeze`;
await mkdir(evidence);
const save = (name, value) => writeFile(join(evidence, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
async function snapshot() {
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"]) assert(!process.env[key], key);
  const runner = {};
  for (const [name, expected] of Object.entries(binding.tools)) {
    runner[name] = await pin(join(tools, name)); assert.deepEqual(runner[name], expected);
  }
  return { candidate: await sourcePins(root, binding.candidateCommit), control: await sourcePins(control, binding.controlCommit),
    runner, binding: await pin(bindingPath), node: { version: process.version, ...await pin(process.execPath) },
    environment: Object.fromEntries(["PATH", "LANG", "LC_ALL", "TZ", "CI"].map(key => [key, process.env[key] ?? null])) };
}
try {
  const before = await snapshot(); await save("before.json", { policy, binding, before });
  const registrationPath = join(root, binding.preimplementation.path);
  assert.deepEqual(await pin(registrationPath), binding.preimplementation.pin);
  const registration = JSON.parse(await readFile(registrationPath, "utf8"));
  assert.equal(registration.controlCommit, binding.controlCommit);
  for (const [file, expected] of Object.entries(registration.sourceBefore)) assert.deepEqual(await pin(join(control, file)), expected);
  const protocolPath = join(root, binding.protocol.path); assert.deepEqual(await pin(protocolPath), binding.protocol.pin);
  const protocol = JSON.parse(await readFile(protocolPath, "utf8"));
  assert.equal(protocol.wordsPerReplicate, 10000); assert.equal(protocol.profiles.length, 4);
  assert(protocol.profiles.every(profile => profile.seeds.development.length === 5));
  const capture = await import(pathToFileURL(join(root, "evaluation/quality/capture.ts")).href);
  const { canonical, digest } = await import(pathToFileURL(join(root, "evaluation/quality/serialization.ts")).href);
  const candidateApi = await import(pathToFileURL(join(root, "src/index.ts")).href);
  const controlApi = await import(pathToFileURL(join(control, "src/index.ts")).href);
  assert.equal(candidateApi.englishConfig.lexicalStyle, undefined);
  assert.deepEqual(withoutAssessments(canonical(candidateApi.englishConfig)), canonical(controlApi.englishConfig));
  const style = candidateApi.englishStyleExperiment;
  assert.equal(style.id, registration.profile.id); assert.equal(style.policy.strength, registration.profile.strength);
  assert.deepEqual(style.policy.styles.map(item => ({ id: item.style.id, prior: item.prior })), registration.profile.styles);
  assert.deepEqual(style.policy.features.map(feature => ({ phoneme: feature.phoneme, form: feature.form,
    multipliers: Object.fromEntries(feature.associations.map(item => [item.style_id, item.multiplier])) })), registration.profile.features);
  assert.equal(style.policy.version, "soft-orthographic-style-v1");
  const baseline = binding.controlArchives[policy];
  assert.deepEqual(await pin(join(baseline.path, "manifest.json")), baseline.manifest);
  assert.deepEqual(await pin(join(`${baseline.path}-freeze`, "complete.json")), baseline.seal);
  const seal = JSON.parse(await readFile(join(`${baseline.path}-freeze`, "complete.json"), "utf8"));
  assert.equal(seal.passed, true); assert.equal(seal.words, 200000); assert.deepEqual(seal.manifest, baseline.manifest);
  const archived = await capture.readRun(baseline.path, true); // Authenticate every archived byte, including every word stream.
  const manifest = archived.manifest;
  assert.equal(manifest.generator.commit, binding.controlCommit); assert.equal(manifest.generator.dirty, false);
  assert.equal(manifest.generator.patch, ""); assert.equal(manifest.cohort, "development"); assert.deepEqual(manifest.protocol, protocol);
  assert.equal(archived.summary.profiles.length, 4);
  assert(archived.summary.profiles.every(profile => profile.words === 50000 && profile.replicates.length === 5 && profile.replicates.every(replicate => replicate.words === 10000)));
  const archiveSources = JSON.parse(gunzipSync(await readFile(join(baseline.path, "sources.json.gz"))).toString());
  assert.equal(digest(archiveSources.generator), manifest.generator.sourceDigest);
  assert.equal(digest(archiveSources.references), manifest.referenceDigest);
  assert.equal(digest({ files: archiveSources.evaluator, definitions: archived.summary.definitions }), manifest.evaluatorDigest);
  for (const [group, sourceRoot] of [["generator", control], ["evaluator", root], ["references", root], ["packageFiles", root]]) {
    for (const file of archiveSources[group]) assert.equal(await readFile(join(sourceRoot, file.path), "utf8"), file.content, `${group}/${file.path}`);
  }
  const activePath = join(root, binding.activePolicy.path); assert.deepEqual(await pin(activePath), binding.activePolicy.pin);
  const active = JSON.parse(await readFile(activePath, "utf8")).configuration;
  const configuration = structuredClone(candidateApi.englishConfig);
  if (policy === "active") { configuration.splitVowels = structuredClone(active.splitVowels); configuration.followingLetters = structuredClone(active.followingLetters); }
  assert.deepEqual(withoutAssessments(canonical(configuration)), manifest.generator.effectiveConfig, "Only registered metadata changes precede enabling style");
  const expected = canonical(configuration); configuration.lexicalStyle = structuredClone(style);
  assert.deepEqual(canonical(configuration), { ...expected, lexicalStyle: canonical(style) });
  await save("control-authentication.json", { passed: true, words: 200000, streams: 20,
    manifest: baseline.manifest, seal: baseline.seal, baselineSourceCommit: binding.controlCommit,
    scope: "All archive bytes and archived source/evaluator/reference/package contents authenticated; exact protocol, stream counts, effective configuration and immutable committed control matched." });
  if (preflightOnly) {
    const after = await snapshot(); assert.deepEqual(after, before);
    await save("complete.json", { passed: true, policy, authenticatedControlWords: 200000, streams: 20,
      candidateCommit: binding.candidateCommit, after, scope: "Full baseline archive/source/configuration authentication and registered candidate configuration preflight only. No candidate corpus has been generated." });
    console.log(JSON.stringify({ passed: true, policy, preflightOnly: true, authenticatedControlWords: 200000 }));
  } else {
  const summary = await capture.captureRun({ root, out, id: `q20-candidate-${policy}`, cohort: "development", protocol, configuration, progress: console.log });
  assert.equal(summary.profiles.reduce((sum, profile) => sum + profile.words, 0), 200000);
  const result = await capture.readRun(out, true);
  assert.equal(result.manifest.generator.commit, binding.candidateCommit); assert.equal(result.manifest.generator.dirty, false);
  assert.deepEqual(result.manifest.generator.effectiveConfig, canonical(configuration));
  assert.equal(result.manifest.evaluatorDigest, manifest.evaluatorDigest); assert.equal(result.manifest.referenceDigest, manifest.referenceDigest);
  const after = await snapshot(); assert.deepEqual(after, before);
  assert.deepEqual(await pin(join(baseline.path, "manifest.json")), baseline.manifest);
  assert.deepEqual(await pin(join(`${baseline.path}-freeze`, "complete.json")), baseline.seal);
  await save("complete.json", { passed: true, words: 200000, streams: 20, policy, candidateCommit: binding.candidateCommit,
    manifest: await pin(join(out, "manifest.json")), beforeSha256: (await pin(join(evidence, "before.json"))).sha256, after,
    scope: "Complete registered capture and provenance only; public replay, independent mechanism audit, paired distributions, original gates and human quality observations remain." });
  }
} catch (error) {
  await save("failure.json", { error: String(error), stack: error.stack }); throw error;
}
