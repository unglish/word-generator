import { describe, expect, it, vi } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling } from "./base-spelling.js";
import { createSplitConstructionPlanner } from "./spelling-split-planner.js";
import type { GraphemeReading } from "../types.js";

function fixture(codaSound: string, codaForm: string, reading?: GraphemeReading) {
  const entries = [{ sound: "t", form: "t", segment: "onset" as const, reading: { kind: "single-phone" as const } },
    { sound: "eɪ", form: "ai", segment: "nucleus" as const, reading: { kind: "single-phone" as const } },
    { sound: codaSound, form: codaForm, segment: "coda" as const, reading }];
  const graphemes = entries.map(entry => ({ phoneme: entry.sound, form: entry.form, frequency: 1, origin: 0, reading: entry.reading }));
  const base = new BaseSpelling(entries.map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: entry.segment, segmentIndex: 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } })), true, true, true);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  const planner = createSplitConstructionPlanner({ graphemes, doubling: undefined },
    [{ vowel: { sound: "eɪ", component: "a" }, coda: { sounds: [codaSound], written: codaForm }, marker: "e" }],
    { syllable: { forms: ["ae"], probability: 95 }, word: { swaps: [{ phoneme: "eɪ", from: "ai", to: "a" }], probability: 35, monosyllableMultiplier: 2 } }, []);
  return { base, planner };
}

describe("split construction planning before sampling", () => {
  it("preserves soft c when the new e supplies its required context", () => {
    const { base, planner } = fixture("s", "c", { kind: "following-letter", require: ["e", "i", "y"] });
    const state = base.constructionState(); const before = structuredClone(state); const rand = vi.fn(() => 0.1);
    expect(planner.decide(state, 1, "word", rand)).toMatchObject({ status: "evaluated", neighbors: { status: "preserved", checkedUnitIds: [0, 2] }, trial: { status: "formed", probability: 70, roll: 0.1 } });
    expect(rand).toHaveBeenCalledTimes(1); expect(state).toEqual(before);
  });
  it("refuses hard c before e even when a custom split table permits the letters", () => {
    const { base, planner } = fixture("k", "c", { kind: "following-letter", forbid: ["e", "i", "y"] });
    const rand = vi.fn(() => 0);
    expect(planner.decide(base.constructionState(), 1, "word", rand)).toMatchObject({ status: "neighbor-refused", neighbors: { unitId: 2, reason: "reading-obligation" } });
    expect(rand).not.toHaveBeenCalled();
  });
  it.each([undefined, { kind: "unsupported-construction", reason: "lexical only" }] as const)("refuses unlicensed coda readings without sampling", reading => {
    const { base, planner } = fixture("s", "s", reading); const rand = vi.fn(() => 0);
    expect(planner.decide(base.constructionState(), 1, "word", rand).status).toBe("neighbor-refused");
    expect(rand).not.toHaveBeenCalled();
  });
  it("replays the complete decision and rejects forged ownership and probabilities", () => {
    const { base, planner } = fixture("t", "t", { kind: "single-phone" });
    const view = base.constructionState();
    const attempt = planner.decide(view, 1, "word", () => 0.2);
    expect(() => planner.verify(view, 1, "word", attempt)).not.toThrow();
    if (attempt.status !== "evaluated" || attempt.trial.status === "refused") throw new Error("fixture failure");
    const forged = structuredClone(attempt);
    forged.span.nucleus.inputCellIds = [0];
    expect(() => planner.verify(view, 1, "word", forged)).toThrow("Invalid split-vowel attempt");
    attempt.trial.probability = 100;
    expect(() => planner.verify(view, 1, "word", attempt)).toThrow("Invalid split-vowel attempt");
  });
  it("does not sample after opaque nucleus edits or route refusal", () => {
    const { base, planner } = fixture("t", "t", { kind: "single-phone" }); const rand = vi.fn(() => 0);
    expect(planner.decide(base.constructionState(), 1, "syllable", rand).status).toBe("policy-refused");
    base.edit(1, 2, "a", "opaque");
    expect(planner.decide(base.constructionState(), 1, "word", rand).status).toBe("ownership-refused");
    expect(rand).not.toHaveBeenCalled();
  });
});
