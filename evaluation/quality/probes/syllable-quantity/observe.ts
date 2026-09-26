import assert from "node:assert/strict";
import type { Word } from "../../../../src/types.js";
import type { SyllableWeightAnalysis } from "../../../../src/index.js";
import type { Json } from "../../serialization.js";

export const analysisName = "english-legacy-partial-quantity-v1";
export const quantities = new Map<string, 1 | 2>([
  ["eɪ", 2], ["aɪ", 2], ["əʊ", 2], ["ɔɪ", 2], ["aʊ", 2],
  ["ɪ", 1], ["ɛ", 1], ["æ", 1], ["ʊ", 1], ["ʌ", 1], ["ə", 1],
]);
export const unspecified = new Set(["i:", "u", "ɑ", "ɔ", "ɚ", "ɜ"]);
const diphthongs = [...quantities].filter(([, quantity]) => quantity === 2).map(([sound]) => sound);
export const activePolicy = { type: "moraic", analysis: analysisName, coda: "weight-by-position", unknown: "legacy-segment-count" } as const;
export type Mode = "original" | "control" | "candidate";
type Counts = Record<string, number>;

interface DiphthongCount {
  eligible: number;
  light: number | null;
  heavy: number | null;
  primarySelected: number | null;
  secondaryCandidate: number | null;
  secondarySelected: number | null;
}

interface ContextCount {
  morphology: "bare" | "affixed";
  rootSyllables: number;
  position: "isolated" | "initial" | "medial" | "final";
  sounds: string[];
  closed: boolean;
  syllables: number;
  quantity: Counts;
  analytical: Counts;
  operational: Counts;
  decisionMarks: Counts;
}

export interface QuantityObservation {
  mode: Mode;
  words: number;
  rootSyllables: number;
  nuclearSegments: number;
  unavailableDecisionWords: number;
  quantity: Counts;
  analytical: Counts;
  operational: Counts;
  legacyDisagreements: number;
  openDiphthongs: Record<string, DiphthongCount>;
  secondaryCandidates: number;
  secondaryAppliedWords: number;
  multisyllabicRoots: number;
  primarySecondaryDecisionClashes: number;
  primaryWindow: { eligible: number; outsideFinalThree: number };
  finalStressCheckedWords: number;
  finalStressUnavailableWords: number;
  contexts: Record<string, ContextCount>;
  patterns: Record<string, { morphology: "bare" | "affixed"; weights: string[]; words: number; primaryPositions: Counts }>;
  witnesses: Array<{ kind: string; draw: number; word: Word }>;
}

export function emptyQuantityObservation(mode: Mode): QuantityObservation {
  const available = mode === "original" ? null : 0;
  return {
    mode, words: 0, rootSyllables: 0, nuclearSegments: 0, unavailableDecisionWords: 0,
    quantity: {}, analytical: {}, operational: {}, legacyDisagreements: 0,
    openDiphthongs: Object.fromEntries(diphthongs.map(sound => [sound, { eligible: 0, light: available, heavy: available, primarySelected: available, secondaryCandidate: available, secondarySelected: available }])),
    secondaryCandidates: 0, secondaryAppliedWords: 0, multisyllabicRoots: 0, primarySecondaryDecisionClashes: 0,
    primaryWindow: { eligible: 0, outsideFinalThree: 0 }, finalStressCheckedWords: 0, finalStressUnavailableWords: 0,
    contexts: {}, patterns: {}, witnesses: [],
  };
}

const count = (counts: Counts, key: string, amount = 1): void => { counts[key] = (counts[key] ?? 0) + amount; };
const legacyWeight = (nucleus: string[], coda: string[]): "heavy" | "light" => coda.length > 0 || nucleus.length > 1 ? "heavy" : "light";

function positionAt(index: number, length: number): ContextCount["position"] {
  if (length === 1) return "isolated";
  if (index === 0) return "initial";
  return index === length - 1 ? "final" : "medial";
}

/** Independent arithmetic for the preregistered model; does not call the runtime analyzer. */
function checkWeight(syllable: SyllableWeightAnalysis, mode: "control" | "candidate"): void {
  let knownMoras = 0;
  let complete = syllable.nucleus.length > 0;
  for (const [index, phone] of syllable.nucleus.entries()) {
    assert.equal(phone.segmentIndex, index);
    assert.ok(quantities.has(phone.sound) || unspecified.has(phone.sound), `Unexpected nucleus ${phone.sound}`);
    const quantity = mode === "candidate" ? quantities.get(phone.sound) : undefined;
    if (quantity !== undefined) {
      assert.deepEqual(phone.declared, { analysis: analysisName, moras: quantity });
      assert.deepEqual(phone.quantity, { status: "known", moras: quantity });
      knownMoras += quantity;
    } else {
      assert.equal(phone.declared, undefined);
      assert.deepEqual(phone.quantity, { status: "unknown", reason: "unspecified" });
      complete = false;
    }
  }
  assert.equal(syllable.nucleusMoras, complete ? knownMoras : null);
  let analytical: SyllableWeightAnalysis["analytical"];
  if (mode === "control") analytical = { weight: "unknown", basis: "legacy-policy" };
  else if (syllable.nucleus.length === 0) analytical = { weight: "unknown", basis: "empty-nucleus" };
  else if (syllable.coda.length > 0) analytical = { weight: "heavy", basis: "weight-by-position" };
  else if (knownMoras >= 2) analytical = { weight: "heavy", basis: "nuclear-quantity" };
  else if (complete) analytical = { weight: "light", basis: "nuclear-quantity" };
  else analytical = { weight: "unknown", basis: "unspecified-quantity" };
  assert.deepEqual(syllable.analytical, analytical);
  const legacy = legacyWeight(syllable.nucleus.map(phone => phone.sound), syllable.coda);
  let operational: SyllableWeightAnalysis["operational"];
  if (mode === "control") operational = { weight: legacy, basis: "legacy-rule" };
  else if (analytical.weight === "unknown") operational = { weight: legacy, basis: "legacy-fallback" };
  else operational = { weight: analytical.weight, basis: "moraic-analysis" };
  assert.deepEqual(syllable.operational, operational);
}

function retain(result: QuantityObservation, kind: string, draw: number, word: Word): void {
  if (!result.witnesses.some(witness => witness.kind === kind)) result.witnesses.push({ kind, draw, word });
}

export function observeQuantity(word: Word, draw: number, result: QuantityObservation): void {
  const trace = word.trace;
  assert.ok(trace, "Missing trace");
  const stages = trace.stages.filter(stage => stage.name === "applyStress");
  assert.equal(stages.length, 1, "Missing or duplicate root stress stage");
  const syllables = stages[0].before;
  const evidence = trace.stressWeight;
  result.words++;
  result.rootSyllables += syllables.length;
  if (syllables.length > 1) result.multisyllabicRoots++;
  const morphology = trace.morphology?.prefix || trace.morphology?.suffix ? "affixed" : "bare";
  if (result.mode === "original") {
    assert.equal(evidence, undefined);
    result.unavailableDecisionWords++;
  } else {
    assert.ok(evidence, "Missing shared weight evidence");
    assert.equal(evidence.version, 1);
    assert.equal(evidence.domain, "root-before-nucleus-repair");
    assert.equal(evidence.stage, "applyStress");
    assert.deepEqual(evidence.policy, result.mode === "candidate" ? activePolicy : { type: "legacy-segment-count" });
    assert.equal(evidence.syllables.length, syllables.length);
    assert.equal(evidence.primary.strategy, "ot");
  }
  for (const [index, shape] of syllables.entries()) {
    result.nuclearSegments += shape.nucleus.length;
    const position = positionAt(index, syllables.length);
    const axis = { morphology, rootSyllables: syllables.length, position, sounds: shape.nucleus, closed: shape.coda.length > 0 } as const;
    const context = result.contexts[JSON.stringify(axis)] ??= { ...axis, syllables: 0, quantity: {}, analytical: {}, operational: {}, decisionMarks: {} };
    context.syllables++;
    const openDiphthong = shape.coda.length === 0 && shape.nucleus.length === 1 && diphthongs.includes(shape.nucleus[0]);
    const vowel = openDiphthong ? result.openDiphthongs[shape.nucleus[0]] : undefined;
    if (vowel) vowel.eligible++;
    if (!evidence) {
      count(result.quantity, "unavailable", shape.nucleus.length);
      count(context.quantity, "unavailable", shape.nucleus.length);
      count(context.decisionMarks, "unavailable");
      if (openDiphthong) retain(result, "historical-open-diphthong", draw, word);
      continue;
    }
    const observation = evidence.syllables[index];
    assert.equal(observation.syllableIndex, index);
    assert.deepEqual(observation.nucleus.map(phone => phone.sound), shape.nucleus);
    assert.deepEqual(observation.coda, shape.coda);
    checkWeight(observation, result.mode === "candidate" ? "candidate" : "control");
    for (const phone of observation.nucleus) {
      const category = phone.quantity.status === "known" ? `known:${phone.quantity.moras}` : `unknown:${phone.quantity.reason}`;
      count(result.quantity, category);
      count(context.quantity, category);
    }
    const analytical = `${observation.analytical.weight}:${observation.analytical.basis}`;
    const operational = `${observation.operational.weight}:${observation.operational.basis}`;
    count(result.analytical, analytical); count(context.analytical, analytical);
    count(result.operational, operational); count(context.operational, operational);
    const primary = evidence.primary.selectedIndex === index;
    const secondary = evidence.secondary.applied && evidence.secondary.selectedIndex === index;
    let mark = "unmarked";
    if (primary) mark = "primary";
    else if (secondary) mark = "secondary";
    count(context.decisionMarks, mark);
    const changed = observation.operational.weight !== legacyWeight(shape.nucleus, shape.coda);
    assert.equal(changed, result.mode === "candidate" && openDiphthong, "Operational change outside the registered context");
    if (changed) result.legacyDisagreements++;
    if (vowel) {
      if (observation.operational.weight === "heavy") vowel.heavy!++;
      else vowel.light!++;
      if (primary) vowel.primarySelected!++;
      if (evidence.secondary.candidates.some(candidate => candidate.syllableIndex === index)) vowel.secondaryCandidate!++;
      if (secondary) vowel.secondarySelected!++;
      retain(result, `open-${shape.nucleus[0]}`, draw, word);
    }
    if (observation.operational.basis === "legacy-fallback") retain(result, "explicit-unknown-fallback", draw, word);
  }
  if (!evidence) return;
  const primary = evidence.primary.selectedIndex;
  if (syllables.length <= 1) assert.equal(primary, null);
  else assert.ok(primary !== null && Number.isInteger(primary) && primary >= 0 && primary < syllables.length);
  const indices = evidence.secondary.candidates.map(candidate => candidate.syllableIndex);
  assert.deepEqual(indices, primary === null ? [] : [0, 1, 2].filter(index => index < syllables.length && index !== primary));
  for (const candidate of evidence.secondary.candidates) assert.equal(candidate.weight, evidence.syllables[candidate.syllableIndex].operational.weight === "heavy" ? 70 : 30);
  result.secondaryCandidates += indices.length;
  if (evidence.secondary.selectedIndex === null) assert.equal(indices.length, 0);
  else assert.ok(indices.includes(evidence.secondary.selectedIndex));
  if (evidence.secondary.applied) {
    assert.notEqual(evidence.secondary.selectedIndex, null);
    assert.notEqual(primary, null);
    result.secondaryAppliedWords++;
    if (Math.abs(evidence.secondary.selectedIndex! - primary!) === 1) result.primarySecondaryDecisionClashes++;
  }
  if (syllables.length >= 4 && primary !== null) {
    result.primaryWindow.eligible++;
    if (primary < syllables.length - 3) result.primaryWindow.outsideFinalThree++;
  }
  const weights = evidence.syllables.map(syllable => syllable.operational.weight);
  const pattern = result.patterns[JSON.stringify({ morphology, weights })] ??= { morphology, weights, words: 0, primaryPositions: {} };
  pattern.words++;
  count(pattern.primaryPositions, primary === null ? "unmarked" : String(primary));
  if (morphology === "affixed") result.finalStressUnavailableWords++;
  else {
    assert.equal(word.syllables.length, syllables.length);
    const finalPrimary = word.syllables.findIndex(syllable => syllable.stress === "ˈ");
    assert.equal(primary, finalPrimary < 0 ? null : finalPrimary);
    if (evidence.secondary.applied) assert.equal(word.syllables[evidence.secondary.selectedIndex!].stress, "ˌ");
    result.finalStressCheckedWords++;
  }
}

export function reconcileQuantity(result: QuantityObservation): void {
  const sum = (counts: Counts): number => {
    assert.ok(Object.values(counts).every(value => Number.isSafeInteger(value) && value >= 0));
    return Object.values(counts).reduce((a, b) => a + b, 0);
  };
  assert.equal(sum(result.quantity), result.nuclearSegments);
  assert.equal(Object.values(result.contexts).reduce((total, context) => total + context.syllables, 0), result.rootSyllables);
  if (result.mode === "original") {
    assert.equal(result.unavailableDecisionWords, result.words);
    assert.equal(sum(result.analytical), 0);
  } else {
    assert.equal(result.unavailableDecisionWords, 0);
    assert.equal(sum(result.analytical), result.rootSyllables);
    assert.equal(sum(result.operational), result.rootSyllables);
    assert.equal(result.finalStressCheckedWords + result.finalStressUnavailableWords, result.words);
    const eligible = Object.values(result.openDiphthongs).reduce((total, vowel) => total + vowel.eligible, 0);
    assert.equal(result.legacyDisagreements, result.mode === "candidate" ? eligible : 0);
    for (const vowel of Object.values(result.openDiphthongs)) {
      assert.equal(vowel.heavy! + vowel.light!, vowel.eligible);
      assert.equal(result.mode === "candidate" ? vowel.light : vowel.heavy, 0);
    }
  }
}

/** Compare the complete serialized config after removing only the registered additions. */
export function verifyActivationConfig(control: Json, candidate: Json): void {
  const original = control as Record<string, Json>;
  const active = candidate as Record<string, Json>;
  const stress = (active.pronunciation as Record<string, Json>).stress as Record<string, Json>;
  assert.deepEqual(stress.syllableWeight, activePolicy);
  for (const item of active.phonemes as Json[]) {
    const phone = item as Record<string, Json>;
    const quantity = quantities.get(phone.sound as string);
    assert.deepEqual(phone.nuclearQuantity, quantity === undefined ? undefined : { analysis: analysisName, moras: quantity });
  }
  const strip = (value: Json, path: string[] = []): Json => {
    if (Array.isArray(value)) return value.map((item, index) => strip(item, [...path, String(index)]));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "nuclearQuantity" && !(key === "syllableWeight" && path.join(".") === "pronunciation.stress")).map(([key, item]) => [key, strip(item, [...path, key])]));
  };
  assert.deepEqual(strip(active), original, "Configuration changed beyond quantity data and weight policy");
}
