import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { englishConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/index.ts";
import { verifyLexicalSpellingOperations } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/lexical-spelling-evidence.ts";
import { verifyFinalWordSourceLinks } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/final-word-sources.ts";
import { verifyConfiguredAllomorphs } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/core/morphology/allomorph-evidence.ts";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
export function countsFor(word) {
  const counts = {};
  const add = (key, value = 1) => { counts[key] = (counts[key] ?? 0) + value; };
  add("words");
  const t = word.trace ?? {}, m = t.morphology, template = m?.template ?? "no-morphology-plan";
  add(`words/${template === "bare" ? "planned-bare" : template}`);
  if (!t.baseSpelling) add("missingBaseEvidence");
  else {
    if (t.baseSpelling.edits.some(e => e.phase === "gap")) add("words/gap-overridden");
    for (const kind of ["shared", "split"]) {
      const ledger = t.baseSpelling[kind];
      add(`root/${kind}/unavailable`, Number(ledger == null));
      if (ledger) { add(`root/${kind}/constructions`, ledger.constructions.length); add(`root/${kind}/liveConstructions`, ledger.liveConstructionIds.length); }
    }
  }
  if (t.finalNucleus?.repairs.length) add("words/final-nucleus-repaired");
  for (const [name, required] of [["finalNucleus", true], ["pronunciationPasses", true], ["morphologyPreparation", Boolean(m)],
    ["morphologyWriting", ["prefixed", "suffixed", "both"].includes(template)], ["gapSpellingPass", ["bare", "no-morphology-plan"].includes(template)]]) {
    if (required && !(name in t)) add(`missingOperationPackets/${name}`);
  }
  const f = t.finalWord;
  if (!f) { add("missingFinalEvidence"); return counts; }
  for (const phase of ["initial", "cells"]) for (const cell of f.spelling[phase]) add(`cells/${phase}/${cell.part}/${cell.source.kind}`);
  const live = new Set(f.spelling.cells.map(c => c.id));
  const parts = new Map(f.spelling.initial.map(c => [c.id, c.part]));
  for (const event of f.spelling.events) for (const id of event.outputIds) parts.set(id, event.part);
  for (const [id, part] of parts) if (!live.has(id)) add(`cells/deleted/${part}`);
  add("cells/finalPhonemicLicenseUnavailable", f.spelling.cells.length);
  if (f.spelling.events.some(e => e.rule === "repairConsonantLetters")) add("words/final-cleanup-edited");
  for (const e of f.spelling.events) {
    const key = `edits/${e.part}/${e.rule}`;
    add(key); add(`${key}/removedUnits`, e.before.length); add(`${key}/insertedUnits`, e.after.length);
  }
  const origins = new Map(f.phones.initial.map(p => [p.id, p.source]));
  for (const p of f.phones.initial) add(`phones/initial/${p.source.part ?? "bridge"}/${p.source.kind}`);
  const start = word.lexical?.rootSyllableStart ?? 0, length = word.lexical?.root.length ?? 0;
  for (const p of f.phones.final) {
    const origin = origins.get(p.id), part = origin.part ?? "bridge";
    add(`phones/final/${part}/${origin.kind}`);
    if (["prefix", "suffix"].includes(part) && p.syllable >= start && p.syllable < start + length) add(`phones/affixInRoot/${part}`);
  }
  for (const origin of origins.values()) if (origin.kind === "bridge") add(`phones/bridges/${origin.boundary}`);
  for (const change of f.phones.changes) add(`phones/changes/${change.rule}`);
  for (const change of f.phones.realization) add(`phones/realizations/${change.rule}`);
  return counts;
}
async function* rows(path) {
  const reader = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of reader) yield JSON.parse(line);
}
async function checkArtifact(directory, item) {
  const hash = createHash("sha256"); let bytes = 0;
  for await (const chunk of createReadStream(join(directory, item.file))) { hash.update(chunk); bytes += chunk.length; }
  assert.equal(hash.digest("hex"), item.sha256); assert.equal(bytes, item.bytes);
}
async function analyze() {
const [archive, manifestHash, output] = process.argv.slice(2);
assert(archive && manifestHash && output);
const registrationBytes = await readFile("/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/experiments/final-word-ownership/measurement.json");
const registration = JSON.parse(registrationBytes);
const manifestBytes = await readFile(join(archive, "manifest.json")); assert.equal(sha(manifestBytes), manifestHash);
const manifest = JSON.parse(manifestBytes).manifest;
const candidateArm = manifest.generator.commit === "7e34a17f31d44d1e31420f458bf6e2d99c5fa038";
assert(candidateArm || manifest.generator.commit === "905ba3e92d396db358504fec1826c1c83f680ff3", "Unexpected source commit");
const protocolBytes = await readFile("/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/quality/protocol.json");
assert.equal(sha(protocolBytes), registration.protocolSha256); assert.deepEqual(manifest.protocol, JSON.parse(protocolBytes)); assert.equal(manifest.cohort, "development");
const config = structuredClone({ ...englishConfig, splitVowels: registration.configuration.splitVowels, followingLetters: registration.configuration.followingLetters });
const total = {}, replicates = {}, merge = (target, source) => { for (const [k, v] of Object.entries(source)) target[k] = (target[k] ?? 0) + v; };
for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
  const file = `words/${profile.id}-${seed}.jsonl.gz`, items = manifest.artifacts.filter(a => a.file === file);
  assert.equal(items.length, 1); await checkArtifact(archive, items[0]);
  let index = 0; const counts = {};
  for await (const row of rows(join(archive, file))) {
    assert.equal(row.profile, profile.id); assert.equal(row.seed, seed); assert.equal(row.drawIndex, index++);
    if (candidateArm) {
      assert(row.word.trace?.finalWord, "Candidate final evidence missing");
      verifyLexicalSpellingOperations(row.word, config); verifyFinalWordSourceLinks(row.word); verifyConfiguredAllomorphs(row.word, config);
    } else assert.equal(row.word.trace?.finalWord, undefined, "Control unexpectedly has final evidence");
    merge(counts, countsFor(row.word));
  }
  assert.equal(index, 10000); merge(total, counts); replicates[`${profile.id}/${seed}`] = counts;
  console.log(`${profile.id}/${seed}: ${index} records replayed and counted`);
}
assert.equal(total.words, registration.wordsPerArm);
await writeFile(output, JSON.stringify({ manifestSha256: manifestHash, registrationSha256: sha(registrationBytes), protocolSha256: registration.protocolSha256,
  counts: total, replicates, configuredOperationReplayFailures: candidateArm ? 0 : null, sourceBindingFailures: candidateArm ? 0 : null,
  scope: candidateArm ? "Configured production replay and operational-source binding; independent structural replay is separate." : "Control counters only: final configured-operation/source replay evidence is unavailable." }, null, 2) + "\n", { flag: "wx" });

}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await analyze();
