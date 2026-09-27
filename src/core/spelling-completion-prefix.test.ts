import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { BaseSpelling } from "./base-spelling.js";
import { createCompletionPrefixResolver } from "./spelling-completion-prefix.js";

function fixture(onset = true) {
  const entries = [...(onset ? [{ sound: "t", form: "tt", segment: "onset" as const, increment: 1 }] : []),
    { sound: "eɪ", form: "a", segment: "nucleus" as const, increment: 0 }];
  const base = new BaseSpelling(entries.map((entry, id) => ({ id, part: "root", syllableIndex: 0,
    segment: entry.segment, segmentIndex: 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } })), true, true, true);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, entry.increment));
  return base;
}
const resolve = createCompletionPrefixResolver(englishConfig);
describe("completion prefix evidence", () => {
  it("uses the complete current preceding form and recorded doubling count", () => {
    expect(resolve(fixture().constructionState(), 1)).toEqual({ status: "available", prefix: { previousForm: "tt", doublingCount: 1 },
      evidence: { doublingCount: 1, quotaSource: "original" } });
  });
  it("supports a word-initial nucleus without inventing a preceding form", () => {
    expect(resolve(fixture(false).constructionState(), 0)).toMatchObject({ status: "available", prefix: { doublingCount: 0 } });
  });
  it("does not reuse the originally selected form after an opaque rewrite", () => {
    const base = fixture(); base.edit(0, 2, "t", "opaque", 0);
    expect(resolve(base.constructionState(), 1)).toEqual({ status: "unavailable", reason: "unresolved-ownership" });
  });
  it("does not cross an unowned insertion to reach a prior source unit", () => {
    const base = fixture(); base.edit(2, 0, "e", "marker", 0);
    expect(resolve(base.constructionState(), 1)).toEqual({ status: "unavailable", reason: "nonadjacent-prefix" });
  });
  it("retains explicit missing quota-history failure", () => {
    const state = structuredClone(fixture().constructionState()); delete state.units[0].doublingIncrement;
    expect(resolve(state, 1)).toEqual({ status: "unavailable", reason: "missing-doubling-history" });
  });
});
