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

  it("captures repair traces with rule, before, and after", () => {
    let foundRepair = false;
    for (let s = 0; s < 200; s++) {
      const w = generateWord({ seed: s, trace: true });
      if (w.trace!.repairs.length > 0) {
        const r = w.trace!.repairs[0];
        expect(typeof r.rule).toBe("string");
        expect(typeof r.before).toBe("string");
        expect(typeof r.after).toBe("string");
        expect(r.before).not.toBe(r.after);
        foundRepair = true;
        break;
      }
    }
    expect(foundRepair).toBe(true);
  });

  it("summary.repairCount matches repairs array length", () => {
    const word = generateWord({ seed: 10, trace: true });
    const t = word.trace!;
    expect(t.summary.repairCount).toBe(t.repairs.length);
  });

  it("traces morphology plan details when morphology is enabled", () => {
    let found = false;
    for (let s = 0; s < 200; s++) {
      const w = generateWord({ seed: s, morphology: true, trace: true });
      if (w.trace!.morphology && w.trace!.morphology.template !== "bare") {
        const m = w.trace!.morphology;
        expect(typeof m.template).toBe("string");
        expect(typeof m.syllableReduction).toBe("number");
        // At least one of prefix/suffix should be defined for non-bare
        expect(m.prefix !== undefined || m.suffix !== undefined).toBe(true);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("does not include morphology trace when morphology is not used", () => {
    const word = generateWord({ seed: 42, trace: true });
    expect(word.trace!.morphology).toBeUndefined();
  });

  it("traces boundary adjustment drops", () => {
    // Multi-syllable words should occasionally trigger boundary drops
    let found = false;
    for (let s = 0; s < 500; s++) {
      const w = generateWord({ seed: s, syllableCount: 3, trace: true });
      const drops = w.trace!.structural.filter(e => e.event === "boundaryDrop");
      if (drops.length > 0) {
        expect(drops[0].detail).toMatch(/dropped coda/);
        expect(drops[0].detail).toMatch(/equal sonority/);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("traces final-s extension", () => {
    let found = false;
    for (let s = 0; s < 500; s++) {
      const w = generateWord({ seed: s, trace: true });
      const finalS = w.trace!.structural.filter(e => e.event === "finalS");
      if (finalS.length > 0) {
        expect(finalS[0].detail).toMatch(/appended \/s\//);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("traces nasal+stop extension", () => {
    let found = false;
    for (let s = 0; s < 2000; s++) {
      const w = generateWord({ seed: s, trace: true });
      const ext = w.trace!.structural.filter(e => e.event === "nasalStopExtension");
      if (ext.length > 0) {
        expect(ext[0].detail).toMatch(/extended/);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("structural array is always present (may be empty)", () => {
    const word = generateWord({ seed: 42, trace: true });
    expect(Array.isArray(word.trace!.structural)).toBe(true);
  });
});
