import { describe, it, expect } from "vitest";
import { generateWord } from "./generate";

// ---------------------------------------------------------------------------
// Y-as-vowel frequency and consonant counting tests (#63)
// ---------------------------------------------------------------------------

describe("Y-as-vowel improvements (#63)", () => {
  describe("Y appears word-finally at a reasonable rate", () => {
    it("at least 2% of generated words end in Y", () => {
      const total = 10_000;
      let yFinalCount = 0;

      for (let i = 0; i < total; i++) {
        const word = generateWord({ seed: i });
        if (word.written.clean.toLowerCase().endsWith("y")) {
          yFinalCount++;
        }
      }

      const rate = yFinalCount / total;
      console.log(`  Y-final rate: ${(rate * 100).toFixed(1)}% (${yFinalCount}/${total})`);
      expect(rate).toBeGreaterThanOrEqual(0.02);
    });
  });

  describe("Y appears in generated words overall", () => {
    it("at least 5% of words contain Y", () => {
      const total = 10_000;
      let yCount = 0;

      for (let i = 0; i < total; i++) {
        const word = generateWord({ seed: i });
        if (word.written.clean.toLowerCase().includes("y")) {
          yCount++;
        }
      }

      const rate = yCount / total;
      console.log(`  Y-containing rate: ${(rate * 100).toFixed(1)}% (${yCount}/${total})`);
      expect(rate).toBeGreaterThanOrEqual(0.05);
    });
  });
});
