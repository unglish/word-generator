import { createGraphemeResolver } from "./grapheme-selection.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { englishDoublingRealizations } from "../elements/graphemes/doubling.js";
import type { Grapheme } from "../types.js";
import { createDoublingModel, type DoublingSlot } from "./spelling-doubling.js";

const config = { ...englishConfig.doubling!, probability: 100, finalDoublingOnly: [], neverDoubleFinal: [] };
function slot(sound: string, form: string, extra: Partial<DoublingSlot> = {}): DoublingSlot {
  return { phoneme: englishConfig.phonemes.find(p => p.sound === sound)!, form,
    position: "coda", prevPhoneme: englishConfig.phonemes.find(p => p.sound === "æ")!, nucleusForm: "a",
    stress: "ˈ", prevReduced: false, isCluster: false, isFirstInCoda: true,
    isLastPhoneme: true, isEndOfWord: true, isMonosyllabic: true, nextIsConsonant: false, ...extra };
}
function glyph(sound: string, form: string): Grapheme {
  return { phoneme: sound, form, frequency: 1, origin: 0, reading: { kind: "following-letter", forbid: ["e", "i", "y"] } };
}

describe("sound-specific doubling support", () => {
  it.each(englishDoublingRealizations)("supports $phoneme / $from → $to without a pure-planner draw", rule => {
    const model = createDoublingModel(config); const input = slot(rule.phoneme, rule.from);
    expect(model.describe(input, 0)).toEqual({ kind: "probabilistic", form: rule.from, probability: 100, doubledForm: rule.to });
    let draws = 0; const state = { doublingCount: 0 };
    expect(model.sample(input, state, () => { draws++; return 0.9; })).toBe(rule.to);
    expect(draws).toBe(1); expect(state.doublingCount).toBe(1);
    expect(model.describe(input, 0)).toMatchObject({ doubledForm: rule.to });
  });
  it.each([["s", "c"], ["z", "s"], ["ʃ", "s"]])("does not expand unsupported %s / %s", (sound, form) => {
    const model = createDoublingModel(config); const state = { doublingCount: 0 };
    expect(model.describe(slot(sound, form), 0)).toMatchObject({ kind: "fixed", reason: "unsupported-realization" });
    expect(model.sample(slot(sound, form), state, () => { throw new Error("Unexpected RNG draw"); })).toBe(form);
    expect(state.doublingCount).toBe(0);
  });
  it.each(["k", "s"])("counts direct ck only for its configured sound: %s", sound => {
    expect(createDoublingModel(config).describe(slot(sound, "ck"), 0)).toMatchObject({
      kind: "fixed", reason: "multi-char-grapheme", countIncrement: sound === "k" ? 1 : 0,
    });
  });
  it("retains the direct-selection guard order", () => {
    const model = createDoublingModel(config);
    expect(model.describe(slot("k", "ck", { isCluster: true }), 0)).toMatchObject({ reason: "in-cluster", countIncrement: 0 });
    expect(model.describe(slot("k", "ck", { nextIsConsonant: true }), 0)).toMatchObject({ reason: "coda-before-consonant", countIncrement: 0 });
  });
  it("permits only declared first-coda cluster expansions", () => {
    const model = createDoublingModel(config);
    expect(model.describe(slot("k", "c", { isCluster: true }), 0)).toMatchObject({ doubledForm: "ck" });
    for (const input of [slot("s", "c", { isCluster: true }), slot("p", "p", { isCluster: true }),
      slot("k", "c", { isCluster: true, isFirstInCoda: false }), slot("k", "c", { isCluster: true, position: "onset" })]) {
      expect(model.describe(input, 0)).toMatchObject({ kind: "fixed", reason: "in-cluster" });
    }
  });
  it("retains quota and failed-roll accounting", () => {
    const model = createDoublingModel({ ...config, probability: 50 });
    const state = { doublingCount: 0 }; let draws = 0;
    expect(model.sample(slot("s", "s"), state, () => { draws++; return 0.75; })).toBe("s");
    expect(draws).toBe(1); expect(state.doublingCount).toBe(0);
    expect(model.describe(slot("s", "s"), 1)).toMatchObject({ reason: "max-per-word" });
  });
  it("retains legacy form overrides and equal-text success when policy is omitted", () => {
    const model = createDoublingModel({ ...config, realizations: undefined, doubledForms: { c: "ck", s: "s" } });
    expect(model.describe(slot("s", "c"), 0)).toMatchObject({ doubledForm: "ck" });
    const state = { doublingCount: 0 }; let draws = 0;
    expect(model.sample(slot("z", "s"), state, () => { draws++; return 0; })).toBe("s");
    expect(state.doublingCount).toBe(1); expect(draws).toBe(1);
  });
  it("treats an empty structured policy as no expansion, without legacy fallback", () => {
    expect(createDoublingModel({ ...config, realizations: [] }).describe(slot("k", "c"), 0))
      .toMatchObject({ reason: "unsupported-realization" });
  });
  it("uses the resulting reading rather than the selected hard-c obligation", () => {
    const model = createDoublingModel(config); const g = glyph("k", "c");
    expect(model.readingFor(g, "ck")).toEqual({ kind: "single-phone" });
    expect(model.readingFor(g, "c")).toEqual(g.reading);
    expect(model.readingFor(glyph("s", "c"), "ck")).toBeUndefined();
    expect(model.readingFor(g, "cc")).toBeUndefined();
  });
  it("detaches configured output obligations from caller mutation", () => {
    const rules = [{ phoneme: "k", from: "c", to: "ck", reading: { kind: "following-letter" as const, require: ["e"] } }];
    const model = createDoublingModel({ ...config, realizations: rules });
    rules[0].reading.require[0] = "a";
    const reading = model.readingFor(glyph("k", "c"), "ck");
    expect(reading).toEqual({ kind: "following-letter", require: ["e"] });
    if (reading?.kind === "following-letter") reading.require!.push("i");
    expect(model.readingFor(glyph("k", "c"), "ck")).toEqual({ kind: "following-letter", require: ["e"] });
  });
  it("rejects ambiguous duplicate relations and nonsensical expansion shapes", () => {
    const rule = englishDoublingRealizations[0];
    for (const rules of [[rule, rule], [{ ...rule, from: "bb" }], [{ ...rule, to: "b" }], [{ ...rule, phoneme: "" }]]) {
      expect(() => createDoublingModel({ ...config, realizations: rules })).toThrow(/doubling realization/);
    }
  });
});


it("applies sound-specific direct-form quota preferences in the shared resolver", () => {
  for (const sound of ["k", "s"]) {
    const graphemes = [glyph(sound, "ck"), glyph(sound, "c")];
    const resolve = createGraphemeResolver({ ...englishConfig, doubling: config, graphemes, ...buildGraphemeMaps(graphemes) });
    const pool = resolve({ phoneme: slot(sound, "c").phoneme, index: 1, total: 2,
      position: "coda", syllableIndex: 0, syllableCount: 1, onsetLength: 0, nucleusLength: 1, codaLength: 1, isCluster: false },
    { previousForm: "a", doublingCount: 1 });
    expect(pool.weights.map(([g]) => g.form)).toEqual(sound === "k" ? ["c"] : ["ck", "c"]);
  }
});


it("rejects malformed output-reading contracts from JavaScript callers", () => {
  for (const reading of [null, { kind: "typo" }, { kind: "following-letter", require: ["th"] }]) {
    const invalid = { ...englishDoublingRealizations[0], reading };
    expect(() => createDoublingModel({ ...config, realizations: [invalid as unknown as typeof englishDoublingRealizations[number]] }))
      .toThrow(/doubling realization/);
  }
});
