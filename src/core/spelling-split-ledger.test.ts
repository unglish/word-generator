import { describe, expect, it } from "vitest";
import { createCompletionObligationInspector } from "./spelling-completion-obligation.js";
import { englishSplitVowelSupports } from "../elements/graphemes/split-vowels.js";
import { englishConfig } from "../config/english.js";
import { BaseSpelling, createSplitSpellingRuntime } from "./base-spelling.js";
import { verifyBaseSpellingEvidence } from "./spelling-evidence.js";
import type { GraphemeReading } from "../types.js";

function fixture(codaSound: string, codaForm: string, reading?: GraphemeReading, nucleusForm = "ai") {
  const entries = [{ sound: "t", form: "t", segment: "onset" as const, reading: { kind: "single-phone" as const } },
    { sound: "eɪ", form: nucleusForm, segment: "nucleus" as const, reading: { kind: "single-phone" as const } },
    { sound: codaSound, form: codaForm, segment: "coda" as const, reading }];
  const graphemes = entries.map(entry => ({ phoneme: entry.sound, form: entry.form, frequency: 1, origin: 0, reading: entry.reading }));
  const phones = entries.map((entry, id) => ({ id, part: "root" as const, syllableIndex: 0,
    segment: entry.segment, segmentIndex: 0, soundAtSpelling: entry.sound,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.sound)!) } }));
  const runtime = createSplitSpellingRuntime({ graphemes, doubling: undefined },
    [{ vowel: { sound: "eɪ", component: "a" }, coda: { sounds: [codaSound], written: codaForm }, marker: "e" }],
    { syllable: { forms: ["ae"], probability: 95 }, word: { swaps: [{ phoneme: "eɪ", from: nucleusForm, to: "a" }], probability: 35, monosyllableMultiplier: 2 } }, []);
  const base = new BaseSpelling(phones, true, true, true, [], { graphemes, doubling: undefined }, undefined, runtime);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id, 0));
  base.setPhase("word");
  return { base, planner: runtime.planner };
}

function formed() {
  const { base, planner } = fixture("t", "t", { kind: "single-phone" });
  const before = base.snapshot();
  const attempt = planner.decide(base.constructionState(), 1, "word", () => 0);
  expect(base.recordSplitAttempt(attempt)).toBe(0);
  return { base, before };
}
describe("split-vowel ledger commit", () => {
  it("publishes a detached v5 trace and preserves original phone and unit records", () => {
    const { base, before } = formed(); const trace = base.snapshot();
    expect(trace.version).toBe(5); expect(trace.surface).toBe("tate");
    expect(trace.phones).toEqual(before.phones); expect(trace.units).toEqual(before.units);
    if (trace.version !== 5) throw new Error("fixture");
    expect(trace.split.liveConstructionIds).toEqual([0]);
    expect(trace.split.attempts).toHaveLength(1); expect(trace.edits).toHaveLength(1);
    trace.split.constructions[0].reading.component = "!";
    expect(base.snapshot()).not.toEqual(trace);
    expect(() => verifyBaseSpellingEvidence(base.snapshot(), englishConfig)).toThrow("v5 requires its split spelling configuration");
  });
  it("refuses destructive edits and batches atomically", () => {
    const { base } = formed(); const before = base.snapshot();
    expect(base.edit(3, 1, "", "delete-marker", 0)).toBe(false);
    expect(base.editBatch([{ start: 0, deleteCount: 1, insert: "d", rule: "onset", partId: 0 },
      { start: 3, deleteCount: 1, insert: "", rule: "marker", partId: 0 }])).toBe(false);
    const after = base.snapshot();
    expect(after.cells).toEqual(before.cells); expect(after.edits).toEqual(before.edits);
    if (after.version !== 5) throw new Error("fixture");
    expect(after.split.guards).toHaveLength(2);
    expect(after.split.guards.map(entry => entry.decision.status)).toEqual(["refused", "refused"]);
    expect(after.shared.timeline.filter(entry => entry.kind === "split-guard").map(entry => entry.index)).toEqual([0, 1]);
    expect(base.edit(0, 1, "d", "onset", 0)).toBe(true);
    expect(base.snapshot().surface).toBe("date");
  });
  it("records explicit split retirement for lexical whole-root replacement", () => {
    const { base } = formed(); base.replaceWithGapSpelling("tate", "word", "fixture");
    const trace = base.snapshot(); if (trace.version !== 5) throw new Error("fixture");
    expect(trace.split.liveConstructionIds).toEqual([]);
    expect(trace.split.supersessions).toHaveLength(1);
    expect(trace.split.supersessions[0]).toMatchObject({ constructionIds: [0], before: "tate", after: "word", ownership: "unavailable" });
    expect(trace.unresolvedCells).toBe(4);
  });
  it("marks a live split obligation satisfied and damaged marker evidence unavailable", () => {
    const { base } = formed(); const trace = base.snapshot(); if (trace.version !== 5) throw new Error("fixture");
    const inspect = createCompletionObligationInspector(englishConfig, englishSplitVowelSupports);
    const view = base.constructionState();
    expect(inspect(view, 1, trace.split.constructions)).toEqual({ status: "satisfied", reading: "split", constructionId: 0 });
    expect(inspect({ ...view, cells: view.cells.slice(0, -1) }, 1, trace.split.constructions))
      .toEqual({ status: "unavailable", reason: "invalid-split-reading" });
  });
  it("rejects stale attempts without committing any cells or trace records", () => {
    const { base, planner } = fixture("t", "t", { kind: "single-phone" });
    const attempt = planner.decide(base.constructionState(), 1, "word", () => 0);
    base.edit(0, 1, "d", "later", 0); const before = base.snapshot();
    expect(() => base.recordSplitAttempt(attempt)).toThrow(); expect(base.snapshot()).toEqual(before);
  });
});
