import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord, generateWords } from "../index.js";
import type { Syllable } from "../types.js";
import { weightMatchingCoda } from "./root-repetition.js";
import { withStageDraws } from "../test-support/stage-stream-probe.js";


function hasNucleusTriple(syllables: readonly Syllable[]): boolean {
  return syllables.some(({ nucleus }, index) => {
    const sound = nucleus[0]?.sound;
    return sound !== undefined
      && sound === syllables[index - 1]?.nucleus[0]?.sound
      && sound === syllables[index - 2]?.nucleus[0]?.sound;
  });
}

describe("root repetition weights", () => {
  it("lowers the matching coda odds while preserving the protected probability", () => {
    const options: [string, number][] = [["l", 20], ["n", 30], ["r", 50]];
    const result = weightMatchingCoda(
      options, (sound) => sound, { sound: "l", multiplier: 0.25 }, new Set(["r"]),
    );
    expect(result).toEqual([["l", 5], ["n", 30], ["r", 35]]);
    const preservedMatch = weightMatchingCoda(
      options, (sound) => sound, { sound: "l", multiplier: 0.25 }, new Set(["l", "r"]),
    );
    expect(preservedMatch).toEqual(result);
    expect(options).toEqual([["l", 20], ["n", 30], ["r", 50]]);
  });

  it("validates custom weights and coda sounds", () => {
    expect(() => createGenerator({ ...englishConfig, rootRepetition: { tripleNucleusMultiplier: 0 } }))
      .toThrow(/rootRepetition.tripleNucleusMultiplier/);
    expect(() => createGenerator({ ...englishConfig, rootRepetition: { matchingCodaOverrides: { l: NaN } } }))
      .toThrow(/rootRepetition.matchingCodaOverrides.l/);
    expect(() => createGenerator({ ...englishConfig, rootRepetition: { preserveCodaInitials: ["æ"] } }))
      .toThrow(/rootRepetition.preserveCodaInitials/);
  });

  it("does not apply the lexicon policy to text mode output or stage draws", () => {
    const withoutPolicy = createGenerator({ ...englishConfig, rootRepetition: undefined });
    const rand = createSeededRng(503);
    const withoutPolicyRand = createSeededRng(503);
    for (let index = 0; index < 100; index++) {
      const word = withStageDraws(() => generateWord({ mode: "text", rand, trace: true }));
      const withoutPolicyWord = withStageDraws(() => withoutPolicy.generateWord({
        mode: "text", rand: withoutPolicyRand, trace: true,
      }));
      expect(word.value).toEqual(withoutPolicyWord.value);
      expect(word.draws, `word ${index}`).toEqual(withoutPolicyWord.draws);
    }
  });

  it("keeps seeded root consonant matches rare while retaining attested patterns", () => {
    const count = 8_000;
    const rand = createSeededRng(22_503);
    const matches = new Map<string, number>();
    let total = 0;
    for (let index = 0; index < count; index++) {
      const word = generateWord({ mode: "lexicon", rand });
      for (const { onset, coda } of word.lexical!.root) {
        const sound = onset.at(-1)?.sound;
        if (sound && sound === coda[0]?.sound) {
          matches.set(sound, (matches.get(sound) ?? 0) + 1);
          total++;
        }
      }
    }
    expect(total / count).toBeLessThan(0.037);
    for (const [sound, ceiling] of Object.entries({ l: 0.001, n: 0.012, t: 0.008, k: 0.005, s: 0.008 })) {
      expect((matches.get(sound) ?? 0) / count, sound).toBeLessThan(ceiling);
    }
    expect(matches.get("p")).toBeGreaterThan(0);
    expect(matches.get("b")).toBeGreaterThan(0);
  }, 120_000);

  it.each([4, 5])("keeps surface vowel triples rare in %i-syllable bare roots", (syllableCount) => {
    const count = 2_000;
    const words = generateWords(count, { mode: "lexicon", syllableCount, seed: 11_823, morphology: false });
    const triples = words.filter((word) => hasNucleusTriple(word.syllables)).length;
    expect(triples).toBeGreaterThan(0);
    expect(triples / count).toBeLessThan(syllableCount === 4 ? 0.035 : 0.06);
  }, 30_000);

  it("leaves lexical words and stage draws identical when only reduction changes", () => {
    const withoutReductionPenalty = createGenerator({
      ...englishConfig,
      rootRepetition: { ...englishConfig.rootRepetition, tripleReductionMultiplier: 1 },
    });
    const options = { syllableCount: 5, morphology: false, mode: "lexicon" as const };
    const ordinaryRand = createSeededRng(497);
    const weightedRand = createSeededRng(497);
    let triplesBroken = 0;
    for (let index = 0; index < 400; index++) {
      const { value: ordinary, draws: ordinaryDraws } = withStageDraws(() => withoutReductionPenalty.generateWord({ ...options, rand: ordinaryRand }));
      const { value: weighted, draws: weightedDraws } = withStageDraws(() => generateWord({ ...options, rand: weightedRand }));
      expect(weighted.written).toEqual(ordinary.written);
      expect(weighted.lexical).toEqual(ordinary.lexical);
      // The multiplier changes each reduction roll's odds, not the number of rolls.
      expect(weightedDraws, `word ${index}`).toEqual(ordinaryDraws);
      if (hasNucleusTriple(ordinary.syllables) && !hasNucleusTriple(weighted.syllables)) {
        triplesBroken++;
      }
    }
    expect(triplesBroken).toBeGreaterThan(0);
  });
});
