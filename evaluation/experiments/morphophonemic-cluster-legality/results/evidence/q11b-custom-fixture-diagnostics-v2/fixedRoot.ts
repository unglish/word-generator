import { serializeTraceEvidence } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../trace-evidence.js";
import { verifyBareWordOperations } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../bare-word-evidence.js";
import { verifyMorphologyOperations } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/./operation-evidence.js";
import { verifyConfiguredAllomorphs } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/./allomorph-evidence.js";
import { verifyFinalWordSourceLinks } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../final-word-sources.js";
import { replayFinalPhones } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../final-phones.js";
import { replayFinalSpelling } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../final-spelling.js";
import { replaySpellingEdits } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../spelling-regex-edits.js";
import { createGenerator, createSeededRng, generateWord } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../../index.js";
import { englishConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../../config/english.js";
import type { Affix, LanguageConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../../config/language.js";
import type { Grapheme } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/morphology/../../types.js";

const prefixIn = englishConfig.morphology!.prefixes.find(affix => affix.written === "in")!;
const suffixNamed = (written: string) => englishConfig.morphology!.suffixes.find(affix => affix.written === written)!;

function customAffix(type: "prefix" | "suffix", planned: string, resolved: string): Affix {
  const form = { phonemes: ["ɪ", "n"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }], syllableCount: 1 };
  return {
    ...form, type, written: planned, frequency: 1, stressEffect: "none",
    allomorphs: [{ ...form, written: resolved, phonologicalCondition: { position: type === "prefix" ? "following" : "preceding" } }],
  };
}

function fixedRoot(options: { prefix?: Affix; suffix?: Affix; onset?: string; coda?: string; maxConsonants?: number } = {}) {
  const { prefix, suffix, onset = "b", coda = "t", maxConsonants = 3 } = options;
  const glyph = (phoneme: string, form: string): Grapheme => ({ phoneme, form, frequency: 1, origin: 0, startWord: 1, midWord: 1, endWord: 1 });
  const onsetGlyph = glyph(onset, onset);
  const nucleusGlyph = glyph("ɑ", "a");
  const codaGlyph = glyph(coda, coda);
  const one: [number, number][] = [[1, 1]];
  const template = prefix ? suffix ? "both" : "prefixed" : "suffixed";
  const weights = { bare: 0, prefixed: 0, suffixed: 0, both: 0, [template]: 1 };
  const target = 3 + (prefix?.phonemes.length ?? 0) + (suffix?.phonemes.length ?? 0);
  const config: LanguageConfig = {
    ...englishConfig,
    phonemeMaps: {
      onset: new Map([[onset, [englishConfig.phonemes.find(phoneme => phoneme.sound === onset)!]]]),
      nucleus: new Map([["ɑ", [englishConfig.phonemes.find(phoneme => phoneme.sound === "ɑ")!]]]),
      coda: new Map([[coda, [englishConfig.phonemes.find(phoneme => phoneme.sound === coda)!]]]),
    },
    graphemes: [onsetGlyph, nucleusGlyph, codaGlyph],
    graphemeMaps: { onset: new Map([[onset, [onsetGlyph]]]), nucleus: new Map([["ɑ", [nucleusGlyph]]]), coda: new Map([[coda, [codaGlyph]]]) },
    clusterConstraint: undefined,
    clusterWeights: undefined,
    clusterLimits: { maxOnset: 1, maxCoda: 1 },
    codaConstraints: { allowedFinal: [coda] },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[target, 1]], lexicon: [[target, 1]] },
    generationWeights: {
      ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
      codaLength: { monosyllabic: { 1: one }, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 },
    },
    pronunciation: {
      ...englishConfig.pronunciation,
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
      vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false },
    },
    morphology: { ...englishConfig.morphology!, prefixes: prefix ? [prefix] : [], suffixes: suffix ? [suffix] : [], templateWeights: { text: weights, lexicon: weights } },
    sharedSpellings: undefined, doubling: undefined, silentE: undefined, spellingRules: [], gapSpellings: [],
    writtenFormConstraints: { ...englishConfig.writtenFormConstraints, policy: undefined, maxConsonantLetters: maxConsonants },
  };
  const generator = createGenerator(config);
  const generation = { seed: 13, morphology: true, syllableCount: 1 + (prefix?.syllableCount ?? 0) + (suffix?.syllableCount ?? 0) };
  return { generator, config, generation, word: () => generator.generateWord({ ...generation, trace: true }) };
}


export { fixedRoot };
