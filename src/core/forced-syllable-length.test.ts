import { describe, expect, it } from "vitest";
import { generateWords } from "../index.js";
import type { Word } from "../types.js";

// A requested syllable count used to draw its target phoneme count from the
// whole-lexicon length distribution, so a requested monosyllable aimed at about
// six phonemes and the consonant plan packed the surplus into clusters (37% of
// codas had three or more consonants, against 3.5% for monosyllables chosen
// automatically and 7% in CMU). The target is now conditioned on the count.

const SAMPLE = 20000;

const phonemeCount = (word: Word): number =>
  word.syllables.reduce((sum, syllable) => sum + syllable.onset.length + syllable.nucleus.length + syllable.coda.length, 0);

const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

function automaticWithSyllables(syllables: number, seed: number): Word[] {
  return generateWords(SAMPLE, { seed, mode: "lexicon", morphology: false }).filter(word => word.syllables.length === syllables);
}

describe("requested syllable counts", () => {
  it("gives requested monosyllables automatic-monosyllable lengths and codas", () => {
    const requested = generateWords(SAMPLE / 4, { seed: 1301, mode: "lexicon", morphology: false, syllableCount: 1 });
    const automatic = automaticWithSyllables(1, 1302);
    expect(automatic.length).toBeGreaterThan(1000);
    expect(requested.every(word => word.syllables.length === 1)).toBe(true);

    expect(Math.abs(mean(requested.map(phonemeCount)) - mean(automatic.map(phonemeCount)))).toBeLessThan(0.25);
    const heavyCodaShare = requested.filter(word => word.syllables[0].coda.length >= 3).length / requested.length;
    expect(heavyCodaShare).toBeLessThan(0.1);
  });

  it("gives requested disyllables automatic-disyllable lengths", () => {
    const requested = generateWords(SAMPLE / 4, { seed: 1303, mode: "lexicon", morphology: false, syllableCount: 2 });
    const automatic = automaticWithSyllables(2, 1304);
    expect(requested.every(word => word.syllables.length === 2)).toBe(true);
    expect(Math.abs(mean(requested.map(phonemeCount)) - mean(automatic.map(phonemeCount)))).toBeLessThan(0.25);
  });
});
