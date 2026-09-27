import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { BaseSpelling } from "./base-spelling.js";
import { createSplitSpanResolver } from "./spelling-split-ownership.js";

function fixture(coda = [{ sound: "ð", form: "th" }]) {
  const choices = [{ sound: "b", form: "b", segment: "onset" as const },
    { sound: "eɪ", form: "ai", segment: "nucleus" as const },
    ...coda.map(entry => ({ ...entry, segment: "coda" as const }))];
  const phones = choices.map((entry, id) => ({ id, part: "root" as const, syllableIndex: 0,
    segment: entry.segment, segmentIndex: entry.segment === "coda" ? id - 2 : 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } }));
  const reading = { graphemes: choices.map(entry => ({ phoneme: entry.sound, form: entry.form,
    frequency: 1, origin: 0, reading: { kind: "single-phone" as const } })), doubling: undefined };
  const base = new BaseSpelling(phones, true, true, true, englishConfig.sharedSpellings!, reading);
  choices.forEach((choice, id) => base.appendChoice(id, choice.form, choice.form, id, 0));
  return base;
}
const resolve = createSplitSpanResolver(englishConfig.sharedSpellings!);

describe("live split-vowel ownership", () => {
  it("binds the whole nucleus and multi-letter coda independently", () => {
    const base = fixture(); const view = base.constructionState(); const before = structuredClone(view);
    expect(resolve(view, 1, "word")).toMatchObject({ status: "complete", nucleus: { inputCellIds: [1, 2], before: "ai" },
      codaUnitIds: [2], codaCellIds: [3, 4], markerOffset: 5,
      context: { vowel: { sound: "eɪ", form: "ai", position: "nucleus" }, coda: { sounds: ["ð"], written: "th" } } });
    expect(view).toEqual(before);
  });
  it("preserves an ordered two-phone coda", () => {
    expect(resolve(fixture([{ sound: "s", form: "s" }, { sound: "t", form: "t" }]).constructionState(), 1, "syllable"))
      .toMatchObject({ status: "complete", codaUnitIds: [2, 3], context: { coda: { sounds: ["s", "t"], written: "st" } } });
  });
  it("refuses onset selection and a missing coda", () => {
    expect(resolve(fixture().constructionState(), 0, "word")).toEqual({ status: "refused", reason: "not-single-nucleus" });
    expect(resolve(fixture([]).constructionState(), 1, "word")).toEqual({ status: "refused", reason: "missing-coda" });
  });
  it.each([1, 2, 3, 4])("refuses removal of component cell %i", cell => {
    const state = structuredClone(fixture().constructionState());
    state.cells = state.cells.filter(entry => entry.id !== cell);
    expect(resolve(state, 1, "word").status).toBe("refused");
  });
  it("does not borrow a matching substring after an opaque edit", () => {
    const base = fixture(); base.edit(1, 2, "a", "opaque");
    expect(resolve(base.constructionState(), 1, "word")).toEqual({ status: "refused", reason: "unresolved-ownership" });
  });
  it("refuses an unowned appended marker instead of absorbing it", () => {
    const base = fixture(); base.edit(5, 0, "e", "silentE:append", 0);
    expect(resolve(base.constructionState(), 1, "word")).toEqual({ status: "refused", reason: "incomplete-syllable-edge" });
  });
  it("preserves complete shared coda ownership and refuses partial shared output", () => {
    const base = fixture([{ sound: "k", form: "k" }, { sound: "s", form: "s" }]);
    const view = base.constructionState();
    const reading = { graphemes: view.units.map(unit => ({ phoneme: view.phones[unit.id].soundAtSpelling,
      form: unit.selected, frequency: 1, origin: 0, reading: { kind: "single-phone" as const } })), doubling: undefined };
    const planner = createSharedConstructionPlanner(englishConfig.sharedSpellings!, reading);
    const slot = { phase: "word", partId: null } as const;
    base.setPhase("word");
    const attempt = planner.decide(base.constructionState(), slot, "ks-to-x", [2, 3], () => 0);
    expect(base.recordSharedAttempt(slot, "ks-to-x", [2, 3], attempt)).toBe(0);
    expect(resolve(base.constructionState(), 1, "word")).toMatchObject({ status: "complete", sharedCodaIds: [0],
      codaUnitIds: [2, 3], context: { coda: { sounds: ["k", "s"], written: "x" } } });
    const broken = structuredClone(base.constructionState());
    broken.cells = broken.cells.slice(0, -1);
    expect(resolve(broken, 1, "word")).toEqual({ status: "refused", reason: "invalid-shared-coda" });
  });
  it("refuses reordered coda cells", () => {
    const state = structuredClone(fixture().constructionState());
    state.cells = [...state.cells.slice(0, 3), state.cells[4], state.cells[3]];
    expect(resolve(state, 1, "word").status).toBe("refused");
  });
});
