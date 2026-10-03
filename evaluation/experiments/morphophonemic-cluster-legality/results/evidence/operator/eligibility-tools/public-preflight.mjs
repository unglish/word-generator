import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { installedDependencies } from "./dependency-closure.mjs";

assert.equal(process.argv.length, 5, "Provide candidate checkout, full revision and fresh preflight directory");
const [root, commit, out] = process.argv.slice(2);
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const pin = async path => {
  const bytes = await readFile(path);
  return { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
};
async function snapshot() {
  assert.equal(git("rev-parse", "HEAD"), commit);
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
  const files = {};
  for (const name of git("ls-files", "-z").split("\0").filter(Boolean)) files[name] = await pin(join(root, name));
  const overrides = ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"];
  for (const name of overrides) assert(!process.env[name], name);
  return { commit, files, dependencies: await installedDependencies(root),
    node: { version: process.version, ...await pin(process.execPath) },
    environment: Object.fromEntries(["PATH", "LANG", "LC_ALL", "TZ", "CI", ...overrides].map(name => [name, process.env[name] ?? null])),
    tools: { runner: await pin(fileURLToPath(import.meta.url)), closure: await pin(fileURLToPath(new URL("./dependency-closure.mjs", import.meta.url))) } };
}
await mkdir(out);
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
try {
  const before = await snapshot();
  await save("before.json", before);
  const { englishConfig, createGenerator } = await import(pathToFileURL(join(root, "src/index.ts")).href);
  const { createSeededRng } = await import(pathToFileURL(join(root, "src/utils/random.ts")).href);
  const { canonical } = await import(pathToFileURL(join(root, "evaluation/quality/serialization.ts")).href);
  const { capturePreflight } = await import(pathToFileURL(join(root, "evaluation/experiments/morphophonemic-cluster-legality/capture/capture-preflight.mjs")).href);
  const preflight = await capturePreflight({ root, arm: "candidate", expectedCommit: commit,
    registrationPath: join(root, "evaluation/experiments/morphophonemic-cluster-legality/treatment-measurement.json"),
    captureModuleUrl: pathToFileURL(join(root, "evaluation/quality/capture.ts")) });
  const activeRegistration = preflight.registration.activePolicyRegistration;
  const activePath = join(root, activeRegistration.path);
  assert.equal((await pin(activePath)).sha256, activeRegistration.sha256);
  const active = JSON.parse(await readFile(activePath, "utf8")).configuration;
  const rows = [], configurations = {}, streams = [];
  for (const policy of ["default", "active"]) {
    const config = structuredClone(englishConfig);
    if (policy === "active") { config.splitVowels = active.splitVowels; config.followingLetters = active.followingLetters; }
    assert.equal(config.morphology.morphophonemicPolicy.preserveClusterLegality, true);
    configurations[policy] = canonical(config);
    const baseline = preflight.registration.controlArchives[policy];
    assert.deepEqual(await pin(join(baseline.path, "manifest.json")), baseline.manifest);
    assert.deepEqual(await pin(join(`${baseline.path}-freeze`, "complete.json")), baseline.seal);
    const expected = JSON.parse(await readFile(join(baseline.path, "manifest.json"), "utf8")).manifest.generator.effectiveConfig;
    expected.morphology.morphophonemicPolicy = { preserveClusterLegality: true };
    assert.deepEqual(configurations[policy], expected);
    const generator = createGenerator(config);
    for (const profile of preflight.protocol.profiles) for (const seed of profile.seeds.development) {
      const raw = createSeededRng(seed); let draws = 0;
      const rand = () => { draws++; return raw(); };
      for (let drawIndex = 0; drawIndex < 10; drawIndex++) {
        rows.push({ policy, profile: profile.id, seed, drawIndex,
          word: generator.generateWord({ ...profile.options, rand, trace: true }) });
      }
      streams.push({ policy, profile: profile.id, seed, words: 10, draws, nextRng: raw() });
    }
  }
  assert.equal(rows.length, 400);
  assert.equal(streams.length, 40);
  const bytes = gzipSync(Buffer.from(JSON.stringify({ configurations, profiles: preflight.protocol.profiles, rows, streams })));
  await writeFile(join(out, "records.json.gz"), bytes, { flag: "wx" });
  const after = await snapshot();
  assert.deepEqual(after, before);
  await save("complete.json", { passed: true, words: 400, streams: 40, records: await pin(join(out, "records.json.gz")), after,
    scope: "Public API/verifier development preflight: ten words from each registered stream and spelling policy. This is not a reduced corpus acceptance run or quality claim." });
} catch (error) {
  await save("failure.json", { error: String(error), stack: error.stack });
  throw error;
}
