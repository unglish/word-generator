import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling } from "./base-spelling.js";
import { createCompletionProjectionGuard } from "./spelling-completion-projection.js";
import type { Grapheme } from "../types.js";

function fixture() {
  const graphemes: Grapheme[] = [
    { phoneme: "k", form: "c", frequency: 1, origin: 0, reading: { kind: "following-letter", forbid: ["e", "i", "y"] } },
    { phoneme: "eɪ", form: "a", frequency: 1, origin: 0, reading: { kind: "open-vowel-or-split-marker" } },
    { phoneme: "t", form: "t", frequency: 1, origin: 0, reading: { kind: "single-phone" } },
    { phoneme: "eɪ", form: "ai", frequency: 1, origin: 0, reading: { kind: "single-phone" } },
    // Synthetic alternative isolates the changed neighboring-letter condition.
    { phoneme: "eɪ", form: "e", frequency: 1, origin: 0, reading: { kind: "single-phone" } },
  ];
  const base = new BaseSpelling(graphemes.slice(0, 3).map((grapheme, id) => ({ id, part: "root", syllableIndex: 0,
    segment: id === 0 ? "onset" : id === 1 ? "nucleus" : "coda", segmentIndex: 0, soundAtSpelling: grapheme.phoneme,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === grapheme.phoneme)!) } })), true, true, true);
  graphemes.slice(0, 3).forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  const guard = createCompletionProjectionGuard({ ...englishConfig, graphemes, doubling: undefined, sharedSpellings: [] }, []);
  return { base, guard };
}
describe("completion projected reading checks", () => {
  it("accepts a supported whole-nucleus alternative without mutating input", () => {
    const { base, guard } = fixture(); const view = base.constructionState(); const before = structuredClone(view);
    expect(guard(view, 1, 3, [])).toMatchObject({ status: "preserved", form: "ai", checkedUnitIds: [1] });
    expect(view).toEqual(before);
  });
  it("refuses a replacement that invalidates hard c", () => {
    const { base, guard } = fixture();
    expect(guard(base.constructionState(), 1, 4, [])).toEqual({ status: "refused", reason: "neighbor-reading", unitId: 0 });
  });
  it("does not replace one unresolved obligation with another", () => {
    const { base, guard } = fixture();
    expect(guard(base.constructionState(), 1, 1, [])).toMatchObject({ status: "refused", reason: "unsupported-completion-reading" });
  });
  it("refuses a different phone's spelling and opaque target ownership", () => {
    const { base, guard } = fixture();
    expect(guard(base.constructionState(), 1, 2, []).status).toBe("refused");
    base.edit(1, 1, "aa", "opaque", 0);
    expect(guard(base.constructionState(), 1, 3, [])).toMatchObject({ status: "refused", reason: "unavailable-nucleus" });
  });
});
