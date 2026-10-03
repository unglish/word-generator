import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGunzip } from "node:zlib";
import { installedDependencies } from "./dependency-closure.mjs";

assert.equal(process.argv.length, 6, "Provide candidate checkout, full measured revision, archive and fresh report path");
let [root, commit, archive, out] = process.argv.slice(2);
root = await realpath(root); archive = await realpath(archive); out = resolve(out);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function pin(path) {
  assert((await lstat(path)).isFile(), `Nonregular input: ${path}`);
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest("hex") };
}
async function tree(directory) {
  const files = {};
  async function visit(relative = "") {
    for (const entry of (await readdir(join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      assert(!entry.isSymbolicLink(), `Aliased input: ${name}`);
      if (entry.isDirectory()) await visit(name); else files[name] = await pin(join(directory, name));
    }
  }
  await visit(); return files;
}
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
async function snapshot() {
  assert.equal(git("rev-parse", "HEAD"), commit);
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
  const files = {};
  for (const name of git("ls-files", "-z").split("\0").filter(Boolean)) files[name] = await pin(join(root, name));
  const overrides = ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"];
  for (const name of overrides) assert(!process.env[name], name);
  const nodePath = await realpath(process.execPath);
  return { files, dependencies: await installedDependencies(root),
    node: { version: process.version, ...await pin(nodePath) },
    environment: Object.fromEntries(["PATH", "LANG", "LC_ALL", "TZ", "CI"].map(name => [name, process.env[name] ?? null])),
    tools: { runner: await pin(fileURLToPath(import.meta.url)), closure: await pin(fileURLToPath(new URL("./dependency-closure.mjs", import.meta.url))) } };
}
const freezePath = archive + "-freeze";
const sealBytes = await readFile(join(freezePath, "complete.json"));
const seal = JSON.parse(sealBytes);
assert.equal(seal.passed, true); assert.equal(seal.words, 200000);
const beforeBytes = await readFile(join(freezePath, "before.json"));
assert.equal(sha(beforeBytes), seal.beforeSha256);
const frozen = JSON.parse(beforeBytes);
assert.deepEqual(frozen.before, seal.after);
assert.equal(frozen.binding.candidateRoot, root); assert.equal(frozen.binding.candidateCommit, commit);
assert.equal(seal.candidateCommit, commit); assert.equal(commit, "4f4c95d555a00f1d8cb44892a72e57748f377948");
const manifestBytes = await readFile(join(archive, "manifest.json"));
assert.deepEqual({ bytes: manifestBytes.length, sha256: sha(manifestBytes) }, seal.manifest);
const manifest = JSON.parse(manifestBytes).manifest;
assert.equal(manifest.generator.commit, commit); assert.equal(manifest.generator.dirty, false);
assert.equal(manifest.id, `q20-candidate-${frozen.policy}`); assert.equal(manifest.cohort, "development");
assert.equal(seal.streams, 20); assert.equal(seal.policy, frozen.policy);
const bindingPath = fileURLToPath(new URL("../capture-tools/execution-registration.json", import.meta.url));
assert.deepEqual(await pin(bindingPath), frozen.before.binding);
assert.deepEqual(JSON.parse(await readFile(bindingPath, "utf8")), frozen.binding);
const binding = frozen.binding;
for (const [name, expected] of Object.entries(binding.tools)) {
  assert.deepEqual(await pin(fileURLToPath(new URL("../capture-tools/" + name, import.meta.url))), expected);
}
for (const input of [binding.preimplementation, binding.protocol, binding.activePolicy]) {
  assert.deepEqual(await pin(join(root, input.path)), input.pin);
}
const protocol = JSON.parse(await readFile(join(root, binding.protocol.path), "utf8"));
assert.deepEqual(manifest.protocol, protocol); assert.equal(protocol.wordsPerReplicate, 10000);
assert.equal(protocol.profiles.length, 4); assert(protocol.profiles.every(profile => profile.seeds.development.length === 5));
const before = await snapshot();
assert.deepEqual(before.files, frozen.before.candidate.files); assert.deepEqual(before.dependencies, frozen.before.candidate.dependencies);
assert.deepEqual(before.node, frozen.before.node); assert.deepEqual(before.environment, frozen.before.environment);
const api = await import(pathToFileURL(join(root, "src/index.ts")).href);
const { canonical } = await import(pathToFileURL(join(root, "evaluation/quality/serialization.ts")).href);
const config = structuredClone(api.englishConfig);
assert.equal(config.lexicalStyle, undefined);
if (frozen.policy === "active") {
  const active = JSON.parse(await readFile(join(root, binding.activePolicy.path), "utf8")).configuration;
  config.splitVowels = active.splitVowels; config.followingLetters = active.followingLetters;
} else assert.equal(frozen.policy, "default");
config.lexicalStyle = structuredClone(api.englishStyleExperiment);
assert.deepEqual(canonical(config), manifest.generator.effectiveConfig);
const generator = api.createGenerator(config);
const artifacts = new Map(manifest.artifacts.map(r => [r.file, r]));
assert.equal(artifacts.size, manifest.artifacts.length);
async function authenticateArtifacts() {
  for (const record of artifacts.values()) {
    assert(!record.file.startsWith("/") && !record.file.split("/").includes(".."));
    assert.deepEqual(await pin(join(archive, record.file)), { bytes: record.bytes, sha256: record.sha256 });
  }
}
await authenticateArtifacts();
const expected = new Set(manifest.protocol.profiles.flatMap(p => p.seeds.development.map(seed => `words/${p.id}-${seed}.jsonl.gz`)));
assert.equal(expected.size, 20);
assert.deepEqual(new Set([...artifacts.keys()].filter(name => name.startsWith("words/"))), expected);
assert.deepEqual(new Set(Object.keys(await tree(join(archive, "words"))).map(name => "words/" + name)), expected);
let words = 0; const streams = [];
for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
  const name = `words/${profile.id}-${seed}.jsonl.gz`, path = join(archive, name);
  const raw = api.createSeededRng(seed); let draws = 0, count = 0;
  const rand = () => { draws++; return raw(); };
  const lines = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) {
    const row = JSON.parse(line);
    assert.equal(row.profile, profile.id); assert.equal(row.seed, seed); assert.equal(row.drawIndex, count);
    const fresh = generator.generateWord({ ...profile.options, rand, trace: true });
    assert.deepEqual(JSON.parse(JSON.stringify(fresh)), row.word, `${profile.id}/${seed}/${count}`);
    count++; words++;
  }
  assert.equal(count, manifest.protocol.wordsPerReplicate); assert.equal(count, 10000);
  streams.push({ profile: profile.id, seed, words: count, replayDraws: draws, replayNextRng: raw(),
    rngScope: "Replayer observations; capture does not archive these full-stream draw totals or next-state probes." });
  console.log(`${profile.id}/${seed}: ${count} complete public words/traces replayed`);
}
assert.equal(words, 200000);
await authenticateArtifacts();
assert.deepEqual(await readFile(join(archive, "manifest.json")), manifestBytes);
assert.deepEqual(await readFile(join(freezePath, "complete.json")), sealBytes);
assert.deepEqual(await readFile(join(freezePath, "before.json")), beforeBytes);
const after = await snapshot(); assert.deepEqual(after, before);
await writeFile(out, JSON.stringify({ passed: true, words, streams, policy: frozen.policy, sourceCommit: commit,
  manifest: seal.manifest, before, after,
  scope: "All registered archived candidate words and complete traces regenerate through the frozen public API with identical configuration/source/dependency/node/environment and every artifact authenticated before/after. Independent hard legality, base/style weights, sequence partition/path probabilities and final feature survival are separate." }, null, 2) + "\n", { flag: "wx" });
