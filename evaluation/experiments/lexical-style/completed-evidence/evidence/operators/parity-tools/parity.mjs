import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { installedDependencies } from "./dependency-closure.mjs";

const roots = {
  control: "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator",
  candidate: "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator",
};
const commits = {
  control: "1159465fe6c10f55a97e8c5851e8a75c604450e7",
  candidate: "4f4c95d555a00f1d8cb44892a72e57748f377948",
};
const out = "/private/tmp/q20-public-parity-v1";
const tools = dirname(fileURLToPath(import.meta.url));
const registrationPath = join(roots.candidate, "evaluation/experiments/lexical-style/measurement-preimplementation.json");
const protocolPath = join(roots.control, "evaluation/quality/protocol.json");
const activePath = join(roots.control, "evaluation/experiments/final-word-ownership/measurement.json");
const captureDone = "/private/tmp/q11b-candidate-capture-driver-v2/complete.json";
const gatesDone = "/private/tmp/q11b-gates-driver-v1/complete.json";
const gateStarted = "/private/tmp/q11b-gates-v1";
const driverBefore = "/private/tmp/q11b-gates-driver-v1/before.json";
const auditBefore = "/private/tmp/q11b-full-audit-driver-v1/before.json";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function pin(path) { const bytes = await readFile(path); return { bytes: bytes.length, sha256: sha(bytes) }; }
const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
async function snapshot() {
  const sources = {};
  for (const [arm, root] of Object.entries(roots)) {
    assert.equal(git(root, "rev-parse", "HEAD"), commits[arm]);
    assert.equal(git(root, "status", "--porcelain", "--untracked-files=no"), "");
    const files = {};
    for (const name of git(root, "ls-files", "-z").split("\0").filter(Boolean)) files[name] = await pin(join(root, name));
    sources[arm] = { commit: commits[arm], files, dependencies: await installedDependencies(root) };
  }
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"]) assert(!process.env[key], key);
  return { sources, node: { version: process.version, ...await pin(process.execPath) },
    registration: await pin(registrationPath), protocol: await pin(protocolPath), active: await pin(activePath),
    tools: { runner: await pin(fileURLToPath(import.meta.url)), dependencies: await pin(join(tools, "dependency-closure.mjs")) },
    scheduling: { gateBefore: await pin(driverBefore), auditBefore: await pin(auditBefore) },
    environment: Object.fromEntries(["PATH", "LANG", "LC_ALL", "TZ", "CI"].map(key => [key, process.env[key] ?? null])) };
}
await mkdir(out);
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const streams = []; let comparisons = 0, publicCalls = 0, probes = 0;
async function event(value) { await appendFile(join(out, "scheduling.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...value }) + "\n"); }
async function waitForReservedInterval() {
  const reserved = () => (existsSync(captureDone) || existsSync(gateStarted)) && !existsSync(gatesDone);
  if (!reserved()) return;
  await event({ event: "paused", comparisons, reason: "Q11b full audits and original gates/timing reserved; retain RNG state and complete requested count." });
  while (reserved()) {
    for (const directory of ["/private/tmp/q11b-full-audit-driver-v1", "/private/tmp/q11b-gates-driver-v1"]) {
      for (const name of ["failure.json", "upstream-failure.json"]) assert(!existsSync(join(directory, name)), `Reserved prerequisite failed: ${directory}/${name}`);
    }
    await delay(15000);
  }
  const completed = JSON.parse(await readFile(gatesDone, "utf8")); assert.equal(completed.passed, true);
  await event({ event: "resumed", comparisons, gateCompletion: await pin(gatesDone) });
}
try {
  // Capture completion precedes four full 200k audits, which precede the original gate runner.
  // Pause at that earlier boundary; do not wait for timing to start before yielding the machine.
  for (const beforePath of [driverBefore, auditBefore]) {
    const frozen = JSON.parse(await readFile(beforePath, "utf8"));
    for (const [path, digest] of Object.entries(frozen.inputPins)) assert.equal((await pin(path)).sha256, digest);
  }
  const auditBinding = JSON.parse(await readFile(auditBefore, "utf8")); assert.equal(auditBinding.upstream, captureDone);
  const gateBinding = JSON.parse(await readFile(driverBefore, "utf8"));
  assert.equal(gateBinding.prerequisites["q11b-full-audits"], "/private/tmp/q11b-full-audit-driver-v1/complete.json");
  await waitForReservedInterval();
  const before = await snapshot(); await save("before.json", before);
  assert.equal(before.registration.sha256, "e27370bd1ffadb9bd8e61265e3896ccf52c2f8e6537ca573896dd8001718d225");
  assert.equal(before.protocol.sha256, "70d661acae4605ae064d7a194f76a405b452c0124c9e2651e96c666e86b03df9");
  assert.equal(before.active.sha256, "7ee6193f4e5e5c9f79bcef9485bdc50e7df4202f0527e97f9c00459e3adeebf1");
  const protocol = JSON.parse(await readFile(protocolPath, "utf8"));
  assert.equal(protocol.profiles.length, 4); assert(protocol.profiles.every(profile => profile.seeds.development.length === 5));
  const active = JSON.parse(await readFile(activePath, "utf8")).configuration;
  const modules = {};
  for (const [arm, root] of Object.entries(roots)) modules[arm] = await import(pathToFileURL(join(root, "src/index.ts")).href);
  const { createSeededRng } = await import(pathToFileURL(join(roots.control, "src/utils/random.ts")).href);
  for (const cohort of ["omitted", "zero", "enabled-trace-plain"]) for (const policy of ["default", "active"]) {
    const generators = {};
    for (const side of ["left", "right"]) {
      const arm = cohort === "enabled-trace-plain" || side === "right" ? "candidate" : "control";
      const config = structuredClone(modules[arm].englishConfig); assert.equal(config.lexicalStyle, undefined);
      if (policy === "active") { config.splitVowels = structuredClone(active.splitVowels); config.followingLetters = structuredClone(active.followingLetters); }
      if (cohort === "enabled-trace-plain" || (cohort === "zero" && side === "right")) {
        config.lexicalStyle = structuredClone(modules.candidate.englishStyleExperiment);
        if (cohort === "zero") config.lexicalStyle.policy.strength = 0;
      }
      generators[side] = modules[arm].createGenerator(config);
    }
    for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
      const calls = { left: 0, right: 0 }; const rngs = {}; const digests = {};
      for (const side of ["left", "right"]) { const rng = createSeededRng(seed); rngs[side] = () => { calls[side]++; return rng(); }; digests[side] = createHash("sha256"); }
      for (let index = 0; index < 250; index++) {
        await waitForReservedInterval();
        const coordinate = `${cohort}/${policy}/${profile.id}/${seed}/${index}`;
        const left = generators.left.generateWord({ ...profile.options, rand: rngs.left, trace: true }); publicCalls++;
        const right = generators.right.generateWord({ ...profile.options, rand: rngs.right, trace: cohort !== "enabled-trace-plain" }); publicCalls++;
        if (cohort === "enabled-trace-plain") { assert(left.trace?.lexicalStyle, coordinate); delete left.trace; }
        assert.deepEqual(right, left, coordinate);
        assert.equal(calls.right, calls.left, coordinate + "/draws");
        digests.left.update(JSON.stringify(left) + "\n"); digests.right.update(JSON.stringify(right) + "\n"); comparisons++;
      }
      assert.equal(rngs.left(), rngs.right()); probes++; assert.equal(calls.left, calls.right);
      const record = { cohort, policy, profile: profile.id, seed, comparisons: 250, drawsIncludingProbe: calls.left,
        nextRngEquality: true, leftWordTraceHash: digests.left.digest("hex"), rightWordTraceHash: digests.right.digest("hex") };
      assert.equal(record.leftWordTraceHash, record.rightWordTraceHash); streams.push(record);
      await appendFile(join(out, "streams.jsonl"), JSON.stringify(record) + "\n");
      console.log(`${cohort}/${policy}/${profile.id}/${seed}: 250 complete paired comparisons`);
    }
  }
  assert.equal(comparisons, 30000); assert.equal(publicCalls, 60000); assert.equal(probes, 120); assert.equal(streams.length, 120);
  for (const cohort of ["omitted", "zero", "enabled-trace-plain"]) assert.equal(streams.filter(stream => stream.cohort === cohort).length, 40);
  await waitForReservedInterval();
  const after = await snapshot(); assert.deepEqual(after, before);
  await save("complete.json", { passed: true, comparisons, publicCalls, probes, streams, after,
    scope: "Full registered compatibility and RNG experiment only. This does not establish linguistic quality, style benefit, full-corpus distributions, original gates or human outcomes." });
  console.log(JSON.stringify({ passed: true, comparisons, publicCalls, probes }));
} catch (error) {
  await save("failure.json", { error: String(error), stack: error.stack, comparisons, publicCalls, probes, completedStreams: streams.length }); throw error;
}
