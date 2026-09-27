import { describe, expect, it, vi } from "vitest";
import { sampleCompletion } from "./spelling-completion-sampling.js";

describe("registered conditional completion sampling", () => {
  it("conditions on supported proposals without changing inventory order", () => {
    const pool = [{ inventoryIndex: 7, weight: 1 }, { inventoryIndex: 3, weight: 100, refusal: "reading" }, { inventoryIndex: 9, weight: 3 }];
    const rand = vi.fn(() => 0.25);
    expect(sampleCompletion(pool, rand)).toEqual({ status: "selected", inventoryIndex: 9, roll: 0.25,
      candidates: [{ inventoryIndex: 7, weight: 1, retainedWeight: 1, probability: 0.25 },
        { inventoryIndex: 3, weight: 100, refusal: "reading", retainedWeight: 0, probability: 0 },
        { inventoryIndex: 9, weight: 3, retainedWeight: 3, probability: 0.75 }] });
    expect(rand).toHaveBeenCalledTimes(1);
  });
  it("skips RNG for empty, refused-only and singleton support", () => {
    const rand = vi.fn(() => { throw new Error("draw"); });
    expect(sampleCompletion([], rand).status).toBe("infeasible");
    expect(sampleCompletion([{ inventoryIndex: 0, weight: 1, refusal: "reading" }], rand).status).toBe("infeasible");
    expect(sampleCompletion([{ inventoryIndex: 0, weight: 2 }], rand)).toMatchObject({ status: "selected", inventoryIndex: 0 });
    expect(rand).not.toHaveBeenCalled();
  });
  it("matches an independent integer interval reference over all small weight triples", () => {
    for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) for (let c = 1; c <= 5; c++) {
      const weights = [a, b, c]; const total = a + b + c;
      for (let numerator = 0; numerator < 2 * total; numerator++) {
        // Midpoints of half-unit intervals avoid floating-point boundary ambiguity.
        const roll = (2 * numerator + 1) / (4 * total);
        const target = BigInt(2 * numerator + 1);
        const expected = target < 4n * BigInt(a) ? 0 : target < 4n * BigInt(a + b) ? 1 : 2;
        const result = sampleCompletion(weights.map((weight, inventoryIndex) => ({ inventoryIndex, weight })), () => roll);
        expect(result.status === "selected" && result.inventoryIndex).toBe(expected);
      }
    }
  });
  it("keeps distinct entries with equal weights and obeys reordered intervals", () => {
    for (const indices of [[2, 8], [8, 2]]) {
      expect(sampleCompletion(indices.map(inventoryIndex => ({ inventoryIndex, weight: 1 })), () => 0.5)).toMatchObject({ inventoryIndex: indices[1] });
    }
  });
  it("handles overflowing raw totals by rescaling, without adding a draw", () => {
    const rand = vi.fn(() => 0.5);
    expect(sampleCompletion([{ inventoryIndex: 0, weight: Number.MAX_VALUE }, { inventoryIndex: 1, weight: Number.MAX_VALUE }], rand))
      .toMatchObject({ inventoryIndex: 1, candidates: [{ probability: 0.5 }, { probability: 0.5 }] });
    expect(rand).toHaveBeenCalledTimes(1);
  });
  it.each([-1, 1, NaN, Infinity])("rejects invalid uniform value %s", roll => {
    expect(() => sampleCompletion([{ inventoryIndex: 0, weight: 1 }, { inventoryIndex: 1, weight: 1 }], () => roll)).toThrow("random draw");
  });
  it("rejects invalid weights and reused inventory identities before sampling", () => {
    const rand = vi.fn(() => 0);
    for (const weight of [0, -1, NaN, Infinity]) expect(() => sampleCompletion([{ inventoryIndex: 0, weight }], rand)).toThrow("candidate weight");
    expect(() => sampleCompletion([{ inventoryIndex: 0, weight: 1 }, { inventoryIndex: 0, weight: 2 }], rand)).toThrow("candidate weight");
    expect(rand).not.toHaveBeenCalled();
  });
});
