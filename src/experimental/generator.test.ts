import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, generateWords } from "../index.js";
import type { ClusterRepairBackend } from "./rust-repair.js";
describe("experimental repair integration boundary", () => {
  it("preserves the default sequential batch API and validates counts", () => {
    const generator = createGenerator(englishConfig);
    expect(generator.repairBackend).toBe("typescript");
    expect(generator.generateWords(20, { seed: 342, trace: true })).toEqual(generateWords(20, { seed: 342, trace: true }));
    expect(generator.generateWords(0)).toEqual([]);
    for (const count of [-1, 1.5, NaN, 1000001]) expect(() => generator.generateWords(count)).toThrow();
  });
  it("rejects using a backend compiled for another configuration", () => {
    const other = { ...englishConfig };
    const backend: ClusterRepairBackend = { name: "rust-wasm-v1", config: other, repair() { throw new Error("must not execute"); }, dispose() {} };
    expect(() => createGenerator(englishConfig, { experimentalRepair: backend })).toThrow("different configuration");
  });
});
