import { describe, it, expect } from "vitest";
import { generateWord } from "./generate.js";

describe("trace pipeline", () => {
  it("attaches a trace when trace: true is passed", () => {
    const word = generateWord({ seed: 42, trace: true });
    expect(word.trace).toBeDefined();
    const t = word.trace!;

    // stages
    expect(t.stages.length).toBeGreaterThan(0);
    expect(t.stages[0].name).toBe("generateSyllables");
    for (const stage of t.stages) {
      expect(stage).toHaveProperty("name");
      expect(stage).toHaveProperty("before");
      expect(stage).toHaveProperty("after");
      expect(Array.isArray(stage.before)).toBe(true);
      expect(Array.isArray(stage.after)).toBe(true);
    }

    // grapheme selections
    expect(t.graphemeSelections.length).toBeGreaterThan(0);
    for (const g of t.graphemeSelections) {
      expect(typeof g.phoneme).toBe("string");
      expect(typeof g.position).toBe("string");
      expect(typeof g.syllableIndex).toBe("number");
      expect(Array.isArray(g.candidates)).toBe(true);
      expect(Array.isArray(g.afterCondition)).toBe(true);
      expect(Array.isArray(g.afterPosition)).toBe(true);
      expect(Array.isArray(g.weights)).toBe(true);
      expect(typeof g.roll).toBe("number");
      expect(typeof g.selected).toBe("string");
      expect(typeof g.doubled).toBe("boolean");
    }

    // summary
    expect(t.summary).toBeDefined();
    expect(typeof t.summary.totalDecisions).toBe("number");
    expect(typeof t.summary.repairCount).toBe("number");
    expect(typeof t.summary.morphologyApplied).toBe("boolean");
    expect(t.summary.totalDecisions).toBe(t.graphemeSelections.length);
  });

  it("does not attach a trace when trace option is not set", () => {
    const word = generateWord({ seed: 42 });
    expect(word.trace).toBeUndefined();
  });

  it("stage snapshots use string arrays, not Phoneme objects", () => {
    const word = generateWord({ seed: 42, trace: true, syllableCount: 2 });
    const afterGen = word.trace!.stages.find(s => s.name === "generateSyllables")!;
    expect(afterGen.after.length).toBeGreaterThan(0);
    for (const snap of afterGen.after) {
      for (const sound of [...snap.onset, ...snap.nucleus, ...snap.coda]) {
        expect(typeof sound).toBe("string");
      }
    }
  });
});
