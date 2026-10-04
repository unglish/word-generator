import type { Phoneme, Syllable } from "../types.js";
import type { PrimaryStressRules } from "../config/language.js";

/** Model-qualified phonological contribution, not a prediction of duration. */
export interface NuclearQuantity {
  analysis: string;
  moras: 1 | 2;
}

export type SyllableWeightPolicy =
  | { type: "legacy-segment-count" }
  | {
      type: "moraic";
      analysis: string;
      coda: "weight-by-position" | "nonmoraic";
      unknown: "legacy-segment-count" | "error";
    };

export const LEGACY_SYLLABLE_WEIGHT: SyllableWeightPolicy = { type: "legacy-segment-count" };

export interface NuclearQuantityObservation {
  segmentIndex: number;
  sound: string;
  declared?: NuclearQuantity;
  quantity:
    | { status: "known"; moras: 1 | 2 }
    | { status: "unknown"; reason: "unspecified" | "model-mismatch" | "legacy-policy" };
}

export interface SyllableWeightAnalysis {
  syllableIndex: number;
  nucleus: NuclearQuantityObservation[];
  /** Exact sum only when every contribution belongs to the selected model. */
  nucleusMoras: number | null;
  coda: string[];
  analytical: {
    weight: "light" | "heavy" | "unknown";
    basis: "nuclear-quantity" | "weight-by-position" | "unspecified-quantity" | "empty-nucleus" | "legacy-policy";
  };
  operational: {
    weight: "light" | "heavy";
    basis: "legacy-rule" | "moraic-analysis" | "legacy-fallback";
  };
}

export interface StressWeightTrace {
  version: 1;
  stage: "applyStress";
  domain: "root-before-nucleus-repair";
  policy: SyllableWeightPolicy;
  syllables: SyllableWeightAnalysis[];
  primary: { strategy: PrimaryStressRules["type"]; selectedIndex: number | null };
  secondary: {
    /** Candidate choice and application before the separate rhythmic pass. */
    candidates: Array<{ syllableIndex: number; weight: number }>;
    selectedIndex: number | null;
    applied: boolean;
  };
}

function observeQuantity(phone: Phoneme, segmentIndex: number, policy: SyllableWeightPolicy): NuclearQuantityObservation {
  const declared = phone.nuclearQuantity ? { ...phone.nuclearQuantity } : undefined;
  let quantity: NuclearQuantityObservation["quantity"];
  if (!declared) quantity = { status: "unknown", reason: "unspecified" };
  else if (policy.type === "legacy-segment-count") quantity = { status: "unknown", reason: "legacy-policy" };
  else if (declared.analysis !== policy.analysis) quantity = { status: "unknown", reason: "model-mismatch" };
  else quantity = { status: "known", moras: declared.moras };
  return { segmentIndex, sound: phone.sound, declared, quantity };
}

function analyticalWeight(
  syllable: Syllable,
  policy: SyllableWeightPolicy,
  knownMoras: number,
  complete: boolean,
): SyllableWeightAnalysis["analytical"] {
  if (policy.type === "legacy-segment-count") return { weight: "unknown", basis: "legacy-policy" };
  if (syllable.nucleus.length === 0) return { weight: "unknown", basis: "empty-nucleus" };
  if (syllable.coda.length > 0 && policy.coda === "weight-by-position") return { weight: "heavy", basis: "weight-by-position" };
  if (knownMoras >= 2) return { weight: "heavy", basis: "nuclear-quantity" };
  if (complete) return { weight: "light", basis: "nuclear-quantity" };
  return { weight: "unknown", basis: "unspecified-quantity" };
}

function operationalWeight(
  syllable: Syllable,
  syllableIndex: number,
  policy: SyllableWeightPolicy,
  analytical: SyllableWeightAnalysis["analytical"],
): SyllableWeightAnalysis["operational"] {
  const legacyWeight = syllable.coda.length > 0 || syllable.nucleus.length > 1 ? "heavy" : "light";
  if (policy.type === "legacy-segment-count") return { weight: legacyWeight, basis: "legacy-rule" };
  if (analytical.weight !== "unknown") return { weight: analytical.weight, basis: "moraic-analysis" };
  if (policy.unknown === "legacy-segment-count") return { weight: legacyWeight, basis: "legacy-fallback" };
  throw new Error(`Unknown syllable weight in analysis "${policy.analysis}" at syllable ${syllableIndex}: ${analytical.basis}`);
}

export function analyzeSyllableWeight(
  syllable: Syllable,
  syllableIndex: number,
  policy: SyllableWeightPolicy = LEGACY_SYLLABLE_WEIGHT,
): SyllableWeightAnalysis {
  const nucleus = syllable.nucleus.map((phone, index) => observeQuantity(phone, index, policy));
  const knownMoras = nucleus.reduce((total, item) => total + (item.quantity.status === "known" ? item.quantity.moras : 0), 0);
  const complete = nucleus.length > 0 && nucleus.every(item => item.quantity.status === "known");
  const nucleusMoras = complete ? knownMoras : null;
  const analytical = analyticalWeight(syllable, policy, knownMoras, complete);
  const operational = operationalWeight(syllable, syllableIndex, policy, analytical);

  return { syllableIndex, nucleus, nucleusMoras, coda: syllable.coda.map(phone => phone.sound), analytical, operational };
}

export function analyzeWordWeight(
  syllables: Syllable[],
  policy: SyllableWeightPolicy = LEGACY_SYLLABLE_WEIGHT,
): SyllableWeightAnalysis[] {
  return syllables.map((syllable, index) => analyzeSyllableWeight(syllable, index, policy));
}
