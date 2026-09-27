import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling } from "./base-spelling.js";
import { createSplitConstructionPlanner } from "./spelling-split-planner.js";
import { prepareSplitVowelTransaction } from "./spelling-split-transaction.js";
import { createSplitLiveGuard } from "./spelling-split-live.js";
import { isSingleOwned, sourceUnits } from "./spelling-ownership.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
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

const guard = createSplitLiveGuard([{ vowel: { sound: "eɪ", component: "a" }, coda: { sounds: ["t"], written: "t" }, marker: "e" }]);
function formed() {
  const { base, planner } = fixture("t", "t", { kind: "single-phone" });
  const view = base.constructionState();
  const attempt = planner.decide(view, 1, "word", () => 0);
  return { view, plan: prepareSplitVowelTransaction(view, planner, attempt, 0, 4) };
}
describe("live split-vowel invariants", () => {
  it("preserves intact paired spans and their exact intervening cells", () => {
    const { view, plan } = formed();
    expect(guard(plan.cells, view.phones, [plan.construction])).toEqual({ status: "preserved" });
  });
  it.each([1, 2, 3])("rejects deletion at surface index %i", index => {
    const { view, plan } = formed(); plan.cells.splice(index, 1);
    expect(guard(plan.cells, view.phones, [plan.construction]).status).toBe("refused");
  });
  it("rejects changed coda provenance even when letters and IDs are unchanged", () => {
    const { view, plan } = formed();
    plan.cells[2].origin = { kind: "rewrite", editId: 1, sourceUnitIds: [2], ownership: "unresolved" };
    expect(guard(plan.cells, view.phones, [plan.construction])).toMatchObject({ status: "refused", reason: "changed-coda" });
  });
  it("rejects unrecorded construction origins", () => {
    const { view, plan } = formed();
    expect(guard(plan.cells, view.phones, [])).toMatchObject({ status: "refused", reason: "unknown-construction" });
  });
  it("does not expose either span as a complete singular spelling unit", () => {
    const { view, plan } = formed();
    expect(isSingleOwned(plan.cells[1].origin)).toBe(false);
    expect(sourceUnits(plan.cells[1].origin)).toEqual([1]);
    expect(sourceUnits(plan.cells[3].origin)).toEqual([1]);
    expect(resolveSingleSpellingUnit({ ...view, cells: plan.cells }, 1)).toEqual({ status: "refused", reason: "already-split" });
  });
  it("rejects an inserted letter after the marker in the same part", () => {
    const { view, plan } = formed();
    plan.cells.push({ id: 6, text: "s", partId: 0, origin: { kind: "rewrite", editId: 1, sourceUnitIds: [], ownership: "unresolved" } });
    expect(guard(plan.cells, view.phones, [plan.construction])).toMatchObject({ status: "refused", reason: "changed-edge" });
  });
});
