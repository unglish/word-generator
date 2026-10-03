import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../../index.js";
import { createSeededRng } from "../../utils/random.js";
import type { MorphologyCategories } from "./categories.js";
const profile = JSON.parse(readFileSync(new URL("../../../evaluation/experiments/stem-affix-compatibility/experimental-profile.json", import.meta.url), "utf8")) as { model: MorphologyCategories };
function configuration() {
  const config = structuredClone(englishConfig);
  config.morphology!.categories = structuredClone(profile.model);
  return config;
}
describe("category-aware public generation", () => {
  it("records a continuous licensed category path in deterministic public outputs", () => {
    const generator = createGenerator(configuration());
    const rand = createSeededRng(20261002);
    let affixed = 0;
    for (let index = 0; index < 1000; index++) {
      const word = generator.generateWord({ rand, trace: true });
      const morphology = word.trace!.morphology!;
      const decision = morphology.categories!;
      expect(decision.eligiblePaths).toBeGreaterThan(0);
      let category = decision.retained.stem;
      for (const step of decision.retained.steps) {
        const sense = profile.model.senses.find(sense => sense.id === step.sense)!;
        expect(sense.transitions).toContainEqual({ input: step.input, output: step.output });
        expect(step.input).toBe(category); category = step.output;
      }
      expect(decision.retained.final).toBe(category);
      expect(Boolean(decision.retained.prefixSense)).toBe(Boolean(morphology.prefix));
      expect(Boolean(decision.retained.suffixSense)).toBe(Boolean(morphology.suffix));
      if (decision.retained.steps.length) affixed++;
    }
    expect(affixed).toBeGreaterThan(500);
  });
  it("recomputes the retained path when a forced short both plan drops its prefix", () => {
    const config = configuration();
    for (const mode of ["text", "lexicon"] as const) config.morphology!.templateWeights[mode] = { bare: 0, prefixed: 0, suffixed: 0, both: 1 };
    const generator = createGenerator(config);
    for (let seed = 0; seed < 50; seed++) {
      const word = generator.generateWord({ seed, syllableCount: 1, trace: true });
      const morphology = word.trace!.morphology!;
      expect(morphology.template).toBe("suffixed");
      expect(morphology.categories!.requestedTemplate).toBe("both");
      expect(morphology.categories!.planned.prefixSense).toBeDefined();
      expect(morphology.categories!.retained.prefixSense).toBeUndefined();
      expect(morphology.categories!.retained.steps).toHaveLength(1);
      expect(morphology.categories!.retained.steps[0].input).toBe(morphology.categories!.retained.stem);
    }
  });
  it("preserves traced/plain output and next RNG state with the policy active", () => {
    const generator = createGenerator(configuration()), traced = createSeededRng(27), plain = createSeededRng(27);
    for (let index = 0; index < 100; index++) {
      const word = generator.generateWord({ rand: traced, trace: true });
      delete word.trace;
      expect(word).toEqual(generator.generateWord({ rand: plain }));
    }
    expect(traced()).toBe(plain());
  });
});
