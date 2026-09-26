import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../../../../src/index.js";
import { canonical } from "../../serialization.js";
import type { LanguageConfig } from "../../../../src/config/language.js";
import type { Word } from "../../../../src/types.js";
import { validateConfiguration, validatePattern } from "./validate.js";
import { emptyObservation, observe, reconcile, morphologyStratum, reconcileStrata } from "./observe.js";

function witness(): Word {
  const config = structuredClone(englishConfig);
  config.pronunciation.stress.primary = { type: "initial" };
  config.pronunciation.stress.secondary = { ...config.pronunciation.stress.secondary, enabled: true, probability: 100 };
  config.pronunciation.stress.rhythmic = { ...config.pronunciation.stress.rhythmic, enabled: true, probability: 100, requireUnstressedNeighbors: false };
  config.syllableStructure.letterLengthTargets = undefined;
  const prefix = config.morphology!.prefixes.find(prefix => prefix.written === "out")!;
  const suffix = config.morphology!.suffixes.find(suffix => suffix.written === "tion")!;
  config.morphology = { ...config.morphology!, prefixes: [prefix], suffixes: [suffix], templateWeights: { lexicon: { bare: 0, prefixed: 0, suffixed: 0, both: 1 }, text: { bare: 0, prefixed: 0, suffixed: 0, both: 1 } } };
  return createGenerator(config).generateWord({ seed: 77, syllableCount: 6, morphology: true, trace: true });
}

describe("stress-pattern archival replay", () => {
  it("checks each event/snapshot without mutating input and keeps missing origins unavailable", () => {
    const rand = createSeededRng(220);
    const generator = createGenerator(englishConfig);
    const candidate = emptyObservation(), control = emptyObservation();
    for (let draw = 0; draw < 250; draw++) {
      const word = generator.generateWord({ rand, trace: true, morphology: true });
      const before = JSON.stringify(word);
      validateConfiguration(word, englishConfig);
      observe(word, "candidate", candidate);
      expect(JSON.stringify(word)).toBe(before);
      const historical = structuredClone(word); delete historical.trace!.stressPattern;
      observe(historical, "control", control);
    }
    reconcile(candidate); reconcile(control);
    expect(candidate.originsAvailableWords).toBe(250);
    expect(control.originsUnavailableWords).toBe(250);
    expect(control.domains["root-after-primary"].unavailableWords).toBe(250);
    expect(control.domains["surface-after-realization"].patterns).toEqual(candidate.domains["surface-after-realization"].patterns);
    const custom = witness(); validatePattern(custom);
    expect(custom.trace!.stressPattern!.morphology).toHaveLength(2);
  });
  it("conditions on resolved morphology and final length, with every stratum reconciling", () => {
    const generator = createGenerator(englishConfig), rand = createSeededRng(221);
    const total = emptyObservation(), strata: Record<string, ReturnType<typeof emptyObservation>> = {};
    for (let draw = 0; draw < 100; draw++) {
      const word = generator.generateWord({ rand, morphology: true, trace: true });
      const key = morphologyStratum(word);
      observe(word, "candidate", total);
      observe(word, "candidate", strata[key] ??= emptyObservation());
    }
    reconcileStrata(total, Object.values(strata));
    const word = witness();
    word.trace!.morphology = { template: "bare", syllableReduction: 0 };
    expect(morphologyStratum(word)).toBe(`bare:${word.syllables.length}`);
    Object.values(strata)[0].words++;
    expect(() => reconcileStrata(total, Object.values(strata))).toThrow();
  });
  it("accepts canonical archived config whose affix object keys differ in insertion order", () => {
    const archived = canonical(englishConfig) as unknown as LanguageConfig;
    const generator = createGenerator(englishConfig);
    for (let seed = 0; seed < 30; seed++) {
      const word = generator.generateWord({ seed, morphology: true, trace: true });
      validateConfiguration(word, archived);
    }
  });
  it("rejects recorded policy metadata that differs from pinned configuration", () => {
    const generator = createGenerator(englishConfig);
    for (const field of ["primary-draw", "secondary-gate", "rhythmic-gate"] as const) {
      const word = generator.generateWord({ seed: 77, syllableCount: 4, morphology: false, trace: true });
      if (field === "primary-draw") word.trace!.stressPattern!.primary.draws.pop();
      if (field === "secondary-gate") word.trace!.stressPattern!.explicitSecondary.probability++;
      if (field === "rhythmic-gate") word.trace!.stressPattern!.rhythmic.probability++;
      expect(() => validateConfiguration(word, englishConfig)).toThrow();
    }
  });
  const mutations: Array<[string, (word: Word) => void]> = [
    ["missing event", word => { word.trace!.stressPattern!.events.splice(1, 1); }],
    ["duplicate event", word => { word.trace!.stressPattern!.events.splice(1, 0, word.trace!.stressPattern!.events[1]); }],
    ["reordered events", word => { const events = word.trace!.stressPattern!.events; [events[1], events[2]] = [events[2], events[1]]; }],
    ["out-of-range coordinate", word => { word.trace!.stressPattern!.events[0].syllableIndex = 999; }],
    ["forward origin", word => { word.trace!.stressPattern!.events[1].previousOrigin = { kind: "event", eventId: 100 }; }],
    ["omitted no-net-change history", word => { word.trace!.stressPattern!.events = word.trace!.stressPattern!.events.filter(event => event.cause.kind !== "morphology"); }],
    ["missing snapshot", word => { word.trace!.stressPattern!.snapshots.splice(1, 1); }],
    ["duplicate snapshot", word => { word.trace!.stressPattern!.snapshots[1] = word.trace!.stressPattern!.snapshots[0]; }],
    ["wrong snapshot origin", word => { word.trace!.stressPattern!.snapshots.at(-1)!.syllables[0].origin = { kind: "input" }; }],
    ["wrong root offset", word => { word.trace!.stressPattern!.assembly!.rootSyllableStart++; }],
    ["omitted affix effect", word => { word.trace!.stressPattern!.morphology.pop(); }],
    ["wrong final phone", word => { word.trace!.stressPattern!.snapshots.at(-1)!.syllables[0].nucleus[0].sound = "forged"; }],
    ["missing rhythm draw", word => { word.trace!.stressPattern!.rhythmic.iterations.find(iteration => iteration.draw !== null)!.draw = null; }],
    ["wrong inherited weight decision", word => { word.trace!.stressWeight!.primary.selectedIndex = 99; }],
    ["duplicate legacy stage", word => { word.trace!.stages.push(word.trace!.stages.find(stage => stage.name === "applyStress")!); }],
  ];
  it.each(mutations)("rejects %s", (_label, mutate) => {
    const word = witness(); mutate(word); expect(() => validatePattern(word)).toThrow();
  });
});
