import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling } from "./base-spelling.js";
import { createSplitConstructionPlanner } from "./spelling-split-planner.js";
import { prepareSplitVowelTransaction } from "./spelling-split-transaction.js";
import type { GraphemeReading } from "../types.js";

function fixture(codaSound: string, codaForm: string, reading?: GraphemeReading, nucleusForm = "ai") {
  const entries = [{ sound: "t", form: "t", segment: "onset" as const, reading: { kind: "single-phone" as const } },
    { sound: "eɪ", form: nucleusForm, segment: "nucleus" as const, reading: { kind: "single-phone" as const } },
    { sound: codaSound, form: codaForm, segment: "coda" as const, reading }];
  const graphemes = entries.map(entry => ({ phoneme: entry.sound, form: entry.form, frequency: 1, origin: 0, reading: entry.reading }));
  const base = new BaseSpelling(entries.map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: entry.segment, segmentIndex: 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } })), true, true, true);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  const planner = createSplitConstructionPlanner({ graphemes, doubling: undefined },
    [{ vowel: { sound: "eɪ", component: "a" }, coda: { sounds: [codaSound], written: codaForm }, marker: "e" }],
    { syllable: { forms: ["ae"], probability: 95 }, word: { swaps: [{ phoneme: "eɪ", from: nucleusForm, to: "a" }], probability: 35, monosyllableMultiplier: 2 } }, []);
  return { base, planner };
}

describe("atomic split-vowel transaction preparation", () => {
  it("allocates both vowel spans and retains every coda cell identity", () => {
    const { base, planner } = fixture("t", "t", { kind: "single-phone" });
    const state = base.constructionState(); const before = structuredClone(state);
    const attempt = planner.decide(state, 1, "word", () => 0);
    const plan = prepareSplitVowelTransaction(state, planner, attempt, 0, 4);
    expect(plan.cells.map(cell => cell.text).join("")).toBe("tate");
    expect(plan).toMatchObject({ start: 1, before: "ait", after: "ate", nextCellId: 6, nextEditId: 1,
      construction: { nucleusUnitId: 1, phoneId: 1, inputCellIds: [1, 2], componentCellIds: [4], markerCellIds: [5], preservedCodaCellIds: [3] } });
    expect(plan.output[1]).toEqual(state.cells[3]);
    expect(plan.output[0].origin).toMatchObject({ kind: "split-vowel", role: "component", unitId: 1, phoneId: 1 });
    expect(plan.output[2].origin).toMatchObject({ kind: "split-vowel", role: "marker", unitId: 1, phoneId: 1 });
    expect(state).toEqual(before);
    plan.construction.attempt.nucleusId = 999; plan.cells[0].text = "!";
    expect(state).toEqual(before); expect(attempt.nucleusId).toBe(1);
  });
  it("records both roles when the vowel component itself stays unchanged", () => {
    const { base, planner } = fixture("t", "t", { kind: "single-phone" }, "a");
    const state = base.constructionState();
    const attempt = planner.decide(state, 1, "word", () => 0);
    const plan = prepareSplitVowelTransaction(state, planner, attempt, 0, 3);
    expect(plan.before).toBe("at"); expect(plan.after).toBe("ate");
    expect(plan.construction.componentCellIds).toEqual([3]);
    expect(plan.construction.markerCellIds).toEqual([4]);
    expect(plan.construction.preservedCodaCellIds).toEqual([2]);
  });
  it("rejects stale decisions without mutating the current ledger", () => {
    const { base, planner } = fixture("t", "t", { kind: "single-phone" });
    const attempt = planner.decide(base.constructionState(), 1, "word", () => 0);
    base.edit(0, 1, "d", "later-edit");
    const state = base.constructionState(); const before = structuredClone(state);
    expect(() => prepareSplitVowelTransaction(state, planner, attempt, 0, 5)).toThrow();
    expect(state).toEqual(before);
  });
  it("cannot commit failed rolls or reuse current cell IDs", () => {
    const { base, planner } = fixture("t", "t", { kind: "single-phone" });
    const state = base.constructionState();
    const failed = planner.decide(state, 1, "word", () => 0.9);
    expect(() => prepareSplitVowelTransaction(state, planner, failed, 0, 4)).toThrow("did not form");
    const formed = planner.decide(state, 1, "word", () => 0);
    expect(() => prepareSplitVowelTransaction(state, planner, formed, 0, 3)).toThrow("allocation");
  });
});
