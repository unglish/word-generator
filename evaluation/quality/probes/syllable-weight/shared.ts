import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { Word, WordGenerationOptions } from "../../../../src/types.js";

export const profiles = [
  { id: "lexicon-default", options: { mode: "lexicon", morphology: true }, seeds: [69212153, 101601885, 3921817393, 3948943232, 2089697863] },
  { id: "lexicon-bare", options: { mode: "lexicon", morphology: false }, seeds: [2380207674, 772709128, 1304238451, 1696751198, 1498885173] },
  { id: "monosyllables-bare", options: { mode: "lexicon", morphology: false, syllableCount: 1 }, seeds: [462530651, 62358955, 3297327738, 2001884366, 2353354178] },
  { id: "text-default", options: { mode: "text", morphology: true }, seeds: [4167471042, 2666001996, 3562318933, 1999736106, 1665836705] },
] satisfies Array<{ id: string; options: WordGenerationOptions; seeds: number[] }>;
export const draws = 1000;
export const originalRef = "8e9ceb2fb1d8a7a6d4a6d4239e501ccaaed73c1c";
export const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
export const scheduleSha256 = sha(JSON.stringify({ profiles, draws }));
export const runtimeFile = (name: string): boolean => /\.(?:ts|js|mjs|json)$/.test(name) && !/\.(?:test|bench)\./.test(name);
export const filesDigest = (files: Record<string, string>): string => sha(JSON.stringify(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))));

export function sourceSnapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (runtimeFile(entry.name)) result[relative(root, path)] = sha(readFileSync(path));
    }
  }
  walk(join(root, "src"));
  for (const path of ["package.json", "package-lock.json", "tsconfig.json"]) result[path] = sha(readFileSync(join(root, path)));
  return result;
}

export function evaluatorSnapshot(directory: string): Record<string, string> {
  return Object.fromEntries(readdirSync(directory).sort().filter(name => name === "README.md" || (name.endsWith(".ts") && !name.endsWith(".test.ts"))).map(name => [name, sha(readFileSync(join(directory, name)))]));
}

export interface Observation {
  words: number;
  unavailable: number;
  observedSyllables: number;
  quantity: Record<string, number>;
  analytical: Record<string, number>;
  operational: Record<string, number>;
  primaryStrategies: Record<string, number>;
  secondaryCandidates: number;
  secondaryApplied: number;
  finalStressCheckedWords: number;
  finalStressUnavailableWords: number;
  witnesses: Array<{ draw: number; word: Word }>;
}

export function emptyObservation(): Observation {
  return { words: 0, unavailable: 0, observedSyllables: 0, quantity: {}, analytical: {}, operational: {}, primaryStrategies: {}, secondaryCandidates: 0, secondaryApplied: 0, finalStressCheckedWords: 0, finalStressUnavailableWords: 0, witnesses: [] };
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

/** Check evidence against the archived root stage, never against later surface phones. */
export function observe(word: Word, draw: number, mode: "original" | "candidate", result: Observation): void {
  result.words++;
  const trace = word.trace;
  assert.ok(trace, "Missing public trace");
  const weight = trace.stressWeight;
  if (mode === "original") {
    assert.equal(weight, undefined, "Original unexpectedly has new weight evidence");
    result.unavailable++;
    if (result.witnesses.length === 0) result.witnesses.push({ draw, word });
    return;
  }
  assert.ok(weight, "Candidate missing weight evidence");
  assert.equal(weight.version, 1);
  assert.equal(weight.stage, "applyStress");
  assert.equal(weight.domain, "root-before-nucleus-repair");
  assert.deepEqual(weight.policy, { type: "legacy-segment-count" });
  const stages = trace.stages.filter(stage => stage.name === "applyStress");
  assert.equal(stages.length, 1, "Missing or duplicate applyStress stage");
  const stage = stages[0];
  assert.equal(weight.syllables.length, stage.before.length);
  let sawHeavy = false;
  for (const [index, syllable] of weight.syllables.entries()) {
    const source = stage.before[index];
    assert.equal(syllable.syllableIndex, index);
    assert.deepEqual(syllable.coda, source.coda);
    assert.deepEqual(syllable.nucleus.map(phone => phone.sound), source.nucleus);
    assert.equal(syllable.nucleusMoras, null, "Default inventory acquired a mora count");
    assert.deepEqual(syllable.analytical, { weight: "unknown", basis: "legacy-policy" });
    const expected = source.coda.length > 0 || source.nucleus.length > 1 ? "heavy" : "light";
    assert.deepEqual(syllable.operational, { weight: expected, basis: "legacy-rule" });
    sawHeavy ||= expected === "heavy";
    result.observedSyllables++;
    increment(result.analytical, `${syllable.analytical.weight}:${syllable.analytical.basis}`);
    increment(result.operational, `${syllable.operational.weight}:${syllable.operational.basis}`);
    for (const [segmentIndex, phone] of syllable.nucleus.entries()) {
      assert.equal(phone.segmentIndex, segmentIndex);
      assert.equal(phone.declared, undefined);
      assert.deepEqual(phone.quantity, { status: "unknown", reason: "unspecified" });
      increment(result.quantity, "unknown:unspecified");
    }
  }
  const primary = weight.primary.selectedIndex;
  if (weight.syllables.length <= 1) assert.equal(primary, null);
  else assert.ok(primary !== null && Number.isInteger(primary) && primary >= 0 && primary < weight.syllables.length);
  assert.equal(weight.primary.strategy, "ot");
  increment(result.primaryStrategies, weight.primary.strategy);
  const indices = weight.secondary.candidates.map(candidate => candidate.syllableIndex);
  const expectedIndices = primary === null ? [] : [0, 1, 2].filter(index => index < weight.syllables.length && index !== primary);
  assert.deepEqual(indices, expectedIndices);
  assert.equal(new Set(indices).size, indices.length);
  for (const candidate of weight.secondary.candidates) {
    assert.notEqual(candidate.syllableIndex, primary);
    assert.ok(candidate.syllableIndex >= 0 && candidate.syllableIndex < weight.syllables.length);
    assert.equal(candidate.weight, weight.syllables[candidate.syllableIndex].operational.weight === "heavy" ? 70 : 30);
  }
  result.secondaryCandidates += indices.length;
  if (weight.secondary.selectedIndex !== null) assert.ok(indices.includes(weight.secondary.selectedIndex));
  else assert.equal(indices.length, 0);
  if (weight.secondary.applied) {
    assert.notEqual(weight.secondary.selectedIndex, null);
    result.secondaryApplied++;
  }
  // Legacy stage snapshots omit stress marks. Later morphology can change them;
  // only a bare final word independently retains these root stress decisions.
  if (trace.morphology?.prefix || trace.morphology?.suffix) result.finalStressUnavailableWords++;
  else {
    assert.equal(word.syllables.length, weight.syllables.length);
    const finalPrimary = word.syllables.findIndex(syllable => syllable.stress === "ˈ");
    assert.equal(primary, finalPrimary < 0 ? null : finalPrimary);
    if (weight.secondary.applied) assert.equal(word.syllables[weight.secondary.selectedIndex!].stress, "ˌ");
    result.finalStressCheckedWords++;
  }
  const witnessClass = sawHeavy ? "heavy" : "all-light";
  if (!result.witnesses.some(item => (item.word.trace!.stressWeight!.syllables.some(s => s.operational.weight === "heavy") ? "heavy" : "all-light") === witnessClass)) result.witnesses.push({ draw, word });
}

export interface Variant {
  tracing: boolean;
  wordHash: string;
  rngBoundaryHash: string;
  rngCalls: number;
  nextRng: number;
  legacyTraceHash: string | null;
}

export interface ParityReport {
  schemaVersion: 1;
  probe: "syllable-weight-parity-v1";
  mode: "original" | "candidate";
  createdAt: string;
  node: string;
  checkout: string;
  gitHead: string;
  sourceFiles: Record<string, string>;
  sourceDigest: string;
  evaluatorFiles: Record<string, string>;
  evaluatorSha256: string;
  scheduleSha256: string;
  generatedWords: number;
  streams: Array<{ profile: string; options: WordGenerationOptions; seed: number; draws: number; variants: Variant[] }>;
  observations: Array<{ profile: string; seed: number; result: Observation }>;
}

export function validateReport(report: ParityReport): void {
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.probe, "syllable-weight-parity-v1");
  assert.ok(report.mode === "original" || report.mode === "candidate");
  assert.equal(report.scheduleSha256, scheduleSha256);
  assert.equal(report.sourceDigest, filesDigest(report.sourceFiles));
  assert.equal(report.evaluatorSha256, filesDigest(report.evaluatorFiles));
  assert.ok(report.sourceFiles["src/index.ts"]);
  for (const files of [report.sourceFiles, report.evaluatorFiles]) for (const hash of Object.values(files)) assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(report.generatedWords, 40000);
  assert.equal(report.streams.length, 20);
  assert.equal(report.observations.length, 20);
  let index = 0;
  for (const profile of profiles) for (const seed of profile.seeds) {
    const stream = report.streams[index];
    assert.equal(stream.profile, profile.id);
    assert.equal(stream.seed, seed);
    assert.equal(stream.draws, draws);
    assert.deepEqual(stream.options, profile.options);
    assert.equal(stream.variants.length, 2);
    for (const [variantIndex, variant] of stream.variants.entries()) {
      assert.equal(variant.tracing, variantIndex === 1);
      for (const hash of [variant.wordHash, variant.rngBoundaryHash]) assert.match(hash, /^[a-f0-9]{64}$/);
      if (variant.tracing) assert.match(variant.legacyTraceHash!, /^[a-f0-9]{64}$/);
      else assert.equal(variant.legacyTraceHash, null);
      assert.ok(Number.isInteger(variant.rngCalls) && variant.rngCalls >= draws);
      assert.ok(Number.isFinite(variant.nextRng) && variant.nextRng >= 0 && variant.nextRng < 1);
    }
    for (const field of ["wordHash", "rngBoundaryHash", "rngCalls", "nextRng"] as const) assert.equal(stream.variants[0][field], stream.variants[1][field], `Trace/no-trace mismatch: ${field}`);
    const observation = report.observations[index++];
    assert.equal(observation.profile, profile.id);
    assert.equal(observation.seed, seed);
    assert.equal(observation.result.words, draws);
    assert.equal(observation.result.unavailable, report.mode === "original" ? draws : 0);
    assert.ok(observation.result.witnesses.length > 0 && observation.result.witnesses.length <= 2);
    for (const witness of observation.result.witnesses) {
      assert.ok(Number.isInteger(witness.draw) && witness.draw >= 0 && witness.draw < draws);
      observe(witness.word, witness.draw, report.mode, emptyObservation());
    }
    if (report.mode === "original") {
      assert.equal(observation.result.observedSyllables, 0);
      assert.deepEqual(observation.result.quantity, {});
      assert.deepEqual(observation.result.analytical, {});
      assert.deepEqual(observation.result.operational, {});
      assert.equal(observation.result.finalStressCheckedWords + observation.result.finalStressUnavailableWords, 0);
    } else {
      assert.ok(observation.result.observedSyllables >= draws);
      assert.deepEqual(observation.result.analytical, { "unknown:legacy-policy": observation.result.observedSyllables });
      assert.deepEqual(observation.result.primaryStrategies, { ot: draws });
      assert.deepEqual(Object.keys(observation.result.quantity), ["unknown:unspecified"]);
      const weights = observation.result.operational;
      assert.ok(Object.keys(weights).every(key => ["light:legacy-rule", "heavy:legacy-rule"].includes(key)));
      assert.equal(Object.values(weights).reduce((sum, count) => sum + count, 0), observation.result.observedSyllables);
      assert.equal(observation.result.finalStressCheckedWords + observation.result.finalStressUnavailableWords, draws);
    }
  }
}
