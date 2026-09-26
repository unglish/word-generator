import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import type { Word, Syllable, Phoneme } from "../../../../src/types.js";
import type { StressAssignmentCause, StressMark, StressOrigin, StressPatternDomain, StressPatternSnapshot, StressPhoneSnapshot } from "../../../../src/core/stress-pattern.js";
import type { StageSnapshot, SyllableSnapshot } from "../../../../src/core/trace.js";

export const domains: StressPatternDomain[] = ["root-before-primary", "root-after-primary", "root-after-explicit-secondary", "root-after-rhythmic", "assembled-after-morphology", "final-lexical-before-realization", "surface-after-realization"];
export const mark = (value: Syllable["stress"]): StressMark => value === "ˈ" ? "primary" : value === "ˌ" ? "secondary" : "unmarked";
const validDraw = (value: number | null): void => { assert.ok(value !== null && Number.isFinite(value) && value >= 0 && value < 1, "Invalid executed draw"); };
const shape = (syllables: StressPatternSnapshot["syllables"]) => syllables.map(syllable => ({ onset: syllable.onset.map(phone => phone.sound), nucleus: syllable.nucleus.map(phone => phone.sound), coda: syllable.coda.map(phone => phone.sound), mark: syllable.mark }));
const oldShape = (syllables: SyllableSnapshot[]) => syllables.map(syllable => ({ onset: syllable.onset, nucleus: syllable.nucleus, coda: syllable.coda, mark: mark(syllable.stress) }));
function phoneSnapshot(phone: Phoneme): StressPhoneSnapshot {
  const result: StressPhoneSnapshot = { sound: phone.sound };
  if (phone.nuclearQuantity) result.nuclearQuantity = { ...phone.nuclearQuantity };
  if (phone.reduced !== undefined) result.reduced = phone.reduced;
  if (phone.aspirated !== undefined) result.aspirated = phone.aspirated;
  return result;
}
const wordPhones = (syllables: Syllable[]) => syllables.map(syllable => ({ onset: syllable.onset.map(phoneSnapshot), nucleus: syllable.nucleus.map(phoneSnapshot), coda: syllable.coda.map(phoneSnapshot), mark: mark(syllable.stress) }));
const segments = (syllable: StressPatternSnapshot["syllables"][number]) => ({ onset: syllable.onset, nucleus: syllable.nucleus, coda: syllable.coda });
const snapshotPhones = (snapshot: StressPatternSnapshot) => snapshot.syllables.map(syllable => ({ ...segments(syllable), mark: syllable.mark }));
export function oneStage(word: Word, name: string): StageSnapshot {
  const stages = word.trace!.stages.filter(stage => stage.name === name);
  assert.equal(stages.length, 1, `Missing/duplicate stage: ${name}`);
  return stages[0];
}

/** Reconstruct executed assignments from decisions, checking every event and snapshot in order. */
export function validatePattern(word: Word): void {
  const trace = word.trace;
  assert.ok(trace?.stressPattern && trace.stressWeight && word.lexical, "Missing candidate evidence");
  const pattern = trace.stressPattern;
  const weight = trace.stressWeight;
  assert.equal(pattern.version, 1);
  assert.equal(pattern.scope, "returned-attempt");
  assert.deepEqual(pattern.snapshots.map(snapshot => snapshot.domain), domains);
  const [initial, primary, explicit, rhythmic, assembled, lexical, surface] = pattern.snapshots;
  assert.equal(pattern.rootSyllableCount, initial.syllables.length);
  assert.equal(pattern.rootSyllableCount, word.lexical.root.length);
  const stressStage = oneStage(word, "applyStress");
  assert.deepEqual(shape(initial.syllables), oldShape(stressStage.before));
  assert.deepEqual(shape(rhythmic.syllables), oldShape(stressStage.after));
  for (const snapshot of [primary, explicit, rhythmic]) {
    assert.deepEqual(snapshot.syllables.map(segments), initial.syllables.map(segments), "Stress changed phones");
  }
  assert.deepEqual(shape(assembled.syllables), oldShape(oneStage(word, "assembleMorphology").after));
  const pronunciation = oneStage(word, "generatePronunciation");
  assert.deepEqual(shape(lexical.syllables), oldShape(pronunciation.before));
  assert.deepEqual(shape(surface.syllables), oldShape(pronunciation.after));
  assert.deepEqual(snapshotPhones(lexical), wordPhones(word.lexical.syllables));
  assert.deepEqual(snapshotPhones(surface), wordPhones(word.syllables));
  assert.equal(weight.syllables.length, initial.syllables.length);
  assert.deepEqual(weight.primary, { strategy: pattern.primary.strategy, selectedIndex: pattern.primary.selectedIndex });
  assert.deepEqual(weight.secondary, { candidates: pattern.explicitSecondary.candidates, selectedIndex: pattern.explicitSecondary.selectedIndex, applied: pattern.explicitSecondary.applied });
  for (const [index, input] of weight.syllables.entries()) {
    assert.equal(input.syllableIndex, index);
    assert.deepEqual(input.coda, initial.syllables[index].coda.map(phone => phone.sound));
    assert.deepEqual(input.nucleus.map(phone => ({ sound: phone.sound, declared: phone.declared })), initial.syllables[index].nucleus.map(phone => ({ sound: phone.sound, declared: phone.nuclearQuantity })));
  }
  let coordinates: "root" | "word" = "root";
  let marks = initial.syllables.map(syllable => syllable.mark);
  let origins: StressOrigin[] = marks.map(value => ({ kind: value === "unmarked" ? "unmarked" : "input" }));
  let eventIndex = 0;
  function assignment(index: number, after: StressMark, cause: StressAssignmentCause): void {
    assert.ok(Number.isSafeInteger(index) && index >= 0 && index < marks.length, "Invalid assignment coordinate");
    assert.deepEqual(pattern.events[eventIndex], { id: eventIndex, coordinates, syllableIndex: index, before: marks[index], previousOrigin: origins[index], after, cause }, "Missing, duplicate, reordered or inconsistent assignment");
    marks[index] = after;
    origins[index] = { kind: "event", eventId: eventIndex++ };
  }
  function snapshot(value: StressPatternSnapshot): void {
    assert.equal(value.coordinates, coordinates);
    assert.equal(value.eventCount, eventIndex);
    assert.deepEqual(value.syllables.map(syllable => syllable.mark), marks, "Snapshot labels differ from replay");
    assert.deepEqual(value.syllables.map(syllable => syllable.origin), origins, "Snapshot origins differ from replay");
  }
  snapshot(initial);
  pattern.primary.draws.forEach(validDraw);
  if (pattern.primary.selectedIndex !== null) assignment(pattern.primary.selectedIndex, "primary", { kind: "root-primary" });
  else assert.equal(marks.length, 0);
  snapshot(primary);
  const secondary = pattern.explicitSecondary;
  const primaryIndex = marks.indexOf("primary");
  const candidateIndices = (secondary.candidateWindow === "all-nonprimary" ? marks.map((_, index) => index) : [0, 1, 2].filter(index => index < marks.length)).filter(index => index !== primaryIndex);
  const skipped = marks.length <= 1 ? "monosyllabic" : !secondary.enabled ? "disabled" : primaryIndex < 0 ? "no-primary" : candidateIndices.length === 0 ? "no-candidates" : null;
  assert.equal(secondary.skipped, skipped);
  if (skipped) {
    assert.deepEqual({ candidates: secondary.candidates, selectedIndex: secondary.selectedIndex, applied: secondary.applied, selectionDraw: secondary.selectionDraw, gateDraw: secondary.gateDraw }, { candidates: [], selectedIndex: null, applied: false, selectionDraw: null, gateDraw: null });
  } else {
    assert.deepEqual(secondary.candidates.map(candidate => candidate.syllableIndex), candidateIndices);
    validDraw(secondary.selectionDraw); validDraw(secondary.gateDraw);
    const total = secondary.candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let cumulative = 0;
    const selected = secondary.candidates.find(candidate => { cumulative += candidate.weight; return secondary.selectionDraw! * total < cumulative; }) ?? secondary.candidates.at(-1)!;
    assert.equal(secondary.selectedIndex, selected.syllableIndex);
    assert.equal(secondary.applied, secondary.gateDraw! * 100 < secondary.probability);
    if (secondary.applied) assignment(selected.syllableIndex, "secondary", { kind: "explicit-secondary" });
  }
  snapshot(explicit);
  let iterationIndex = 0;
  if (pattern.rhythmic.enabled) for (let index = 1; index < marks.length - 1; index++) {
    const iteration = pattern.rhythmic.iterations[iterationIndex];
    assert.ok(iteration, "Missing rhythmic iteration");
    const alreadyMarked = marks[index] !== "unmarked";
    const neighbor = marks[index - 1] !== "unmarked" || marks[index + 1] !== "unmarked";
    const skipped = alreadyMarked ? "already-marked" : pattern.rhythmic.requireUnstressedNeighbors && neighbor ? "marked-neighbor" : null;
    assert.deepEqual({ syllableIndex: iteration.syllableIndex, before: iteration.before, left: iteration.left, right: iteration.right, neighborCheckPerformed: iteration.neighborCheckPerformed, skipped: iteration.skipped }, { syllableIndex: index, before: marks[index], left: marks[index - 1], right: marks[index + 1], neighborCheckPerformed: !alreadyMarked, skipped });
    if (skipped) assert.deepEqual({ draw: iteration.draw, applied: iteration.applied }, { draw: null, applied: false });
    else {
      validDraw(iteration.draw);
      assert.equal(iteration.applied, iteration.draw! * 100 < pattern.rhythmic.probability);
      if (iteration.applied) assignment(index, "secondary", { kind: "rhythmic", iteration: iterationIndex });
    }
    iterationIndex++;
  }
  assert.equal(pattern.rhythmic.iterations.length, iterationIndex, "Extra rhythmic iteration");
  snapshot(rhythmic);
  const realization = trace.morphology?.realization;
  const realizedCount = (role: "prefix" | "suffix") => {
    const form = realization?.[role]?.resolved;
    return form && form.syllableCount !== 0 ? form.syllables?.length ?? 0 : 0;
  };
  const offset = realizedCount("prefix"), suffixCount = realizedCount("suffix");
  assert.equal(word.lexical.rootSyllableStart, offset);
  assert.deepEqual(pattern.assembly, { rootSyllableStart: offset, prefixSyllables: offset, suffixSyllables: suffixCount });
  marks = [...Array<StressMark>(offset).fill("unmarked"), ...marks, ...Array<StressMark>(suffixCount).fill("unmarked")];
  origins = [...Array.from({ length: offset }, (): StressOrigin => ({ kind: "unmarked" })), ...origins, ...Array.from({ length: suffixCount }, (): StressOrigin => ({ kind: "unmarked" }))];
  coordinates = "word";
  const roles = (["prefix", "suffix"] as const).filter(role => realization?.[role]);
  assert.deepEqual(pattern.morphology.map(effect => effect.role), roles);
  for (const [id, effect] of pattern.morphology.entries()) {
    const indices = Array.from({ length: realizedCount(effect.role) }, (_, index) => effect.role === "prefix" ? index : offset + pattern.rootSyllableCount + index);
    assert.equal(effect.id, id);
    assert.deepEqual(effect.syllableIndices, indices);
    const status = indices.length === 0 ? "no-realized-syllables" : effect.effect === "none" ? "none" : effect.effect === "attract-preceding" && effect.role === "prefix" ? "prefix-attraction-not-applied" : effect.effect === "attract-preceding" && indices[0] === 0 ? "no-preceding-syllable" : "applied";
    assert.equal(effect.status, status);
    const startEvent = eventIndex;
    if (status === "applied") {
      if (effect.effect === "secondary") assignment(indices[0], "secondary", { kind: "morphology", effectId: id, action: "affix-secondary" });
      else {
        assert.ok(effect.effect === "primary" || effect.effect === "attract-preceding");
        for (let index = 0; index < marks.length; index++) if (marks[index] === "primary") assignment(index, "secondary", { kind: "morphology", effectId: id, action: "demote-primary" });
        assignment(effect.effect === "primary" ? indices[0] : indices[0] - 1, "primary", { kind: "morphology", effectId: id, action: effect.effect === "primary" ? "affix-primary" : "preceding-primary" });
      }
    }
    assert.deepEqual(effect.eventIds, Array.from({ length: eventIndex - startEvent }, (_, index) => startEvent + index));
  }
  snapshot(assembled); snapshot(lexical); snapshot(surface);
  assert.equal(pattern.events.length, eventIndex, "Extra assignment event");
}

/** Check declared decisions against the pinned default config, without weighing affix/surface domains. */
export function validateConfiguration(word: Word, config: import("../../../../src/config/language.js").LanguageConfig): void {
  const pattern = word.trace!.stressPattern!;
  const rules = config.pronunciation.stress;
  assert.equal(pattern.primary.strategy, rules.primary.type);
  const primary = rules.primary;
  let expectedDraws = 0;
  if (pattern.rootSyllableCount > 1) {
    if (primary.type === "weight-sensitive") expectedDraws = 1;
    if (primary.type === "ot" && primary.otConfig.noise) {
      const registered = new Set(["WSP", "ALIGN-LEFT", "ALIGN-RIGHT", "NONFINALITY", "NONINITIAL"]);
      expectedDraws = 2 * primary.otConfig.constraints.filter(constraint => registered.has(constraint.name)).length;
    }
  }
  assert.equal(pattern.primary.draws.length, expectedDraws, "Primary executed draw count differs from pinned policy");
  for (const field of ["enabled", "candidateWindow", "probability"] as const) assert.equal(pattern.explicitSecondary[field], rules.secondary[field]);
  for (const field of ["enabled", "probability", "requireUnstressedNeighbors"] as const) assert.equal(pattern.rhythmic[field], rules.rhythmic[field]);
  for (const candidate of pattern.explicitSecondary.candidates) {
    const heavy = word.trace!.stressWeight!.syllables[candidate.syllableIndex].operational.weight === "heavy";
    assert.equal(candidate.weight, heavy ? rules.secondary.heavyWeight : rules.secondary.lightWeight);
  }
  for (const effect of pattern.morphology) {
    const planned = word.trace!.morphology!.realization![effect.role]!.planned;
    const pool = effect.role === "prefix" ? config.morphology!.prefixes : config.morphology!.suffixes;
    const sameForm = (affix: typeof pool[number]) => affix.written === planned.written && affix.syllableCount === planned.syllableCount && JSON.stringify(affix.phonemes) === JSON.stringify(planned.phonemes) && isDeepStrictEqual(affix.syllables, planned.syllables);
    const effects = new Set(pool.filter(sameForm).map(affix => affix.stressEffect));
    assert.equal(effects.size, 1, "Pinned configured form has missing/ambiguous stress effect");
    assert.ok(effects.has(effect.effect), "Affix effect differs from pinned config");
  }
}
