import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../index.js";
import type { Grapheme } from "../types.js";
import type { LanguageConfig } from "../config/language.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";
import { createCurrentSpellingObserver } from "../../evaluation/quality/probes/unit-normalization/observe-current.js";

const glyph = (phoneme: string, form: string, frequency = 1): Grapheme => ({
  phoneme, form, frequency, origin: 0, startWord: 1, midWord: 1, endWord: 1,
  reading: { kind: "single-phone" },
});

function observeRoot(finals: Grapheme[], policy: "preserve-phones" | false = "preserve-phones", spellingRules: LanguageConfig["spellingRules"] = []) {
  const phone = (sound: string) => englishConfig.phonemes.find(entry => entry.sound === sound)!;
  const graphemes = [glyph("b", "b"), glyph("æ", "a"), ...finals];
  const one: [number, number][] = [[1, 1]];
  const config: LanguageConfig = {
    ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes),
    phonemeMaps: { onset: new Map([["b", [phone("b")]]]), nucleus: new Map([["æ", [phone("æ")]]]),
      coda: new Map([[finals[0].phoneme, [phone(finals[0].phoneme)]]]) },
    clusterConstraint: undefined, clusterWeights: undefined, clusterLimits: { maxOnset: 1, maxCoda: 1 },
    codaConstraints: { allowedFinal: [finals[0].phoneme] },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[3, 1]], lexicon: [[3, 1]] },
    generationWeights: { ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
      codaLength: { monosyllabic: { 1: one }, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 } },
    sharedSpellings: undefined, doubling: undefined, silentE: undefined, spellingRules, gapSpellings: [],
    pronunciation: { ...englishConfig.pronunciation,
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
      vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false } },
    writtenFormConstraints: { policy: policy || undefined, maxConsonantLetters: 1 },
  };
  const word = createGenerator(config).generateWord({ seed: 13, syllableCount: 1, morphology: false, trace: true });
  verifyBaseSpellingEvidence(word.trace!.baseSpelling!, config);
  const counts = createCurrentSpellingObserver(config)({ word });
  return { word, counts };
}

const count = (counts: Record<string, number>, key: string) => counts[key] ?? 0;

describe("spelling coverage observations from public generator output", () => {
  it("attributes a v1 half-th to its cap without inventing unavailable budget decisions", () => {
    const legacy = observeRoot([glyph("θ", "th")], false);
    expect(legacy.word.written.clean).toBe("bat");
    expect(legacy.counts).toMatchObject({ words: 1, "ledgerVersion:1": 1, phones: 3, units: 3,
      selectedThUnits: 1, partialSourceUnits: 1, partialThUnits: 1, capPartialThUnits: 1,
      "partialThRule:repairConsonantLetters": 1, capEdits: 1, capWords: 1,
      budgetEpisodesUnavailableWords: 1, verifiedCertificates: 0 });
    expect(count(legacy.counts, "noSurvivingLineageUnits")).toBe(0);
    expect(count(legacy.counts, "episodes")).toBe(0);
  });

  it("counts an intact v3 th as a refusal, not partial loss or a certificate", () => {
    const { word, counts } = observeRoot([glyph("θ", "th")]);
    expect(word.written.clean).toBe("bath");
    expect(counts).toMatchObject({ "ledgerVersion:3": 1, selectedThUnits: 1, verifiedCertificates: 0, changedUnits: 0, wordsWithOverBudgetEpisode: 1, wordsWithInfeasibleBudget: 1 });
    expect(count(counts, "infeasibleReason:no-licensed-plan")).toBeGreaterThan(0);
    for (const key of ["capPartialThUnits", "partialSourceUnits", "noSurvivingLineageUnits", "capEdits", "budgetEpisodesUnavailableWords"]) {
      expect(count(counts, key), key).toBe(0);
    }
  });

  it("retains the lineage of a certified whole ph-to-f replacement", () => {
    const { word, counts } = observeRoot([glyph("f", "ph", 1000), glyph("f", "f")]);
    expect(word.written.clean).toBe("baf");
    expect(word.trace!.baseSpelling!.certificates![0].replacements[0]).toMatchObject({ before: "ph", after: "f", phoneIds: [2] });
    expect(counts).toMatchObject({ "selectedSpelling:[\"f\",\"ph\"]": 1, "licensedSpelling:[\"f\",\"ph\",\"f\"]": 1,
      "wordsWithRespell": 1, "wordsWithOverBudgetEpisode": 1, "writtenLength:3": 1, "legacySelectedAttemptIndex:0": 1, "base-before-word-rules:before:consonantLetters:2": 1,
      "base-before-word-rules:after:consonantLetters:1": 1, "ledgerVersion:3": 1, "episodeStatus:respell": 1,
      verifiedCertificates: 1, changedPhoneIdsInCertificates: 1, changedUnits: 1, "replayedPool:ordinary": 3 });
    for (const key of ["partialSourceUnits", "noSurvivingLineageUnits", "capEdits", "unresolvedCells"]) {
      expect(count(counts, key), key).toBe(0);
    }
  });

  it("distinguishes missing reading evidence from missing cell ownership", () => {
    const short = glyph("f", "f"); delete short.reading;
    const { word, counts } = observeRoot([glyph("f", "ph", 1000), short]);
    expect(word.written.clean).toBe("baph");
    expect(count(counts, "infeasibleReason:unknown-reading")).toBeGreaterThan(0);
    expect(count(counts, "branchRefusal:unknown-reading")).toBeGreaterThan(0);
    for (const key of ["unresolvedCells", "wordsWithUnresolvedCells", "verifiedCertificates", "partialSourceUnits", "noSurvivingLineageUnits"]) {
      expect(count(counts, key), key).toBe(0);
    }
  });

  it("counts generic rewrite ancestry as unresolved even when every source unit retains lineage", () => {
    const { word, counts } = observeRoot([glyph("f", "ph", 1000), glyph("f", "f")], "preserve-phones",
      [{ name: "opaque-vowel-expansion", pattern: "a", replacement: "aph", scope: "word" }]);
    expect(word.written.clean).toBe("baphf");
    expect(counts).toMatchObject({ unresolvedCells: 3, wordsWithUnresolvedCells: 1, verifiedCertificates: 1 });
    expect(count(counts, "infeasibleReason:unresolved-ownership")).toBeGreaterThan(0);
    expect(count(counts, "noSurvivingLineageUnits")).toBe(0);
    expect(count(counts, "partialSourceUnits")).toBe(0);
    expect(count(counts, "capUnknownInputCells")).toBe(0);
  });

  it("counts unresolved rewrite cells consumed by a legacy cap separately from surviving unknown cells", () => {
    const { word, counts } = observeRoot([glyph("f", "ph")], false,
      [{ name: "opaque-vowel-expansion", pattern: "a", replacement: "aph", scope: "word" }]);
    expect(word.written.clean).toBe("bap");
    expect(counts.capUnknownInputCells).toBe(1);
    expect(counts.unresolvedCells).toBe(2);
    expect(word.trace!.baseSpelling!.edits.filter(edit => edit.rule === "repairConsonantLetters")
      .map(edit => [edit.before, edit.after])).toEqual([["h", ""], ["h", ""], ["p", ""]]);
    expect(counts.capEdits).toBe(3);
    expect(counts.capNoLineageUnits).toBe(1);
    expect(counts["noLineageRule:repairConsonantLetters"]).toBe(1);
    expect(count(counts, "verifiedCertificates")).toBe(0);
    expect(counts.budgetEpisodesUnavailableWords).toBe(1);
  });
});
