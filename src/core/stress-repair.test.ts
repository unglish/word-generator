import { describe, it, expect } from "vitest";
import { generateWords } from "./generate.js";

describe("stress-aware nucleus re-pick", () => {
  it("no primary-stressed schwa in 10,000 words", { timeout: 20_000 }, () => {
    const words = generateWords(10_000, { seed: 123 });
    let stressedSchwaCount = 0;

    for (const word of words) {
      for (const syl of word.syllables) {
        if (syl.stress === "ˈ" && syl.nucleus[0]?.sound === "ə") {
          stressedSchwaCount++;
        }
      }
    }

    expect(stressedSchwaCount).toBe(0);
  });

  it("monosyllables can still have schwa nucleus (no stress marker)", { timeout: 20_000 }, () => {
    const words = generateWords(10_000, { seed: 456, syllableCount: 1 });
    let schwaCount = 0;

    for (const word of words) {
      if (word.syllables[0]?.nucleus[0]?.sound === "ə") {
        schwaCount++;
      }
    }

    // Monosyllables have no stress marker, so schwa should still appear
    expect(schwaCount).toBeGreaterThan(0);
  });
});
