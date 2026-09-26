import { describe, expect, it } from "vitest";
import { analyzeStressPattern, createGenerator, createSeededRng, englishConfig } from "../index.js";
import type { Affix, LanguageConfig } from "../config/language.js";
import type { StressPatternDomain, StressPatternTrace } from "./stress-pattern.js";

const domains: StressPatternDomain[] = ["root-before-primary", "root-after-primary", "root-after-explicit-secondary", "root-after-rhythmic", "assembled-after-morphology", "final-lexical-before-realization", "surface-after-realization"];
const marks = (trace: StressPatternTrace, domain: StressPatternDomain) => trace.snapshots.find(snapshot => snapshot.domain === domain)!.syllables.map(syllable => syllable.mark);
const affix = (type: "prefix" | "suffix", stressEffect: Affix["stressEffect"], zero = false): Affix => ({
  type, stressEffect, written: zero ? "s" : "in", frequency: 1,
  phonemes: zero ? ["s"] : ["ɪ", "n"], syllableCount: zero ? 0 : 1,
  syllables: zero ? [] : [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }],
});

function config(options: { primary?: number; secondary?: boolean; secondaryProbability?: number; rhythm?: boolean; rhythmProbability?: number; neighbors?: boolean; zeroWeights?: boolean; firstThree?: boolean; prefix?: Affix; suffix?: Affix; reduction?: boolean } = {}): LanguageConfig {
  const weights = { bare: 0, prefixed: 0, suffixed: 0, both: 0 };
  weights[options.prefix ? options.suffix ? "both" : "prefixed" : options.suffix ? "suffixed" : "bare"] = 1;
  return {
    ...englishConfig,
    phonemeMaps: { ...englishConfig.phonemeMaps, nucleus: new Map([["ʌ", englishConfig.phonemeMaps.nucleus.get("ʌ")!]]) },
    syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined },
    pronunciation: {
      ...englishConfig.pronunciation,
      stress: { ...englishConfig.pronunciation.stress,
        primary: { type: "fixed", fixedPosition: options.primary ?? 0 },
        secondary: { ...englishConfig.pronunciation.stress.secondary, enabled: options.secondary ?? false, probability: options.secondaryProbability ?? 100, candidateWindow: options.firstThree ? "first-three" : "all-nonprimary", ...(options.zeroWeights ? { heavyWeight: 0, lightWeight: 0 } : {}) },
        rhythmic: { ...englishConfig.pronunciation.stress.rhythmic, enabled: options.rhythm ?? false, probability: options.rhythmProbability ?? 100, requireUnstressedNeighbors: options.neighbors ?? true },
      },
      vowelReduction: { enabled: options.reduction ?? false, rules: [{ source: "ʌ", target: "ə", probability: 100 }], reduceSecondaryStress: true },
    },
    morphology: { ...englishConfig.morphology!, prefixes: options.prefix ? [options.prefix] : [], suffixes: options.suffix ? [options.suffix] : [], templateWeights: { lexicon: weights, text: weights } },
  };
}
const word = (fixture: LanguageConfig, syllableCount = 4) => createGenerator(fixture).generateWord({ seed: 51, syllableCount, morphology: true, trace: true });

describe("passive complete stress-pattern tracing", () => {
  it("records all seven domains with actual root/full coordinates and fixed primary without a draw", () => {
    const result = word(config());
    const trace = result.trace!.stressPattern!;
    expect(trace.scope).toBe("returned-attempt");
    expect(trace.snapshots.map(snapshot => snapshot.domain)).toEqual(domains);
    expect(trace.snapshots.map(snapshot => snapshot.coordinates)).toEqual(["root", "root", "root", "root", "word", "word", "word"]);
    expect(trace.primary).toEqual({ strategy: "fixed", selectedIndex: 0, draws: [] });
    expect(marks(trace, "root-before-primary")).toEqual(["unmarked", "unmarked", "unmarked", "unmarked"]);
    expect(marks(trace, "surface-after-realization")).toEqual(["primary", "unmarked", "unmarked", "unmarked"]);
    expect(trace.events).toEqual([{ id: 0, coordinates: "root", syllableIndex: 0, before: "unmarked", previousOrigin: { kind: "unmarked" }, after: "primary", cause: { kind: "root-primary" } }]);
    expect(trace.explicitSecondary.skipped).toBe("disabled");
    expect(trace.rhythmic.iterations).toEqual([]);
  });

  it.each([0, 100])("records both executed explicit draws at a %i%% gate", probability => {
    const trace = word(config({ secondary: true, secondaryProbability: probability, zeroWeights: true })).trace!.stressPattern!;
    expect(trace.explicitSecondary).toMatchObject({ selectedIndex: 3, applied: probability === 100, skipped: null });
    expect(trace.explicitSecondary.candidates).toEqual([1, 2, 3].map(syllableIndex => ({ syllableIndex, weight: 0 })));
    for (const draw of [trace.explicitSecondary.selectionDraw, trace.explicitSecondary.gateDraw]) {
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(1);
    }
    expect(trace.events.filter(event => event.cause.kind === "explicit-secondary")).toHaveLength(probability === 100 ? 1 : 0);
  });

  it.each([0, 2])("records only executed OT noise calls at noise %i", noise => {
    const fixture = config();
    fixture.pronunciation.stress.primary = { type: "ot", otConfig: { noise, constraints: [{ name: "ALIGN-LEFT", weight: 4 }, { name: "unknown-custom-name", weight: 7 }, { name: "NONFINALITY", weight: 2 }] } };
    const actualDraws: number[] = [];
    const rng = createSeededRng(20260926);
    const result = createGenerator(fixture).generateWord({ rand: () => { const value = rng(); actualDraws.push(value); return value; }, syllableCount: 4, morphology: true, trace: true });
    const primary = result.trace!.stressPattern!.primary;
    expect(primary.strategy).toBe("ot");
    expect(primary.draws).toHaveLength(noise === 0 ? 0 : 4);
    if (primary.draws.length) {
      const offset = actualDraws.indexOf(primary.draws[0]);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(actualDraws.slice(offset, offset + primary.draws.length)).toEqual(primary.draws);
    }
    expect(result.trace!.stressPattern!.events[0].syllableIndex).toBe(primary.selectedIndex);
  });

  it("records the configured first-three candidate window without widening it", () => {
    const trace = word(config({ primary: 3, secondary: true, firstThree: true }), 5).trace!.stressPattern!;
    expect(trace.explicitSecondary.candidateWindow).toBe("first-three");
    expect(trace.explicitSecondary.candidates.map(candidate => candidate.syllableIndex)).toEqual([0, 1, 2]);
  });

  it("records sequential rhythm eligibility after each earlier insertion", () => {
    const trace = word(config({ rhythm: true }), 6).trace!.stressPattern!;
    expect(marks(trace, "root-after-rhythmic")).toEqual(["primary", "unmarked", "secondary", "unmarked", "secondary", "unmarked"]);
    expect(trace.rhythmic.iterations.map(iteration => [iteration.syllableIndex, iteration.left, iteration.skipped, iteration.applied])).toEqual([
      [1, "primary", "marked-neighbor", false], [2, "unmarked", null, true], [3, "secondary", "marked-neighbor", false], [4, "unmarked", null, true],
    ]);
    expect(trace.rhythmic.iterations.filter(iteration => iteration.skipped).every(iteration => iteration.draw === null)).toBe(true);
  });

  it("records zero-probability rhythm draws without pretending the rule was disabled", () => {
    const trace = word(config({ rhythm: true, rhythmProbability: 0 }), 6).trace!.stressPattern!;
    expect(trace.rhythmic.iterations.map(iteration => iteration.skipped)).toEqual(["marked-neighbor", null, null, null]);
    expect(trace.rhythmic.iterations.slice(1).every(iteration => iteration.draw !== null && !iteration.applied)).toBe(true);
    expect(trace.events).toHaveLength(1);
  });

  it("records already-marked skips separately from evaluated neighbor checks", () => {
    const trace = word(config({ primary: 2, secondary: true, rhythm: true, neighbors: false, zeroWeights: true }), 5).trace!.stressPattern!;
    const primaryIteration = trace.rhythmic.iterations.find(iteration => iteration.syllableIndex === 2)!;
    expect(primaryIteration).toMatchObject({ skipped: "already-marked", neighborCheckPerformed: false, draw: null, applied: false });
    expect(trace.rhythmic.iterations.filter(iteration => iteration.syllableIndex !== 2).every(iteration => iteration.draw !== null)).toBe(true);
  });

  it("keeps demotion and re-promotion even when the final root mark equals its starting mark", () => {
    const trace = word(config({ suffix: affix("suffix", "attract-preceding") }), 2).trace!.stressPattern!;
    expect(marks(trace, "root-after-rhythmic")).toEqual(["primary"]);
    expect(marks(trace, "assembled-after-morphology")).toEqual(["primary", "unmarked"]);
    expect(trace.events.map(event => [event.before, event.after])).toEqual([["unmarked", "primary"], ["primary", "secondary"], ["secondary", "primary"]]);
    expect(trace.events[2].previousOrigin).toEqual({ kind: "event", eventId: 1 });
    expect(trace.events[1].previousOrigin).toEqual({ kind: "event", eventId: 0 });
  });

  it("preserves an overwritten explicit-secondary origin when a suffix attracts primary", () => {
    const trace = word(config({ secondary: true, suffix: affix("suffix", "attract-preceding") }), 3).trace!.stressPattern!;
    const promoted = trace.events.find(event => event.cause.kind === "morphology" && event.cause.action === "preceding-primary")!;
    expect(promoted).toMatchObject({ syllableIndex: 1, before: "secondary", after: "primary", previousOrigin: { kind: "event", eventId: 1 } });
    expect(trace.events[1].cause).toEqual({ kind: "explicit-secondary" });
  });

  it("retains ordered effects and distinct role references for same-spelling prefix and suffix", () => {
    const result = word(config({ prefix: affix("prefix", "primary"), suffix: affix("suffix", "primary") }), 3);
    const trace = result.trace!.stressPattern!;
    expect(trace.assembly).toEqual({ rootSyllableStart: 1, prefixSyllables: 1, suffixSyllables: 1 });
    expect(trace.morphology.map(effect => [effect.role, effect.eventIds])).toEqual([["prefix", [1, 2]], ["suffix", [3, 4]]]);
    expect(trace.events[1]).toMatchObject({ coordinates: "word", syllableIndex: 1, previousOrigin: { kind: "event", eventId: 0 } });
    expect(trace.events[3]).toMatchObject({ syllableIndex: 0, previousOrigin: { kind: "event", eventId: 2 } });
    expect(marks(trace, "surface-after-realization")).toEqual(["secondary", "secondary", "primary"]);
    for (const effect of trace.morphology) expect(result.trace!.morphology!.realization![effect.role]!.resolved.written).toBe("in");
  });

  it("uses actual allomorph arrays for coordinates despite different planned and declared counts", () => {
    const prefix = affix("prefix", "primary");
    prefix.allomorphs = [{ phonologicalCondition: { position: "following" }, written: "into", phonemes: ["ɪ", "n", "t", "u"], syllableCount: 7, syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }, { onset: ["t"], nucleus: ["u"], coda: [] }] }];
    const result = word(config({ prefix }), 2);
    expect(result.trace!.morphology!.realization!.prefix).toMatchObject({ allomorphIndex: 0, planned: { syllableCount: 1 }, resolved: { syllableCount: 7 } });
    const trace = result.trace!.stressPattern!;
    expect(trace.assembly).toEqual({ rootSyllableStart: 2, prefixSyllables: 2, suffixSyllables: 0 });
    expect(trace.morphology[0].syllableIndices).toEqual([0, 1]);
    expect(trace.events[1]).toMatchObject({ syllableIndex: 2, previousOrigin: { kind: "event", eventId: 0 } });
    expect(marks(trace, "surface-after-realization")).toEqual(["primary", "unmarked", "secondary"]);
  });

  it.each(["none", "primary", "secondary", "attract-preceding"] as const)("does not invent a %s effect for a zero-syllable affix", effect => {
    const trace = word(config({ suffix: affix("suffix", effect, true) }), 1).trace!.stressPattern!;
    expect(trace.morphology).toEqual([{ id: 0, role: "suffix", effect, syllableIndices: [], status: "no-realized-syllables", eventIds: [] }]);
    expect(trace.events).toHaveLength(1);
    expect(trace.explicitSecondary).toMatchObject({ skipped: "monosyllabic", selectionDraw: null, gateDraw: null });
  });

  it("does not apply suffix-only attraction to a prefix", () => {
    const trace = word(config({ prefix: affix("prefix", "attract-preceding") }), 2).trace!.stressPattern!;
    expect(trace.morphology[0]).toMatchObject({ status: "prefix-attraction-not-applied", eventIds: [] });
    expect(marks(trace, "surface-after-realization")).toEqual(["unmarked", "primary"]);
  });

  it("observes unspecified affix quantity without invoking the root's strict unknown policy again", () => {
    const prefix = affix("prefix", "none");
    prefix.phonemes = ["u"];
    prefix.syllables = [{ onset: [], nucleus: ["u"], coda: [] }];
    const fixture = config({ prefix });
    fixture.pronunciation.stress.syllableWeight = { type: "moraic", analysis: "english-legacy-partial-quantity-v1", coda: "weight-by-position", unknown: "error" };
    const result = word(fixture, 2);
    const assembled = result.trace!.stressPattern!.snapshots.find(snapshot => snapshot.domain === "assembled-after-morphology")!;
    expect(assembled.syllables[0].nucleus[0]).toEqual({ sound: "u" });
    expect(result.trace!.stressWeight!.syllables).toHaveLength(1);
  });

  it("preserves historical root phones when a later morphology promotion repairs schwa", () => {
    const fixture = config({ suffix: affix("suffix", "attract-preceding") });
    fixture.phonemeMaps.nucleus = new Map(["ʌ", "ə"].map(sound => [sound, englishConfig.phonemeMaps.nucleus.get(sound)!]));
    const generator = createGenerator(fixture);
    let observed = 0;
    for (let seed = 0; seed < 100; seed++) {
      const result = generator.generateWord({ seed, syllableCount: 3, morphology: true, trace: true });
      const trace = result.trace!.stressPattern!;
      const byDomain = (domain: StressPatternDomain) => trace.snapshots.find(snapshot => snapshot.domain === domain)!.syllables[1];
      if (byDomain("assembled-after-morphology").nucleus[0].sound !== "ə") continue;
      observed++;
      expect(byDomain("root-after-rhythmic")).toMatchObject({ mark: "unmarked", nucleus: [{ sound: "ə" }] });
      expect(byDomain("assembled-after-morphology")).toMatchObject({ mark: "primary", nucleus: [{ sound: "ə" }] });
      expect(byDomain("final-lexical-before-realization")).toMatchObject({ mark: "primary", nucleus: [{ sound: "ʌ" }] });
      expect(result.lexical!.root[1].nucleus[0].sound).toBe("ʌ");
      expect(byDomain("final-lexical-before-realization").origin).toEqual(byDomain("assembled-after-morphology").origin);
    }
    expect(observed).toBeGreaterThan(0);
  });

  it("detaches snapshots, origins and candidate lists from every other returned view", () => {
    const fixture = config({ secondary: true, reduction: true });
    const result = word(fixture, 3);
    const original = structuredClone(result);
    const trace = result.trace!.stressPattern!;
    trace.snapshots[0].syllables[0].nucleus[0].nuclearQuantity!.analysis = "edited";
    trace.snapshots[1].syllables[0].origin = { kind: "input" };
    trace.explicitSecondary.candidates[0].weight = -123;
    expect(trace.snapshots[1].syllables[0].nucleus[0].nuclearQuantity!.analysis).toBe("english-legacy-partial-quantity-v1");
    expect(trace.snapshots[2].syllables[0].origin).toEqual({ kind: "event", eventId: 0 });
    expect(result.trace!.stressWeight!.secondary.candidates[0].weight).toBeGreaterThan(0);
    expect(result.lexical!.root[0].nucleus[0].nuclearQuantity!.analysis).toBe("english-legacy-partial-quantity-v1");
    expect(word(fixture, 3)).toEqual(original);
  });

  it("detaches reduced surface quantity and morphology origins independently", () => {
    const fixture = config({ prefix: affix("prefix", "primary"), reduction: true });
    const result = word(fixture, 2);
    const original = structuredClone(result);
    const trace = result.trace!.stressPattern!;
    const surface = trace.snapshots.at(-1)!;
    expect(surface.syllables[1].nucleus[0]).toMatchObject({ sound: "ə", reduced: true });
    surface.syllables[1].nucleus[0].nuclearQuantity!.analysis = "edited-surface";
    surface.syllables[1].origin = { kind: "input" };
    trace.events[1].previousOrigin = { kind: "input" };
    expect(result.syllables[1].nucleus[0].nuclearQuantity!.analysis).toBe("english-legacy-partial-quantity-v1");
    expect(trace.snapshots.at(-2)!.syllables[1].origin).toEqual({ kind: "event", eventId: 1 });
    expect(trace.snapshots[3].syllables[0].origin).toEqual({ kind: "event", eventId: 0 });
    expect(word(fixture, 2)).toEqual(original);
  });

  it("keeps full generation and RNG consumption identical with observation off/on", () => {
    for (const fixture of [config({ secondary: true, rhythm: true }), config({ secondary: true, rhythm: true, secondaryProbability: 0, rhythmProbability: 0 }), config({ prefix: affix("prefix", "primary"), suffix: affix("suffix", "attract-preceding"), reduction: true })]) {
      const generator = createGenerator(fixture);
      const left = createSeededRng(20260926), right = createSeededRng(20260926);
      let a = 0, b = 0;
      for (let draw = 0; draw < 100; draw++) {
        const plain = generator.generateWord({ rand: () => { a++; return left(); }, syllableCount: 5, morphology: true });
        const traced = generator.generateWord({ rand: () => { b++; return right(); }, syllableCount: 5, morphology: true, trace: true });
        expect({ ...traced, trace: undefined }).toEqual(plain);
        expect(b).toBe(a);
      }
      expect(right()).toBe(left());
    }
  });
});

describe("pure complete-pattern analysis", () => {
  it("counts ordered adjacent labels, maximal gaps and signed distance without inventing feet", () => {
    expect(analyzeStressPattern({ availability: "observed", marks: ["unmarked", "primary", "secondary", "unmarked", "unmarked", "secondary", "primary", "primary", "unmarked"] })).toEqual({
      availability: "observed", syllables: 9, primaryIndices: [1, 6, 7], secondaryIndices: [2, 5],
      adjacencies: [{ leftIndex: 1, left: "primary", right: "secondary" }, { leftIndex: 5, left: "secondary", right: "primary" }, { leftIndex: 6, left: "primary", right: "primary" }],
      unmarkedRuns: [{ start: 0, end: 0, length: 1, position: "initial" }, { start: 3, end: 4, length: 2, position: "internal" }, { start: 8, end: 8, length: 1, position: "final" }],
      secondaryDistances: [{ syllableIndex: 2, primaries: [{ primaryIndex: 1, signedDistance: 1 }, { primaryIndex: 6, signedDistance: -4 }, { primaryIndex: 7, signedDistance: -5 }] }, { syllableIndex: 5, primaries: [{ primaryIndex: 1, signedDistance: 4 }, { primaryIndex: 6, signedDistance: -1 }, { primaryIndex: 7, signedDistance: -2 }] }],
    });
  });
  it("distinguishes an observed unmarked pattern, an empty input, and unavailable history", () => {
    expect(analyzeStressPattern({ availability: "observed", marks: ["unmarked", "unmarked"] })).toMatchObject({ primaryIndices: [], secondaryIndices: [], unmarkedRuns: [{ start: 0, end: 1, length: 2, position: "whole-word" }] });
    expect(analyzeStressPattern({ availability: "observed", marks: [] })).toMatchObject({ syllables: 0, unmarkedRuns: [] });
    expect(analyzeStressPattern({ availability: "unavailable", reason: "historical stage omitted marks" })).toEqual({ availability: "unavailable", reason: "historical stage omitted marks" });
  });
});
