import { describe, expect, it } from "vitest";
import { categoryPaths, validateCategoryModel, type MorphologyCategories } from "./categories.js";
const weights = { prefix: [18], suffix: [13, 17] };
const model: MorphologyCategories = {
  stems: [{ id: "noun", weight: 2 }, { id: "verb", weight: 3 }, { id: "adjective", weight: 5 }],
  order: "suffix-then-prefix",
  senses: [
    { id: "negative", affix: { type: "prefix", index: 0 }, weight: 7, transitions: [{ input: "adjective", output: "adjective" }] },
    { id: "reversal", affix: { type: "prefix", index: 0 }, weight: 11, transitions: [{ input: "verb", output: "verb" }] },
    { id: "nominal", affix: { type: "suffix", index: 0 }, weight: 13, transitions: [{ input: "adjective", output: "noun" }] },
    { id: "adjectival", affix: { type: "suffix", index: 1 }, weight: 17, transitions: [{ input: "verb", output: "adjective" }] },
  ],
};
describe("typed lexical category paths", () => {
  it("retains every permitted sense and records exact intermediate categories", () => {
    validateCategoryModel(model, { prefix: 1, suffix: 2 });
    expect(categoryPaths(model, "bare", weights).map(path => path.stem)).toEqual(["noun", "verb", "adjective"]);
    expect(categoryPaths(model, "prefixed", weights).map(path => path.prefixSense)).toEqual(["reversal", "negative"]);
    expect(categoryPaths(model, "both", weights)).toEqual([{ stem: "verb", final: "adjective", weight: 3*17*7,
      prefixSense: "negative", suffixSense: "adjectival", steps: [
        { sense: "adjectival", input: "verb", output: "adjective" },
        { sense: "negative", input: "adjective", output: "adjective" },
      ] }]);
  });
  it("makes construction order explicit rather than assuming written order", () => {
    const paths = categoryPaths({ ...model, order: "prefix-then-suffix" }, "both", weights);
    expect(paths).toHaveLength(2);
    expect(paths.map(path => path.steps.map(step => step.sense))).toEqual([["reversal", "adjectival"], ["negative", "nominal"]]);
  });
  it("rejects missing contracts and ambiguous category transitions", () => {
    expect(() => validateCategoryModel(model, { prefix: 1, suffix: 3 })).toThrow("Every configured affix");
    const changed = structuredClone(model);
    changed.senses[0].transitions.push({ input: "adjective", output: "noun" });
    expect(() => validateCategoryModel(changed, { prefix: 1, suffix: 2 })).toThrow("unambiguous");
  });
  it("rejects invalid weights, references, categories and inventory sizes", () => {
    for (const weight of [0, -1, Infinity, NaN]) {
      const changed = structuredClone(model); changed.stems[0].weight = weight;
      expect(() => validateCategoryModel(changed, { prefix: 1, suffix: 2 })).toThrow("weights");
    }
    const unknown = structuredClone(model); unknown.senses[0].transitions[0].output = "unknown";
    expect(() => validateCategoryModel(unknown, { prefix: 1, suffix: 2 })).toThrow("unambiguous");
    const missing = structuredClone(model); missing.senses[0].affix.index = 2;
    expect(() => validateCategoryModel(missing, { prefix: 1, suffix: 2 })).toThrow("existing");
    expect(() => validateCategoryModel(model, { prefix: 1, suffix: -1 })).toThrow("nonnegative");
  });
  it("divides affix frequency across senses and excludes zero-frequency affixes", () => {
    const paths = categoryPaths(model, "prefixed", { prefix: [1], suffix: [13, 17] });
    expect(paths[0].weight).toBeCloseTo(3*11/18);
    expect(paths[1].weight).toBeCloseTo(5*7/18);
    expect(categoryPaths(model, "suffixed", { prefix: [18], suffix: [0, 17] }).map(path => path.suffixSense)).toEqual(["adjectival"]);
  });
  it("returns an empty pool instead of admitting an incompatible transition", () => {
    const changed = structuredClone(model);
    changed.senses[0].transitions = [{ input: "noun", output: "noun" }];
    changed.senses[1].transitions = [{ input: "noun", output: "noun" }];
    changed.senses[2].transitions = [{ input: "adjective", output: "verb" }];
    expect(categoryPaths(changed, "both", weights)).toEqual([]);
  });
});
