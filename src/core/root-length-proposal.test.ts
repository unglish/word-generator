import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../index.js";
import type { LanguageConfig } from "../config/language.js";

function generator(letterLengthTargets: LanguageConfig["syllableStructure"]["letterLengthTargets"]) {
  return createGenerator({
    ...englishConfig,
    phonemeLengthWeights: { ...englishConfig.phonemeLengthWeights, text: [[4, 1], [8, 1]] },
    phonemeToSyllableWeights: { ...englishConfig.phonemeToSyllableWeights, text: {
      4: [[1, 1], [2, 1]],
      8: [[1, 1], [2, 1]],
    } },
    syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets },
  });
}

describe("root length proposals", () => {
  it.each([0, 1, 2])("keeps phone and syllable targets independent of letter bounds with syllableCount=%s", syllableCount => {
    const unscored = generator(undefined);
    const scored = generator({ 1: [4, 4, 5, 5], 2: [9, 9, 10, 10] });
    const seen = new Set<number>();
    for (let seed = 0; seed < 16; seed++) {
      const options = { seed, syllableCount, mode: "text", morphology: false, trace: true } as const;
      const first = unscored.generateWord(options).trace!;
      const second = scored.generateWord(options).trace!;
      expect(second.targetPhonemeCount, `seed ${seed}`).toBe(first.targetPhonemeCount);
      expect(second.syllableCount, `seed ${seed}`).toBe(first.syllableCount);
      seen.add(first.targetPhonemeCount!);
    }
    expect(seen).toEqual(new Set([4, 8]));
  });
});
