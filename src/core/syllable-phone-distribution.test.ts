import { describe, expect, it } from "vitest";
import { createGenerator } from "./generate.js";
import { englishConfig } from "../config/english.js";
import { lexiconReference } from "../config/lexicon-reference.js";
import { createSeededRng } from "../utils/random.js";
import type { Word } from "../types.js";

// #443 guards automatic root sampling against bias from the spelling score.
// Center the same margins on the independently measured root population.
const SEEDS = [42, 43, 44] as const;
const SAMPLE_PER_SEED = 40_000;

const { syllables } = lexiconReference.root;
const joint: Record<number, [number, number][]> = lexiconReference.syllablesByPhoneLength;
const total = Object.values(syllables).reduce((sum, count) => sum + count, 0);
const at = (phones: number, count: number) => joint[phones]?.find(([syllables]) => syllables === count)?.[1] ?? 0;

const targets = {
  monoShare: [syllables[1] / total, 0.025],
  twoSylShare: [syllables[2] / total, 0.025],
  monoPhones3: [at(3, 1) / syllables[1], 0.035],
  monoPhones4: [at(4, 1) / syllables[1], 0.035],
  monoPhones5: [at(5, 1) / syllables[1], 0.035],
  twoSylPhones6: [at(6, 2) / syllables[2], 0.04],
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

function checkStats(words: Word[], label: string) {
  const observed = collectStats(words);
  for (const key of Object.keys(targets) as Array<keyof typeof targets>) {
    const [expected, margin] = targets[key];
    expect(Math.abs(observed[key] - expected), `${label} ${key}`).toBeLessThanOrEqual(margin);
  }
}

describe("lexicon syllable/phone-count distribution", () => {
  it(
    "matches the measured root joint distribution across seeds 42/43/44",
    () => {
      const pooled: Word[] = [];

      for (const seed of SEEDS) {
        const words = sampleLexiconBare(seed, SAMPLE_PER_SEED);
        pooled.push(...words);
        checkStats(words, `seed ${seed}`);
      }
      checkStats(pooled, "pooled");
    },
    180_000,
  );
});
