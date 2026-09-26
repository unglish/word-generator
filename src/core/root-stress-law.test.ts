import { describe, expect, it } from "vitest";
import { createRootStressLaw, createSeededRng, RootStressLawError } from "../index.js";
import type { RootLogMass, RootStressLawInput, StressMark } from "../index.js";

function input(n = 4, primary = 3): RootStressLawInput {
  return {
    beforePrimary: Array<StressMark>(n).fill("unmarked"),
    afterPrimary: Array.from({ length: n }, (_, i) => i === primary ? "primary" : "unmarked"),
    operationalHeavy: Array<boolean>(n).fill(true),
    secondary: { enabled: true, candidateWindow: "first-three", probability: 40, heavyWeight: 1, lightWeight: 1 },
    rhythmic: { enabled: true, probability: 40, requireUnstressedNeighbors: true },
    lambda: Math.log(2),
  };
}
function logValue(value: RootLogMass): number {
  expect(value.status).toBe("finite");
  if (value.status !== "finite") throw new Error("Expected a positive mass");
  return value.value;
}
function marks(n: number, primary: number, secondary: number[]): StressMark[] {
  return Array.from({ length: n }, (_, i) => i === primary ? "primary" : secondary.includes(i) ? "secondary" : "unmarked");
}
function expectCode(action: () => unknown, code: RootStressLawError["code"]): void {
  try {
    action();
    throw new Error("Expected a root stress law error");
  } catch (error) {
    expect(error).toBeInstanceOf(RootStressLawError);
    expect((error as RootStressLawError).code).toBe(code);
  }
}

describe("public root stress law", () => {
  it("sums duplicate histories before conditioning: 10/43, 28/43, 5/43", () => {
    const law = createRootStressLaw(input());
    const partition = logValue(law.analyzeCount(1).logPartition);
    for (const [index, numerator, prior] of [[0, 10, 10], [1, 28, 28], [2, 5, 10]]) {
      const result = law.analyzePattern(marks(4, 3, [index]));
      expect(Math.exp(logValue(result.priorLogMass))).toBeCloseTo(prior / 75, 14);
      expect(Math.exp(logValue(result.tiltedLogMass) - partition)).toBeCloseTo(numerator / 43, 14);
    }
    expect(law.analyzePattern(marks(4, 3, [0, 1])).priorLogMass).toEqual({ status: "zero" });
    expect(law.analyzeCount(2).logPartition).toEqual({ status: "zero" });
    expectCode(() => law.sample(2, () => 0), "zero-support");
  });

  it("retains exact zero strata and sums the simpler 2/3 versus 1/3 placement", () => {
    const law = createRootStressLaw(input(4, 2));
    const partition = logValue(law.analyzeCount(1).logPartition);
    expect(Math.exp(logValue(law.analyzePattern(marks(4, 2, [0])).tiltedLogMass) - partition)).toBeCloseTo(2 / 3, 14);
    expect(Math.exp(logValue(law.analyzePattern(marks(4, 2, [1])).tiltedLogMass) - partition)).toBeCloseTo(1 / 3, 14);
    expect(law.analyzePattern(marks(4, 2, [3])).priorLogMass.status).toBe("zero");
  });

  it.each([0, 1])("cannot remove the fixed-K disyllable adjacency with primary %i", primary => {
    const law = createRootStressLaw(input(2, primary));
    const result = law.sample(1, () => { throw new Error("Forced path must not draw"); });
    expect(result.marks).toEqual(marks(2, primary, [1 - primary]));
    expect(law.analyzePattern(result.marks).adjacentMarkedPairs).toBe(1);
    expect(result.selectedPatternConditionalLogMass).toBeCloseTo(0, 14);
  });

  it("retains the all-zero last-option rule and zero components", () => {
    const config = input();
    Object.assign(config.secondary, { probability: 100, heavyWeight: 0, lightWeight: 0 });
    config.rhythmic.enabled = false;
    const law = createRootStressLaw(config);
    const count = law.analyzeCount(1);
    expect(count.components.map(component => component.prior.status)).toEqual(["zero", "zero", "zero", "finite"]);
    expect(law.sample(1, () => { throw new Error("No choice exists"); }).marks).toEqual(marks(4, 3, [2]));
  });

  it("disabled secondary and monosyllables expose only the none component", () => {
    const disabled = input();
    disabled.secondary.enabled = false;
    for (const config of [disabled, input(1, 0)]) {
      expect(createRootStressLaw(config).analyzeCount(0).components.map(component => component.component)).toEqual([{ kind: "no-explicit-mark" }]);
    }
  });

  it("models directional rhythm and excludes edges", () => {
    const config = input(5, 4);
    config.secondary.enabled = false;
    config.rhythmic.probability = 100;
    const law = createRootStressLaw(config);
    expect(law.sample(1, () => { throw new Error("Deterministic rhythm"); }).marks).toEqual(marks(5, 4, [1]));
    expect(law.analyzePattern(marks(5, 4, [2])).priorLogMass.status).toBe("zero");
    config.rhythmic.requireUnstressedNeighbors = false;
    expect(createRootStressLaw(config).sample(3, () => 0).marks).toEqual(marks(5, 4, [1, 2, 3]));
  });

  it("keeps subnormal gate support in logs without materializing zero", () => {
    const config = input();
    config.secondary.probability = Number.MIN_VALUE;
    config.rhythmic.probability = 0;
    const count = createRootStressLaw(config).analyzeCount(1);
    expect(logValue(count.logPartition)).toBeLessThan(Math.log(Number.MIN_VALUE));
    expect(Math.exp(logValue(count.logPartition))).toBe(0);
  });

  it("keeps tiny rhythmic support in the preregistered corrected numeric domain", () => {
    const config = input(3, 0);
    config.secondary.probability = 0;
    config.rhythmic = { enabled: true, probability: Number.MIN_VALUE, requireUnstressedNeighbors: false };
    const law = createRootStressLaw(config);
    expect(logValue(law.analyzeCount(1).logPartition)).toBeLessThan(Math.log(Number.MIN_VALUE));
    expect(law.sample(1, () => { throw new Error("Only one pattern is supported"); }).marks).toEqual(marks(3, 0, [1]));
  });

  it("keeps a near-unit gate's failure mass", () => {
    const config = input(3, 2);
    config.secondary.probability = 100 - 2 ** -46;
    config.rhythmic.probability = 0;
    expect(logValue(createRootStressLaw(config).analyzeCount(0).logPartition)).toBeCloseTo(Math.log((100 - config.secondary.probability) / 100), 13);
  });

  it("detaches inputs, analyses, pattern results and sampling transcripts", () => {
    const config = input();
    const law = createRootStressLaw(config);
    const before = law.analyzeCount(1);
    const sample = law.sample(1, createSeededRng(81));
    config.afterPrimary = [];
    config.rhythmic.probability = 100;
    config.secondary.heavyWeight = 0;
    const explicit = before.components[1].component;
    if (explicit.kind === "explicit-mark") explicit.syllableIndex = 99;
    if (before.components[1].prior.status === "finite") before.components[1].prior.value = 99;
    before.components.length = 0;
    sample.marks.fill("secondary");
    sample.count.components.length = 0;
    sample.componentDraws.length = 0;
    sample.backward.length = 0;
    expect(law.analyzeCount(1).components).toHaveLength(4);
    expect(law.sample(1, createSeededRng(81)).marks.filter(mark => mark === "primary")).toHaveLength(1);
    expect(law.sample(1, createSeededRng(81))).toEqual(law.sample(1, createSeededRng(81)));
  });

  it("records every actual sampling draw in order, and no forced draw", () => {
    const law = createRootStressLaw(input());
    const recorded: number[] = [];
    const seeded = createSeededRng(72);
    const result = law.sample(1, () => { const value = seeded(); recorded.push(value); return value; });
    const transcript = [...result.componentDraws, ...result.backward.filter(step => step.kind === "drawn")].sort((a, b) => a.drawOrdinal - b.drawOrdinal);
    expect(transcript.map(step => step.uniform)).toEqual(recorded);
    expect(transcript.map(step => step.drawOrdinal)).toEqual(recorded.map((_, index) => index));
    expect(result.marks.filter(mark => mark === "secondary")).toHaveLength(1);
    expect(result.selectedPatternPriorLogMass).toBe(logValue(law.analyzePattern(result.marks).priorLogMass));
  });

  it("reports polynomial work dimensions on a longer deterministic case", () => {
    const config = input(128, 127);
    config.secondary.candidateWindow = "all-nonprimary";
    config.rhythmic.probability = 0;
    const result = createRootStressLaw(config).sample(1, () => 0.5);
    expect(result.work.componentPasses).toBeLessThanOrEqual(129);
    expect(result.work.statesVisited).toBeLessThanOrEqual(result.work.componentPasses * 128 * 2 * 2);
    expect(result.work.transitionsConsidered).toBe(result.work.statesVisited * 2);
    expect(result.work.peakRetainedCells).toBe(129 * 2 * 2);
    expect(result.work.allocatedCells).toBeLessThanOrEqual(128 * 2 * 2 * 2 + 129 * 2 * 2);
  });

  it.each([-1, NaN, Infinity, -Infinity])("rejects invalid numeric parameters %s", value => {
    for (const group of ["secondary", "rhythmic"] as const) {
      const config = input(); config[group].probability = value;
      expectCode(() => createRootStressLaw(config), "invalid-input");
    }
    for (const key of ["heavyWeight", "lightWeight"] as const) {
      const config = input(); config.secondary[key] = value;
      expectCode(() => createRootStressLaw(config), "invalid-input");
    }
    const config = input(); config.lambda = value;
    expectCode(() => createRootStressLaw(config), "invalid-input");
  });

  it("rejects overflow, absorbed positive weights, subnormal totals and oversized log bounds", () => {
    for (const [heavy, light] of [[Number.MAX_VALUE, Number.MAX_VALUE], [1, 2 ** -54], [Number.MIN_VALUE, 0]]) {
      const config = input(3, 2);
      config.operationalHeavy = [true, false, true];
      Object.assign(config.secondary, { heavyWeight: heavy, lightWeight: light });
      expectCode(() => createRootStressLaw(config), "unsupported-numerical-range");
    }
    const config = input(); config.lambda = 1000;
    expectCode(() => createRootStressLaw(config), "unsupported-numerical-range");
  });

  it("distinguishes invalid domain/encoding from valid unsupported patterns", () => {
    for (const before of [[], ["primary", "unmarked", "unmarked", "unmarked"], new Array(4), ["x", "unmarked", "unmarked", "unmarked"]]) {
      const config = input(); config.beforePrimary = before as StressMark[];
      expectCode(() => createRootStressLaw(config), "invalid-input");
    }
    for (const after of [marks(4, 3, [0]), ["unmarked", "unmarked", "unmarked", "unmarked"], ["primary", "unmarked", "unmarked", "primary"]]) {
      const config = input(); config.afterPrimary = after as StressMark[];
      expectCode(() => createRootStressLaw(config), "invalid-input");
    }
    const law = createRootStressLaw(input());
    expectCode(() => law.analyzePattern(marks(4, 2, [])), "invalid-input");
    expectCode(() => law.analyzePattern(["", "unmarked", "unmarked", "primary"] as StressMark[]), "invalid-input");
    expect(law.analyzePattern(marks(4, 3, [0, 1, 2])).priorLogMass.status).toBe("zero");
    expectCode(() => law.analyzeCount(4), "invalid-input");
  });

  it.each([-1, 1, NaN, Infinity, -Infinity])("rejects an actually consumed invalid RNG value %s", value => {
    expectCode(() => createRootStressLaw(input()).sample(1, () => value), "invalid-rng");
  });
});
