import { describe, expect, it } from "vitest";
import { englishConfig } from "../index.js";
import { BaseSpelling } from "./base-spelling.js";
import { resolveConstructionSpan } from "./spelling-construction-ownership.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";

interface Choice { sound: string; form: string; part?: number }
function fixture(choices: Choice[]) {
  const phones = choices.map((choice, id) => ({ id, part: "root" as const, syllableIndex: choice.part ?? 0,
    segment: "onset" as const, segmentIndex: id, soundAtSpelling: choice.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === choice.sound)!) } }));
  const base = new BaseSpelling(phones, true, true, true);
  choices.forEach((choice, id) => base.appendChoice(id, choice.form, choice.form, id, 0));
  return base;
}
const pair = () => fixture([{ sound: "k", form: "ck" }, { sound: "s", form: "s" }]);
const mutable = (base: BaseSpelling) => structuredClone(base.constructionState()) as {
  -readonly [Key in keyof ConstructionLedgerView]: ConstructionLedgerView[Key] extends readonly (infer Item)[] ? Item[] : ConstructionLedgerView[Key]
};

describe("shared spelling source ownership", () => {
  it.each(["k", "ck"])("consumes the full %s selection for /k/, then /s/", form => {
    const base = fixture([{ sound: "k", form }, { sound: "s", form: "s" }]);
    expect(resolveConstructionSpan(base.constructionState(), [0, 1])).toMatchObject({ status: "complete", start: 0,
      end: form.length + 1, before: form + "s", sourceUnitIds: [0, 1], phoneIds: [0, 1],
      inputCellIds: Array.from({ length: form.length + 1 }, (_, id) => id), sourcePartIds: [0, 0],
      displayPartId: 0, phonemes: [{ sound: "k" }, { sound: "s" }], following: { known: true, letter: "" } });
  });

  it.each([["g", "z"], ["k", "w"]])("retains ordered /%s,%s/ parts across a syllable boundary", (left, right) => {
    const base = fixture([{ sound: "ɛ", form: "e" }, { sound: left, form: left },
      { sound: right, form: right, part: 1 }, { sound: "æ", form: "a", part: 1 }]);
    expect(resolveConstructionSpan(base.constructionState(), [1, 2])).toMatchObject({ status: "complete", start: 1, end: 3,
      sourceUnitIds: [1, 2], phoneIds: [1, 2], sourcePartIds: [0, 1], displayPartId: 0,
      phonemes: [{ sound: left }, { sound: right }], following: { known: true, phoneme: { sound: "æ" }, letter: "a" } });
  });

  it("detaches returned phone data and all ownership arrays", () => {
    const base = pair(); const view = base.constructionState(); const before = structuredClone(view);
    const result = resolveConstructionSpan(view, [0, 1]);
    if (result.status !== "complete") throw new Error("Fixture must resolve");
    result.phonemes[0].sound = "z";
    for (const ids of [result.sourceUnitIds, result.phoneIds, result.inputCellIds, result.sourcePartIds]) ids[0] = 999;
    expect(view).toEqual(before);
  });

  it.each([[], [0], [1, 0], [0, 0], [0, 2], [-1, 0], [0, 1.5]].map(ids => ({ ids })))("refuses invalid ordered unit request $ids", ({ ids }) => {
    expect(resolveConstructionSpan(pair().constructionState(), ids)).toEqual({ status: "refused", reason: "invalid-units" });
  });

  it("refuses a phone claimed by multiple original units", () => {
    const view = mutable(pair()); view.units[1].phoneIds = [0];
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "invalid-phones" });
  });

  it.each(["absent", "mismatch"])("refuses %s writer boundary evidence", mode => {
    const view = mutable(pair());
    if (mode === "absent") delete view.phones[0].boundary;
    else view.phones[0].boundary!.phoneme.sound = "g";
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "missing-boundary" });
  });

  it.each([0, 1])("refuses ck when source cell %i is missing", index => {
    const view = mutable(pair()); view.cells.splice(index, 1);
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "partial-unit" });
  });

  it("refuses a unit with no surviving cells", () => {
    const view = mutable(pair()); view.cells.splice(0, 2);
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "missing-unit" });
  });

  it("refuses generic rewrite ancestry even when the text remains identical", () => {
    const base = pair(); base.edit(0, 2, "k", "opaque-rewrite"); base.edit(0, 1, "ck", "opaque-restore");
    expect(resolveConstructionSpan(base.constructionState(), [0, 1])).toEqual({ status: "refused", reason: "unresolved-ownership" });
  });

  it("refuses reordered whole units", () => {
    const view = mutable(pair()); view.cells = [view.cells[2], view.cells[0], view.cells[1]];
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "noncontiguous-span" });
  });

  it("refuses a spelling cell attributed to the wrong source part", () => {
    const view = mutable(pair()); view.cells[0].partId = 1;
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "wrong-part" });
  });

  it("refuses a mixture of initial and licensed cells", () => {
    const view = mutable(pair());
    view.cells[1].origin = { kind: "licensed", unitId: 0, offset: 1, editId: 0, certificateId: 0, sourceUnitIds: [0] };
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "mixed-origin" });
  });

  it.each(["licensed", "normalized"] as const)("refuses %s origins without a recorded license", kind => {
    const view = mutable(pair());
    view.cells.slice(0, 2).forEach((cell, offset) => {
      cell.origin = { kind, unitId: 0, offset, editId: 0, certificateId: 0, sourceUnitIds: [0] };
    });
    expect(resolveConstructionSpan(view, [0, 1])).toEqual({ status: "refused", reason: "missing-license" });
  });

  it("does not infer following phone context from a rewritten vowel letter", () => {
    const base = fixture([{ sound: "g", form: "g" }, { sound: "z", form: "z" }, { sound: "æ", form: "a" }]);
    base.edit(2, 1, "e", "opaque-vowel");
    expect(resolveConstructionSpan(base.constructionState(), [0, 1])).toMatchObject({ status: "complete", following: { known: false } });
  });

  it("does not use a partially surviving following vowel unit as context", () => {
    const view = mutable(fixture([{ sound: "g", form: "g" }, { sound: "z", form: "z" }, { sound: "æ", form: "ae" }]));
    view.cells.pop();
    expect(resolveConstructionSpan(view, [0, 1])).toMatchObject({ status: "complete", following: { known: false } });
  });

  it("does not treat an unappended next phone as the end of the word", () => {
    const view = mutable(fixture([{ sound: "g", form: "g" }, { sound: "z", form: "z" }, { sound: "æ", form: "a" }]));
    view.cells.pop(); view.units.pop();
    expect(resolveConstructionSpan(view, [0, 1])).toMatchObject({ status: "complete", following: { known: false } });
  });
});
