import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../index.js";
import { replayFinalNuclei } from "./final-nucleus-evidence.js";
import { verifyWordPronunciation } from "./pronunciation-evidence.js";

const weights = { bare: 0, prefixed: 0, suffixed: 1, both: 0 };
const config = { ...englishConfig,
  phonemeMaps: { ...englishConfig.phonemeMaps,
    nucleus: new Map(["ʌ", "ə"].map(sound => [sound, englishConfig.phonemeMaps.nucleus.get(sound)!])) },
  pronunciation: { ...englishConfig.pronunciation, stress: { ...englishConfig.pronunciation.stress,
    primary: { type: "initial" as const }, secondary: { ...englishConfig.pronunciation.stress.secondary, enabled: false },
    rhythmic: { ...englishConfig.pronunciation.stress.rhythmic, enabled: false } } },
  morphology: { ...englishConfig.morphology!, suffixes: [englishConfig.morphology!.suffixes.find(affix => affix.written === "tion")!],
    templateWeights: { text: weights, lexicon: weights } },
};

describe("final nucleus evidence", () => {
  it("replays promoted schwa repairs and rejects changed draws, views and phone histories", () => {
    const generator = createGenerator(config);
    const words = Array.from({ length: 100 }, (_, seed) => generator.generateWord({ seed, morphology: true, syllableCount: 3, trace: true }));
    const repaired = words.filter(word => word.trace!.finalNucleus!.repairs.length > 0);
    expect(repaired.length).toBeGreaterThan(0);
    for (const word of repaired) {
      expect(word.trace!.finalNucleus!.rolls.length).toBeGreaterThan(0);
      expect(() => replayFinalNuclei(JSON.parse(JSON.stringify(word)), config)).not.toThrow();
      expect(() => verifyWordPronunciation(word, config)).not.toThrow();
    }
    const word = repaired[0];
    const mutations = [
      (copy: typeof word) => { copy.trace!.finalNucleus!.rolls.pop(); },
      (copy: typeof word) => { copy.trace!.finalNucleus!.rolls.push(0.5); },
      (copy: typeof word) => { copy.trace!.finalNucleus!.rootAfter[1].nucleus[0].sound = "ə"; },
      (copy: typeof word) => { copy.trace!.finalNucleus!.phonesAfter!.changes.pop(); },
      (copy: typeof word) => { copy.trace!.writerInput![1].nucleus[0].sound = "ə"; },
      (copy: typeof word) => { copy.trace!.pronunciationPasses!.push(structuredClone(copy.trace!.pronunciationPasses![0])); },
      (copy: typeof word) => { copy.trace!.finalWord!.phones.initial[0].initialSound = "forged"; },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(word); mutate(copy);
      expect(() => verifyWordPronunciation(copy, config)).toThrow();
    }
  });
});
