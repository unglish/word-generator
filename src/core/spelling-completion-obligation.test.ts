import { describe, expect, it } from "vitest";
import { BaseSpelling } from "./base-spelling.js";
import { englishConfig } from "../config/english.js";
import { createCompletionObligationInspector } from "./spelling-completion-obligation.js";
import type { GraphemeReading } from "../types.js";

function fixture(closed: boolean, reading?: GraphemeReading) {
  const entries = [{ sound: "eɪ", form: "a", segment: "nucleus" as const },
    ...(closed ? [{ sound: "t", form: "t", segment: "coda" as const }] : [])];
  const base = new BaseSpelling(entries.map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: entry.segment, segmentIndex: 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } })), true, true, true);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  const inspect = createCompletionObligationInspector({ doubling: undefined, graphemes: entries.map(entry => ({
    phoneme: entry.sound, form: entry.form, frequency: 1, origin: 0, reading })) }, []);
  return { base, inspect };
}
describe("current vowel completion obligations", () => {
  it("distinguishes a supported open nucleus from a closed bare vowel", () => {
    for (const closed of [false, true]) {
      const { base, inspect } = fixture(closed, { kind: "open-vowel-or-split-marker" });
      expect(inspect(base.constructionState(), 0, []).status).toBe(closed ? "unresolved" : "satisfied");
    }
  });
  it("does not certify a generic silent-e insertion", () => {
    const { base, inspect } = fixture(true, { kind: "open-vowel-or-split-marker" });
    base.edit(2, 0, "e", "silentE:marker", 0);
    expect(inspect(base.constructionState(), 0, [])).toMatchObject({ status: "unresolved", inputCellIds: [0] });
  });
  it("keeps missing reading and opaque nucleus ownership unavailable", () => {
    const { base, inspect } = fixture(true);
    expect(inspect(base.constructionState(), 0, [])).toEqual({ status: "unavailable", reason: "unknown-reading" });
    base.edit(0, 1, "ai", "opaque", 0);
    expect(inspect(base.constructionState(), 0, []).status).toBe("unavailable");
  });
  it("does not retarget an ordinary reading or a consonant", () => {
    const { base, inspect } = fixture(true, { kind: "single-phone" });
    expect(inspect(base.constructionState(), 0, [])).toEqual({ status: "not-target" });
    expect(inspect(base.constructionState(), 1, [])).toEqual({ status: "not-target" });
  });
  it("does not classify an incomplete root as satisfied", () => {
    const { base, inspect } = fixture(false, { kind: "open-vowel-or-split-marker" });
    const view = base.constructionState();
    expect(inspect({ ...view, cursor: { ...view.cursor, lastAppendedUnitId: -1 } }, 0, []))
      .toEqual({ status: "unavailable", reason: "incomplete-root" });
  });
});
