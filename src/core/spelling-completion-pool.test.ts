import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { spellingBoundaryContexts } from "./spelling-context.js";
import { createCompletionCandidatePool } from "./spelling-completion-pool.js";
import type { Grapheme } from "../types.js";

const slot = spellingBoundaryContexts(["eɪ", "t"].map((sound, id) => ({ id, part: "root", syllableIndex: 0,
  segment: id === 0 ? "nucleus" : "coda", segmentIndex: 0, soundAtSpelling: sound,
  boundary: { phoneme: englishConfig.phonemes.find(phone => phone.sound === sound)! } })))[0].slot;
const glyph = (form: string, frequency: number, extra: Partial<Grapheme> = {}): Grapheme => ({
  form, phoneme: "eɪ", frequency, origin: 0, reading: { kind: "single-phone" }, ...extra,
});
function pool(graphemes: Grapheme[]) {
  return createCompletionCandidatePool({ ...englishConfig, doubling: undefined, graphemes, ...buildGraphemeMaps(graphemes) });
}
describe("completion candidate resolver", () => {
  it("preserves resolver weights and distinct inventory entries while excluding zero weights", () => {
    const resolve = pool([glyph("ai", 3), glyph("ay", 0), glyph("ai", 7)]);
    expect(resolve(slot, { doublingCount: 0 })).toMatchObject({ status: "available", pool: "ordinary",
      proposals: [{ inventoryIndex: 0, form: "ai", weight: 3 }, { inventoryIndex: 2, form: "ai", weight: 7 }] });
  });
  it("does not expose fallback-only entries when ordinary readings need completion", () => {
    const resolve = pool([glyph("a", 5, { reading: { kind: "open-vowel-or-split-marker" } }), glyph("ai", 1, { fallbackOnly: true })]);
    expect(resolve(slot, { doublingCount: 0 })).toMatchObject({ status: "available", pool: "ordinary",
      proposals: [{ inventoryIndex: 0, refusal: "unresolved-vowel-obligation" }] });
  });
  it("retains the existing empty-ordinary-pool fallback rule", () => {
    const resolve = pool([glyph("a", 0), glyph("ai", 2, { fallbackOnly: true })]);
    expect(resolve(slot, { doublingCount: 0 })).toMatchObject({ status: "available", pool: "fallback",
      proposals: [{ inventoryIndex: 1, weight: 2 }] });
  });
  it("reports no legal grapheme without inventing a spelling", () => {
    expect(pool([glyph("ai", 0)])(slot, { doublingCount: 0 })).toEqual({ status: "unavailable", reason: "no-legal-grapheme" });
  });
  it("retains unsupported and unknown readings as explicit refusals", () => {
    const resolve = pool([glyph("ae", 1, { reading: undefined }), glyph("ea", 1, { reading: { kind: "unsupported-construction", reason: "lexical" } })]);
    expect(resolve(slot, { doublingCount: 0 })).toMatchObject({ proposals: [{ refusal: "unknown-reading" }, { refusal: "unsupported-reading" }] });
  });
});
