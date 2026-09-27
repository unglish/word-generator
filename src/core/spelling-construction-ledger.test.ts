import { validateSharedEventOrder } from "./spelling-construction-events.js";
import { applySpellingRules, applySilentE, repairConsonantPileups, repairConsonantLetters, repairFinalConsonantLetters, repairVowelLetters } from "./write.js";
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


describe("explicit lexical gap supersession", () => {
  it("retires live shared ownership while preserving construction and source history", () => {
    const base = fixture(); form(base); const before = base.snapshot();
    base.replaceWithGapSpelling("ax", "other", "lexical");
    const trace = base.snapshot();
    if (trace.version !== 4 || before.version !== 4) throw new Error("Expected shared traces");
    expect(trace.surface).toBe("other");
    expect(trace.scope).toBe("bare-after-gap-spelling");
    expect(trace.units).toEqual(before.units);
    expect(trace.phones).toEqual(before.phones);
    expect(trace.shared.constructions).toEqual(before.shared.constructions);
    expect(trace.shared.liveConstructionIds).toEqual([]);
    expect(trace.shared.supersessions).toEqual([{ version: 1, id: 0, cursor: { lastAppendedUnitId: 2, nextEditId: 1 },
      editId: 1, rule: "gapSpelling:lexical", constructionIds: [0], rootPhoneIds: [0, 1, 2],
      inputCellIds: [0, 4], outputCellIds: [5, 6, 7, 8, 9], before: "ax", after: "other", ownership: "unavailable" }]);
    expect(trace.cells.every(cell => cell.origin.kind === "rewrite" && cell.origin.ownership === "unresolved")).toBe(true);
    expect(trace.unresolvedCells).toBe(5);
    expect(trace.edits[1]).toMatchObject({ phase: "gap", rule: "gapSpelling:lexical", before: "ax", after: "other" });
    expect(trace.shared.editGuards).toEqual([]);
  });

  it("does not let a gap-like rule name bypass ordinary edit preservation", () => {
    const base = fixture(); form(base); base.markGapSpelling();
    expect(base.edit(0, 2, "other", "gapSpelling:not-an-explicit-supersession")).toBe(false);
    expect(base.snapshot().surface).toBe("ax");
  });

  it("replaces ownership even when the explicit lexical spelling has identical text", () => {
    const base = fixture(); form(base);
    base.replaceWithGapSpelling("ax", "ax", "same-text-lexical");
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.surface).toBe("ax");
    expect(trace.shared.liveConstructionIds).toEqual([]);
    expect(trace.shared.supersessions[0]).toMatchObject({ inputCellIds: [0, 4], outputCellIds: [5, 6], ownership: "unavailable" });
    expect(trace.unresolvedCells).toBe(2);
  });

  it("keeps legacy same-text no-op behavior and permissive historical rule names", () => {
    const source = fixture().snapshot();
    const base = new BaseSpelling(source.phones, true, true, true);
    source.units.forEach(unit => base.appendChoice(unit.choiceId, unit.selected, unit.afterDoubling, unit.inventoryIndex, unit.doublingIncrement));
    base.replaceWithGapSpelling("acks", "acks", "");
    expect(base.snapshot()).toMatchObject({ version: 3, surface: "acks", scope: "bare-after-gap-spelling", edits: [] });
    base.replaceWithGapSpelling("acks", "other", "");
    expect(base.snapshot().edits[0]).toMatchObject({ phase: "gap", rule: "gapSpelling:", before: "acks", after: "other" });
  });

  it("refuses stale full-root replacement before changing any state", () => {
    const base = fixture(); form(base); const before = base.snapshot();
    expect(() => base.replaceWithGapSpelling("acks", "other", "stale")).toThrow(/Unrecorded/);
    expect(base.snapshot()).toEqual(before);
  });

  it("allows later edits without treating retired constructions as live", () => {
    const base = fixture(); form(base);
    base.replaceWithGapSpelling("ax", "other", "lexical");
    expect(base.edit(0, 1, "a", "later-edit")).toBe(true);
    expect(base.snapshot().surface).toBe("ather");
    const attempt = planner().decide(base.constructionState(), slot, "ks-to-x", [1, 2], () => { throw new Error("Unexpected draw"); });
    expect(attempt.result).toEqual({ status: "unavailable", reason: "unresolved-ownership" });
  });

  it("records repeated lexical replacements without retiring the same construction twice", () => {
    const base = fixture(); form(base);
    base.replaceWithGapSpelling("ax", "other", "first");
    base.replaceWithGapSpelling("other", "new", "second");
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.shared.supersessions.map(entry => entry.constructionIds)).toEqual([[0], []]);
    expect(trace.shared.supersessions.map(entry => entry.editId)).toEqual([1, 2]);
    expect(trace.surface).toBe("new");
  });

  it("keeps traced and untraced live ownership equal through supersession and subsequent edits", () => {
    const traced = fixture(); const untraced = fixture(undefined, undefined, undefined, false);
    for (const base of [traced, untraced]) {
      form(base); base.replaceWithGapSpelling("ax", "other", "lexical");
      expect(base.edit(0, 1, "a", "later-edit")).toBe(true);
    }
    expect(traced.constructionState()).toEqual(untraced.constructionState());
  });
});


describe("atomic writer repair transactions", () => {
  it("does not commit an earlier allowed edit when a later batch edit is refused", () => {
    const base = fixture(["k", "w", "s", "t"], ["c", "w", "s", "t"], [0, 0, 0, 0]); form(base, "cw-to-qu", [0, 1]);
    const before = structuredClone(base.constructionState());
    expect(base.editBatch([{ start: 3, deleteCount: 1, insert: "", rule: "safe-tail" },
      { start: 1, deleteCount: 1, insert: "", rule: "unsafe-shared" }])).toBe(false);
    expect(base.constructionState()).toEqual(before);
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.shared.transactions[0]).toMatchObject({ status: "refused", cursor: { nextEditId: 1 },
      checks: [{ status: "allowed" }, { status: "refused", reason: "consumes-shared-spelling" }] });
    expect(trace.edits).toHaveLength(1);
  });

  it("rejects an invalid later range without committing an earlier valid edit", () => {
    const base = fixture(); form(base); const before = base.snapshot();
    expect(() => base.editBatch([{ start: 0, deleteCount: 1, insert: "e", rule: "first" },
      { start: 9, deleteCount: 1, insert: "", rule: "invalid" }])).toThrow(/batch range/);
    expect(base.snapshot()).toEqual(before);
  });

  it("commits accepted batches with the same cells and edit IDs as sequential writes", () => {
    const batched = fixture(); const sequential = fixture();
    for (const base of [batched, sequential]) form(base);
    const edits = [{ start: 0, deleteCount: 1, insert: "ee", rule: "prefix" },
      { start: 3, deleteCount: 0, insert: "a", rule: "tail" },
      { start: 0, deleteCount: 2, insert: "ee", rule: "noop" }];
    expect(batched.editBatch(edits)).toBe(true);
    for (const edit of edits) expect(sequential.edit(edit.start, edit.deleteCount, edit.insert, edit.rule)).toBe(true);
    expect(batched.constructionState()).toEqual(sequential.constructionState());
    expect(batched.snapshot().edits).toEqual(sequential.snapshot().edits);
  });

  it("uses evolving part offsets when earlier parts change length", () => {
    const base = fixture(); form(base);
    const parts = ["ax", ""];
    expect(base.observeParts(parts).batch!([
      { part: 0, start: 0, deleteCount: 1, insert: "ee", rule: "prefix" },
      { part: 1, start: 0, deleteCount: 0, insert: "a", rule: "next-part" },
    ])).toBe(true);
    expect(base.snapshot().surface).toBe("eexa");
    expect(base.projectParts(2)).toEqual(["eex", "a"]);
    expect(parts).toEqual(["ax", ""]);
  });

  it("keeps the consonant-pileup text unchanged when its second deletion is refused", () => {
    const base = fixture(["æ", "b", "k", "s", "t", "r"], ["a", "b", "k", "s", "t", "r"], [0, 0, 0, 0, 0, 0]);
    form(base, "ks-to-x", [2, 3]);
    const parts = ["abxtr"]; const hyphenated = [...parts];
    repairConsonantPileups(parts, hyphenated, 2, undefined, base.observeParts(parts));
    expect(parts).toEqual(["abxtr"]); expect(hyphenated).toEqual(parts); base.assertSurface(parts.join(""));
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    expect(trace.shared.transactions[0]).toMatchObject({ status: "refused", checks: [{ status: "allowed" }, { status: "refused" }] });
  });

  it("retains a refused final cluster and stops a later refused single-letter deletion", () => {
    const base = fixture(["æ", "b", "k", "s", "t", "r"], ["a", "b", "k", "s", "t", "r"], [0, 0, 0, 0, 0, 0]);
    form(base, "ks-to-x", [2, 3]);
    const parts = ["abxtr"]; const hyphenated = [...parts];
    repairFinalConsonantLetters(parts, hyphenated, 2, base.observeParts(parts));
    expect(parts).toEqual(["abxtr"]); base.assertSurface(parts.join(""));
    repairConsonantLetters(parts, hyphenated, 2, base.observeParts(parts));
    expect(parts).toEqual(["abxr"]); expect(hyphenated).toEqual(parts); base.assertSurface(parts.join(""));
  });

  it("keeps the complete following vowel when vowel trimming would invalidate gz", () => {
    const base = fixture(["ɛ", "g", "z", "æ"], ["e", "g", "z", "aa"], [0, 0, 0, 0]); form(base, "gz-to-x");
    const parts = ["exaa"]; const hyphenated = [...parts];
    repairVowelLetters(parts, hyphenated, 1, base.observeParts(parts));
    expect(parts).toEqual(["exaa"]); expect(hyphenated).toEqual(parts); base.assertSurface(parts.join(""));
  });

  it("does not append a silent-e marker after its vowel swap is refused", () => {
    const base = fixture(["ɛ", "g", "z", "æ", "t"], ["e", "g", "z", "a", "t"], [0, 0, 1, 1, 1]); form(base, "gz-to-x");
    const phone = (sound: string) => englishConfig.phonemes.find(entry => entry.sound === sound)!;
    const syllables = [{ onset: [], nucleus: [phone("ɛ")], coda: [phone("g")] },
      { onset: [phone("z")], nucleus: [phone("æ")], coda: [phone("t")] }];
    const parts = ["ex", "at"]; const hyphenated = ["ex", "&shy;", "at"];
    applySilentE(parts, hyphenated, syllables, ["e", "a"], new Map([["æ", [{ from: "a", to: "ae" }]]]),
      new Set(), 100, () => 0, base.observeParts(parts));
    expect(parts).toEqual(["ex", "at"]); expect(hyphenated).toEqual(["ex", "&shy;", "at"]);
    base.assertSurface(parts.join(""));
    expect(base.snapshot().edits).toHaveLength(1);
  });
});


describe("shared decision event order", () => {
  function history() {
    const base = fixture();
    form(base, "ks-to-x", [1, 2], 0.9);
    form(base);
    base.edit(1, 1, "", "refused-single");
    base.editBatch([{ start: 1, deleteCount: 1, insert: "", rule: "refused-batch" }]);
    base.edit(0, 1, "e", "accepted-single");
    base.replaceWithGapSpelling("ex", "other", "lexical");
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    return trace;
  }

  it("records interleaved attempts, guards, transactions and supersession at their original cursors", () => {
    const trace = history();
    expect(trace.shared.events).toEqual([
      { kind: "attempt", index: 0, cursor: { lastAppendedUnitId: 2, nextEditId: 0 } },
      { kind: "attempt", index: 1, cursor: { lastAppendedUnitId: 2, nextEditId: 0 } },
      { kind: "guard", index: 0, cursor: { lastAppendedUnitId: 2, nextEditId: 1 } },
      { kind: "transaction", index: 0, cursor: { lastAppendedUnitId: 2, nextEditId: 1 } },
      { kind: "guard", index: 1, cursor: { lastAppendedUnitId: 2, nextEditId: 1 } },
      { kind: "supersession", index: 0, cursor: { lastAppendedUnitId: 2, nextEditId: 2 } },
    ]);
    expect(validateSharedEventOrder(trace)).toEqual({ events: 6 });
  });

  it.each(["missing", "duplicate", "cursor", "index", "backwards", "unreferenced", "kind"])("rejects %s event ordering corruption", corruption => {
    const trace = history();
    if (corruption === "missing") trace.shared.events.splice(2, 1);
    if (corruption === "duplicate") trace.shared.events.splice(2, 0, structuredClone(trace.shared.events[1]));
    if (corruption === "cursor") trace.shared.events[0].cursor.nextEditId = 1;
    if (corruption === "index") trace.shared.events[0].index = 1;
    if (corruption === "backwards") trace.shared.events.unshift(trace.shared.events.pop()!);
    if (corruption === "unreferenced") trace.shared.editGuards.push(structuredClone(trace.shared.editGuards[0]));
    if (corruption === "kind") Object.assign(trace.shared.events[0], { kind: "unknown" });
    expect(() => validateSharedEventOrder(trace)).toThrow(/event order/);
  });

  it("detaches returned event cursors", () => {
    const base = fixture(); form(base);
    const trace = base.snapshot();
    if (trace.version !== 4) throw new Error("Expected shared trace");
    trace.shared.events[0].cursor.nextEditId = 99;
    const fresh = base.snapshot();
    if (fresh.version !== 4) throw new Error("Expected shared trace");
    expect(fresh.shared.events[0].cursor.nextEditId).toBe(0);
  });
});
