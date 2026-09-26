import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { digest } from "../../serialization.js";
import { readArchive, sha, verifiedDraws } from "./archive.js";
import { emptyQuantityObservation, observeQuantity, reconcileQuantity, verifyActivationConfig } from "./observe.js";
import type { Mode, QuantityObservation } from "./observe.js";

const [originalPath, controlPath, candidatePath, outputPath] = process.argv.slice(2);
assert.ok(originalPath && controlPath && candidatePath && outputPath, "Usage: analyze.ts ORIGINAL CONTROL CANDIDATE REPORT.json");
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
async function sourceSnapshot(): Promise<Array<{ path: string; content: string }>> {
  const probeFiles = ["README.md", "activation-amendment.md", "archive.ts", "observe.ts", "analyze.ts"].map(file => `evaluation/quality/probes/syllable-quantity/${file}`);
  const files = [...probeFiles, ...["capture.ts", "model.ts", "serialization.ts", "metrics.ts", "distribution.ts"].map(file => `evaluation/quality/${file}`)];
  return Promise.all(files.sort().map(async path => ({ path, content: await readFile(join(repository, path), "utf8") })));
}
const evaluatorSources = await sourceSnapshot();
const original = await readArchive(resolve(originalPath));
const control = await readArchive(resolve(controlPath));
const candidate = await readArchive(resolve(candidatePath));
const proofBytes = await readFile(join(repository, "evaluation/experiments/shared-weight-control/full-parity-proof.json.gz"));
assert.equal(sha(proofBytes), "c3a331d0dcab746b2eee0e921ef030b77cfb45d64d821f59afa0b2f377909f0f", "Full control proof changed");
const proof = JSON.parse(gunzipSync(proofBytes).toString("utf8")) as {
  original: { manifestDigest: string }; control: { manifestDigest: string };
  words: number; completeWordAndLegacyTraceParity: boolean; coreSummaryParity: boolean; sourceBundlesMatch: boolean;
  streams: Array<{ profile: string; seed: number; words: number; nuclearSegments: number }>;
};
assert.equal(proof.original.manifestDigest, digest(original.manifest));
assert.equal(proof.control.manifestDigest, digest(control.manifest));
assert.equal(proof.words, 200000);
assert.ok(proof.completeWordAndLegacyTraceParity && proof.coreSummaryParity && proof.sourceBundlesMatch);
for (const previous of [original, control]) {
  assert.deepEqual(candidate.schedule, previous.schedule);
  assert.equal(candidate.manifest.protocolDigest, previous.manifest.protocolDigest);
  assert.equal(candidate.manifest.evaluatorDigest, previous.manifest.evaluatorDigest);
  assert.equal(candidate.manifest.referenceDigest, previous.manifest.referenceDigest);
  assert.equal(candidate.manifest.environment.node, previous.manifest.environment.node);
  assert.equal(candidate.manifest.environment.packageLockDigest, previous.manifest.environment.packageLockDigest);
}
verifyActivationConfig(control.manifest.generator.effectiveConfig, candidate.manifest.generator.effectiveConfig);
const controlFiles = new Map(control.sources.generator.map(file => [file.path, file.content]));
assert.deepEqual(candidate.sources.generator.map(file => file.path).sort(), [...controlFiles.keys()].sort(), "Runtime source file set changed");
const changedFiles = candidate.sources.generator.filter(file => file.content !== controlFiles.get(file.path)).map(file => file.path).sort();
assert.deepEqual(changedFiles, ["src/config/english.ts", "src/elements/phonemes.ts"], "Behavioral scope differs from the registered inventory/config activation");
const runs: Array<{
  mode: Mode; id: string; manifestDigest: string; sourceDigest: string;
  streams: Array<{ profile: string; seed: number; observation: QuantityObservation }>;
}> = [];
for (const [mode, archive] of [["original", original], ["control", control], ["candidate", candidate]] as const) {
  const streams = [];
  for (const stream of archive.schedule) {
    const observation = emptyQuantityObservation(mode);
    for await (const draw of verifiedDraws(archive, stream)) observeQuantity(draw.word, draw.drawIndex, observation);
    reconcileQuantity(observation);
    assert.equal(observation.words, stream.words);
    if (mode !== "candidate") {
      const pinned = proof.streams.find(item => item.profile === stream.profile && item.seed === stream.seed);
      assert.ok(pinned);
      assert.equal(observation.words, pinned.words);
      assert.equal(observation.nuclearSegments, pinned.nuclearSegments);
    }
    streams.push({ profile: stream.profile, seed: stream.seed, observation });
    console.log(`${mode}: ${stream.profile}/${stream.seed}, ${observation.words} records observed`);
  }
  runs.push({ mode, id: archive.manifest.id, manifestDigest: digest(archive.manifest), sourceDigest: archive.manifest.generator.sourceDigest, streams });
}
for (const [index, stream] of runs[0].streams.entries()) {
  const controlStream = runs[1].streams[index];
  assert.equal(controlStream.observation.rootSyllables, stream.observation.rootSyllables);
  for (const [sound, counts] of Object.entries(stream.observation.openDiphthongs)) assert.equal(controlStream.observation.openDiphthongs[sound].eligible, counts.eligible);
}
assert.deepEqual(await sourceSnapshot(), evaluatorSources, "Observer source changed during analysis");
const report = {
  schemaVersion: 1, probe: "partial-quantity-activation-v1", createdAt: new Date().toISOString(), node: process.version,
  evaluatorDigest: digest(evaluatorSources), evaluatorSources, controlProofSha256: sha(proofBytes),
  protocolDigest: candidate.manifest.protocolDigest, coreEvaluatorDigest: candidate.manifest.evaluatorDigest,
  changedRuntimeFiles: changedFiles,
  scope: "Root stress input. Original quantity/stress decisions unavailable; eligibility from recorded root geometry. Primary and secondary selection counts are observed, not paired counterfactual outcomes. Final metrics remain in frozen core comparisons.",
  runs,
};
await writeFile(resolve(outputPath), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ report: resolve(outputPath), runs: runs.map(run => ({ mode: run.mode, words: run.streams.reduce((sum, stream) => sum + stream.observation.words, 0) })) }));
