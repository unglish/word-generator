import { describe, expect, it } from "vitest";
import { assessLegacyOrigin, compileLexicalStyle } from "./lexical-style.js";
import type { LexicalStylePolicy } from "./lexical-style-model.js";

function fixture(): LexicalStylePolicy {
  return { version: "soft-orthographic-style-v1", strength: 1,
    styles: [{ style: { id: "plain", label: "Plain", interpretation: "Experimental plain spelling affinity; no etymological claim." }, prior: 3 },
      { style: { id: "marked", label: "Marked", interpretation: "Experimental marked spelling affinity; no etymological claim." }, prior: 1 }],
    sources: [{ id: "example", title: "Fixture source", url: "https://example.test/source", accessed_at: "2026-10-03", claim_scope: "lexeme-history" }],
    features: [{ phoneme: "f", form: "ph", source_ids: ["example"], strength_basis: "experimental-heuristic",
      associations: [{ style_id: "plain", multiplier: .5 }, { style_id: "marked", multiplier: 2 }] }] };
}
describe("soft orthographic style kernel", () => {
  it("preserves invalid legacy codes as unsourced unknowns instead of inventing a language", () => {
    const labels = ["Germanic", "French", "Greek", "Latin", "Other"];
    expect(assessLegacyOrigin(5, labels)).toEqual({ code: 5, label: null, status: "unsourced-legacy" });
    expect(assessLegacyOrigin(3, labels)).toEqual({ code: 3, label: "Latin", status: "unsourced-legacy" });
    expect(() => assessLegacyOrigin(NaN, labels)).toThrow();
  });
  it("disables omission and zero strength before any random choice", () => {
    expect(compileLexicalStyle(undefined, "fixture")).toBeNull();
    expect(compileLexicalStyle({ ...fixture(), strength: 0 }, "fixture")).toBeNull();
  });
  it("uses exactly one profile draw and keeps normalized priors as evidence", () => {
    const compiled = compileLexicalStyle(fixture(), "fixture")!; let draws = 0;
    expect(compiled.choose(() => { draws++; return .749; }).style_id).toBe("plain");
    const marked = compiled.choose(() => { draws++; return .75; }); expect(marked.style_id).toBe("marked");
    expect(draws).toBe(2); expect(marked.normalized_priors).toEqual([{ style_id: "plain", probability: .75 }, { style_id: "marked", probability: .25 }]);
    expect(() => compiled.choose(() => 1)).toThrow();
  });
  it("preserves candidate support, object identity and unassessed neutrality while sharing a word choice", () => {
    const compiled = compileLexicalStyle(fixture(), "fixture")!, choice = compiled.choose(() => .9);
    const simple = { phoneme: "f", form: "f" }, marked = { phoneme: "f", form: "ph" }, boundary = { phoneme: "p", form: "ph" };
    const result = compiled.apply([[simple, 10], [marked, 2], [boundary, 3]], choice);
    expect(result.weights).toEqual([[simple, 10], [marked, 4], [boundary, 3]]); expect(result.weights[1][0]).toBe(marked);
    expect(result.evidence[1]).toMatchObject({ base_weight: 2, multiplier: 2, final_weight: 4, association_source_ids: ["example"] });
    expect(compiled.apply([[marked, 2]], choice).weights[0][1]).toBe(4);
    expect(compiled.apply([], choice).weights).toEqual([]);
  });
  it("interpolates strength without turning styles into hard filters", () => {
    const compiled = compileLexicalStyle({ ...fixture(), strength: .5 }, "fixture")!;
    const option = { phoneme: "f", form: "ph" };
    expect(compiled.apply([[option, 4]], compiled.choose(() => 0)).weights[0][1]).toBe(3);
    expect(compiled.apply([[option, 4]], compiled.choose(() => .9)).weights[0][1]).toBe(6);
  });
  it("freezes the policy and rejects invalid source/association/weight contracts", () => {
    const policy = fixture(), compiled = compileLexicalStyle(policy, "fixture")!; policy.features[0].associations[1].multiplier = .5;
    const choice = compiled.choose(() => .9), option = { phoneme: "f", form: "ph" };
    expect(compiled.apply([[option, 4]], choice).weights[0][1]).toBe(8);
    expect(() => compiled.apply([[option, 0]], choice)).toThrow();
    expect(() => compiled.apply([[option, Infinity]], choice)).toThrow();
    expect(() => compiled.apply([[option, Number.MAX_VALUE]], choice)).toThrow();
    expect(() => compiled.apply([[option, 1]], { ...choice, profile_id: "foreign" })).toThrow();
    expect(() => compiled.apply([[option, 1]], { ...choice, draw: 0 })).toThrow();
    expect(() => compiled.apply([[option, 1]], { ...choice, normalized_priors: [] })).toThrow();
    for (const mutate of [(p: LexicalStylePolicy) => { p.styles[1].prior = 0; },
      (p: LexicalStylePolicy) => { p.features[0].source_ids = ["missing"]; },
      (p: LexicalStylePolicy) => { p.features[0].associations.pop(); },
      (p: LexicalStylePolicy) => { p.features[0].associations[0].multiplier = 0; },
      (p: LexicalStylePolicy) => { p.styles[0].prior = Number.MIN_VALUE; p.styles[1].prior = Number.MAX_VALUE; },
      (p: LexicalStylePolicy) => { p.sources[0].accessed_at = "2026-02-31"; }]) {
      const invalid = fixture(); mutate(invalid); expect(() => compileLexicalStyle(invalid, "fixture")).toThrow();
    }
  });
});
