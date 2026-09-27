import { createBaseSpellingEvidenceVerifier } from "./spelling-evidence.js";
import { createSplitFormationScheduleVerifier } from "./spelling-split-schedule.js";
import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../index.js";
import { englishSplitVowelSupports } from "../elements/graphemes/split-vowels.js";
import { englishSharedSpellings } from "../elements/graphemes/shared.js";
import { verifyCompletionSchedule } from "./spelling-completion-schedule.js";

const splitVowels = { supports: englishSplitVowelSupports, routes: {
  syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
  word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
} };
describe("split vowel public writer integration", () => {
  it("replays public outputs with exact trace-on/off RNG parity", () => {
    const config = { ...englishConfig, sharedSpellings: englishSharedSpellings, splitVowels };
    const generator = createGenerator(config);
    const formationSchedule = createSplitFormationScheduleVerifier(config);
    const fullVerifier = createBaseSpellingEvidenceVerifier(config);
    const on = createSeededRng(129); const off = createSeededRng(129);
    let tracedCalls = 0; let plainCalls = 0; let formations = 0; let completions = 0;
    for (let draw = 0; draw < 500; draw++) {
      const options = { morphology: draw % 2 === 0, mode: draw % 3 ? "text" as const : "lexicon" as const };
      const traced = generator.generateWord({ ...options, rand: () => { tracedCalls++; return on(); }, trace: true });
      const plain = generator.generateWord({ ...options, rand: () => { plainCalls++; return off(); } });
      const trace = traced.trace!.baseSpelling!;
      if (trace.version !== 5) throw new Error("Expected v5");
      expect(() => fullVerifier(trace), `draw ${draw}`).not.toThrow();
      expect(() => formationSchedule(trace), `draw ${draw}`).not.toThrow();
      expect(() => verifyCompletionSchedule(trace), `draw ${draw}`).not.toThrow();
      formations += trace.split.constructions.length; completions += trace.completion.certificates.length;
      delete traced.trace; expect(traced).toEqual(plain); expect(tracedCalls).toBe(plainCalls);
    }
    expect(formations).toBeGreaterThan(0); expect(completions).toBeGreaterThan(0); expect(on()).toBe(off());
  });
  it("rejects missing, duplicated and moved formation trials", () => {
    const config = { ...englishConfig, sharedSpellings: englishSharedSpellings, splitVowels };
    const generator = createGenerator(config); const verify = createSplitFormationScheduleVerifier(config);
    const trace = generator.generateWord({ seed: 129, trace: true, morphology: false }).trace!.baseSpelling!;
    if (trace.version !== 5) throw new Error("Expected v5");
    expect(() => verify(trace)).not.toThrow();
    const omitted = structuredClone(trace); omitted.split.attempts.pop();
    expect(() => verify(omitted)).toThrow();
    const duplicate = structuredClone(trace); duplicate.split.attempts.push(duplicate.split.attempts[0]);
    expect(() => verify(duplicate)).toThrow();
    const moved = structuredClone(trace);
    const position = moved.shared.timeline.findIndex(entry => entry.kind === "split-attempt");
    const [entry] = moved.shared.timeline.splice(position, 1); moved.shared.timeline.push(entry);
    expect(() => verify(moved)).toThrow();
  });

  it("rejects missing required events through the main evidence API", () => {
    const config = { ...englishConfig, sharedSpellings: englishSharedSpellings, splitVowels };
    const verify = createBaseSpellingEvidenceVerifier(config);
    const trace = createGenerator(config).generateWord({ seed: 129, trace: true, morphology: false }).trace!.baseSpelling!;
    if (trace.version !== 5) throw new Error("Expected v5");
    expect(verify(trace)).toMatchObject({ version: 5, writerSchedule: "verified" });
    for (const kind of ["completion-attempt", "split-attempt", "normalization-check", "writer-step"] as const) {
      const damaged = structuredClone(trace);
      const index = damaged.shared.timeline.findIndex(entry => entry.kind === kind);
      expect(index).toBeGreaterThanOrEqual(0); damaged.shared.timeline.splice(index, 1);
      expect(() => verify(damaged)).toThrow();
    }
    expect(() => createBaseSpellingEvidenceVerifier()(trace)).toThrow("v5 requires");
  });

  it("keeps empty support diagnostic with explicit refusals and no legacy formation edits", () => {
    const config = { ...englishConfig, sharedSpellings: englishSharedSpellings,
      splitVowels: { ...splitVowels, supports: [] } };
    const generator = createGenerator(config); const verify = createBaseSpellingEvidenceVerifier(config);
    const rand = createSeededRng(2718); let attempts = 0;
    for (let draw = 0; draw < 64; draw++) {
      const trace = generator.generateWord({ rand, trace: true, morphology: false }).trace!.baseSpelling!;
      if (trace.version !== 5) throw new Error("Expected v5");
      expect(() => verify(trace)).not.toThrow();
      expect(trace.split.constructions).toHaveLength(0);
      expect(trace.split.attempts.every(entry => entry.attempt.status !== "evaluated")).toBe(true);
      expect(trace.edits.some(edit => edit.rule === "spellingRule:magic-e" || edit.rule.startsWith("silentE:swap"))).toBe(false);
      attempts += trace.split.attempts.length;
    }
    expect(attempts).toBeGreaterThan(0);
  });

});
