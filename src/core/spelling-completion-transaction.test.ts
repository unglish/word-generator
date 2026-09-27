import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import type { Grapheme } from "../types.js";
import { BaseSpelling } from "./base-spelling.js";
import { createCompletionPlanner } from "./spelling-completion-planner.js";
import { prepareCompletionTransaction } from "./spelling-completion-transaction.js";

function fixture() {
  const graphemes: Grapheme[] = [
    { phoneme: "eɪ", form: "a", frequency: 1, origin: 0, reading: { kind: "open-vowel-or-split-marker" } },
    { phoneme: "t", form: "t", frequency: 1, origin: 0, reading: { kind: "single-phone" } },
    { phoneme: "eɪ", form: "ai", frequency: 1, origin: 0, reading: { kind: "single-phone" } },
  ];
  const base = new BaseSpelling(graphemes.slice(0, 2).map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: id === 0 ? "nucleus" : "coda", segmentIndex: 0, soundAtSpelling: entry.phoneme,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.phoneme)!) } })), true, true, true);
  graphemes.slice(0, 2).forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  const planner = createCompletionPlanner({ ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes), doubling: undefined, sharedSpellings: [] }, []);
  const view = base.constructionState();
  const attempt = planner.decide(view, 0, [], () => { throw new Error("Unexpected draw"); });
  return { base, view, planner, attempt };
}
describe("atomic completion transaction preparation", () => {
  it("replaces the complete nucleus and preserves the exact coda, with detached provenance", () => {
    const { view, planner, attempt } = fixture(); const before = structuredClone(view);
    const plan = prepareCompletionTransaction(view, planner, [], attempt, 0, 2);
    expect(plan.cells.map(cell => cell.text).join("")).toBe("ait");
    expect(plan.cells[2]).toEqual(view.cells[1]);
    expect(plan.certificate).toMatchObject({ id: 0, unitId: 0, phoneIds: [0], inputCellIds: [0], outputCellIds: [2, 3], before: "a", after: "ai", inventoryIndex: 2 });
    expect(plan.output.map(cell => cell.origin)).toEqual([0, 1].map(offset => ({ kind: "completion", certificateId: 0, editId: view.cursor.nextEditId, unitId: 0, offset, sourceUnitIds: [0] })));
    expect(plan.nextCellId).toBe(4); expect(plan.nextEditId).toBe(view.cursor.nextEditId + 1);
    plan.cells[2].text = "x"; plan.certificate.attempt.nucleusId = 99;
    expect(view).toEqual(before); expect(attempt.nucleusId).toBe(0);
  });
  it("rejects stale evidence before changing any state", () => {
    const { base, planner, attempt } = fixture(); base.edit(1, 1, "d", "test", 0);
    const view = base.constructionState(); const before = structuredClone(view);
    expect(() => prepareCompletionTransaction(view, planner, [], attempt, 0, 3)).toThrow();
    expect(view).toEqual(before);
  });
  it("rejects reused and overflowing allocations", () => {
    const { view, planner, attempt } = fixture();
    for (const next of [0, 1, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
      expect(() => prepareCompletionTransaction(view, planner, [], attempt, 0, next)).toThrow("Invalid completion allocation");
    }
    expect(() => prepareCompletionTransaction(view, planner, [], attempt, -1, 2)).toThrow("Invalid completion allocation");
  });
  it("cannot turn a non-target decision into a replacement", () => {
    const { view, planner } = fixture(); const attempt = planner.decide(view, 1, [], () => 0);
    expect(() => prepareCompletionTransaction(view, planner, [], attempt, 0, 2)).toThrow("Completion did not select");
  });
});
