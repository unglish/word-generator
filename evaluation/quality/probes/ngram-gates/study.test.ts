import { describe, expect, it } from "vitest";
import { createSeededRng, generateWord, generateWords } from "../../../../src/index.js";
import { addNgrams, advanceSeed, evaluateGate, evaluateGates, streamSchedule, traceReplay } from "./study.js";

describe("unchanged-generator gate study", () => {
  it("counts overlapping UTF-16 within-word opportunities", () => {
    const counts: Record<string, number> = {};
    expect(addNgrams("aaaa", 2, counts)).toBe(3);
    expect(counts).toEqual({ aa: 3 });
    expect(addNgrams("", 3, counts)).toBe(0);
    expect(addNgrams("x", 3, counts)).toBe(0);
    const unicode: Record<string, number> = {};
    expect(addNgrams("a😀", 2, unicode)).toBe(2);
    expect(Object.keys(unicode)).toHaveLength(2);
  });

  it("includes missing reference categories and excludes exact cutoff equality", () => {
    const under = evaluateGate({ aa: 10 }, 10, { aa: 5, bb: 4, cc: 1 }, 0.1, 0.2, "under");
    expect(under).toMatchObject({ ngram: "bb", generatedCount: 0, referenceCount: 4, generatedTotal: 10, referenceTotal: 10, ratio: 0, failed: true });
    const over = evaluateGate({ cc: 900, zz: 50, aa: 10, bb: 5 }, 965, { aa: 5, bb: 4, cc: 1 }, 0.1, 1, "over");
    expect(over.ngram).toBe("aa");
    expect(over.failed).toBe(false);
  });

  it("preserves first-enumerated ties and passes exact thresholds", () => {
    expect(evaluateGate({ bb: 5, aa: 5 }, 10, { aa: 1, bb: 1 }, 0, 1, "over")).toMatchObject({ ngram: "bb", ratio: 1, failed: false });
    expect(evaluateGate({ bb: 5, aa: 5 }, 10, { aa: 1, bb: 1 }, 0, 1, "under")).toMatchObject({ ngram: "aa", ratio: 1, failed: false });
    expect(() => evaluateGate({}, 0, { aa: 1 }, 0, 1, "under")).toThrow();
  });

  it("uses the four existing thresholds and distinct eligibility cutoffs", () => {
    const gates = evaluateGates({ aa: 10 }, 10, { aaa: 10 }, 10, [{ aa: 900, bb: 100 }, { aaa: 9999, bbb: 1 }], {
      maxBigramOverRepresentation: 2, maxTrigramOverRepresentation: 2,
      minBigramRepresentation: 0.5, minTrigramRepresentation: 0.5,
      minBigramBaselineFreq: 0.01, minTrigramBaselineFreq: 0.00001, sampleSize: 10,
    });
    expect(Object.values(gates).map(gate => gate.failed)).toEqual([false, false, true, true]);
    expect(gates.trigramUnder.ngram).toBe("bbb");
  });

  it("advances the actual public RNG exactly across wraparound", () => {
    for (const seed of [0, 42, 0xffffffff]) {
      const rng = createSeededRng(seed);
      for (let calls = 0; calls < 2000; calls++) expect(createSeededRng(advanceSeed(seed, calls))()).toBe(rng());
    }
    expect(advanceSeed(42, 2 ** 32)).toBe(42);
    expect(() => advanceSeed(42, -1)).toThrow();
  });

  it("reserves disjoint adjacent phase intervals and a separate control", () => {
    const schedule = streamSchedule("unchanged-ngram-gates-v1", 20, 42);
    expect(schedule).toEqual(streamSchedule("unchanged-ngram-gates-v1", 20, 42));
    expect(schedule[0]).toMatchObject({ id: "control", seed: 42, phase: null });
    const study = schedule.slice(1);
    expect(new Set(study.map(entry => entry.seed)).size).toBe(20);
    expect(study.reduce((sum, entry) => sum + entry.capacity, 0)).toBe(2 ** 32);
    for (let i = 1; i < study.length; i++) expect(study[i].phase).toBe(study[i - 1].phase! + study[i - 1].capacity);
  });

  it("matches the public batch API and exact traced word-start replay over 2,000 draws", () => {
    const expected = generateWords(2000, { seed: 42 });
    const rng = createSeededRng(42);
    let calls = 0;
    for (let draw = 0; draw < expected.length; draw++) {
      const start = calls;
      const word = generateWord({ rand: () => { calls++; return rng(); } });
      expect(word).toEqual(expected[draw]);
      expect(traceReplay(word, advanceSeed(42, start), calls - start).trace).toBeDefined();
    }
    expect(() => traceReplay(expected[0], 42, 0)).toThrow(/replay/);
  });
});
