import { describe, expect, it } from "vitest";
import { englishConfig } from "../index.js";
import type { Grapheme, GraphemeReading } from "../types.js";
import { BaseSpelling } from "./base-spelling.js";
import { createConstructionNeighborGuard } from "./spelling-construction-neighbors.js";

function fixture(reading?: GraphemeReading) {
  const sounds = ["g", "k", "s"];
  const graphemes: Grapheme[] = ["g", "ck", "s"].map((form, id) => ({ phoneme: sounds[id], form,
    frequency: 1, origin: 0, startWord: 1, midWord: 1, endWord: 1, reading: id === 0 ? reading : { kind: "single-phone" } }));
  const base = new BaseSpelling(sounds.map((sound, id) => ({ id, part: "root", syllableIndex: 0,
    segment: "coda", segmentIndex: id, soundAtSpelling: sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === sound)!) } })), true, true, true);
  graphemes.forEach((grapheme, id) => base.appendChoice(id, grapheme.form, grapheme.form, id, 0));
  const config = { graphemes, doubling: englishConfig.doubling };
  return { base, config, guard: createConstructionNeighborGuard(config) };
}

describe("neighbor readings around a proposed shared construction", () => {
  it("retains a hard-g reading when ck+s becomes x", () => {
    const f = fixture({ kind: "following-letter", forbid: ["e", "i", "y"] });
    expect(f.guard(f.base.constructionState(), [1, 2], "x")).toMatchObject({ status: "preserved",
      checks: [{ unitId: 0, form: "g", inputCellIds: [0], before: { nextLetter: "c", openPart: false },
        after: { nextLetter: "x", openPart: false } }], unchangedContextUnitIds: [] });
    expect(f.base.snapshot().surface).toBe("gcks");
  });

  it.each([
    { kind: "following-letter", require: ["c"] },
    { kind: "following-letter", forbid: ["x"] },
    { kind: "unsupported-construction", reason: "lexical" },
    { kind: "open-vowel-or-split-marker" },
  ] satisfies GraphemeReading[])("refuses an incompatible configured obligation: $kind", reading => {
    const f = fixture(reading);
    expect(f.guard(f.base.constructionState(), [1, 2], "x")).toEqual({ status: "refused", unitId: 0, reason: "reading-obligation" });
  });

  it("does not infer an undeclared neighboring reading", () => {
    const f = fixture();
    expect(f.guard(f.base.constructionState(), [1, 2], "x")).toEqual({ status: "refused", unitId: 0, reason: "unknown-reading" });
  });

  it("keeps unchanged context separate from positively checked reading support", () => {
    const f = fixture();
    expect(f.guard(f.base.constructionState(), [1, 2], "cs")).toEqual({ status: "preserved", checks: [], unchangedContextUnitIds: [0] });
  });

  it("refuses unresolved neighboring ancestry even when its visible letter looks legal", () => {
    const f = fixture({ kind: "single-phone" }); f.base.edit(0, 1, "j", "opaque");
    expect(f.guard(f.base.constructionState(), [1, 2], "x")).toEqual({ status: "refused", unitId: 0, reason: "unresolved-neighbor" });
  });

  it("rejects incomplete consumed units before checking neighbors", () => {
    const f = fixture({ kind: "single-phone" }); f.base.edit(1, 1, "", "partial-ck");
    expect(f.guard(f.base.constructionState(), [1, 2], "x")).toEqual({ status: "refused", unitId: null, reason: "invalid-source" });
  });

  it("preserves an open-vowel reading before a following-syllable qu construction", () => {
    const sounds = ["i:", "k", "w", "æ"];
    const forms = ["e", "c", "w", "a"];
    const graphemes: Grapheme[] = forms.map((form, id) => ({ phoneme: sounds[id], form, frequency: 1,
      origin: 0, startWord: 1, midWord: 1, endWord: 1,
      reading: { kind: id === 0 ? "open-vowel-or-split-marker" : "single-phone" } }));
    const base = new BaseSpelling(sounds.map((sound, id) => ({ id, part: "root", syllableIndex: id === 0 ? 0 : 1,
      segment: id === 0 || id === 3 ? "nucleus" : "onset", segmentIndex: id === 2 ? 1 : 0, soundAtSpelling: sound,
      boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === sound)!) } })), true, true, true);
    forms.forEach((form, id) => base.appendChoice(id, form, form, id, 0));
    const result = createConstructionNeighborGuard({ graphemes, doubling: undefined })(base.constructionState(), [1, 2], "qu");
    expect(result).toMatchObject({ status: "preserved", checks: [{ unitId: 0,
      reading: { kind: "open-vowel-or-split-marker" }, before: { nextLetter: "c", openPart: true },
      after: { nextLetter: "q", openPart: true } }], unchangedContextUnitIds: [3] });
  });

  it("detaches configured and returned readings", () => {
    const f = fixture({ kind: "following-letter", forbid: ["e"] });
    if (f.config.graphemes[0].reading?.kind !== "following-letter") throw new Error("Expected reading fixture");
    f.config.graphemes[0].reading.forbid!.push("x");
    const result = f.guard(f.base.constructionState(), [1, 2], "x");
    if (result.status !== "preserved" || result.checks[0].reading.kind !== "following-letter") throw new Error("Expected preserved fixture");
    result.checks[0].reading.forbid!.push("x");
    expect(f.guard(f.base.constructionState(), [1, 2], "x").status).toBe("preserved");
  });
});
