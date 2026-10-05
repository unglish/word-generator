import { describe, expect, it, vi } from "vitest";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import type { Grapheme } from "../types.js";
import { BaseSpelling } from "./base-spelling.js";
import { createCompletionPlanner } from "./spelling-completion-planner.js";

function fixture(alternatives: Grapheme[] = []) {
  const graphemes: Grapheme[] = [
    { phoneme: "k", form: "c", frequency: 1, origin: 0, reading: { kind: "following-letter", forbid: ["e", "i", "y"] } },
    { phoneme: "eɪ", form: "a", frequency: 1, origin: 0, reading: { kind: "open-vowel-or-split-marker" } },
    { phoneme: "t", form: "t", frequency: 1, origin: 0, reading: { kind: "single-phone" } }, ...alternatives,
  ];
  const base = new BaseSpelling(graphemes.slice(0, 3).map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: id === 0 ? "onset" : id === 1 ? "nucleus" : "coda", segmentIndex: 0, soundAtSpelling: entry.phoneme,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.phoneme)!) } })), true, true, true);
  graphemes.slice(0, 3).forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  const config = { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes), doubling: undefined, sharedSpellings: [] };
  return { base, planner: createCompletionPlanner(config, []) };
}
const alternative = (form: string, frequency = 1, fallbackOnly = false): Grapheme => ({
  phoneme: "eɪ", form, frequency, origin: 0, reading: { kind: "single-phone" }, fallbackOnly,
});
describe("replayable completion decisions", () => {
  it("authenticates the opaque written boundary and still refuses changed neighbor readings", () => {
    const { base, planner } = fixture([alternative("ai"), alternative("ei")]);
    base.edit(0, 1, "cc", "opaque-prefix", 0);
    const view = base.constructionState(); const before = structuredClone(view);
    const rand = vi.fn(() => 0.5);
    const result = planner.decide(view, 1, [], rand);
    expect(result).toMatchObject({ status: "evaluated", prefix: {
      prefix: { previousForm: "c" }, evidence: { writtenBoundaryCellId: 4 } },
    proposals: [{ refusal: "unresolved-vowel-obligation" }, { form: "ai" }, { refusal: "unresolved-neighbor" }],
    sample: { status: "selected", inventoryIndex: 3 } });
    expect(rand).not.toHaveBeenCalled(); expect(view).toEqual(before);
    planner.verify(view, 1, [], result);
    if (result.status !== "evaluated" || !("writtenBoundaryCellId" in result.prefix.evidence)) throw new Error("Expected written boundary");
    const corrupted = structuredClone(result); corrupted.prefix.evidence.writtenBoundaryCellId = 99;
    expect(() => planner.verify(view, 1, [], corrupted)).toThrow("Invalid completion attempt");
  });
  it("filters a changed hard-c reading before sampling and preserves live state", () => {
    const { base, planner } = fixture([alternative("e"), alternative("ai")]);
    const view = base.constructionState(); const before = structuredClone(view); const rand = vi.fn(() => 0.5);
    const result = planner.decide(view, 1, [], rand);
    expect(result).toMatchObject({ status: "evaluated", sample: { status: "selected", inventoryIndex: 4 },
      proposals: [{ refusal: "unresolved-vowel-obligation" }, { refusal: "neighbor-reading" }, { form: "ai" }] });
    expect(rand).not.toHaveBeenCalled(); expect(view).toEqual(before);
    expect(() => planner.verify(view, 1, [], result)).not.toThrow();
  });
  it("uses one conditional draw and reconstructs weights and chosen identity during replay", () => {
    const { base, planner } = fixture([alternative("ai", 3), alternative("ay", 7)]);
    const view = base.constructionState(); const rand = vi.fn(() => 0.3);
    const result = planner.decide(view, 1, [], rand);
    expect(result).toMatchObject({ status: "evaluated", sample: { status: "selected", inventoryIndex: 4, roll: 0.3 } });
    expect(rand).toHaveBeenCalledTimes(1); planner.verify(view, 1, [], result);
    if (result.status !== "evaluated" || result.sample.status !== "selected") throw new Error("Expected selection");
    const corrupted = structuredClone(result); corrupted.sample.candidates[1].weight = 99;
    expect(() => planner.verify(view, 1, [], corrupted)).toThrow("Invalid completion attempt");
    const wrongSelection = structuredClone(result); wrongSelection.sample.inventoryIndex = 3;
    expect(() => planner.verify(view, 1, [], wrongSelection)).toThrow("Invalid completion attempt");
  });
  it("retains an infeasible ordinary pool without promoting fallback-only alternatives", () => {
    const { base, planner } = fixture([alternative("ai", 1, true)]); const rand = vi.fn(() => 0.2);
    const result = planner.decide(base.constructionState(), 1, [], rand);
    expect(result).toMatchObject({ status: "evaluated", pool: { pool: "ordinary" }, sample: { status: "infeasible" } });
    expect(rand).not.toHaveBeenCalled(); planner.verify(base.constructionState(), 1, [], result);
  });
  it("records non-target and unavailable ownership without drawing", () => {
    const { base, planner } = fixture([alternative("ai")]); const rand = vi.fn(() => 0.2);
    expect(planner.decide(base.constructionState(), 0, [], rand)).toMatchObject({ status: "unchanged", obligation: { status: "not-target" } });
    base.edit(1, 1, "aa", "opaque", 0);
    expect(planner.decide(base.constructionState(), 1, [], rand)).toMatchObject({ status: "unchanged", obligation: { status: "unavailable" } });
    expect(rand).not.toHaveBeenCalled();
  });
});
