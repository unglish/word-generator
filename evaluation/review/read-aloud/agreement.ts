import { digest } from "../snapshot.js";
import { makeTarget, validatePronunciationPolicy } from "../auditory/targets.js";
import type { PronunciationPolicy, PronunciationTarget } from "../auditory/model.js";
import { validateReadingTranscription } from "./coding.js";
import type { ReadAloudDraw, ReadingSyllable, ReadingTranscription } from "./model.js";

export interface DrawAgreement {
  source_available: boolean;
  phones_available: boolean;
  phones_and_stress_available: boolean;
  intended_phones: boolean | null;
  intended_phones_and_stress: boolean | null;
  accepted_phones: boolean | null;
  accepted_phones_and_stress: boolean | null;
}
function phones(syllables: ReadingSyllable[]): string[] { return syllables.flatMap(syllable => syllable.phones); }
function phoneMatch(observed: ReadingSyllable[], target: PronunciationTarget): boolean {
  return digest(phones(observed)) === digest(phones(target.syllables));
}
function stressMatch(observed: ReadingSyllable[], target: PronunciationTarget): boolean {
  return digest(observed.map(syllable => ({ phones: syllable.phones, stress: syllable.stress }))) === digest(target.syllables);
}

export function assessDrawAgreement(policy: PronunciationPolicy, draw: ReadAloudDraw, observed: ReadingTranscription | null): DrawAgreement {
  validatePronunciationPolicy(policy);
  if (observed !== null) validateReadingTranscription(policy, observed);
  const declared = [...draw.alternatives];
  if (draw.intended.status === "resolved") declared.push(draw.intended.target);
  else if (declared.length) throw new Error("Unresolved source cannot acquire accepted alternatives.");
  for (const target of declared) {
    if (digest(makeTarget(policy, target.syllables)) !== digest(target)) throw new Error("Agreement target or dialect policy changed.");
  }
  const sourceAvailable = draw.intended.status === "resolved";
  const syllables = observed?.status === "transcribed" ? observed.syllables : null;
  const phonesAvailable = sourceAvailable && syllables !== null;
  const stressAvailable = phonesAvailable && !syllables!.some(syllable => syllable.stress === "unknown");
  const result: DrawAgreement = { source_available: sourceAvailable, phones_available: phonesAvailable,
    phones_and_stress_available: stressAvailable, intended_phones: null, intended_phones_and_stress: null,
    accepted_phones: null, accepted_phones_and_stress: null };
  if (draw.intended.status !== "resolved" || !syllables) return result;
  const targets = [draw.intended.target, ...draw.alternatives];
  result.intended_phones = phoneMatch(syllables, draw.intended.target);
  result.accepted_phones = targets.some(target => phoneMatch(syllables, target));
  if (stressAvailable) {
    result.intended_phones_and_stress = stressMatch(syllables, draw.intended.target);
    result.accepted_phones_and_stress = targets.some(target => stressMatch(syllables, target));
  }
  return result;
}
