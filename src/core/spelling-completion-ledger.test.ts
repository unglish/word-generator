import { verifyCompletionSchedule } from "./spelling-completion-schedule.js";
import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import type { Grapheme } from "../types.js";
import { BaseSpelling, createSplitSpellingRuntime } from "./base-spelling.js";
import { createCompletionPlanner } from "./spelling-completion-planner.js";
import { createCompletionObligationInspector } from "./spelling-completion-obligation.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import { createSplitLedgerReplayer } from "./spelling-split-replay.js";

function fixture(syllableCount = 1) {
  const graphemes: Grapheme[] = [
    { phoneme: "eɪ", form: "a", frequency: 1, origin: 0, reading: { kind: "open-vowel-or-split-marker" } },
    { phoneme: "t", form: "t", frequency: 1, origin: 0, reading: { kind: "single-phone" } },
    { phoneme: "eɪ", form: "ai", frequency: 1, origin: 0, reading: { kind: "single-phone" } },
  ];
  const config = { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes), doubling: undefined, sharedSpellings: [] };
  const routes = { syllable: { forms: [], probability: 0 }, word: { swaps: [], probability: 0, monosyllableMultiplier: 1 } };
  const runtime = createSplitSpellingRuntime(config, [], routes, []);
  const planner = createCompletionPlanner(config, []);
  const entries = Array.from({ length: syllableCount }, () => graphemes.slice(0, 2)).flat();
  const phones = entries.map((entry, id) => ({ id, part: "root" as const, syllableIndex: Math.floor(id / 2),
    segment: id % 2 === 0 ? "nucleus" as const : "coda" as const, segmentIndex: 0, soundAtSpelling: entry.phoneme,
    boundary: { phoneme: structuredClone(englishConfig.phonemes.find(phone => phone.sound === entry.phoneme)!) } }));
  const base = new BaseSpelling(phones, true, true, true, [], config, undefined, runtime, planner);
  entries.forEach((entry, id) => base.appendChoice(id, entry.form, entry.form, id % 2, 0));
  base.setPhase("word");
  const decide = () => planner.decide(base.constructionState(), 0, [], () => { throw new Error("Unexpected draw"); });
  return { base, decide, inspect: createCompletionObligationInspector(config, []), replay: createSplitLedgerReplayer(config, [], routes) };
}
describe("live completion ownership and replay", () => {
  it("commits a complete licensed nucleus and replays the full ledger", () => {
    const { base, decide, inspect, replay } = fixture();
    expect(base.recordCompletionAttempt(decide())).toBe(0);
    const view = base.constructionState();
    expect(resolveSingleSpellingUnit(view, 0)).toMatchObject({ status: "complete", before: "ai", inputCellIds: [2, 3] });
    expect(inspect(view, 0, [])).toEqual({ status: "not-target" });
    expect(base.recordCompletionAttempt(decide())).toBeNull();
    const trace = base.snapshot(); if (trace.version !== 5) throw new Error("Expected v5");
    expect(trace.surface).toBe("ait"); expect(trace.completion.certificates).toHaveLength(1);
    expect(trace.completion.attempts).toHaveLength(2); expect(replay(trace).writerSchedule).toBe("unverified");
    trace.completion.certificates[0].after = "wrong";
    expect(() => replay(trace)).toThrow();
    expect(base.snapshot().surface).toBe("ait");
  });
  it("runs one final pass and separately verifies its complete source order", () => {
    const { base, replay } = fixture();
    base.completeVowels(() => { throw new Error("Unexpected draw"); });
    const trace = base.snapshot(); if (trace.version !== 5) throw new Error("Expected v5");
    expect(verifyCompletionSchedule(trace)).toEqual({ nuclei: 1, attempts: 1 });
    expect(() => replay(trace)).not.toThrow();
    expect(() => base.completeVowels(() => 0)).toThrow("Invalid completion pass boundary");
    const omitted = structuredClone(trace); omitted.completion.attempts = [];
    expect(() => verifyCompletionSchedule(omitted)).toThrow();
    const repeated = structuredClone(trace); repeated.shared.timeline.push(repeated.shared.timeline[repeated.shared.timeline.length - 1]);
    expect(() => verifyCompletionSchedule(repeated)).toThrow();
    base.edit(2, 1, "d", "late-root-edit", 0);
    const late = base.snapshot(); if (late.version !== 5) throw new Error("Expected v5");
    expect(() => verifyCompletionSchedule(late)).toThrow();
  });
  it("completes multiple nuclei in order using the changing live cursor", () => {
    const { base, replay } = fixture(2); base.completeVowels(() => 0);
    const trace = base.snapshot(); if (trace.version !== 5) throw new Error("Expected v5");
    expect(trace.surface).toBe("aitait");
    expect(trace.completion.attempts.map(entry => entry.attempt.nucleusId)).toEqual([0, 2]);
    expect(trace.completion.attempts.map(entry => entry.attempt.cursor.nextEditId)).toEqual([0, 1]);
    expect(verifyCompletionSchedule(trace)).toEqual({ nuclei: 2, attempts: 2 });
    expect(() => replay(trace)).not.toThrow();
    const reversed = structuredClone(trace); reversed.completion.attempts.reverse();
    expect(() => verifyCompletionSchedule(reversed)).toThrow();
  });
  it("refuses missing ownership certificates and changed output identities", () => {
    const { base, decide } = fixture(); base.recordCompletionAttempt(decide());
    const view = structuredClone(base.constructionState()); view.completionCertificates = [];
    expect(resolveSingleSpellingUnit(view, 0)).toMatchObject({ status: "refused", reason: "missing-license" });
    const damaged = structuredClone(base.constructionState()); damaged.cells[0].id = 999;
    expect(resolveSingleSpellingUnit(damaged, 0)).toMatchObject({ status: "refused", reason: "missing-license" });
  });
  it("rejects stale commits without adding attempts, edits or certificates", () => {
    const { base, decide } = fixture(); const attempt = decide(); base.recordCompletionAttempt(attempt);
    const before = base.snapshot(); expect(() => base.recordCompletionAttempt(attempt)).toThrow();
    expect(base.snapshot()).toEqual(before);
  });
});
