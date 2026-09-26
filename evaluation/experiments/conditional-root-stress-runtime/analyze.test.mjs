import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createGenerator, englishConfig } from "../../../src/index.ts";
import { addGroup, analyzeArchive, morphologyStratum, observationCounts, protectOutput } from "./analyze.mjs";
import { validateActive, validateControl } from "./observe.mjs";

function fixture(active) {
  const config = structuredClone(englishConfig);
  const rules = config.pronunciation.stress;
  rules.primary = { type: "initial" };
  rules.secondary.probability = 100;
  rules.rhythmic.enabled = false;
  if (active) rules.rootPattern = { type: "count-conditioned", lambda: Math.log(2) };
  else delete rules.rootPattern;
  config.syllableStructure.letterLengthTargets = undefined;
  const word = createGenerator(config).generateWord({ seed: 51, syllableCount: 3, morphology: false, trace: true });
  (active ? validateActive : validateControl)(word, config);
  return word;
}
test("aggregate observation keeps unavailable legacy phases distinct from actual six-domain marks", () => {
  const word = fixture(true); const saved = structuredClone(word); const counts = observationCounts(word, true);
  assert.equal(counts.words, 1); assert.equal(counts.rootSyllables, 3);
  assert.equal(counts["root-after-explicit-secondary:unavailableWords"], 1);
  assert.equal(counts["root-after-rhythmic:unavailableWords"], 1);
  assert.equal(Object.hasOwn(counts, "root-after-rhythmic:secondaryMarks"), false);
  assert.equal(counts["root-before-primary:primaryMarks"], 0);
  assert.equal(counts["root-after-primary:primaryMarks"], 1);
  assert.equal(counts["root-after-primary:secondaryMarks"], 0);
  assert.equal(counts["root-after-pattern-application:secondaryMarks"], 1);
  assert.equal(counts["surface-after-realization:secondaryMarks"], 1);
  assert.equal(counts.appliedAssignmentEvents, 2);
  assert.equal(counts["appliedCause:root-primary"], 1);
  assert.equal(counts["appliedCause:root-pattern-sampler"], 1);
  assert.equal(Object.entries(counts).filter(([key]) => key.startsWith("nuclearQuantity:")).reduce((sum, [, n]) => sum + n, 0), 3);
  assert.equal(morphologyStratum(word), "bare/root:3/word:3");
  assert.deepStrictEqual(word, saved);
});
test("control counts retain explicit/rhythm domains without inventing a sampled-application domain", () => {
  const counts = observationCounts(fixture(false), false);
  assert.equal(counts["root-after-pattern-application:unavailableWords"], 1);
  assert.equal(counts["root-after-explicit-secondary:secondaryMarks"], 1);
  assert.equal(counts["root-after-rhythmic:secondaryMarks"], 1);
  assert.equal(Object.hasOwn(counts, "appliedCause:root-pattern-sampler"), false);
});
test("groups recount context uses and real proposal/application changes without conflating fixed K", () => {
  const group = { counts: {}, contextUses: {} };
  const mechanism = { id: "hand", secondaryCount: 1, proposalAdjacencies: 1, appliedAdjacencies: 0,
    proposalPattern: "PSU", appliedPattern: "PUS", supportCostVaries: true };
  addGroup(group, { words: 1 }, mechanism);
  addGroup(group, { words: 1 }, { ...mechanism, proposalPattern: "PUS", proposalAdjacencies: 0 });
  assert.deepStrictEqual(group.contextUses, { hand: 2 });
  assert.equal(group.counts.words, 2); assert.equal(group.counts.proposalChangedWords, 1);
  assert.equal(group.counts.proposalSecondaryCount, 2); assert.equal(group.counts.sampledSecondaryCount, 2);
  assert.equal(group.counts.proposalAdjacentPairs, 1); assert.equal(group.counts.sampledAdjacentPairs, 0);
  assert.equal(group.counts["sampledPattern:PUS"], 2); assert.equal(group.counts["proposalK:1"], 2);
  for (const value of [-1, true, NaN, 0.5]) assert.throws(() => addGroup({ counts: {}, contextUses: {} }, { words: value }));
});
test("resolved zero-written affix identity remains a morphology stratum", () => {
  const word = { syllables: [{}], trace: { stressPattern: { rootSyllableCount: 1 }, morphology: { realization: { prefix: { resolved: { written: "", syllables: [] } } } } } };
  assert.equal(morphologyStratum(word), "prefix/root:1/word:1");
});
test("analysis preflight rejects untrusted freeze bytes without writing a success or failure report", async () => {
  const directory = await mkdtemp(join(tmpdir(), "q09-analysis-preflight-"));
  try {
    const root = join(directory, "root"), original = join(directory, "original"), input = join(directory, "input");
    for (const path of [root, original, input]) await mkdir(path);
    const freeze = join(directory, "freeze.json"); await writeFile(freeze, "{}"); const out = join(directory, "result.json");
    await assert.rejects(analyzeArchive({ root, original, input, freeze, out, variant: "active", expectedManifest: "0".repeat(64),
      expectedFreeze: createHash("sha256").update("different reviewed bytes").digest("hex") }), /externally reviewed digest/);
    await assert.rejects(readFile(out), /ENOENT/);
    await symlink(root, join(directory, "alias"));
    await assert.rejects(protectOutput(join(directory, "alias/report.json"), [root]), /overlaps/);
    await writeFile(out, "retained"); await assert.rejects(protectOutput(out, [root]), /already exists/);
    assert.equal(await readFile(out, "utf8"), "retained");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
