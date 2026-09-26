import type { Phoneme } from "../types.js";
import type { DoublingConfig } from "../config/language.js";
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

export function createDoublingModel(config: DoublingConfig | undefined) {
  const enabled = !!config?.enabled;
  const neverDoubleSet = new Set(config?.neverDouble ?? []);
  const doubledFormSet = new Set(Object.values(config?.doubledForms ?? {}));
  const doubledFormLookup = config?.doubledForms ?? {};
  function describe(slot: DoublingSlot, doublingCount: number): DoublingDecision {
    if (!enabled || !config) return { kind: "fixed", form: slot.form, reason: "disabled", countIncrement: 0 };
    const {
      form, phoneme, position, prevPhoneme, nextNucleus, nucleusForm,
      stress, prevReduced, isCluster, isFirstInCoda,
      isLastPhoneme, isEndOfWord, isMonosyllabic, nextIsConsonant,
    } = slot;

    const skip = (reason: string, countIncrement = 0): DoublingDecision => ({ kind: "fixed", form, reason, countIncrement });

    if (!prevPhoneme) return skip("no-prev-phoneme");

    // Allow doubling for the first consonant in a coda cluster ONLY if it has a custom
    // doubledForm (e.g. k→ck in "backs"), not a simple letter repeat (p→pp).
    // Simple repeats before more coda consonants create impossible clusters: ppt, nnd, ddz, ggz.
    if (isCluster) {
      if (position === "coda" && isFirstInCoda && doubledFormLookup[form]) {
        // Custom doubled form like k→ck is fine in clusters (e.g. "cks")
      } else {
        return skip("in-cluster");
      }
    }

    // Suppress doubling when a coda consonant is followed by another consonant (onset of next syllable).
    // Doubling here creates impossible cross-syllable clusters: "nn" + "t" → "nnt", "ll" + "d" → "lld".
    if (position === "coda" && nextIsConsonant) return skip("coda-before-consonant");

    if (form.length !== 1) {
      // Directly selected doubled forms count only after the preceding eligibility guards.
      return skip("multi-char-grapheme", doubledFormSet.has(form) ? 1 : 0);
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

    // Calculate probability
    let prob = config.probability;
    // Monosyllables are inherently stressed even without a ˈ marker.
    // Only apply unstressed modifier to genuinely unstressed syllables in polysyllabic words.
    if (config.unstressedModifier != null && !stress && !isMonosyllabic) {
      prob *= config.unstressedModifier;
    }
    prob = Math.min(100, Math.max(0, Math.round(prob)));
    if (prob <= 0) return skip("zero-probability:unstressed");

    return { kind: "probabilistic", form, probability: prob, doubledForm: doubledFormLookup[form] ?? (form + form) };
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
  return { describe, sample };
}
