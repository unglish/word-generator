import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling } from "./base-spelling.js";
import { createCompletionProjectionGuard } from "./spelling-completion-projection.js";
import type { Grapheme } from "../types.js";

function fixture(maxConsonantLetters?: number) {
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
  graphemes.push({ phoneme: "k", form: "k", frequency: 1, origin: 0, reading: { kind: "single-phone" } });
  graphemes.push({ phoneme: "k", form: "ck", frequency: 1, origin: 0, reading: { kind: "single-phone" } });
  const guard = createCompletionProjectionGuard({ ...englishConfig, graphemes, doubling: undefined, sharedSpellings: [],
    ...(maxConsonantLetters === undefined ? {} : { writtenFormConstraints: { policy: "preserve-phones" as const, maxConsonantLetters } }) }, []);
  return { base, guard };
}
describe("completion projected reading checks", () => {
  it("preserves an opaque neighboring unit when every surviving letter context is unchanged", () => {
    const { base, guard } = fixture();
    base.edit(2, 1, "tt", "opaque-coda", 0);
    const view = base.constructionState();
    const before = structuredClone(view);
    expect(guard(view, 1, 3, [])).toMatchObject({ status: "preserved", form: "ai" });
    expect(view).toEqual(before);
  });
  it("refuses an opaque predecessor when its following letter changes", () => {
    const { base, guard } = fixture();
    base.edit(0, 1, "cc", "opaque-onset", 0);
    expect(guard(base.constructionState(), 1, 4, [])).toEqual({ status: "refused", reason: "unresolved-neighbor", unitId: 0 });
  });
  it("does not infer context preservation for a missing unit", () => {
    const { base, guard } = fixture();
    base.edit(2, 1, "", "deleted-coda", 0);
    expect(guard(base.constructionState(), 1, 3, [])).toEqual({ status: "refused", reason: "unresolved-neighbor", unitId: 2 });
  });
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


it("validates both readings in a joint projection without changing the ledger", () => {
  const { base, guard } = fixture();
  const view = base.constructionState();
  const before = structuredClone(view);
  expect(guard(view, 1, 4, [], { unitId: 0, inventoryIndex: 5 })).toMatchObject({
    status: "preserved", form: "e", checkedUnitIds: [0, 1],
  });
  expect(view).toEqual(before);
  expect(guard(view, 1, 4, [], { unitId: 0, inventoryIndex: 0 })).toEqual({
    status: "refused", reason: "neighbor-reading", unitId: 0,
  });
  expect(guard(view, 1, 4, [], { unitId: 0, inventoryIndex: 2 })).toEqual({
    status: "refused", reason: "invalid-neighbor-candidate", unitId: 0,
  });
});


it("refuses a joint surface that exceeds the configured written-form budget", () => {
  const { base, guard } = fixture(1);
  expect(guard(base.constructionState(), 1, 4, [], { unitId: 0, inventoryIndex: 6 })).toEqual({
    status: "refused", reason: "written-form-budget",
  });
});
