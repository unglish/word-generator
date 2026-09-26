import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digest } from "../../serialization.js";
import { sha } from "../syllable-quantity/archive.js";
import { readArchive, verifiedDraws, verifyUnchanged } from "./archive.js";
import { emptyObservation, observe, reconcile, morphologyStratum, reconcileStrata } from "./observe.js";
import { validateConfiguration } from "./validate.js";
import type { LanguageConfig } from "../../../../src/config/language.js";
import type { Draw } from "../../model.js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
export async function sourceSnapshot(): Promise<Array<{ path: string; content: string }>> {
  const paths = [
    ...["analyze.ts", "archive.ts", "observe.ts", "validate.ts", "parity.ts", "compare-parity.ts", "protocol.json", "README.md"].map(file => `evaluation/quality/probes/stress-pattern-observer/${file}`),
    "evaluation/quality/probes/syllable-quantity/archive.ts", "evaluation/quality/probes/syllable-weight/shared.ts", "src/core/stress-pattern.ts",
    ...["capture.ts", "model.ts", "serialization.ts", "metrics.ts", "distribution.ts"].map(file => `evaluation/quality/${file}`),
  ];
  return Promise.all(paths.sort().map(async path => ({ path, content: await readFile(join(repository, path), "utf8") })));
}
function legacyWord(draw: Draw) {
  assert.ok(draw.word.trace);
  const trace = { ...draw.word.trace };
  delete trace.stressPattern;
  return { ...draw.word, trace };
}
function witnessKeys(draw: Draw): string[] {
  const pattern = draw.word.trace!.stressPattern!;
  const keys = ["first"];
  for (const effect of pattern.morphology) keys.push(`morphology:${effect.role}:${effect.effect}:${effect.status}`);
  const [, , , , assembled, lexical, surface] = pattern.snapshots;
  const nuclei = (value: typeof lexical) => value.syllables.map(syllable => syllable.nucleus.map(phone => phone.sound));
  if (JSON.stringify(nuclei(assembled)) !== JSON.stringify(nuclei(lexical))) keys.push("lexical-nucleus-change");
  if (JSON.stringify(nuclei(lexical)) !== JSON.stringify(nuclei(surface))) keys.push("surface-nucleus-change");
  const start = pattern.assembly!.rootSyllableStart, end = start + pattern.rootSyllableCount;
  for (const boundary of [start, end]) if (boundary > 0 && boundary < surface.syllables.length) {
    const left = surface.syllables[boundary - 1], right = surface.syllables[boundary];
    if (left.mark !== "unmarked" && right.mark !== "unmarked") keys.push(`boundary:${boundary === start ? "prefix-root" : "root-suffix"}:${left.mark}:${right.mark}`);
  }
  return keys;
}
export async function analyze(controlDirectory: string, candidateDirectory: string, expectedObserverDigest: string) {
  const evaluatorSources = await sourceSnapshot();
  assert.equal(digest(evaluatorSources), expectedObserverDigest, "Observer differs from predeclared fingerprint");
  const protocol = JSON.parse(evaluatorSources.find(source => source.path.endsWith("/protocol.json"))!.content);
  assert.equal(sha(await readFile(join(controlDirectory, "manifest.json"))), protocol.controlManifestSha256);
  const control = await readArchive(controlDirectory), candidate = await readArchive(candidateDirectory);
  assert.equal(control.manifest.generator.sourceDigest, protocol.controlGeneratorDigest);
  for (const archive of [control, candidate]) {
    assert.equal(archive.manifest.evaluatorDigest, protocol.coreEvaluatorDigest);
    assert.equal(archive.manifest.protocolDigest, protocol.coreProtocolDigest);
    for (const files of [archive.sources.generator, archive.sources.evaluator, archive.sources.references, archive.sources.packageFiles]) assert.equal(new Set(files.map(file => file.path)).size, files.length, "Duplicate source path");
  }
  for (const field of ["protocolDigest", "evaluatorDigest", "referenceDigest", "environment"] as const) assert.deepEqual(control.manifest[field], candidate.manifest[field]);
  assert.deepEqual(control.schedule, candidate.schedule);
  assert.deepEqual(control.manifest.generator.effectiveConfig, candidate.manifest.generator.effectiveConfig);
  assert.deepEqual(control.summary.profiles, candidate.summary.profiles, "Frozen evaluator summaries changed");
  const expectedPaths = [...control.sources.generator.map(file => file.path), "src/core/stress-pattern.ts"].sort();
  assert.deepEqual(candidate.sources.generator.map(file => file.path).sort(), expectedPaths);
  const changed = candidate.sources.generator.filter(file => control.sources.generator.find(old => old.path === file.path)?.content !== file.content).map(file => file.path).sort();
  assert.deepEqual(changed, ["src/core/generate.ts", "src/core/morphology/attach.ts", "src/core/pronounce.ts", "src/core/stress-pattern.ts", "src/core/trace.ts", "src/index.ts"]);
  for (const file of [...candidate.sources.generator, ...candidate.sources.packageFiles]) assert.equal(await readFile(join(repository, file.path), "utf8"), file.content, `Candidate archived source differs from reviewed working source: ${file.path}`);
  const streams = [];
  const witnesses: Array<{ profile: string; seed: number; drawIndex: number; categories: string[]; word: Draw["word"] }> = [];
  for (const stream of control.schedule) {
    const left = verifiedDraws(control, stream)[Symbol.asyncIterator]();
    const right = verifiedDraws(candidate, stream)[Symbol.asyncIterator]();
    const observations = { control: emptyObservation(), candidate: emptyObservation() };
    const strata: Record<string, typeof observations> = {};
    const rawHash = createHash("sha256"), legacyHash = createHash("sha256");
    const witnessed = new Set<string>();
    for (let index = 0; index < stream.words; index++) {
      const [before, after] = await Promise.all([left.next(), right.next()]);
      assert.ok(!before.done && !after.done, "Truncated stream");
      assert.deepEqual(legacyWord(after.value), before.value.word, `Legacy parity failed: ${stream.profile}/${stream.seed}/${index}`);
      rawHash.update(JSON.stringify(before.value.word) + "\n");
      legacyHash.update(JSON.stringify(legacyWord(after.value)) + "\n");
      validateConfiguration(after.value.word, candidate.manifest.generator.effectiveConfig as unknown as LanguageConfig);
      const stratum = morphologyStratum(after.value.word);
      assert.equal(stratum, morphologyStratum(before.value.word));
      const counts = strata[stratum] ??= { control: emptyObservation(), candidate: emptyObservation() };
      observe(before.value.word, "control", [observations.control, counts.control]);
      observe(after.value.word, "candidate", [observations.candidate, counts.candidate]);
      const categories = witnessKeys(after.value).filter(key => !witnessed.has(key));
      if (categories.length) {
        categories.forEach(key => witnessed.add(key));
        witnesses.push({ profile: stream.profile, seed: stream.seed, drawIndex: index, categories, word: after.value.word });
      }
    }
    assert.ok((await left.next()).done && (await right.next()).done, "Extra stream record");
    reconcile(observations.control); reconcile(observations.candidate);
    for (const mode of ["control", "candidate"] as const) reconcileStrata(observations[mode], Object.values(strata).map(stratum => stratum[mode]));
    const beforeHash = rawHash.digest("hex"), afterHash = legacyHash.digest("hex");
    assert.equal(beforeHash, afterHash);
    streams.push({ profile: stream.profile, seed: stream.seed, words: stream.words, completeWordAndLegacyTraceSha256: beforeHash, observations, strata });
    console.log(`${stream.profile}/${stream.seed}: ${stream.words} raw records verified, replayed and equal`);
  }
  assert.equal(streams.reduce((sum, stream) => sum + stream.words, 0), protocol.scheduledWords);
  await verifyUnchanged(control);
  await verifyUnchanged(candidate);
  assert.deepEqual(await sourceSnapshot(), evaluatorSources, "Observer changed during measurement");
  for (const file of [...candidate.sources.generator, ...candidate.sources.packageFiles]) assert.equal(await readFile(join(repository, file.path), "utf8"), file.content, `Candidate source changed during measurement: ${file.path}`);
  return { schemaVersion: 1, probe: protocol.id, createdAt: new Date().toISOString(), node: process.version, evaluatorDigest: expectedObserverDigest, evaluatorSources,
    control: { manifestDigest: digest(control.manifest), sourceDigest: control.manifest.generator.sourceDigest },
    candidate: { manifestDigest: digest(candidate.manifest), sourceDigest: candidate.manifest.generator.sourceDigest },
    completeWordAndLegacyTraceParity: true, eventReplayComplete: true, streams, witnesses };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [control, candidate, fingerprint, output] = process.argv.slice(2);
  assert.ok(control && candidate && fingerprint && output, "Usage: analyze.ts CONTROL CANDIDATE PREDECLARED_OBSERVER_DIGEST REPORT.json");
  const report = await analyze(resolve(control), resolve(candidate), fingerprint);
  await writeFile(resolve(output), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
