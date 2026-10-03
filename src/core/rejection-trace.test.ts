import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import { scoreGenerationAttempt } from "./length-semantics.js";

function phones(word: Word): number {
  return word.syllables.reduce((count, syllable) => count + syllable.onset.length + syllable.nucleus.length + syllable.coda.length, 0);
}

describe("complete rejection accounting", () => {
  it("distinguishes executed attempts from an early selected fallback", () => {
    const targets: Record<number, [number, number, number, number]> = { 1: [1000, 1000, 1000, 1000] };
    const generator = createGenerator({ ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: targets } });
    const word = generator.generateWord({ seed: 0, syllableCount: 1, morphology: false, trace: true });
    const selection = word.trace!.selection!;
    expect(selection).toMatchObject({ status: "fallback", acceptedBy: null, attemptsExecuted: 20, selectedAttempt: 1, rejectedAttempts: 20 });
    expect(word.trace!.attempts).toBe(19);
    expect(selection.rejectionReasons.letterLength).toBe(20);
    expect(selection.proposedLengths.reduce((sum, bin) => sum + bin.count, 0)).toBe(20);
    const minimumScore = Math.min(...selection.proposedLengths.map(bin => scoreGenerationAttempt(
      bin.phonemes, selection.targets.scoredPhonemes, bin.letters, bin.syllables, targets,
    ).total));
    expect(selection.selected.score.total).toBe(minimumScore);
    expect(selection.selected).toMatchObject({ syllables: word.syllables.length, phonemes: phones(word), letters: word.written.clean.length, morphologyPhonemes: 0 });
  });

  it("identifies relaxed acceptance after warmup", () => {
    const word = generateWord({ seed: 1, morphology: false, trace: true });
    const selection = word.trace!.selection!;
    expect(selection).toMatchObject({ status: "accepted", acceptedBy: "relaxed", attemptsExecuted: 5, selectedAttempt: 4, rejectedAttempts: 4 });
    expect(selection.selected.score).toMatchObject({ phonemeDistance: 0, letterPenalty: 0.5 });
    expect(selection.selectedAttempt).toBeGreaterThanOrEqual(selection.criteria.warmupAttempts);
  });

  it("reports the first exact acceptance without inventing rejections", () => {
    const generator = createGenerator({ ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined } });
    const word = generator.generateWord({ seed: 2, morphology: false, trace: true });
    const selection = word.trace!.selection!;
    expect(selection.status).toBe("accepted");
    expect(selection.acceptedBy).toBe("exact");
    expect(selection.attemptsExecuted).toBe(1);
    expect(selection.rejectionReasons).toEqual({ phonemeTarget: 0, letterLength: 0, warmup: 0, morphologyResolution: 0 });
    expect(selection.selected.score.total).toBe(0);
    expect(selection.rejectedAttempts).toBe(selection.attemptsExecuted - 1);
    expect(selection.selectedAttempt).toBe(selection.attemptsExecuted - 1);
  });

  it.each([false, true])("tracing preserves outputs and RNG consumption with morphology=%s", morphology => {
    const first = createSeededRng(97412);
    const second = createSeededRng(97412);
    let firstCalls = 0, secondCalls = 0;
    const plainRand = () => { firstCalls++; return first(); };
    const traceRand = () => { secondCalls++; return second(); };
    for (let index = 0; index < 500; index++) {
      const plain = generateWord({ rand: plainRand, morphology });
      const traced = generateWord({ rand: traceRand, morphology, trace: true });
      const { trace, ...output } = traced;
      expect(output).toEqual(plain);
      expect(trace!.selection).toBeDefined();
    }
    expect(firstCalls).toBe(secondCalls);
    expect(first()).toBe(second());
  });

  it("keeps totals and proposal multiplicities coherent across actual morphological strata", () => {
    const words = generateWords(2_000, { seed: 192837, morphology: true, trace: true });
    const outcomes = new Set<string>();
    const morphologies = new Set<string>();
    for (const word of words) {
      const trace = word.trace!;
      const selection = trace.selection!;
      outcomes.add(selection.acceptedBy ?? selection.status);
      morphologies.add(trace.morphology?.template ?? "bare");
      expect(trace.attempts).toBe(selection.attemptsExecuted - 1);
      expect(selection.selectedAttempt).toBeLessThan(selection.attemptsExecuted);
      expect(selection.attemptsExecuted).toBeLessThanOrEqual(selection.criteria.maxAttempts);
      expect(selection.proposedLengths.reduce((sum, bin) => sum + bin.count, 0)).toBe(selection.attemptsExecuted);
      expect(selection.rejectedAttempts).toBe(selection.attemptsExecuted - (selection.status === "accepted" ? 1 : 0));
      expect(Object.values(selection.rejectionReasons).reduce((sum, value) => sum + value, 0)).toBeGreaterThanOrEqual(selection.rejectedAttempts);
      expect(selection.selected).toMatchObject({ syllables: word.syllables.length, phonemes: phones(word), letters: word.written.clean.length });
      expect(selection.selected.score).toEqual(scoreGenerationAttempt(phones(word), selection.targets.scoredPhonemes, word.written.clean.length, word.syllables.length, englishConfig.syllableStructure.letterLengthTargets));
    }
    expect(outcomes).toEqual(new Set(["exact", "relaxed", "fallback"]));
    expect(morphologies).toEqual(new Set(["bare", "prefixed", "suffixed", "both"]));
  });
});
