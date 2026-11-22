import { describe, expect, it } from "vitest";
import { createGenerator } from "./generate.js";
import { lexiconReference } from "../config/lexicon-reference.js";
import { englishConfig } from "../config/english.js";
import { createSeededRng } from "../utils/random.js";
import type { Word } from "../types.js";

// Independent corpus anchors catch changes shared by automatic and forced sampling.
const SAMPLE = 20_000;
const SEED_MONO = 1302;
const SEED_DI = 1304;
const joint: Record<number, [number, number][]> = lexiconReference.syllablesByPhoneLength;

function rootLengthReference(syllables: 1 | 2) {
  const total = lexiconReference.root.syllables[syllables];
  const weights = Object.entries(joint).map(([phones, pairs]) => ({
    phones: Number(phones),
    count: pairs.find(([count]) => count === syllables)?.[1] ?? 0,
  }));
  return {
    mean: weights.reduce((sum, { phones, count }) => sum + phones * count, 0) / total,
    share: (phones: number) => (weights.find(row => row.phones === phones)?.count ?? 0) / total,
  };
}

const mono = rootLengthReference(1);
const di = rootLengthReference(2);

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
  it("keeps forced monosyllable phone lengths near measured monosyllable roots", () => {
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

    expect(Math.abs(mean - mono.mean)).toBeLessThan(MEAN_TOL);
    expect(Math.abs(share3 - mono.share(3))).toBeLessThan(SHARE_TOL);
    expect(Math.abs(share4 - mono.share(4))).toBeLessThan(SHARE_TOL);
    expect(Math.abs(share5 - mono.share(5))).toBeLessThan(SHARE_TOL);
    expect(heavyCodaShare).toBeLessThan(0.1);
  });

  it("keeps forced disyllable mean phone length near the measured disyllable roots", () => {
    const words = sampleForced(SEED_DI, 2);
    expect(words.every((w) => w.syllables.length === 2)).toBe(true);
    const mean =
      words.reduce((sum, w) => sum + phonemeCount(w), 0) / words.length;
    expect(Math.abs(mean - di.mean)).toBeLessThan(MEAN_TOL);
  });
});
