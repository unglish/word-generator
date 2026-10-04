import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import type { Word } from "../../../../src/types.js";
import { digest } from "../../serialization.js";
import { emptyObservation, observe } from "../syllable-weight/shared.js";
import type { Observation } from "../syllable-weight/shared.js";
import { pinnedJson, readArchive, sha, verifiedDraws } from "./archive.js";
import type { VerifiedArchive } from "./archive.js";

const originalBundleSha = "e1b50ce704fa47a6cfabaab29b5082f915030c647869ed850e0d156167ec7ec3";
const controlBundleSha = "3d51a5f669ee6b32a3e61cc015948af8ac27e4bf5815a67208aba4d58c04602e";
const probeDirectory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(probeDirectory, "../../../..");

async function sourceSnapshot(): Promise<Array<{ path: string; content: string }>> {
  const local = ["README.md", "archive.ts", "control.ts"].map(file => `evaluation/quality/probes/syllable-quantity/${file}`);
  const paths = [...local, "evaluation/quality/probes/syllable-weight/shared.ts", "evaluation/quality/capture.ts", "evaluation/quality/model.ts", "evaluation/quality/serialization.ts", "evaluation/quality/metrics.ts", "evaluation/quality/distribution.ts"];
  return Promise.all(paths.sort().map(async path => ({ path, content: await readFile(join(repository, path), "utf8") })));
}

async function verifySourceBundle(archive: VerifiedArchive, name: string, expectedHash: string): Promise<void> {
  const bytes = await readFile(join(repository, `evaluation/experiments/syllable-weight/${name}-source.json.gz`));
  assert.equal(sha(bytes), expectedHash, "Q08a source bundle changed");
  const bundle = JSON.parse(gunzipSync(bytes).toString("utf8")) as { files: Array<{ path: string; content: string; sha256: string }> };
  for (const file of bundle.files) assert.equal(sha(file.content), file.sha256);
  const source = bundle.files.filter(file => file.path.startsWith("src/")).map(({ path, content }) => ({ path, content })).sort((a, b) => a.path.localeCompare(b.path));
  const archived = [...archive.sources.generator].sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(archived, source, `Archived ${name} source differs from Q08a pinned runtime`);
}

function legacyWord(word: Word): string {
  const copy = { ...word, trace: { ...word.trace! } };
  delete copy.trace.stressWeight;
  return JSON.stringify(copy);
}

function reconcile(result: Observation, nuclearSegments: number, mode: "original" | "candidate"): void {
  const counts = [result.words, result.unavailable, result.observedSyllables, result.secondaryCandidates, result.secondaryApplied, result.finalStressCheckedWords, result.finalStressUnavailableWords,
    ...Object.values(result.quantity), ...Object.values(result.analytical), ...Object.values(result.operational), ...Object.values(result.primaryStrategies)];
  assert.ok(counts.every(value => Number.isSafeInteger(value) && value >= 0), "Invalid observation aggregate");
  const sum = (values: Record<string, number>): number => Object.values(values).reduce((a, b) => a + b, 0);
  if (mode === "original") {
    assert.equal(result.unavailable, result.words);
    assert.equal(result.observedSyllables, 0);
    assert.equal(sum(result.quantity), 0);
  } else {
    assert.equal(result.unavailable, 0);
    assert.equal(sum(result.quantity), nuclearSegments);
    assert.equal(sum(result.analytical), result.observedSyllables);
    assert.equal(sum(result.operational), result.observedSyllables);
    assert.equal(sum(result.primaryStrategies), result.words);
    assert.equal(result.finalStressCheckedWords + result.finalStressUnavailableWords, result.words);
  }
}

const [originalPath, controlPath, outputPath] = process.argv.slice(2);
assert.ok(originalPath && controlPath && outputPath, "Usage: control.ts ORIGINAL CONTROL REPORT.json");
const evaluatorSources = await sourceSnapshot();
const original = await readArchive(resolve(originalPath));
const control = await readArchive(resolve(controlPath));
assert.equal(control.manifest.generator.commit, "82b9152eb8610d9e99f8501e50d37e1463705f85");
assert.equal(control.manifest.generator.dirty, false);
await verifySourceBundle(original, "original", originalBundleSha);
await verifySourceBundle(control, "candidate", controlBundleSha);
assert.deepEqual(control.manifest.protocol, original.manifest.protocol);
assert.equal(control.manifest.protocol.wordsPerReplicate, 10000);
assert.equal(control.schedule.length, 20);
assert.equal(control.manifest.environment.node, original.manifest.environment.node);
assert.equal(control.manifest.environment.packageLockDigest, original.manifest.environment.packageLockDigest);
assert.deepEqual(control.schedule, original.schedule);
const originalSummary = { ...original.summary, id: "comparison" };
const controlSummary = { ...control.summary, id: "comparison" };
assert.deepEqual(controlSummary, originalSummary, "Core summary changed");
assert.deepEqual(await pinnedJson(control.directory, control.manifest, "distributions.json.gz"), await pinnedJson(original.directory, original.manifest, "distributions.json.gz"), "Complete core distributions changed");
const streams = [];
for (const stream of control.schedule) {
  const previous = verifiedDraws(original, stream);
  const current = verifiedDraws(control, stream);
  const before = emptyObservation();
  const after = emptyObservation();
  const wordHash = createHash("sha256");
  let nuclearSegments = 0;
  let words = 0;
  while (true) {
    const [a, b] = await Promise.all([previous.next(), current.next()]);
    assert.equal(a.done, b.done, "Archive stream lengths differ");
    if (a.done || b.done) break;
    const expected = legacyWord(a.value.word);
    assert.equal(legacyWord(b.value.word), expected, `Complete word/legacy trace changed: ${stream.profile}/${stream.seed}/${words}`);
    wordHash.update(expected + "\n");
    observe(a.value.word, words, "original", before);
    observe(b.value.word, words, "candidate", after);
    nuclearSegments += b.value.word.trace!.stages.find(stage => stage.name === "applyStress")!.before.reduce((sum, syllable) => sum + syllable.nucleus.length, 0);
    words++;
  }
  assert.equal(words, stream.words);
  reconcile(before, nuclearSegments, "original");
  reconcile(after, nuclearSegments, "candidate");
  streams.push({ profile: stream.profile, seed: stream.seed, words, nuclearSegments, completeLegacyWordHash: wordHash.digest("hex"), original: before, control: after });
  console.log(`${stream.profile}: ${stream.seed}, ${words} complete draws and observations verified`);
}
assert.deepEqual(await sourceSnapshot(), evaluatorSources, "Observer source changed during analysis");
const report = {
  schemaVersion: 1, probe: "shared-weight-full-control-v1", createdAt: new Date().toISOString(), node: process.version,
  original: { id: original.manifest.id, manifestDigest: digest(original.manifest), sourceDigest: original.manifest.generator.sourceDigest },
  control: { id: control.manifest.id, manifestDigest: digest(control.manifest), sourceDigest: control.manifest.generator.sourceDigest },
  evaluatorDigest: digest(evaluatorSources), evaluatorSources,
  protocolDigest: control.manifest.protocolDigest, coreEvaluatorDigest: control.manifest.evaluatorDigest,
  words: streams.reduce((sum, stream) => sum + stream.words, 0),
  completeWordAndLegacyTraceParity: true, coreSummaryParity: true, completeCoreDistributionParity: true,
  rngParity: "not observed by archival harness; Q08a separately verified 20,000 scheduled draws",
  sourceBundlesMatch: true, streams,
};
assert.equal(report.words, 200000);
await writeFile(resolve(outputPath), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ words: report.words, completeWordAndLegacyTraceParity: true, report: resolve(outputPath) }));
