import { describe, expect, it } from "vitest";
import { createGenerator } from "./generate.js";
import { englishConfig } from "../config/english.js";
import { createSeededRng } from "../utils/random.js";
import type { Word } from "../types.js";

/**
 * Pins the lexicon-mode syllable / phone-count distribution after reverting
 * letter-peak syllable sampling bias (#443).
 *
 * Reference (createGenerator / generateWord, lexicon, morphology off;
 * seeds 42/43/44 × 200k pooled on pre-bias a1815918):
 *   mono 12.90%, 2-syl 46.03%, mono|3ph 34.73%, mono|4ph 40.80%,
 *   mono|5ph 16.75%, 2-syl|6ph 30.10%.
 *
 * Biased main (#443) moves those to ~20.3 / 38.4 / 24.3 / 48.5 / 23.1 / 44.0.
 *
 * This test uses 40_000 words × seeds 42/43/44 (120k total). Bounds are
 * two-sided around the reverted distribution with margins that still fail on
 * biased main:
 *   mono / 2-syl ±2.5pp (gaps to main ~7.4–7.6pp)
 *   mono phone shares ±3.5pp (gaps ~6.5–10.5pp)
 *   2-syl|6ph ±4.0pp (gap ~13.9pp)
 */

const SEEDS = [42, 43, 44] as const;
const SAMPLE_PER_SEED = 40_000;

const BOUNDS = {
  monoShare: { lo: 0.104, hi: 0.154 },
  twoSylShare: { lo: 0.435, hi: 0.485 },
  monoPhones3: { lo: 0.312, hi: 0.382 },
  monoPhones4: { lo: 0.373, hi: 0.443 },
  monoPhones5: { lo: 0.132, hi: 0.202 },
  twoSylPhones6: { lo: 0.261, hi: 0.341 },
} as const;

function phonemeCount(word: Word): number {
  return word.syllables.reduce(
    (sum, syllable) =>
      sum +
      syllable.onset.length +
      syllable.nucleus.length +
      syllable.coda.length,
    0,
  );
}

function collectStats(words: Word[]) {
  let mono = 0;
  let twoSyl = 0;
  let mono3 = 0;
  let mono4 = 0;
  let mono5 = 0;
  let two6 = 0;

  for (const word of words) {
    const syllables = word.syllables.length;
    const phones = phonemeCount(word);
    if (syllables === 1) {
      mono++;
      if (phones === 3) mono3++;
      else if (phones === 4) mono4++;
      else if (phones === 5) mono5++;
    } else if (syllables === 2) {
      twoSyl++;
      if (phones === 6) two6++;
    }
  }

  return {
    monoShare: mono / words.length,
    twoSylShare: twoSyl / words.length,
    monoPhones3: mono > 0 ? mono3 / mono : 0,
    monoPhones4: mono > 0 ? mono4 / mono : 0,
    monoPhones5: mono > 0 ? mono5 / mono : 0,
    twoSylPhones6: twoSyl > 0 ? two6 / twoSyl : 0,
  };
}

function sampleLexiconBare(seed: number, count: number): Word[] {
  const generator = createGenerator(englishConfig);
  const rand = createSeededRng(seed);
  const words: Word[] = [];
  for (let i = 0; i < count; i++) {
    words.push(
      generator.generateWord({
        rand,
        mode: "lexicon",
        morphology: false,
      }),
    );
  }
  return words;
}

describe("lexicon syllable/phone-count distribution", () => {
  it(
    "stays within pre-#443 bounds across seeds 42/43/44",
    () => {
      const pooled: Word[] = [];

      for (const seed of SEEDS) {
        const words = sampleLexiconBare(seed, SAMPLE_PER_SEED);
        pooled.push(...words);
        const stats = collectStats(words);
        for (const [key, bound] of Object.entries(BOUNDS) as Array<
          [keyof typeof BOUNDS, { lo: number; hi: number }]
        >) {
          expect(
            stats[key],
            `seed ${seed} ${key}=${(stats[key] * 100).toFixed(2)}% outside [${(bound.lo * 100).toFixed(1)}, ${(bound.hi * 100).toFixed(1)}]`,
          ).toBeGreaterThanOrEqual(bound.lo);
          expect(
            stats[key],
            `seed ${seed} ${key}=${(stats[key] * 100).toFixed(2)}% outside [${(bound.lo * 100).toFixed(1)}, ${(bound.hi * 100).toFixed(1)}]`,
          ).toBeLessThanOrEqual(bound.hi);
        }
      }

      const pooledStats = collectStats(pooled);
      for (const [key, bound] of Object.entries(BOUNDS) as Array<
        [keyof typeof BOUNDS, { lo: number; hi: number }]
      >) {
        expect(
          pooledStats[key],
          `pooled ${key}=${(pooledStats[key] * 100).toFixed(2)}% outside [${(bound.lo * 100).toFixed(1)}, ${(bound.hi * 100).toFixed(1)}]`,
        ).toBeGreaterThanOrEqual(bound.lo);
        expect(
          pooledStats[key],
          `pooled ${key}=${(pooledStats[key] * 100).toFixed(2)}% outside [${(bound.lo * 100).toFixed(1)}, ${(bound.hi * 100).toFixed(1)}]`,
        ).toBeLessThanOrEqual(bound.hi);
      }
    },
    180_000,
  );
});
