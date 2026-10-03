import { englishConfig } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/../config/english.js";
import type { Affix } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/../config/language.js";
import { createGenerator, generateWords } from "/Users/ryanbetts/.codex/worktrees/linguistic-q11b-treatment/word-generator/src/core/./generate.js";

const affix = (written: string, type: "prefix" | "suffix"): Affix => {
  const pool = type === "prefix" ? englishConfig.morphology!.prefixes : englishConfig.morphology!.suffixes;
  return pool.find(entry => entry.written === written)!;
};

function lexicalGenerator(options: { prefix?: string; suffix?: string; vowels?: string[] } = {}) {
  const { prefix, suffix, vowels = ["ʌ"] } = options;
  const templateWeights = {
    bare: prefix || suffix ? 0 : 1,
    prefixed: prefix && !suffix ? 1 : 0,
    suffixed: suffix && !prefix ? 1 : 0,
    both: prefix && suffix ? 1 : 0,
  };
  return ({
    ...englishConfig,
    phonemeMaps: {
      ...englishConfig.phonemeMaps,
      nucleus: new Map(vowels.map(sound => [sound, englishConfig.phonemeMaps.nucleus.get(sound)!])),
    },
    pronunciation: {
      ...englishConfig.pronunciation,
      stress: {
        ...englishConfig.pronunciation.stress,
        primary: { type: "initial" },
        secondary: { ...englishConfig.pronunciation.stress.secondary, enabled: false },
        rhythmic: { ...englishConfig.pronunciation.stress.rhythmic, enabled: false },
      },
      aspiration: {
        enabled: true,
        targets: [{ segment: "onset", index: 0, manner: ["stop"], voiced: false }],
        rules: [{ id: "word-initial-only", when: { wordInitial: true }, probability: 100 }],
        fallbackProbability: 0,
      },
      vowelReduction: {
        enabled: true,
        rules: [{ source: "ʌ", target: "ə", probability: 100 }],
        reduceSecondaryStress: true,
      },
    },
    morphology: {
      ...englishConfig.morphology!,
      prefixes: prefix ? [affix(prefix, "prefix")] : englishConfig.morphology!.prefixes,
      suffixes: suffix ? [affix(suffix, "suffix")] : englishConfig.morphology!.suffixes,
      templateWeights: { text: templateWeights, lexicon: templateWeights },
    },
  });
}


export { lexicalGenerator };
