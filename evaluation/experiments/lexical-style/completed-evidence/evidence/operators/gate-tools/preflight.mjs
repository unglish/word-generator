import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const roots = { control: "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-control/word-generator",
  candidate: "/Users/ryanbetts/.codex/worktrees/linguistic-q20-style/word-generator" };
const arm = process.env.Q20_GATE_ARM;
assert(arm === "control" || arm === "candidate");
const api = await import(pathToFileURL(roots[arm] + "/src/index.ts"));
const policy = process.env.Q20_SPELLING_POLICY;
assert(policy === "default" || policy === "active");
const config = structuredClone(api.englishConfig);
if (policy === "active") {
  const active = JSON.parse(await readFile(roots.candidate + "/evaluation/experiments/final-word-ownership/measurement.json", "utf8")).configuration;
  config.splitVowels = active.splitVowels; config.followingLetters = active.followingLetters;
}
if (arm === "candidate") config.lexicalStyle = structuredClone(api.englishStyleExperiment);
const direct = api.createGenerator(config);
const wrapper = await import("./generator.ts");
const text = await import("./text-generator.ts");
for (const mode of ["lexicon", "text"]) {
  const target = mode === "text" ? text : wrapper;
  const a = api.createSeededRng(42), b = api.createSeededRng(42);
  for (let index = 0; index < 100; index++) {
    assert.deepEqual(target.generateWord({ mode, rand: a, trace: true }), direct.generateWord({ mode, rand: b, trace: true }));
  }
  assert.equal(a(), b());
  const batchRng = api.createSeededRng(123);
  assert.deepEqual(target.generateWords(100, { mode, seed: 123, trace: true }),
    Array.from({ length: 100 }, () => direct.generateWord({ mode, rand: batchRng, trace: true })));
  if (arm === "control" && policy === "default") assert.deepEqual(target.generateWords(100, { mode, seed: 123, trace: true }),
    api.generateWords(100, { mode, seed: 123, trace: true }));
}
const registration = JSON.parse(await readFile(new URL("./binding-registration.json", import.meta.url), "utf8"));
for (const record of registration.records) {
  const original = await readFile(record.original, "utf8"), wrapped = await readFile(record.wrapper, "utf8");
  assert.equal(createHash("sha256").update(original).digest("hex"), record.originalSha256);
  assert.equal(createHash("sha256").update(wrapped).digest("hex"), record.wrapperSha256);
  assert.equal(wrapped.replace("from \"./generator.js\"", "from \"./generate.js\"")
    .replace(`from "${roots.candidate}/src/utils/letters.js"`, "from \"../utils/letters.js\""), original);
  const controlOriginal = await readFile(record.original.replace(roots.candidate, roots.control), "utf8");
  assert.equal(controlOriginal, original);
}
const perf = await readFile(new URL("./generate.perf.test.ts", import.meta.url), "utf8");
const textPerf = await readFile(new URL("./generate-text.perf.test.ts", import.meta.url), "utf8");
assert.equal(textPerf.replace("from \"./text-generator.js\"", "from \"./generator.js\""), perf);
console.log(JSON.stringify({ passed: true, arm, completePublicWordComparisons: 400, nextRngProbes: 2,
  policy, originalGateBodiesAuthenticated: true, batchingScope: "Matched public single-word loop; native control batch equality passes separately." }));
