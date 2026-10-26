import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import { scoreGenerationAttempt } from "./length-semantics.js";
import { findExample } from "../test-support/find-example.js";

function phones(word: Word): number {
  return word.syllables.reduce((count, syllable) => count + syllable.onset.length + syllable.nucleus.length + syllable.coda.length, 0);
}

describe("complete rejection accounting", () => {
  it("distinguishes executed attempts from an early selected fallback", () => {
    const targets: Record<number, [number, number, number, number]> = { 1: [1000, 1000, 1000, 1000] };
    const generator = createGenerator({ ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: targets } });
    // Every attempt is rejected; "early" means the best-scoring one was not the last.
    const { word } = findExample(word => word.trace!.selection!.selectedAttempt < word.trace!.selection!.attemptsExecuted - 1, {
      property: "a fallback selecting an attempt before the last", limit: 50, generator, options: { syllableCount: 1, morphology: false },
    });
    const selection = word.trace!.selection!;
    const maxAttempts = selection.criteria.maxAttempts;
    expect(selection).toMatchObject({ status: "fallback", acceptedBy: null, attemptsExecuted: maxAttempts, rejectedAttempts: maxAttempts });
    expect(word.trace!.attempts).toBe(maxAttempts - 1);
    expect(selection.rejectionReasons.letterLength).toBe(maxAttempts);
    expect(selection.proposedLengths.reduce((sum, bin) => sum + bin.count, 0)).toBe(maxAttempts);
    const minimumScore = Math.min(...selection.proposedLengths.map(bin => scoreGenerationAttempt(
      bin.phonemes, word.trace!.targetPhonemeCount!, bin.letters, bin.syllables, targets,
    ).total));
    expect(selection.selected.score.total).toBe(minimumScore);
    expect(selection.selected).toMatchObject({ syllables: word.syllables.length, phonemes: phones(word), letters: word.written.clean.length });
  });

  it("identifies relaxed acceptance after warmup", () => {
    const { word } = findExample(word => word.trace!.selection!.acceptedBy === "relaxed", {
      property: "a relaxed acceptance", limit: 200, options: { morphology: false },
    });
    const selection = word.trace!.selection!;
    const lastAttempt = selection.attemptsExecuted - 1;
    expect(selection).toMatchObject({ status: "accepted", acceptedBy: "relaxed", selectedAttempt: lastAttempt, rejectedAttempts: lastAttempt });
    expect(selection.selected.score.phonemeDistance).toBe(0);
    expect(selection.selected.score.letterPenalty).toBeGreaterThan(0);
    expect(selection.selected.score.letterPenalty).toBeLessThanOrEqual(selection.criteria.relaxedLetterPenalty);
    expect(selection.selectedAttempt).toBeGreaterThanOrEqual(selection.criteria.warmupAttempts);
  });

  it("reports the first exact acceptance without inventing rejections", () => {
    const generator = createGenerator({ ...englishConfig, syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined } });
    const { word } = findExample(word => word.trace!.selection!.selectedAttempt === 0, {
      property: "a root accepted on its first attempt", limit: 50, generator, options: { morphology: false },
    });
    const selection = word.trace!.selection!;
    expect(selection.status).toBe("accepted");
    expect(selection.acceptedBy).toBe("exact");
    expect(selection.attemptsExecuted).toBe(1);
    expect(selection.rejectionReasons).toEqual({ phonemeTarget: 0, letterLength: 0, warmup: 0 });
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

  it("keeps totals and root proposal multiplicities coherent across morphological strata", () => {
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
      const { selected } = selection;
      expect(selected.score).toEqual(scoreGenerationAttempt(selected.phonemes, trace.targetPhonemeCount!, selected.letters, selected.syllables, englishConfig.syllableStructure.letterLengthTargets));
      // Selection scores the root; only words without attached affixes share its lengths.
      if (!trace.morphology || trace.morphology.template === "bare") {
        expect(selected).toMatchObject({ syllables: word.syllables.length, phonemes: phones(word), letters: word.written.clean.length });
      }
    }
    expect(outcomes).toEqual(new Set(["exact", "relaxed", "fallback"]));
    expect(morphologies).toEqual(new Set(["bare", "prefixed", "suffixed", "both"]));
  });
});
