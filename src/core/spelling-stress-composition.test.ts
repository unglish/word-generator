import { describe, expect, it } from "vitest";
import { createGenerator } from "./generate.js";
import { englishConfig } from "../config/english.js";

describe("spelling and lexical stress composition", () => {
  it("retains final budget diagnostics for a planned bare word", () => {
    const weights = { bare: 1, prefixed: 0, suffixed: 0, both: 0 };
    const generator = createGenerator({
      ...englishConfig,
      morphology: { ...englishConfig.morphology!, templateWeights: { text: weights, lexicon: weights } },
      writtenFormConstraints: { ...englishConfig.writtenFormConstraints, policy: "preserve-phones" },
    });
    const word = generator.generateWord({ seed: 19, morphology: true, trace: true });
    expect(word.trace!.morphology!.template).toBe("bare");
    expect(word.trace!.spellingBudgets?.some(entry => entry.scope === "final-morphology")).toBe(true);
    expect(word.trace!.stages.filter(stage => stage.name === "generatePronunciation")).toHaveLength(1);
  });
});
