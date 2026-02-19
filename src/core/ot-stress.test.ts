import { describe, it, expect } from "vitest";
import {
  otEvaluate,
  WSP,
  ALIGN_LEFT,
  ALIGN_RIGHT,
  NONFINALITY,
  OTStressConfig,
} from "./ot-stress.js";
import type { Phoneme, Syllable } from "../types.js";
import { createSeededRng } from "../utils/random.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Make a light syllable (empty coda, single nucleus). */
const light = (): Syllable => ({
  onset: [],
  nucleus: [{ sound: "æ", type: "vowel", ipa: "æ" } as Phoneme],
  coda: [],
});

/** Make a heavy syllable (has coda). */
const heavy = (): Syllable => ({
  onset: [],
  nucleus: [{ sound: "æ", type: "vowel", ipa: "æ" } as Phoneme],
  coda: [{ sound: "n", type: "consonant", ipa: "n" } as Phoneme],
});

// ---------------------------------------------------------------------------
// Individual constraint tests
// ---------------------------------------------------------------------------

describe("OT constraints", () => {
  describe("WSP (Weight-to-Stress)", () => {
    it("returns 0 when stressed syllable is heavy", () => {
      expect(WSP.evaluate([heavy(), light()], 0)).toBe(0);
    });

    it("penalizes stressing a light syllable when heavy exists", () => {
      expect(WSP.evaluate([light(), heavy()], 0)).toBe(1);
    });

    it("returns 0 when all syllables are light", () => {
      expect(WSP.evaluate([light(), light()], 0)).toBe(0);
    });

    it("counts multiple unstressed heavy syllables", () => {
      expect(WSP.evaluate([light(), heavy(), heavy()], 0)).toBe(2);
    });
  });

  describe("ALIGN-LEFT", () => {
    it("returns 0 for initial stress", () => {
      expect(ALIGN_LEFT.evaluate([light(), light(), light()], 0)).toBe(0);
    });

    it("returns syllable index as violation count", () => {
      expect(ALIGN_LEFT.evaluate([light(), light(), light()], 2)).toBe(2);
    });
  });

  describe("ALIGN-RIGHT", () => {
    it("returns 0 for final stress", () => {
      expect(ALIGN_RIGHT.evaluate([light(), light(), light()], 2)).toBe(0);
    });

    it("returns distance from right edge", () => {
      expect(ALIGN_RIGHT.evaluate([light(), light(), light()], 0)).toBe(2);
    });
  });

  describe("NONFINALITY", () => {
    it("returns 1 for final stress", () => {
      expect(NONFINALITY.evaluate([light(), light()], 1)).toBe(1);
    });

    it("returns 0 for non-final stress", () => {
      expect(NONFINALITY.evaluate([light(), light()], 0)).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Evaluator tests
// ---------------------------------------------------------------------------

describe("otEvaluate", () => {
  it("returns 0 for monosyllables", () => {
    const config: OTStressConfig = {
      constraints: [{ name: "ALIGN-LEFT", weight: 10 }],
      noise: 0,
    };
    expect(otEvaluate([light()], config, Math.random)).toBe(0);
  });

  it("strong ALIGN-LEFT always picks initial stress (no noise)", () => {
    const config: OTStressConfig = {
      constraints: [
        { name: "ALIGN-LEFT", weight: 100 },
        { name: "ALIGN-RIGHT", weight: 1 },
      ],
      noise: 0,
    };
    const syls = [light(), light(), light()];
    expect(otEvaluate(syls, config, Math.random)).toBe(0);
  });

  it("strong ALIGN-RIGHT + no NONFINALITY picks final stress (no noise)", () => {
    const config: OTStressConfig = {
      constraints: [
        { name: "ALIGN-RIGHT", weight: 100 },
        { name: "ALIGN-LEFT", weight: 1 },
      ],
      noise: 0,
    };
    const syls = [light(), light(), light()];
    expect(otEvaluate(syls, config, Math.random)).toBe(2);
  });

  it("NONFINALITY blocks final stress when weighted high enough", () => {
    const config: OTStressConfig = {
      constraints: [
        { name: "ALIGN-RIGHT", weight: 5 },
        { name: "NONFINALITY", weight: 20 },
      ],
      noise: 0,
    };
    const syls = [light(), light(), light()];
    // ALIGN-RIGHT wants final, but NONFINALITY blocks it
    // Penult (index 1): ALIGN-RIGHT = 1, NONFINALITY = 0 → score = 5
    // Final (index 2): ALIGN-RIGHT = 0, NONFINALITY = 1 → score = 20
    // Initial (index 0): ALIGN-RIGHT = 2, NONFINALITY = 0 → score = 10
    expect(otEvaluate(syls, config, Math.random)).toBe(1);
  });

  it("WSP prefers heavy syllables", () => {
    const config: OTStressConfig = {
      constraints: [{ name: "WSP", weight: 100 }],
      noise: 0,
    };
    const syls = [light(), heavy(), light()];
    expect(otEvaluate(syls, config, Math.random)).toBe(1);
  });

  it("noise produces variation across runs", () => {
    const config: OTStressConfig = {
      constraints: [
        { name: "ALIGN-LEFT", weight: 5 },
        { name: "ALIGN-RIGHT", weight: 4 },
        { name: "NONFINALITY", weight: 6 },
      ],
      noise: 3,
    };
    const syls = [light(), light(), light()];
    const results = new Set<number>();
    const rand = createSeededRng(42);
    for (let i = 0; i < 500; i++) {
      results.add(otEvaluate(syls, config, rand));
    }
    // With noise=3 and close weights, we should see multiple positions
    expect(results.size).toBeGreaterThan(1);
  });

  it("deterministic with seed and no noise", () => {
    const config: OTStressConfig = {
      constraints: [
        { name: "WSP", weight: 4 },
        { name: "ALIGN-LEFT", weight: 8 },
        { name: "NONFINALITY", weight: 10 },
      ],
      noise: 0,
    };
    const syls = [light(), heavy(), light()];
    const a = otEvaluate(syls, config, createSeededRng(1));
    const b = otEvaluate(syls, config, createSeededRng(1));
    expect(a).toBe(b);
  });

  it("skips unknown constraint names gracefully", () => {
    const config: OTStressConfig = {
      constraints: [
        { name: "FAKE-CONSTRAINT", weight: 100 },
        { name: "ALIGN-LEFT", weight: 10 },
      ],
      noise: 0,
    };
    // Should not throw, just ignore the unknown one
    expect(otEvaluate([light(), light()], config, Math.random)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Distribution test — English config should produce reasonable stress
// ---------------------------------------------------------------------------

describe("English OT stress distribution", () => {
  it("produces >40% initial stress for 3-syllable words", () => {
    const config: OTStressConfig = {
      constraints: [
        { name: "WSP", weight: 4 },
        { name: "ALIGN-LEFT", weight: 8 },
        { name: "ALIGN-RIGHT", weight: 3 },
        { name: "NONFINALITY", weight: 10 },
      ],
      noise: 2,
    };
    const rand = createSeededRng(12345);
    const counts = [0, 0, 0];
    const n = 10000;
    for (let i = 0; i < n; i++) {
      // Mix of light and heavy syllables
      const syls = [
        rand() < 0.4 ? heavy() : light(),
        rand() < 0.4 ? heavy() : light(),
        rand() < 0.4 ? heavy() : light(),
      ];
      counts[otEvaluate(syls, config, rand)]++;
    }
    const initialPct = (counts[0] / n) * 100;
    const finalPct = (counts[2] / n) * 100;
    // Initial stress should dominate (ALIGN-LEFT + NONFINALITY)
    expect(initialPct).toBeGreaterThan(40);
    // Final stress should be rare (NONFINALITY penalty)
    expect(finalPct).toBeLessThan(15);
  });
});
