import type { Phoneme, Grapheme, GraphemeReading } from "../types.js";
import type { DoublingConfig, DoublingRealization } from "../config/language.js";
import type { RNG } from "../utils/random.js";
import { VOWEL_LETTERS } from "../utils/letters.js";

export interface DoublingState {
  doublingCount: number;
}

export interface DoublingTraceInfo {
  attempted: boolean;
  reason?: string;
  probability?: number;
  result?: string;
}

/** Per-phoneme context for the doubling decision. */
export interface DoublingSlot {
  form: string;
  phoneme: Phoneme;
  position: "onset" | "nucleus" | "coda";
  prevPhoneme?: Phoneme;
  nextNucleus?: Phoneme;
  nucleusForm: string;
  stress?: string;
  prevReduced: boolean;
  isCluster: boolean;
  isFirstInCoda: boolean;
  isLastPhoneme: boolean;
  isEndOfWord: boolean;
  isMonosyllabic: boolean;
  nextIsConsonant: boolean;
}

/** Pure transition description; probability is present exactly when the sampler draws. */
export type DoublingDecision =
  | { kind: "fixed"; form: string; reason: string; countIncrement: number }
  | { kind: "probabilistic"; form: string; probability: number; doubledForm: string };

function copyReading(reading: GraphemeReading): GraphemeReading {
  if (reading.kind !== "following-letter") return { ...reading };
  return { ...reading, ...(reading.require ? { require: [...reading.require] } : {}),
    ...(reading.forbid ? { forbid: [...reading.forbid] } : {}) };
}

function validReading(reading: GraphemeReading): boolean {
  if (!reading || typeof reading !== "object") return false;
  switch (reading.kind) {
  case "single-phone":
  case "open-vowel-or-split-marker": return true;
  case "unsupported-construction": return typeof reading.reason === "string";
  case "following-letter": return [reading.require, reading.forbid].every(letters =>
    letters === undefined || (Array.isArray(letters) && letters.every(letter => typeof letter === "string" && letter.length === 1)));
  default: return false;
  }
}

function realizationLookup(rules: readonly DoublingRealization[] | undefined) {
  if (rules === undefined) return undefined;
  const lookup = new Map<string, Map<string, DoublingRealization>>();
  for (const rule of rules) {
    if (typeof rule.phoneme !== "string" || !rule.phoneme || typeof rule.from !== "string" || rule.from.length !== 1 ||
        typeof rule.to !== "string" || rule.to.length < 2 || lookup.get(rule.phoneme)?.has(rule.from) || !validReading(rule.reading) ||
        (rule.allowInCodaCluster !== undefined && typeof rule.allowInCodaCluster !== "boolean")) {
      throw new Error("Invalid or duplicate doubling realization");
    }
    const forms = lookup.get(rule.phoneme) ?? new Map<string, DoublingRealization>();
    forms.set(rule.from, { ...rule, reading: copyReading(rule.reading) });
    lookup.set(rule.phoneme, forms);
  }
  return lookup;
}

export function createDoublingModel(config: DoublingConfig | undefined) {
  const enabled = !!config?.enabled;
  const realizations = realizationLookup(config?.realizations);
  const directForms = new Map<string, Set<string>>();
  for (const [sound, forms] of realizations ?? []) {
    directForms.set(sound, new Set([...forms.values()].map(rule => rule.to)));
  }

  /** Reading of the realized unit, independently of the selected spelling's obligation. */
  function readingFor(grapheme: Grapheme, realized: string): GraphemeReading | undefined {
    if (!realizations || realized === grapheme.form) return grapheme.reading;
    const rule = realizations.get(grapheme.phoneme)?.get(grapheme.form);
    return rule?.to === realized ? copyReading(rule.reading) : undefined;
  }
  const neverDoubleSet = new Set(config?.neverDouble ?? []);
  const doubledFormSet = new Set(Object.values(config?.doubledForms ?? {}));
  const doubledFormLookup = config?.doubledForms ?? {};
  const hasDirectForms = realizations ? directForms.size > 0 : doubledFormSet.size > 0;
  function isDirectForm(sound: string, form: string): boolean {
    return realizations ? !!directForms.get(sound)?.has(form) : doubledFormSet.has(form);
  }
  function describe(slot: DoublingSlot, doublingCount: number): DoublingDecision {
    if (!enabled || !config) return { kind: "fixed", form: slot.form, reason: "disabled", countIncrement: 0 };
    const {
      form, phoneme, position, prevPhoneme, nextNucleus, nucleusForm,
      stress, prevReduced, isCluster, isFirstInCoda,
      isLastPhoneme, isEndOfWord, isMonosyllabic, nextIsConsonant,
    } = slot;

    const skip = (reason: string, countIncrement = 0): DoublingDecision => ({ kind: "fixed", form, reason, countIncrement });

    if (!prevPhoneme) return skip("no-prev-phoneme");
    const realization = realizations?.get(phoneme.sound)?.get(form);
    const clusterAllowed = realizations ? realization?.allowInCodaCluster : !!doubledFormLookup[form];

    // Only explicitly permitted spellings (legacy: custom overrides) enter coda clusters.
    if (isCluster && !(position === "coda" && isFirstInCoda && clusterAllowed)) return skip("in-cluster");

    // Suppress doubling when a coda consonant is followed by another consonant (onset of next syllable).
    // Doubling here creates impossible cross-syllable clusters: "nn" + "t" → "nnt", "ll" + "d" → "lld".
    if (position === "coda" && nextIsConsonant) return skip("coda-before-consonant");

    if (form.length !== 1) {
      // Directly selected doubled forms count only after the preceding eligibility guards.
      return skip("multi-char-grapheme", isDirectForm(phoneme.sound, form) ? 1 : 0);
    }
    if (position !== "onset" && position !== "coda") return skip("nucleus-position");
    if (doublingCount >= config.maxPerWord) return skip("max-per-word");

    // Phonological trigger
    if (config.trigger === "lax-vowel") {
      const isAfterVowel = prevPhoneme.nucleus != null && prevPhoneme.nucleus > 0;
      const isLax = prevPhoneme.tense === false;
      if (!isAfterVowel || !isLax) return skip("trigger:not-after-lax-vowel");
    }

    // Doubling signals "short vowel" to the reader — but only works when the
    // nucleus *looks like* a vowel on the page. Vowel graphemes that end in a
    // consonant letter (e.g. /ɚ/ → "er"/"or"/"ur") break the visual signal:
    // "erss" reads as a consonant pileup, not doubled-after-short-vowel.
    // Empty on first-syllable onset (no preceding nucleus) — the lax-vowel
    // trigger above already rejects that case.
    if (nucleusForm.length > 0) {
      const lastNucleusChar = nucleusForm[nucleusForm.length - 1].toLowerCase();
      if (!VOWEL_LETTERS.has(lastNucleusChar)) return skip("nucleus-ends-consonant-letter");
    }

    // neverDoubleFinal — suppress word-final doubling for specific sounds
    if (isEndOfWord && isLastPhoneme && config.neverDoubleFinal?.includes(phoneme.sound)) return skip("never-double-final");

    // neverDouble — check both phoneme sound and grapheme form
    if (neverDoubleSet.has(phoneme.sound)) return skip("never-double:sound");
    if (neverDoubleSet.has(form)) return skip("never-double:form");

    // finalDoublingOnly
    if (isEndOfWord && config.finalDoublingOnly && config.finalDoublingOnly.length > 0) {
      if (!config.finalDoublingOnly.includes(phoneme.sound)) return skip("final-doubling-only");
    }

    // suppressAfterReduction
    if (config.suppressAfterReduction && prevReduced) return skip("suppress-after-reduction");

    // suppressBeforeTense
    if (config.suppressBeforeTense && nextNucleus) {
      if (nextNucleus.tense === true) return skip("suppress-before-tense");
    }

    if (realizations && !realization) return skip("unsupported-realization");

    // Calculate probability
    let prob = config.probability;
    // Monosyllables are inherently stressed even without a ˈ marker.
    // Only apply unstressed modifier to genuinely unstressed syllables in polysyllabic words.
    if (config.unstressedModifier != null && !stress && !isMonosyllabic) {
      prob *= config.unstressedModifier;
    }
    prob = Math.min(100, Math.max(0, Math.round(prob)));
    if (prob <= 0) return skip("zero-probability:unstressed");

    return { kind: "probabilistic", form, probability: prob, doubledForm: realization?.to ?? doubledFormLookup[form] ?? (form + form) };
  }

  function sample(slot: DoublingSlot, state: DoublingState, rand: RNG, trace?: DoublingTraceInfo): string {
    const decision = describe(slot, state.doublingCount);
    if (decision.kind === "fixed") {
      state.doublingCount += decision.countIncrement;
      if (trace) { trace.attempted = false; trace.reason = decision.reason; }
      return decision.form;
    }
    // Keep the legacy draw even at 100%; pure planning never calls this wrapper.
    const shouldDouble = rand() * 100 < decision.probability;
    if (shouldDouble) {
      state.doublingCount++;
      if (trace) { trace.attempted = true; trace.probability = decision.probability; trace.result = decision.doubledForm; }
      return decision.doubledForm;
    }
    if (trace) { trace.attempted = true; trace.probability = decision.probability; trace.reason = "roll-failed"; }
    return decision.form;
  }
  return { describe, sample, readingFor, isDirectForm, hasDirectForms };
}
