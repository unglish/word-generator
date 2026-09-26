import type { WordTrace } from "../../src/core/trace.js";
import type { Syllable, Word } from "../../src/types.js";

export type MetricDenominator = "words" | "polysyllables" | "disyllables" | "monosyllables" | "affixedWords";

export interface MetricDefinition {
  id: string;
  label: string;
  denominator: MetricDenominator;
  interpretation: "invariant" | "diagnostic";
  direction: "lower" | "higher" | "neutral";
  description: string;
}

// These definitions apply to the frozen default-English evaluation protocol.
// Diagnostics describe distributions; their direction is not a universal target.
export const METRIC_DEFINITIONS = [
  {
    id: "polysyllable_missing_primary",
    label: "Polysyllables without primary stress",
    denominator: "polysyllables",
    interpretation: "invariant",
    direction: "lower",
    description: "Final words with two or more syllables and no syllable marked with primary stress.",
  },
  {
    id: "polysyllable_multiple_primary",
    label: "Polysyllables with multiple primary stresses",
    denominator: "polysyllables",
    interpretation: "invariant",
    direction: "lower",
    description: "Final words with two or more syllables and more than one primary stress; the default model generates single lexical words.",
  },
  {
    id: "primary_schwa",
    label: "Words with primary-stressed schwa",
    denominator: "words",
    interpretation: "invariant",
    direction: "lower",
    description: "At least one primary-stressed nucleus contains /ə/, which the default English configuration prohibits.",
  },
  {
    id: "primary_reduced_vowel",
    label: "Words with a primary-stressed reduced vowel",
    denominator: "words",
    interpretation: "invariant",
    direction: "lower",
    description: "At least one primary-stressed nucleus retains reduced: true; this checks agreement between final stress and reduction metadata.",
  },
  {
    id: "morphology_hiatus_bridge",
    label: "Affixed words with a morphological hiatus fallback",
    denominator: "affixedWords",
    interpretation: "diagnostic",
    direction: "lower",
    description: "At least one traced prefix/root or root/suffix hiatus fallback inserted a segment. The baseline inserts /h/; a future licensed glide needs separate interpretation.",
  },
  {
    id: "zero_weight_grapheme_choice",
    label: "Words with a zero-total-weight grapheme choice",
    denominator: "words",
    interpretation: "invariant",
    direction: "lower",
    description: "At least one grapheme decision has multiple weighted candidates whose weights sum to zero; single-candidate shortcuts are excluded.",
  },
  {
    id: "orthography_trace_missing",
    label: "Words missing an orthographic trace",
    denominator: "words",
    interpretation: "invariant",
    direction: "lower",
    description: "The word has a generation trace but lacks the orthography record required to audit its final spelling.",
  },
  {
    id: "orthography_surface_mismatch",
    label: "Words whose orthographic trace differs from the final spelling",
    denominator: "words",
    interpretation: "invariant",
    direction: "lower",
    description: "An existing orthography.surface differs from written.clean. Missing orthography is counted separately; this measures trace consistency, not pronunciation accuracy.",
  },
  {
    id: "adjacent_duplicate_coda",
    label: "Words with adjacent identical coda segments",
    denominator: "words",
    interpretation: "invariant",
    direction: "lower",
    description: "Within any single syllable of the final word, two consecutive coda phonemes have the same sound. Sequences spanning separate syllable objects are excluded.",
  },
  {
    id: "disyllable_stress_clash",
    label: "Disyllables with adjacent primary and secondary stress",
    denominator: "disyllables",
    interpretation: "diagnostic",
    direction: "lower",
    description: "One of exactly two syllables has primary stress and the other secondary stress. English permits exceptions, so zero is not a universal target.",
  },
  {
    id: "monosyllable_schwa",
    label: "Monosyllables with schwa as their sole nucleus",
    denominator: "monosyllables",
    interpretation: "diagnostic",
    direction: "lower",
    description: "The only syllable has exactly one nucleus phoneme, /ə/. Standalone lexical words and weak function-word forms require different expectations.",
  },
  {
    id: "final_open_checked_vowel",
    label: "Words ending in an open checked vowel",
    denominator: "words",
    interpretation: "diagnostic",
    direction: "lower",
    description: "The final syllable has no coda and its sole nucleus is /ɪ ɛ æ ʌ ʊ/. Schwa, rhotic vowels, and internal syllabification are excluded; dialect and word class affect interpretation.",
  },
  {
    id: "monosyllable_foot_vowel",
    label: "Monosyllables containing the FOOT vowel /ʊ/",
    denominator: "monosyllables",
    interpretation: "diagnostic",
    direction: "higher",
    description: "The single syllable contains /ʊ/. This is a coverage probe for its baseline exclusion, not a target of 100%; increases require distributional calibration.",
  },
] as const satisfies readonly MetricDefinition[];

export type MetricId = typeof METRIC_DEFINITIONS[number]["id"];
export type WordObservations = Record<MetricId, boolean>;
export type WordStrata = Record<MetricDenominator, boolean>;

const CHECKED_VOWELS = new Set(["ɪ", "ɛ", "æ", "ʌ", "ʊ"]);

function requireTrace(word: Word): WordTrace {
  if (!word.trace) {
    throw new Error("Linguistic quality metrics require a word generated with trace: true.");
  }
  return word.trace;
}

function hasAppliedAffix(trace: WordTrace): boolean {
  // morphologyApplied also covers a successfully applied "bare" plan.
  const morphology = trace.morphology;
  return trace.summary.morphologyApplied
    && morphology !== undefined
    && morphology.template !== "bare"
    && Boolean(morphology.prefix || morphology.suffix);
}

export function wordStrata(word: Word): WordStrata {
  const trace = requireTrace(word);
  return {
    words: true,
    polysyllables: word.syllables.length > 1,
    disyllables: word.syllables.length === 2,
    monosyllables: word.syllables.length === 1,
    affixedWords: hasAppliedAffix(trace),
  };
}

function hasAdjacentDuplicateCoda(syllable: Syllable): boolean {
  return syllable.coda.some((phoneme, index) => index > 0 && phoneme.sound === syllable.coda[index - 1].sound);
}

function hasDisyllableStressClash(syllables: Syllable[]): boolean {
  return syllables.length === 2
    && syllables.some(syllable => syllable.stress === "ˈ")
    && syllables.some(syllable => syllable.stress === "ˌ");
}

function hasFinalOpenCheckedVowel(syllables: Syllable[]): boolean {
  const last = syllables[syllables.length - 1];
  return last !== undefined
    && last.coda.length === 0
    && last.nucleus.length === 1
    && CHECKED_VOWELS.has(last.nucleus[0].sound);
}

/** Per-word observations: repeated events count once, and ineligible words are false. */
export function classifyWord(word: Word): WordObservations {
  const trace = requireTrace(word);
  const strata = wordStrata(word);
  const primarySyllables = word.syllables.filter(syllable => syllable.stress === "ˈ");
  return {
    polysyllable_missing_primary: strata.polysyllables && primarySyllables.length === 0,
    polysyllable_multiple_primary: strata.polysyllables && primarySyllables.length > 1,
    primary_schwa: primarySyllables.some(syllable => syllable.nucleus.some(phoneme => phoneme.sound === "ə")),
    primary_reduced_vowel: primarySyllables.some(syllable => syllable.nucleus.some(phoneme => phoneme.reduced === true)),
    morphology_hiatus_bridge: strata.affixedWords && trace.structural.some(event =>
      event.event === "morphPrefixHiatusFallback" || event.event === "morphSuffixHiatusFallback"),
    zero_weight_grapheme_choice: trace.graphemeSelections.some(selection =>
      selection.weights.length > 1 && selection.weights.reduce((total, [, weight]) => total + weight, 0) === 0),
    orthography_trace_missing: trace.orthography === undefined,
    orthography_surface_mismatch: trace.orthography !== undefined && trace.orthography.surface !== word.written.clean,
    adjacent_duplicate_coda: word.syllables.some(hasAdjacentDuplicateCoda),
    disyllable_stress_clash: hasDisyllableStressClash(word.syllables),
    monosyllable_schwa: strata.monosyllables
      && word.syllables[0].nucleus.length === 1
      && word.syllables[0].nucleus[0].sound === "ə",
    final_open_checked_vowel: hasFinalOpenCheckedVowel(word.syllables),
    monosyllable_foot_vowel: strata.monosyllables
      && word.syllables[0].nucleus.some(phoneme => phoneme.sound === "ʊ"),
  };
}
