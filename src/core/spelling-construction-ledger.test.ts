import { applySpellingRules } from "./write.js";
import { describe, expect, it } from "vitest";
import { englishConfig } from "../index.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { BaseSpelling } from "./base-spelling.js";
import { isSingleOwned, sourceUnits } from "./spelling-ownership.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";

function fixture(sounds = ["æ", "k", "s"], forms = ["a", "ck", "s"], parts = [0, 0, 1], trace = true) {
  const base = new BaseSpelling(sounds.map((sound, id) => ({ id, part: "root", syllableIndex: parts[id],
    segment: "onset", segmentIndex: id, soundAtSpelling: sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === sound)!) } })),
  trace, true, true, englishSharedSpellings);
  forms.forEach((form, id) => base.appendChoice(id, form, form, id, 0));
  base.setPhase("word");
  return base;
}
const slot = { phase: "word", partId: null } as const;
const planner = () => createSharedConstructionPlanner(englishSharedSpellings);

function form(base: BaseSpelling, ruleId = "ks-to-x", ids = [1, 2], roll = 0.1) {
  const attempt = planner().decide(base.constructionState(), slot, ruleId, ids, () => roll);
  const id = base.recordSharedAttempt(slot, ruleId, ids, attempt);
  return { attempt, id };
}

describe("atomic shared-spelling ledger commits", () => {
  it("preserves original units while recording exact joint output and all source parts", () => {
    const base = fixture(); const before = base.snapshot();
    expect(form(base).id).toBe(0);
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.units).toEqual(before.units);
    expect(trace.phones).toEqual(before.phones);
    expect(trace.surface).toBe("ax");
    expect(trace.cells[1]).toMatchObject({ id: 4, text: "x", partId: 0,
      origin: { kind: "shared", constructionId: 0, editId: 0, offset: 0, sourceUnitIds: [1, 2], phoneIds: [1, 2] } });
    expect(isSingleOwned(trace.cells[1].origin)).toBe(false);
    expect(sourceUnits(trace.cells[1].origin)).toEqual([1, 2]);
    expect(trace.shared.constructions[0]).toMatchObject({ version: 1, id: 0, editId: 0, attemptId: 0,
      sourceUnitIds: [1, 2], phoneIds: [1, 2], inputCellIds: [1, 2, 3], outputCellIds: [4],
      sourcePartIds: [0, 1], displayPartId: 0, before: "cks", after: "x", reading: { kind: "shared-phones", sounds: ["k", "s"] } });
    expect(trace.edits[0]).toMatchObject({ rule: "sharedSpelling:ks-to-x", start: 1, before: "cks", after: "x" });
    expect(base.projectParts(2)).toEqual(["ax", ""]);
    expect(trace.unresolvedCells).toBe(0);
  });

  it("keeps both qu cells in a single joint construction", () => {
    const base = fixture(["k", "w"], ["c", "w"], [0, 1]);
    form(base, "cw-to-qu", [0, 1]);
    const trace = base.snapshot();
    expect(trace.surface).toBe("qu");
    expect(trace.cells.map(cell => cell.origin)).toEqual([0, 1].map(offset => ({
      kind: "shared", constructionId: 0, editId: 0, offset, sourceUnitIds: [0, 1], phoneIds: [0, 1] })));
    expect(trace.units.map(unit => unit.phoneIds)).toEqual([[0], [1]]);
  });

  it("records failed rolls without advancing cell or edit IDs", () => {
    const base = fixture(); const before = base.constructionState();
    const initial = structuredClone(before);
    expect(form(base, "ks-to-x", [1, 2], 0.25).id).toBeNull();
    expect(base.constructionState()).toEqual(initial);
    expect(form(base).id).toBe(0);
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.shared.attempts.map(entry => [entry.id, entry.constructionId])).toEqual([[0, null], [1, 0]]);
    expect(trace.shared.constructions[0]).toMatchObject({ editId: 0, attemptId: 1, outputCellIds: [4] });
  });

  it.each(["phones", "input", "cursor", "form", "roll"])("rejects forged %s before any ledger mutation", field => {
    const base = fixture(); const before = base.snapshot();
    const attempt = planner().decide(base.constructionState(), slot, "ks-to-x", [1, 2], () => 0.1);
    if (attempt.result.status !== "evaluated" || attempt.result.trial.status === "refused") throw new Error("Expected eligible fixture");
    if (field === "phones") attempt.result.span.phoneIds = [1, 1];
    if (field === "input") attempt.result.span.inputCellIds.pop();
    if (field === "cursor") attempt.cursor.nextEditId++;
    if (field === "form") attempt.result.trial.support.form = "q";
    if (field === "roll") attempt.result.trial.roll = 0.99;
    expect(() => base.recordSharedAttempt(slot, "ks-to-x", [1, 2], attempt)).toThrow();
    expect(base.snapshot()).toEqual(before);
    expect(form(base).id).toBe(0);
  });

  it("does not reuse consumed phones for a second formation", () => {
    const base = fixture(); form(base);
    const attempt = planner().decide(base.constructionState(), slot, "ks-to-x", [1, 2], () => { throw new Error("Unexpected draw"); });
    expect(attempt.result).toEqual({ status: "unavailable", reason: "already-shared" });
    expect(base.recordSharedAttempt(slot, "ks-to-x", [1, 2], attempt)).toBeNull();
    expect(base.snapshot().surface).toBe("ax");
  });

  it("detaches committed evidence from caller attempts and returned traces", () => {
    const base = fixture(); const { attempt } = form(base); const before = base.snapshot();
    attempt.sourceUnitIds[0] = 99;
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    trace.shared.constructions[0].phoneIds[0] = 99;
    trace.shared.attempts[0].attempt.sourceUnitIds[0] = 99;
    expect(base.snapshot()).toEqual(before);
  });

  it("produces equal live ownership with trace history disabled", () => {
    const traced = fixture(); const untraced = fixture(undefined, undefined, undefined, false);
    form(traced); form(untraced);
    expect(untraced.constructionState()).toEqual(traced.constructionState());
    expect(untraced.projectParts(2)).toEqual(traced.projectParts(2));
  });

  it("requires shared capability and the actual writer phase", () => {
    const base = fixture(); const attempt = planner().decide(base.constructionState(), slot, "ks-to-x", [1, 2], () => 0);
    base.setPhase("syllable");
    expect(() => base.recordSharedAttempt(slot, "ks-to-x", [1, 2], attempt)).toThrow(/capability or phase/);
    expect(() => new BaseSpelling([], true, true, false, englishSharedSpellings)).toThrow(/provenance/);
  });

  it("does not let the old evidence verifier accept the new capability", () => {
    const base = fixture(); form(base);
    expect(() => verifyBaseSpellingEvidence(base.snapshot(), englishConfig)).toThrow(/unsupported ledger version/);
  });
});


describe("shared-spelling preservation during generic edits", () => {
  it.each([
    { start: 0, count: 1, insert: "", reason: "consumes-shared-spelling" },
    { start: 0, count: 2, insert: "k", reason: "consumes-shared-spelling" },
    { start: 1, count: 0, insert: "h", reason: "splits-shared-spelling" },
  ])("refuses qu edit $start/$count and retains the live ledger", spec => {
    const base = fixture(["k", "w"], ["c", "w"], [0, 1]); form(base, "cw-to-qu", [0, 1]);
    const before = structuredClone(base.constructionState());
    expect(base.edit(spec.start, spec.count, spec.insert, "destructive-test")).toBe(false);
    expect(base.constructionState()).toEqual(before);
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.shared.editGuards).toMatchObject([{ cursor: { nextEditId: 1 }, rule: "destructive-test",
      decision: { status: "refused", constructionId: 0, reason: spec.reason } }]);
    expect(trace.edits).toHaveLength(1);
  });

  it("refuses a prefix deletion that would expose initial x", () => {
    const base = fixture(); form(base);
    expect(base.edit(0, 1, "", "drop-prefix")).toBe(false);
    expect(base.snapshot().surface).toBe("ax");
  });

  it("allows an unrelated same-part prefix rewrite", () => {
    const base = fixture(); form(base);
    expect(base.edit(0, 1, "e", "prefix-rewrite")).toBe(true);
    expect(base.snapshot().surface).toBe("ex");
    expect(base.snapshot().cells[1].origin).toMatchObject({ kind: "shared", phoneIds: [1, 2] });
  });

  it("preserves syllable-relative position when rewriting within the original part", () => {
    const base = fixture(undefined, undefined, [0, 0, 0]); base.setPhase("syllable");
    const local = { phase: "syllable", partId: 0 } as const;
    const attempt = planner().decide(base.constructionState(), local, "ks-to-x", [1, 2], () => 0);
    base.recordSharedAttempt(local, "ks-to-x", [1, 2], attempt);
    expect(base.edit(0, 1, "e", "prefix-rewrite")).toBe(true);
    expect(base.snapshot().surface).toBe("ex");
  });

  it.each([{ start: 2, count: 1, insert: "" }, { start: 2, count: 0, insert: "h" },
    { start: 2, count: 1, insert: "e" }])("refuses loss of authenticated gz vowel context: $insert", spec => {
    const base = fixture(["ɛ", "g", "z", "æ"], ["e", "g", "z", "a"], [0, 0, 1, 1]); form(base, "gz-to-x");
    expect(base.edit(spec.start, spec.count, spec.insert, "change-vowel")).toBe(false);
    expect(base.snapshot().surface).toBe("exa");
  });

  it("allows unrelated edits after the complete gz following vowel", () => {
    const base = fixture(["ɛ", "g", "z", "æ", "t"], ["e", "g", "z", "a", "t"], [0, 0, 1, 1, 1]); form(base, "gz-to-x");
    expect(base.edit(3, 1, "tt", "following-coda")).toBe(true);
    expect(base.snapshot().surface).toBe("exatt");
  });

  it("treats identical-text edits as no-ops without erasing ownership", () => {
    const base = fixture(); form(base); const before = base.snapshot();
    expect(base.edit(1, 1, "x", "same-text")).toBe(true);
    expect(base.snapshot()).toEqual(before);
  });

  it("returns refusals through both observer interfaces", () => {
    const base = fixture(["k", "w"], ["c", "w"], [0, 0]); form(base, "cw-to-qu", [0, 1]);
    expect(base.observe()(0, 1, "", "observer-delete")).toBe(false);
    expect(base.observeParts(["qu"])(0, 1, 0, "h", "part-insert")).toBe(false);
    expect(base.snapshot().surface).toBe("qu");
  });
});


describe("regex writer refusal propagation", () => {
  it.each([
    { sounds: ["k", "w", "k", "w"], forms: ["c", "w", "c", "w"], ids: [0, 1], pattern: "q|c", expected: "quaaw" },
    { sounds: ["t", "k", "w"], forms: ["t", "c", "w"], ids: [1, 2], pattern: "t|q", expected: "aaqu" },
  ])("keeps offsets correct when an earlier or later match is refused: $pattern", spec => {
    const base = fixture(spec.sounds, spec.forms, spec.sounds.map(() => 0)); form(base, "cw-to-qu", spec.ids);
    let draws = 0;
    const result = applySpellingRules(base.snapshot().surface,
      [{ name: "guard-test", regex: new RegExp(spec.pattern, "g"), replacement: "aa", probability: 50, scope: "word" }],
      () => { draws++; return 0.1; }, undefined, "word", base.observe());
    expect(result).toBe(spec.expected);
    base.assertSurface(result);
    expect(draws).toBe(2);
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.shared.editGuards.map(guard => guard.decision.status).sort()).toEqual(["allowed", "refused"]);
  });
});
