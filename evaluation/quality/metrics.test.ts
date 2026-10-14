import { describe, expect, it } from "vitest";
import type { GraphemeTrace, WordTrace } from "../../src/core/trace.js";
import type { Phoneme, Syllable, Word } from "../../src/types.js";
import { classifyWord, METRIC_DEFINITIONS, wordStrata } from "./metrics.js";

function phoneme(sound: string, reduced = false): Phoneme {
  return { sound, reduced, voiced: true, mannerOfArticulation: "midVowel", placeOfArticulation: "central", startWord: 1, midWord: 1, endWord: 1 };
}

function syllable(sound = "æ", stress?: Syllable["stress"], coda: string[] = ["t"]): Syllable {
  return { onset: [], nucleus: [phoneme(sound)], coda: coda.map(sound => phoneme(sound)), stress };
}

function tracedWord(syllables: Syllable[] = [syllable("æ", "ˈ")], affixed = false): Word & { trace: WordTrace } {
  return {
    syllables,
    pronunciation: "",
    written: { clean: "fixture", hyphenated: "fixture" },
    trace: {
      syllableCount: syllables.length,
      attempts: 0,
      structural: [],
      stages: [],
      graphemeSelections: [],
      repairs: [],
      morphology: affixed ? { template: "suffixed", suffix: "ing", syllableReduction: 1 } : undefined,
      orthography: { surface: "fixture", chars: [], graphemeUnits: [] },
      summary: { morphologyApplied: affixed, totalDecisions: 0, repairCount: 0 },
    },
  };
}

function selection(weights: [string, number][]): GraphemeTrace {
  const candidates = weights.map(([form]) => form);
  return {
    index: 0, phoneme: "z", position: "coda", syllableIndex: 0,
    candidates, afterCondition: candidates, afterPosition: candidates, weights,
    roll: 0, selected: "z", emitted: "z", doubled: false,
  };
}

describe("frozen linguistic quality metrics", () => {
  it("requires trace evidence instead of interpreting an untraced word as clean", () => {
    const word = tracedWord();
    const untraced: Word = { ...word, trace: undefined };
    expect(() => classifyWord(untraced)).toThrow("trace: true");
    expect(() => wordStrata(untraced)).toThrow("trace: true");
  });

  it("defines eligibility using final syllables and applied morphology, not the requested plan", () => {
    const word = tracedWord([syllable(), syllable()], false);
    word.trace.syllableCount = 1;
    word.trace.morphology = { template: "suffixed", suffix: "ing", syllableReduction: 1 };
    expect(wordStrata(word)).toEqual({ words: true, polysyllables: true, disyllables: true, monosyllables: false, affixedWords: false });
    word.trace.summary.morphologyApplied = true;
    expect(wordStrata(word).affixedWords).toBe(true);
  });

  it("keeps word, syllable-count, and affix denominators distinct", () => {
    const words = [
      tracedWord([syllable("ə")]),
      tracedWord([syllable(), syllable()], true),
      tracedWord([syllable("æ", "ˈ"), syllable(), syllable()]),
    ];
    const missingPrimary = METRIC_DEFINITIONS.find(metric => metric.id === "polysyllable_missing_primary")!;
    const eligible = words.filter(word => wordStrata(word)[missingPrimary.denominator]);
    expect(eligible).toHaveLength(2);
    expect(eligible.filter(word => classifyWord(word)[missingPrimary.id])).toHaveLength(1);
    expect(words.filter(word => wordStrata(word).monosyllables)).toHaveLength(1);
    expect(words.filter(word => wordStrata(word).affixedWords)).toHaveLength(1);
    for (const word of words) {
      const observations = classifyWord(word);
      for (const metric of METRIC_DEFINITIONS) {
        if (!wordStrata(word)[metric.denominator]) expect(observations[metric.id]).toBe(false);
      }
    }
  });

  it("does not count bare or missing morphology plans as affixed even when the summary says morphology applied", () => {
    const word = tracedWord();
    word.trace.summary.morphologyApplied = true;
    expect(wordStrata(word).affixedWords).toBe(false);
    word.trace.morphology = { template: "bare", syllableReduction: 0 };
    expect(wordStrata(word).affixedWords).toBe(false);
    word.trace.morphology = { template: "suffixed", syllableReduction: 0 };
    expect(wordStrata(word).affixedWords).toBe(false);
    word.trace.morphology.suffix = "s";
    expect(wordStrata(word).affixedWords).toBe(true);
    word.trace.morphology = { template: "prefixed", prefix: "un", syllableReduction: 1 };
    expect(wordStrata(word).affixedWords).toBe(true);
  });

  it("does not require an explicit primary marker on a monosyllable", () => {
    expect(classifyWord(tracedWord([syllable()])).polysyllable_missing_primary).toBe(false);
    expect(classifyWord(tracedWord([syllable(), syllable()])).polysyllable_missing_primary).toBe(true);
    expect(classifyWord(tracedWord([syllable("æ", "ˈ"), syllable("æ", "ˈ")])).polysyllable_multiple_primary).toBe(true);
  });

  it("distinguishes stressed schwa from the reduced-vowel metadata defect", () => {
    const word = tracedWord([syllable("ə", "ˈ"), syllable()]);
    expect(classifyWord(word).primary_schwa).toBe(true);
    expect(classifyWord(word).primary_reduced_vowel).toBe(false);
    word.syllables[0].nucleus[0] = phoneme("ɪ", true);
    expect(classifyWord(word).primary_schwa).toBe(false);
    expect(classifyWord(word).primary_reduced_vowel).toBe(true);
    word.syllables[0].stress = "ˌ";
    expect(classifyWord(word).primary_reduced_vowel).toBe(false);
  });

  it("counts morphology bridge events once per affixed word and excludes internal hiatus events", () => {
    const word = tracedWord([syllable(), syllable()], true);
    word.trace.structural.push({ event: "vowelHiatusFallback", inserted: "h", leftSyllableIndex: 0, rightSyllableIndex: 1 });
    expect(classifyWord(word).morphology_hiatus_bridge).toBe(false);
    word.trace.structural.push(
      { event: "morphPrefixHiatusFallback", inserted: "h", syllableIndex: 0 },
      { event: "morphSuffixHiatusFallback", inserted: "h", syllableIndex: 1 },
    );
    expect(classifyWord(word).morphology_hiatus_bridge).toBe(true);
    word.trace.summary.morphologyApplied = false;
    expect(classifyWord(word).morphology_hiatus_bridge).toBe(false);
  });

  it("detects zero-weight choices only where more than one weighted candidate was considered", () => {
    const word = tracedWord();
    word.trace.graphemeSelections = [selection([]), selection([["z", 0]]), selection([["s", 0], ["z", 1]])];
    expect(classifyWord(word).zero_weight_grapheme_choice).toBe(false);
    word.trace.graphemeSelections.push(selection([["s", 0], ["ze", 0]]));
    expect(classifyWord(word).zero_weight_grapheme_choice).toBe(true);
  });

  it("separates absent orthography from a stale orthographic surface", () => {
    const word = tracedWord();
    word.written.clean = "fixtures";
    expect(classifyWord(word).orthography_surface_mismatch).toBe(true);
    expect(classifyWord(word).orthography_trace_missing).toBe(false);
    word.trace.orthography = undefined;
    expect(classifyWord(word).orthography_surface_mismatch).toBe(false);
    expect(classifyWord(word).orthography_trace_missing).toBe(true);
  });

  it("detects identical coda neighbors without conflating separate syllable boundaries", () => {
    const word = tracedWord([syllable("æ", "ˈ", ["t"]), syllable("æ", undefined, ["t"])]);
    word.syllables[1].onset = [phoneme("t")];
    expect(classifyWord(word).adjacent_duplicate_coda).toBe(false);
    word.syllables[0].coda.push(phoneme("t"));
    expect(classifyWord(word).adjacent_duplicate_coda).toBe(true);
  });

  it("restricts the stress-clash diagnostic to primary-secondary disyllables", () => {
    const word = tracedWord([syllable("æ", "ˌ"), syllable("æ", "ˈ")]);
    expect(classifyWord(word).disyllable_stress_clash).toBe(true);
    word.syllables.push(syllable());
    expect(classifyWord(word).disyllable_stress_clash).toBe(false);
    expect(classifyWord(tracedWord([syllable("æ", "ˈ"), syllable("æ", "ˈ")])).disyllable_stress_clash).toBe(false);
  });

  it("uses sound identity rather than tense metadata for checked-vowel endings", () => {
    for (const sound of ["ɪ", "ɛ", "æ", "ʌ", "ʊ"]) {
      const word = tracedWord([syllable(sound, "ˈ", [])]);
      word.syllables[0].nucleus[0].tense = true;
      expect(classifyWord(word).final_open_checked_vowel).toBe(true);
      word.syllables[0].coda.push(phoneme("t"));
      expect(classifyWord(word).final_open_checked_vowel).toBe(false);
    }
    for (const sound of ["ə", "ɚ", "eɪ", "ɑ", "ɔ"]) {
      expect(classifyWord(tracedWord([syllable(sound, undefined, [])])).final_open_checked_vowel).toBe(false);
    }
    expect(classifyWord(tracedWord([syllable("æ", "ˈ", []), syllable("ɑ", undefined, [])])).final_open_checked_vowel).toBe(false);
  });

  it("limits monosyllabic coverage probes to final monosyllables", () => {
    expect(classifyWord(tracedWord([syllable("ə")])).monosyllable_schwa).toBe(true);
    expect(classifyWord(tracedWord([syllable("ʊ")])).monosyllable_foot_vowel).toBe(true);
    const word = tracedWord([syllable("ə"), syllable("ʊ")]);
    expect(classifyWord(word).monosyllable_schwa).toBe(false);
    expect(classifyWord(word).monosyllable_foot_vowel).toBe(false);
  });
});
