import assert from "node:assert/strict";
import type { Draw } from "../../model.js";
import type { RepairTrace, StageSnapshot, SyllableSnapshot } from "../../../../src/core/trace.js";

export interface PairRule { nucleus: string[]; coda: string[] }
type Counts = Record<string, number>;
interface Layer {
  observedWords: number; unavailableWords: number; wordsWithViolation: number;
  syllables: number; nuclearSegments: number; codaSegments: number; crossPairs: number;
  violatingPairs: number; violatingNuclei: number; violatingSyllables: number;
  byPair: Counts; byPosition: Counts;
  contexts: Record<string, { nuclearSegments: number; codaPairs: number; violations: number }>;
}
interface Transition { observedWords: number; unavailableWords: number; introduced: number; removed: number; retained: number }
interface Replacement {
  observedRepairs: number; unavailableDetails: number; detailedRepairs: number;
  positivePairExclusions: number; repairsWithPairExclusions: number;
  eligibleCandidateEntries: Counts; selections: Counts;
}
export interface Observation {
  words: number;
  layers: Record<"generatedRoot" | "structuralRoot" | "stressedRoot" | "preparedRoot" | "output", Layer>;
  transitions: Record<"stressRepair" | "edgeRepair", Transition>;
  replacements: Record<"stressRepair" | "edgeRepair", Replacement>;
}
interface ReplacementDetail {
  domain: "lexical-root"; syllableIndex: number; nucleusIndex: number; coda: string[];
  edges: { initial: boolean; final: boolean };
  weighting: "nucleus-only" | "nucleus-times-word-position";
  eligibleCandidateEntries: number; positivePairExclusions: number; totalWeight: number;
}

export function emptyObservation(): Observation {
  const layer = (): Layer => ({ observedWords: 0, unavailableWords: 0, wordsWithViolation: 0,
    syllables: 0, nuclearSegments: 0, codaSegments: 0, crossPairs: 0,
    violatingPairs: 0, violatingNuclei: 0, violatingSyllables: 0, byPair: {}, byPosition: {}, contexts: {} });
  const transition = (): Transition => ({ observedWords: 0, unavailableWords: 0, introduced: 0, removed: 0, retained: 0 });
  const replacement = (): Replacement => ({ observedRepairs: 0, unavailableDetails: 0, detailedRepairs: 0,
    positivePairExclusions: 0, repairsWithPairExclusions: 0, eligibleCandidateEntries: {}, selections: {} });
  return { words: 0, layers: { generatedRoot: layer(), structuralRoot: layer(), stressedRoot: layer(), preparedRoot: layer(), output: layer() },
    transitions: { stressRepair: transition(), edgeRepair: transition() }, replacements: { stressRepair: replacement(), edgeRepair: replacement() } };
}
const add = (counts: Counts, key: string, amount = 1): void => { counts[key] = (counts[key] ?? 0) + amount; };
export function pairSet(rules: PairRule[]): Set<string> {
  const set = new Set<string>();
  for (const rule of rules) for (const nucleus of rule.nucleus) for (const coda of rule.coda) set.add(JSON.stringify([nucleus, coda]));
  return set;
}
function uniqueStage(stages: StageSnapshot[], name: string): StageSnapshot | undefined {
  const matches = stages.filter(stage => stage.name === name);
  assert.ok(matches.length <= 1, `Duplicate stage: ${name}`);
  return matches[0];
}
function validateShapes(shapes: SyllableSnapshot[]): void {
  assert.ok(Array.isArray(shapes));
  for (const shape of shapes) for (const part of ["onset", "nucleus", "coda"] as const) {
    assert.ok(Array.isArray(shape[part]) && shape[part].every(sound => typeof sound === "string" && sound.length > 0), `Malformed ${part} snapshot`);
  }
}
function violations(shapes: SyllableSnapshot[], pairs: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const [si, shape] of shapes.entries()) for (const [ni, nucleus] of shape.nucleus.entries()) for (const [ci, coda] of shape.coda.entries()) {
    if (pairs.has(JSON.stringify([nucleus, coda]))) result.add(JSON.stringify([si, ni, ci, nucleus, coda]));
  }
  return result;
}
function observeLayer(layer: Layer, shapes: SyllableSnapshot[] | undefined, pairs: Set<string>): void {
  if (!shapes) { layer.unavailableWords++; return; }
  validateShapes(shapes);
  layer.observedWords++;
  let wordViolations = 0;
  for (const [si, shape] of shapes.entries()) {
    layer.syllables++; layer.nuclearSegments += shape.nucleus.length; layer.codaSegments += shape.coda.length;
    layer.crossPairs += shape.nucleus.length * shape.coda.length;
    let syllableViolations = 0;
    const position = shapes.length === 1 ? "isolated" : si === 0 ? "initial" : si === shapes.length - 1 ? "final" : "medial";
    for (const nucleus of shape.nucleus) {
      let nuclearViolations = 0;
      for (const coda of shape.coda) if (pairs.has(JSON.stringify([nucleus, coda]))) {
        nuclearViolations++; add(layer.byPair, JSON.stringify([nucleus, coda])); add(layer.byPosition, position);
      }
      const context = layer.contexts[JSON.stringify({ position, nucleus, coda: shape.coda })] ??= { nuclearSegments: 0, codaPairs: 0, violations: 0 };
      context.nuclearSegments++; context.codaPairs += shape.coda.length; context.violations += nuclearViolations;
      if (nuclearViolations) layer.violatingNuclei++;
      syllableViolations += nuclearViolations;
    }
    if (syllableViolations) layer.violatingSyllables++;
    wordViolations += syllableViolations;
  }
  if (wordViolations) layer.wordsWithViolation++;
  layer.violatingPairs += wordViolations;
}
function observeTransition(counts: Transition, stage: StageSnapshot | undefined, pairs: Set<string>): void {
  if (!stage) { counts.unavailableWords++; return; }
  validateShapes(stage.before); validateShapes(stage.after);
  assert.equal(stage.before.length, stage.after.length, "Nucleus repair changed syllable count");
  stage.before.forEach((shape, index) => {
    assert.deepEqual(shape.onset, stage.after[index].onset, "Nucleus repair changed the onset");
    assert.deepEqual(shape.coda, stage.after[index].coda, "Nucleus repair changed the retained coda");
    assert.equal(shape.nucleus.length, stage.after[index].nucleus.length, "Nucleus repair changed nucleus length");
  });
  counts.observedWords++;
  const before = violations(stage.before, pairs), after = violations(stage.after, pairs);
  counts.retained += [...before].filter(key => after.has(key)).length;
  counts.removed += [...before].filter(key => !after.has(key)).length;
  counts.introduced += [...after].filter(key => !before.has(key)).length;
}
export function observe(draw: Draw, result: Observation, pairs: Set<string>, requireDetails: boolean): string[] {
  const trace = draw.word.trace;
  assert.ok(trace, "Missing trace");
  const stages = trace.stages;
  const generated = uniqueStage(stages, "generateSyllables")?.after;
  const structural = uniqueStage(stages, "applyStress")?.before;
  const stress = uniqueStage(stages, "repairStressedNuclei");
  const edge = uniqueStage(stages, "repairNucleusWordPositions");
  const prepared = uniqueStage(stages, "generateWrittenForm")?.before;
  const output = draw.word.syllables.map(shape => ({ onset: shape.onset.map(p => p.sound), nucleus: shape.nucleus.map(p => p.sound), coda: shape.coda.map(p => p.sound) }));
  result.words++;
  const witnesses: string[] = [];
  for (const [name, shapes] of [["generatedRoot", generated], ["structuralRoot", structural], ["stressedRoot", stress?.after], ["preparedRoot", prepared], ["output", output]] as const) {
    observeLayer(result.layers[name], shapes, pairs);
    if (shapes && violations(shapes, pairs).size) witnesses.push(`${name}/violation`);
  }
  for (const [phase, stage, rule] of [["stressRepair", stress, "repairStressedNuclei"], ["edgeRepair", edge, "repairNucleusWordPositions"]] as const) {
    observeTransition(result.transitions[phase], stage, pairs);
    const repairs: RepairTrace[] = trace.repairs.filter(repair => repair.rule === rule);
    const changes = stage?.before.flatMap((shape, si) => shape.nucleus.flatMap((sound, ni) =>
      sound === stage.after[si].nucleus[ni] ? [] : [{ si, ni, before: sound, after: stage.after[si].nucleus[ni] }]));
    if (changes) {
      assert.deepEqual(repairs.map(repair => JSON.stringify([repair.before, repair.after])).sort(),
        changes.map(change => JSON.stringify([change.before, change.after])).sort(), "Repair records do not match stage changes");
    }
    const coordinates = new Set<string>();
    for (const repair of repairs) {
      const counts = result.replacements[phase]; counts.observedRepairs++;
      const detail = (repair as RepairTrace & { nucleusReplacement?: ReplacementDetail }).nucleusReplacement;
      if (!detail) {
        assert.ok(!requireDetails, "Candidate nucleus repair lacks structured details");
        counts.unavailableDetails++; continue;
      }
      assert.ok(stage, "Detailed replacement missing stage");
      assert.equal(detail.domain, "lexical-root");
      assert.equal(detail.weighting, phase === "stressRepair" ? "nucleus-only" : "nucleus-times-word-position");
      assert.ok(Number.isSafeInteger(detail.syllableIndex) && detail.syllableIndex >= 0 && detail.syllableIndex < stage.before.length);
      const shape = stage.before[detail.syllableIndex], after = stage.after[detail.syllableIndex];
      assert.ok(Number.isSafeInteger(detail.nucleusIndex) && detail.nucleusIndex >= 0 && detail.nucleusIndex < shape.nucleus.length);
      const coordinate = JSON.stringify([detail.syllableIndex, detail.nucleusIndex]);
      assert.ok(!coordinates.has(coordinate), "Duplicate replacement coordinate");
      assert.ok(changes?.some(change => change.si === detail.syllableIndex && change.ni === detail.nucleusIndex), "Replacement coordinate did not change");
      coordinates.add(coordinate);
      assert.equal(shape.nucleus[detail.nucleusIndex], repair.before);
      assert.equal(after.nucleus[detail.nucleusIndex], repair.after);
      assert.deepEqual(detail.coda, shape.coda);
      assert.deepEqual(detail.edges, {
        initial: detail.syllableIndex === 0 && shape.onset.length === 0 && detail.nucleusIndex === 0,
        final: detail.syllableIndex === stage.before.length - 1 && shape.coda.length === 0 && detail.nucleusIndex === shape.nucleus.length - 1,
      });
      assert.ok(Number.isSafeInteger(detail.eligibleCandidateEntries) && detail.eligibleCandidateEntries > 0);
      assert.ok(Number.isSafeInteger(detail.positivePairExclusions) && detail.positivePairExclusions >= 0);
      assert.ok(Number.isFinite(detail.totalWeight) && detail.totalWeight > 0);
      assert.ok(shape.coda.every(coda => !pairs.has(JSON.stringify([repair.after, coda]))), "Recorded replacement violates its retained coda");
      counts.detailedRepairs++; counts.positivePairExclusions += detail.positivePairExclusions;
      if (detail.positivePairExclusions) { counts.repairsWithPairExclusions++; witnesses.push(`${phase}/pair-exclusion`); }
      add(counts.eligibleCandidateEntries, String(detail.eligibleCandidateEntries));
      add(counts.selections, JSON.stringify([repair.before, repair.after, detail.coda]));
    }
    if (requireDetails && changes) {
      assert.deepEqual([...coordinates].sort(), changes.map(change => JSON.stringify([change.si, change.ni])).sort(), "Missing replacement coordinate");
    }
  }
  return witnesses;
}
export function reconcile(result: Observation): void {
  const sum = (counts: Counts): number => Object.values(counts).reduce((total, value) => total + value, 0);
  for (const layer of Object.values(result.layers)) {
    assert.equal(layer.observedWords + layer.unavailableWords, result.words);
    assert.equal(Object.values(layer.contexts).reduce((total, context) => total + context.nuclearSegments, 0), layer.nuclearSegments);
    assert.equal(Object.values(layer.contexts).reduce((total, context) => total + context.codaPairs, 0), layer.crossPairs);
    assert.equal(Object.values(layer.contexts).reduce((total, context) => total + context.violations, 0), layer.violatingPairs);
    assert.equal(sum(layer.byPair), layer.violatingPairs); assert.equal(sum(layer.byPosition), layer.violatingPairs);
    assert.ok(layer.violatingPairs <= layer.crossPairs && layer.violatingNuclei <= layer.nuclearSegments && layer.violatingSyllables <= layer.syllables);
  }
  for (const transition of Object.values(result.transitions)) assert.equal(transition.observedWords + transition.unavailableWords, result.words);
  for (const replacement of Object.values(result.replacements)) {
    assert.equal(replacement.unavailableDetails + replacement.detailedRepairs, replacement.observedRepairs);
    assert.equal(sum(replacement.eligibleCandidateEntries), replacement.detailedRepairs); assert.equal(sum(replacement.selections), replacement.detailedRepairs);
  }
}
