import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { installedDependencies } from "./dependency-closure.mjs";

const root = "/Users/ryanbetts/.codex/worktrees/linguistic-q18-categories/word-generator";
const commit = "11bdf6a90ed28e1aba09c40b3901c54c6308437f";
const controlCommit = "1159465fe6c10f55a97e8c5851e8a75c604450e7";
const out = "/private/tmp/q18-paired-summary-v1";
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function pin(path) {
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest("hex") };
}
async function snapshot() {
  assert.equal(git("rev-parse", "HEAD"), commit);
  assert.equal(git("status", "--porcelain", "--untracked-files=no"), "");
  const files = {};
  for (const name of git("ls-files", "-z").split("\0").filter(Boolean)) files[name] = await pin(join(root, name));
  return { commit, files, dependencies: await installedDependencies(root), node: await pin(process.execPath),
    tools: { runner: await pin(fileURLToPath(import.meta.url)), closure: await pin(fileURLToPath(new URL("./dependency-closure.mjs", import.meta.url))) } };
}
await mkdir(out);
const save = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const before = await snapshot();
await save("before.json", before);
try {
  const { compareSummaries, comparisonMarkdown } = await import(pathToFileURL(join(root, "evaluation/quality/compare.ts")).href);
  const profilePath = join(root, "evaluation/experiments/stem-affix-compatibility/experimental-profile.json");
  const categoryProfile = JSON.parse(await readFile(profilePath, "utf8"));
  const inputPins = {}, reports = {}, unchangedStreams = [];
  for (const policy of ["default", "active"]) {
    const summaries = {}, manifests = {};
    for (const arm of ["control", "candidate"]) {
      const archive = arm === "control" ? `/private/tmp/q11b-composed-control-${policy}-v1` : `/private/tmp/q18-candidate-${policy}-v1`;
      const sealPath = `${archive}-freeze/complete.json`, beforePath = `${archive}-freeze/before.json`;
      const seal = JSON.parse(await readFile(sealPath, "utf8"));
      assert.equal(seal.passed, true); assert.equal(seal.words, 200000);
      assert.equal((await pin(beforePath)).sha256, seal.beforeSha256);
      const frozen = JSON.parse(await readFile(beforePath, "utf8"));
      assert.deepEqual(frozen.before, seal.after);
      assert.equal(frozen.policy, policy);
      assert.equal(frozen.expectedCommit, arm === "control" ? controlCommit : commit);
      const manifestPath = join(archive, "manifest.json");
      assert.deepEqual(await pin(manifestPath), seal.manifest);
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")).manifest;
      assert.equal(manifest.generator.commit, frozen.expectedCommit); assert.equal(manifest.generator.dirty, false);
      assert.deepEqual(manifest.protocol, frozen.registration.protocol);
      assert.equal(manifest.protocol.wordsPerReplicate, 10000);
      assert.equal(manifest.protocol.profiles.length, 4);
      for (const path of [sealPath, beforePath, manifestPath]) inputPins[path] = await pin(path);
      const record = manifest.artifacts.find(r => r.file === "summary.json");
      assert(record);
      const summaryPath = join(archive, record.file);
      assert.deepEqual(await pin(summaryPath), { bytes: record.bytes, sha256: record.sha256 });
      inputPins[summaryPath] = await pin(summaryPath);
      summaries[arm] = JSON.parse(await readFile(summaryPath, "utf8"));
      assert.equal(summaries[arm].profiles.reduce((sum, p) => sum + p.words, 0), 200000);
      for (const p of summaries[arm].profiles) {
        assert.equal(p.words, 50000); assert.equal(p.replicates.length, 5);
        assert(p.replicates.every(r => r.words === 10000));
      }
      manifests[arm] = { archive, manifest };
    }
    const expected = structuredClone(manifests.control.manifest.generator.effectiveConfig);
    expected.morphology.categories = categoryProfile.model;
    assert.deepEqual(manifests.candidate.manifest.generator.effectiveConfig, expected);
    reports[policy] = compareSummaries(summaries.control, summaries.candidate);
    for (const profile of ["lexicon-bare", "monosyllables-bare"]) {
      const base = summaries.control.profiles.find(p => p.id === profile);
      assert.deepEqual(summaries.candidate.profiles.find(p => p.id === profile), base);
      for (const r of base.replicates) {
        const name = `words/${profile}-${r.seed}.jsonl.gz`;
        const records = {};
        for (const arm of ["control", "candidate"]) {
          const { archive, manifest } = manifests[arm];
          const artifact = manifest.artifacts.find(a => a.file === name);
          assert(artifact);
          const path = join(archive, name);
          records[arm] = { bytes: artifact.bytes, sha256: artifact.sha256 };
          assert.deepEqual(await pin(path), records[arm]); inputPins[path] = records[arm];
        }
        assert.deepEqual(records.candidate, records.control);
        unchangedStreams.push({ policy, profile, seed: r.seed, words: 10000, ...records.control });
      }
    }
    await save(`${policy}-comparison.json`, reports[policy]);
    await writeFile(join(out, `${policy}-comparison.md`), comparisonMarkdown(reports[policy]), { flag: "wx" });
  }
  assert.equal(unchangedStreams.reduce((sum, r) => sum + r.words, 0), 200000);
  for (const [path, record] of Object.entries(inputPins)) assert.deepEqual(await pin(path), record);
  const after = await snapshot(); assert.deepEqual(after, before);
  await save("complete.json", { passed: true, wordsPerArm: 400000, unchangedBareWords: 200000, unchangedStreams, inputPins, before, after,
    scope: "Paired full original evaluator summaries, all metrics/distributions/diversity/strata/seed deltas retained. Complete archived bare-profile words and traces are byte-identical across both policies. Enabled category mechanism census, full candidate public/independent audits, original gates, timing and human preference remain separate evidence." });
  console.log(JSON.stringify({ passed: true, wordsPerArm: 400000, unchangedBareWords: 200000,
    profiles: Object.fromEntries(Object.entries(reports).map(([policy, report]) => [policy,
      report.profiles.filter(p => !p.id.includes("bare")).map(p => ({ id: p.id, diversity: p.uniqueSpellings,
        phonemes: p.distributions.phonemes.jensenShannonBits, trigrams: p.distributions.trigrams.jensenShannonBits }))])) }));
} catch (error) {
  await save("failure.json", { error: String(error), stack: error.stack });
  throw error;
}
