import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, createSeededRng } from "../../../src/index.js";
import { englishSplitVowelSupports } from "../../../src/elements/graphemes/split-vowels.js";
import { createSplitObserver } from "./observe-split.js";

const config = { ...englishConfig, splitVowels: { supports: englishSplitVowelSupports, routes: {
  syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
} } };
describe("split measurement observer", () => {
  it("accounts for all source nuclei, trials and completions in public traces", () => {
    const generator = createGenerator(config); const observe = createSplitObserver(config); const rand = createSeededRng(129);
    let formed = 0; let completed = 0;
    for (let i = 0; i < 120; i++) {
      const word = generator.generateWord({ rand, trace: true, morphology: i % 2 === 0 });
      const base = word.trace!.baseSpelling!; if (base.version !== 5) throw new Error("Expected v5");
      const { counts, events } = observe(word);
      expect(["satisfied", "unresolved", "unavailable", "not-target"].reduce((n, status) => n + (counts[`finalRoot:${status}`] ?? 0), 0)).toBe(counts.rootNuclei);
      expect(counts.completionAttempts).toBe(counts.rootNuclei);
      expect(events.filter(event => event.category.startsWith("formation:")).length).toBe(base.split.attempts.length);
      expect(counts.formedConstructions).toBe(base.split.constructions.length);
      expect(counts.completionReplacements).toBe(base.completion.certificates.length);
      expect(Object.values(counts).every(value => Number.isSafeInteger(value) && value >= 0)).toBe(true);
      formed += counts.formedConstructions; completed += counts.completionReplacements;
    }
    expect(formed).toBeGreaterThan(0); expect(completed).toBeGreaterThan(0);
  });
  it("marks historical eligibility unavailable instead of reporting zero trials", () => {
    const word = createGenerator(englishConfig).generateWord({ seed: 129, trace: true });
    const observation = createSplitObserver(englishConfig)(word);
    expect(observation.counts.formationEligibilityUnavailableWords).toBe(1);
    expect(observation.counts.formationAttempts).toBeUndefined();
  });
  it("refuses damaged evidence before counting it", () => {
    const word = createGenerator(config).generateWord({ seed: 129, trace: true });
    word.trace!.baseSpelling!.cells[0].text = "!";
    expect(() => createSplitObserver(config)(word)).toThrow();
  });
});
