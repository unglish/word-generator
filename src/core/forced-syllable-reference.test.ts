import { describe, expect, it } from "vitest";
import { createGenerator } from "./generate.js";
import { englishConfig } from "../config/english.js";
import { createSeededRng } from "../utils/random.js";
import type { Word } from "../types.js";

/**
 * Forced-syllable phoneme lengths pinned to fixed reference values from the
 * pre-#443 distribution (not compared to automatic output, which moved with
 * the letter-peak bias).
 *
 * Measured on reverted code with createGenerator / generateWord, lexicon,
 * morphology off, seed 1302, n=20_000 forced monosyllables:
 *   mean phones 3.731; shares 3/4/5 phones ≈ 34.91% / 40.98% / 16.50%.
 *
 * On biased main the 3-phone share of forced monosyllables drops to ~16%.
 */

const SAMPLE = 20_000;
const SEED_MONO = 1302;
const SEED_DI = 1304;

/** Absolute reference anchors (pre-#443). */
const MONO_MEAN_PHONES = 3.731;
const MONO_SHARE_3 = 0.3491;
const MONO_SHARE_4 = 0.4098;
const MONO_SHARE_5 = 0.165;
const DI_MEAN_PHONES = 5.538;

/** Tolerances: tight enough to catch #443's forced-mono 3-phone collapse (~16%),
 *  wide enough for seed noise at n=20k (SE ≈ 0.3–0.4pp for ~35% shares). */
const MEAN_TOL = 0.12;
const SHARE_TOL = 0.035;

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

function sampleForced(seed: number, syllableCount: number): Word[] {
  const generator = createGenerator(englishConfig);
  const rand = createSeededRng(seed);
  const words: Word[] = [];
  for (let i = 0; i < SAMPLE; i++) {
    words.push(
      generator.generateWord({
        rand,
        mode: "lexicon",
        morphology: false,
        syllableCount,
      }),
    );
  }
  return words;
}

describe("forced syllable lengths (fixed reference)", () => {
  it("keeps forced monosyllable phone lengths near pre-#443 anchors", () => {
    const words = sampleForced(SEED_MONO, 1);
    expect(words.every((w) => w.syllables.length === 1)).toBe(true);

    const phones = words.map(phonemeCount);
    const mean = phones.reduce((a, b) => a + b, 0) / phones.length;
    const share3 = phones.filter((p) => p === 3).length / phones.length;
    const share4 = phones.filter((p) => p === 4).length / phones.length;
    const share5 = phones.filter((p) => p === 5).length / phones.length;
    const heavyCodaShare =
      words.filter((w) => w.syllables[0].coda.length >= 3).length /
      words.length;

    expect(Math.abs(mean - MONO_MEAN_PHONES)).toBeLessThan(MEAN_TOL);
    expect(Math.abs(share3 - MONO_SHARE_3)).toBeLessThan(SHARE_TOL);
    expect(Math.abs(share4 - MONO_SHARE_4)).toBeLessThan(SHARE_TOL);
    expect(Math.abs(share5 - MONO_SHARE_5)).toBeLessThan(SHARE_TOL);
    expect(heavyCodaShare).toBeLessThan(0.1);
  });

  it("keeps forced disyllable mean phone length near the pre-#443 anchor", () => {
    const words = sampleForced(SEED_DI, 2);
    expect(words.every((w) => w.syllables.length === 2)).toBe(true);
    const mean =
      words.reduce((sum, w) => sum + phonemeCount(w), 0) / words.length;
    expect(Math.abs(mean - DI_MEAN_PHONES)).toBeLessThan(MEAN_TOL);
  });
});
