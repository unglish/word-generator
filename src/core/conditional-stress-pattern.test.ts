import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../index.js";
import type { ConditionalStressPatternTrace, OTConstraint, RootPatternPolicy } from "../index.js";
import type { Affix, LanguageConfig } from "../config/language.js";

const affix = (type: "prefix" | "suffix", stressEffect: Affix["stressEffect"], zero = false): Affix => ({
  type, stressEffect, written: zero ? "s" : "in", frequency: 1,
  phonemes: zero ? ["s"] : ["ɪ", "n"], syllableCount: zero ? 0 : 1,
  syllables: zero ? [] : [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }],
});
interface Options {
  policy?: RootPatternPolicy;
  primary?: number;
  secondary?: boolean;
  secondaryProbability?: number;
  rhythm?: boolean;
  rhythmProbability?: number;
  neighbors?: boolean;
  zeroWeights?: boolean;
  firstThree?: boolean;
  prefix?: Affix;
  suffix?: Affix;
  reduction?: boolean;
}
function config(options: Options = {}): LanguageConfig {
  const templates = { bare: 0, prefixed: 0, suffixed: 0, both: 0 };
  templates[options.prefix ? options.suffix ? "both" : "prefixed" : options.suffix ? "suffixed" : "bare"] = 1;
  return { ...englishConfig,
    phonemeMaps: { ...englishConfig.phonemeMaps, nucleus: new Map([["ʌ", englishConfig.phonemeMaps.nucleus.get("ʌ")!]]) },
    syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined },
    pronunciation: { ...englishConfig.pronunciation,
      stress: { ...englishConfig.pronunciation.stress,
        ...(options.policy ? { rootPattern: options.policy } : {}),
        primary: { type: "fixed", fixedPosition: options.primary ?? 0 },
        secondary: { ...englishConfig.pronunciation.stress.secondary, enabled: options.secondary ?? true,
          probability: options.secondaryProbability ?? 100, candidateWindow: options.firstThree ? "first-three" : "all-nonprimary",
          ...(options.zeroWeights ? { heavyWeight: 0, lightWeight: 0 } : {}) },
        rhythmic: { ...englishConfig.pronunciation.stress.rhythmic, enabled: options.rhythm ?? true,
          probability: options.rhythmProbability ?? 40, requireUnstressedNeighbors: options.neighbors ?? true } },
      vowelReduction: { enabled: options.reduction ?? false, rules: [{ source: "ʌ", target: "ə", probability: 100 }], reduceSecondaryStress: true } },
    morphology: { ...englishConfig.morphology!, prefixes: options.prefix ? [options.prefix] : [], suffixes: options.suffix ? [options.suffix] : [], templateWeights: { lexicon: templates, text: templates } },
  };
}
const active = (options: Options = {}) => config({ ...options, policy: { type: "count-conditioned", lambda: Math.log(2) } });
const word = (fixture: LanguageConfig, count = 4, seed = 51) => createGenerator(fixture).generateWord({ seed, syllableCount: count, morphology: true, trace: true });
function traceOf(result: ReturnType<typeof word>): ConditionalStressPatternTrace {
  const trace = result.trace?.stressPattern;
  if (trace?.version !== 2) throw new Error("Expected conditional v2 stress trace");
  return trace;
}
const withoutTrace = (result: ReturnType<typeof word>) => { const copy = { ...result }; delete copy.trace; return copy; };
const marks = (trace: ConditionalStressPatternTrace, index: number) => trace.snapshots[index].syllables.map(syllable => syllable.mark);
function counted(seed: number) {
  const rng = createSeededRng(seed);
  const values: number[] = [];
  return { values, rand: () => { const value = rng(); values.push(value); return value; } };
}

describe("opt-in conditional root stress integration", () => {
  it.each([undefined, { type: "legacy" }, { type: "count-conditioned", lambda: 0 }] as const)("preserves all live legacy fields and RNG for %j", policy => {
    const expectedApi = createGenerator(config());
    const actualApi = createGenerator(config({ policy }));
    const left = counted(20260926); const right = counted(20260926);
    for (let draw = 0; draw < 25; draw++) {
      const options = { syllableCount: 4, morphology: false, trace: true };
      const expected = expectedApi.generateWord({ ...options, rand: left.rand });
      const actual = actualApi.generateWord({ ...options, rand: right.rand });
      expect(actual).toStrictEqual(expected);
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
      expect(Reflect.ownKeys(actual.trace!)).toEqual(Reflect.ownKeys(expected.trace!));
      expect(actual.trace?.stressPattern?.version).toBe(1);
      expect(right.values).toEqual(left.values);
    }
    expect(right.rand()).toBe(left.rand());
  });

  it("uses six real domains and a distinct proposal namespace without stressWeight v1", () => {
    const result = word(active()); const trace = traceOf(result);
    expect(trace.snapshots.map(snapshot => snapshot.domain)).toEqual([
      "root-before-primary", "root-after-primary", "root-after-pattern-application",
      "assembled-after-morphology", "final-lexical-before-realization", "surface-after-realization",
    ]);
    expect(Object.hasOwn(result.trace!, "stressWeight")).toBe(false);
    expect(trace.snapshots.map(snapshot => snapshot.coordinates)).toEqual(["root", "root", "root", "word", "word", "word"]);
    expect(trace.events[0]).toEqual({ id: 0, coordinates: "root", syllableIndex: 0, before: "unmarked", previousOrigin: { kind: "unmarked" }, after: "primary", cause: { kind: "root-primary" } });
    const proposal = trace.rootPattern.proposal;
    expect(proposal.target).toBe("detached-proposal");
    expect(Object.hasOwn(proposal.explicitSecondary, "applied")).toBe(false);
    expect(proposal.rhythmic.iterations.every(iteration => !Object.hasOwn(iteration, "applied"))).toBe(true);
    expect(proposal.assignments.map(event => event.proposalEventId)).toEqual(proposal.assignments.map((_, index) => index));
    expect(proposal.snapshots.map(snapshot => snapshot.phase)).toEqual(["after-explicit-secondary", "after-rhythm"]);
    expect(proposal.assignments).toHaveLength(proposal.secondaryCount);
    expect(trace.events.every(event => event.cause.kind !== "explicit-secondary" && event.cause.kind !== "rhythmic")).toBe(true);
  });

  it("applies each sampled secondary once in ascending order with unchanged primary and phones", () => {
    for (let seed = 0; seed < 12; seed++) {
      const trace = traceOf(word(active({ neighbors: false, rhythmProbability: 70 }), 7, seed));
      const { proposal, application } = trace.rootPattern;
      expect(application.secondaryIndices).toHaveLength(proposal.secondaryCount);
      expect(application.secondaryIndices).toEqual([...application.secondaryIndices].sort((a, b) => a - b));
      expect(application.appliedEventIds.map(id => trace.events[id].syllableIndex)).toEqual(application.secondaryIndices);
      expect(application.appliedEventIds.every(id => trace.events[id].before === "unmarked" && trace.events[id].cause.kind === "root-pattern-sampler")).toBe(true);
      expect(marks(trace, 2).filter(mark => mark === "primary")).toHaveLength(1);
      expect(marks(trace, 2)[trace.primary.selectedIndex]).toBe("primary");
      const phones = (index: number) => trace.snapshots[index].syllables.map(({ onset, nucleus, coda }) => ({ onset, nucleus, coda }));
      expect(phones(2)).toStrictEqual(phones(1));
    }
  });

  it.each([1, 4])("records K0 without invented application events for %i syllables", count => {
    const options = { secondaryProbability: 0, rhythmProbability: 0 };
    const a = counted(99); const b = counted(99);
    const legacy = createGenerator(config(options)).generateWord({ syllableCount: count, morphology: false, rand: a.rand });
    const result = createGenerator(active(options)).generateWord({ syllableCount: count, morphology: false, rand: b.rand, trace: true });
    expect(withoutTrace(result)).toStrictEqual(legacy);
    expect(b.values).toEqual(a.values);
    const trace = traceOf(result);
    expect(trace.rootPattern.proposal.secondaryCount).toBe(0);
    expect(trace.rootPattern.application).toEqual({ secondaryIndices: [], appliedEventIds: [], adjacentMarkedPairs: 0 });
    expect(trace.rootPattern.sampling.componentDraws).toEqual([]);
    expect(trace.rootPattern.sampling.backward.every(step => step.kind === "forced")).toBe(true);
    expect(trace.events).toHaveLength(1);
  });

  it("retains the unique adjacent pattern for fixed-K disyllables", () => {
    const a = counted(75); const b = counted(75);
    const legacy = createGenerator(config({ rhythm: false })).generateWord({ syllableCount: 2, morphology: false, rand: a.rand });
    const result = createGenerator(active({ rhythm: false })).generateWord({ syllableCount: 2, morphology: false, rand: b.rand, trace: true });
    expect(withoutTrace(result)).toStrictEqual(legacy);
    expect(b.values).toEqual(a.values);
    expect(traceOf(result).rootPattern.application.adjacentMarkedPairs).toBe(1);
  });

  it.each([0, 100])("records actual selection/gate calls for the %i%% all-zero proposal", probability => {
    const trace = traceOf(word(active({ zeroWeights: true, secondaryProbability: probability, rhythm: false })));
    const proposal = trace.rootPattern.proposal;
    expect(proposal.explicitSecondary).toMatchObject({ selectedIndex: 3, assignedInProposal: probability === 100 });
    expect(proposal.explicitSecondary.candidates.every(candidate => candidate.weight === 0)).toBe(true);
    expect(proposal.explicitSecondary.selectionDraw).toBeTypeOf("number");
    expect(proposal.explicitSecondary.gateDraw).toBeTypeOf("number");
    expect(proposal.secondaryCount).toBe(probability === 100 ? 1 : 0);
  });

  it("preserves first-three proposal candidates even when primary is outside the window", () => {
    const trace = traceOf(word(active({ firstThree: true, primary: 4, rhythm: false }), 6));
    expect(trace.rootPattern.proposal.explicitSecondary.candidates.map(candidate => candidate.syllableIndex)).toEqual([0, 1, 2]);
  });

  it.each([false, true])("keeps sequential proposal rhythm and actual skips with neighbors=%s", neighbors => {
    const trace = traceOf(word(active({ secondary: false, rhythmProbability: 100, neighbors }), 6));
    const proposal = trace.rootPattern.proposal;
    expect(proposal.explicitSecondary.skipped).toBe("disabled");
    expect(proposal.rhythmic.iterations.map(iteration => iteration.syllableIndex)).toEqual([1, 2, 3, 4]);
    expect(proposal.snapshots[1].marks).toEqual(neighbors
      ? ["primary", "unmarked", "secondary", "unmarked", "secondary", "unmarked"]
      : ["primary", "secondary", "secondary", "secondary", "secondary", "unmarked"]);
    expect(proposal.rhythmic.iterations.filter(iteration => iteration.skipped !== null).every(iteration => iteration.draw === null)).toBe(true);
  });

  it.each(["initial", "penultimate", "weight-sensitive", "ot"] as const)("executes %s primary once on the actual root", strategy => {
    const fixture = active();
    const stress = fixture.pronunciation.stress;
    if (strategy === "weight-sensitive") stress.primary = { type: strategy, disyllabicWeights: [60, 40], polysyllabicWeights: { heavyPenult: 20, lightPenult: 10, antepenultHeavy: 30, antepenultLight: 40, initial: 10 } };
    else if (strategy === "ot") stress.primary = { type: "ot", otConfig: { noise: 2, constraints: [{ name: "ALIGN-LEFT", weight: 4 }] } };
    else stress.primary = { type: strategy };
    const trace = traceOf(word(fixture));
    expect(trace.primary.strategy).toBe(strategy);
    expect(trace.events.filter(event => event.cause.kind === "root-primary")).toHaveLength(1);
    expect(trace.primary.draws).toHaveLength(strategy === "ot" ? 2 : strategy === "weight-sensitive" ? 1 : 0);
  });

  it("matches trace-on/off complete outputs and RNG on one shared active stream", () => {
    const api = createGenerator(active()); const a = counted(452); const b = counted(452);
    for (let draw = 0; draw < 30; draw++) {
      const traced = api.generateWord({ rand: a.rand, trace: true, morphology: false });
      const plain = api.generateWord({ rand: b.rand, trace: false, morphology: false });
      expect(withoutTrace(traced)).toStrictEqual(plain);
      expect(a.values).toEqual(b.values);
    }
    expect(a.rand()).toBe(b.rand());
  });

  it("keeps root event IDs through actual prefix shift and successive morphology overwrites", () => {
    const trace = traceOf(word(active({ prefix: affix("prefix", "primary"), suffix: affix("suffix", "attract-preceding"), rhythm: false })));
    expect(trace.assembly).toEqual({ rootSyllableStart: 1, prefixSyllables: 1, suffixSyllables: 1 });
    const effects = trace.morphology;
    expect(effects.map(effect => effect.role)).toEqual(["prefix", "suffix"]);
    const rootDemotion = trace.events.find(event => event.cause.kind === "morphology" && event.cause.effectId === 0 && event.cause.action === "demote-primary")!;
    expect(rootDemotion).toMatchObject({ coordinates: "word", syllableIndex: 1, previousOrigin: { kind: "event", eventId: 0 } });
    for (const effect of effects) for (const id of effect.eventIds) expect(trace.events[id].cause).toMatchObject({ kind: "morphology", effectId: effect.id });
    const suffixPromotion = trace.events.find(event => event.cause.kind === "morphology" && event.cause.action === "preceding-primary")!;
    expect(suffixPromotion.syllableIndex).toBe(trace.assembly.rootSyllableStart + trace.rootSyllableCount - 1);
  });

  it.each(["prefix", "suffix"] as const)("retains the resolved zero-syllable %s with no nonexistent assignment", role => {
    const fixture = active({ [role]: affix(role, "primary", true), rhythm: false });
    const result = word(fixture); const trace = traceOf(result);
    expect(trace.morphology).toMatchObject([{ role, effect: "primary", syllableIndices: [], status: "no-realized-syllables", eventIds: [] }]);
    expect(trace.assembly.prefixSyllables).toBe(0);
    expect(trace.assembly.suffixSyllables).toBe(0);
    expect(result.trace?.morphology?.realization?.[role]).toBeDefined();
    expect(trace.events.every(event => event.cause.kind !== "morphology")).toBe(true);
  });

  it("uses allomorph arrays rather than declared counts for prefix coordinates", () => {
    const prefix = affix("prefix", "secondary");
    prefix.allomorphs = [{ phonologicalCondition: { position: "following" }, written: "arin", phonemes: ["ɑ", "r", "ɪ", "n"], syllableCount: 7,
      syllables: [{ onset: [], nucleus: ["ɑ"], coda: [] }, { onset: ["r"], nucleus: ["ɪ"], coda: ["n"] }] }];
    const trace = traceOf(word(active({ prefix }), 7));
    expect(trace.assembly.rootSyllableStart).toBe(2);
    expect(trace.morphology[0].syllableIndices).toEqual([0, 1]);
    expect(trace.snapshots[3].syllables[2].origin).toEqual({ kind: "event", eventId: 0 });
  });

  it("retains a same-index demotion/re-promotion chain for an attracting suffix", () => {
    const trace = traceOf(word(active({ suffix: affix("suffix", "attract-preceding"), secondary: false, rhythm: false }), 2));
    expect(trace.rootSyllableCount).toBe(1);
    expect(trace.events).toMatchObject([
      { id: 0, coordinates: "root", syllableIndex: 0, after: "primary" },
      { id: 1, coordinates: "word", syllableIndex: 0, before: "primary", after: "secondary", previousOrigin: { kind: "event", eventId: 0 } },
      { id: 2, coordinates: "word", syllableIndex: 0, before: "secondary", after: "primary", previousOrigin: { kind: "event", eventId: 1 } },
    ]);
    expect(trace.snapshots[3].syllables[0].origin).toEqual({ kind: "event", eventId: 2 });
  });

  it("counts a syllabic allomorph of a zero-syllable plan by its realized array", () => {
    const prefix = affix("prefix", "secondary", true);
    prefix.allomorphs = [{ phonologicalCondition: { position: "following" }, written: "in", phonemes: ["ɪ", "n"],
      syllableCount: 1, syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }] }];
    const result = word(active({ prefix })); const trace = traceOf(result);
    expect(result.trace!.morphology!.realization!.prefix).toMatchObject({ planned: { syllableCount: 0 }, resolved: { syllableCount: 1 }, allomorphIndex: 0 });
    expect(trace.assembly.prefixSyllables).toBe(1);
    expect(trace.morphology[0]).toMatchObject({ syllableIndices: [0], status: "applied" });
    expect(trace.snapshots[3].syllables[1].origin).toEqual({ kind: "event", eventId: 0 });
  });

  it("keeps flattened zero-syllable arrays as phone additions without stress events", () => {
    const suffix = affix("suffix", "primary", true);
    suffix.syllables = [{ onset: [], nucleus: [], coda: ["s"] }];
    const result = word(active({ suffix, secondary: false, rhythm: false })); const trace = traceOf(result);
    expect(trace.assembly.suffixSyllables).toBe(0);
    expect(trace.morphology[0]).toMatchObject({ status: "no-realized-syllables", syllableIndices: [], eventIds: [] });
    expect(trace.snapshots[3].syllables.at(-1)!.coda.at(-1)!.sound).toBe("s");
  });

  it("retains unspecified-model quantity as unknown rather than inferring it from the policy", () => {
    const fixture = active();
    fixture.pronunciation.stress.syllableWeight = { type: "moraic", analysis: "unmatched-custom-model", coda: "nonmoraic", unknown: "legacy-segment-count" };
    const trace = traceOf(word(fixture));
    expect(trace.weightInput.syllables.every(syllable => syllable.nucleusMoras === null && syllable.analytical.weight === "unknown")).toBe(true);
    expect(trace.weightInput.syllables.every(syllable => syllable.operational.basis === "legacy-fallback")).toBe(true);
  });

  it("supports an automatic nine-syllable root without truncating the candidate window", () => {
    const fixture = active({ rhythm: false });
    fixture.phonemeToSyllableWeights = {
      lexicon: Object.fromEntries(Object.keys(fixture.phonemeToSyllableWeights.lexicon).map(key => [key, [[9, 1]]])),
      text: Object.fromEntries(Object.keys(fixture.phonemeToSyllableWeights.text).map(key => [key, [[9, 1]]])),
    };
    const result = createGenerator(fixture).generateWord({ seed: 65, mode: "lexicon", morphology: false, trace: true });
    const trace = traceOf(result);
    expect(trace.rootSyllableCount).toBe(9);
    expect(trace.rootPattern.proposal.explicitSecondary.candidates.map(candidate => candidate.syllableIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("keeps the public two-argument OTConstraint contract with shared v2 input", () => {
    const custom: OTConstraint = { name: "two-argument", evaluate: (_syllables, index) => index };
    const result = word(active()); const trace = traceOf(result);
    expect(custom.evaluate(result.lexical!.root, 1, trace.weightInput.syllables)).toBe(1);
  });

  it("checks the actual primary RNG value on the active path without drawing ahead", () => {
    const fixture = active();
    fixture.pronunciation.stress.primary = { type: "ot", otConfig: { noise: 2, constraints: [{ name: "ALIGN-LEFT", weight: 4 }] } };
    const values = counted(145);
    const result = createGenerator(fixture).generateWord({ rand: values.rand, syllableCount: 4, morphology: false, trace: true });
    const index = values.values.indexOf(traceOf(result).primary.draws[0]);
    expect(index).toBeGreaterThanOrEqual(0);
    let consumed = 0;
    const rand = () => { const next = consumed++; return next === index ? 1 : values.values[next]; };
    expect(() => createGenerator(fixture).generateWord({ rand, syllableCount: 4, morphology: false })).toThrow(/finite value in/);
    expect(consumed).toBe(index + 1);
  });

  it("detaches policy, quantity, proposal and every returned snapshot", () => {
    const fixture = active({ reduction: true }); const api = createGenerator(fixture);
    const original = api.generateWord({ seed: 912, syllableCount: 4, morphology: false, trace: true });
    const saved = structuredClone(original);
    const changed = traceOf(original);
    fixture.pronunciation.stress.rootPattern = { type: "legacy" };
    changed.weightInput.syllables[0].nucleus[0].declared!.moras = 2;
    changed.rootPattern.proposal.snapshots[0].marks[0] = "unmarked";
    changed.snapshots[0].syllables[0].nucleus[0].nuclearQuantity!.moras = 2;
    changed.snapshots[5].syllables[0].origin = { kind: "unmarked" };
    original.lexical!.root[0].nucleus[0].nuclearQuantity!.moras = 2;
    expect(api.generateWord({ seed: 912, syllableCount: 4, morphology: false, trace: true })).toStrictEqual(saved);
    expect(changed.snapshots[1].syllables[0].nucleus[0].nuclearQuantity?.moras).toBe(1);
  });

  it("detaches the original mutable policy object at generator creation", () => {
    const policy: RootPatternPolicy = { type: "count-conditioned", lambda: Math.log(2) };
    const api = createGenerator(config({ policy }));
    const options = { seed: 912, syllableCount: 4, morphology: false, trace: true };
    const saved = structuredClone(api.generateWord(options));
    policy.lambda = 1000;
    expect(api.generateWord(options)).toStrictEqual(saved);
    Object.assign(policy, { type: "legacy" });
    expect(api.generateWord(options)).toStrictEqual(saved);
  });

  it("isolates the returned attempt and later calls after rejected length attempts", () => {
    const fixture = structuredClone(englishConfig);
    fixture.pronunciation.stress.rootPattern = { type: "count-conditioned", lambda: Math.log(2) };
    fixture.syllableStructure.letterLengthTargets = { 4: [100, 101, 102, 103] };
    const api = createGenerator(fixture);
    const options = { seed: 51, syllableCount: 4, morphology: false, trace: true };
    const result = api.generateWord(options);
    const saved = structuredClone(result);
    const trace = traceOf(result);
    expect(result.written.clean.length).toBeLessThan(100);
    expect(result.trace!.attempts).toBeGreaterThan(0);
    expect(trace.scope).toBe("returned-attempt");
    expect(trace.snapshots).toHaveLength(6);
    expect(trace.events.map(event => event.id)).toEqual(trace.events.map((_, index) => index));
    expect(trace.events.filter(event => event.cause.kind === "root-primary")).toHaveLength(1);
    expect(trace.events).toHaveLength(1 + trace.rootPattern.proposal.secondaryCount);
    expect(trace.snapshots[5].syllables.map(syllable => syllable.mark)).toEqual(result.syllables.map(syllable =>
      syllable.stress === "ˈ" ? "primary" : syllable.stress === "ˌ" ? "secondary" : "unmarked"));
    expect(trace.snapshots[5].syllables.map(syllable => syllable.nucleus.map(phone => phone.sound)))
      .toEqual(result.syllables.map(syllable => syllable.nucleus.map(phone => phone.sound)));
    const later = api.generateWord({ ...options, seed: 912 });
    expect(result).toStrictEqual(saved);
    trace.rootPattern.proposal.snapshots[0].marks.fill("unmarked");
    trace.events.length = 0;
    trace.snapshots[5].syllables[0].nucleus.length = 0;
    later.trace!.stages.length = 0;
    expect(api.generateWord(options)).toStrictEqual(saved);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid opt-in lambda %s", lambda => {
    expect(() => createGenerator(config({ policy: { type: "count-conditioned", lambda } }))).toThrow(/lambda/);
  });
  it.each([0, Math.log(2)])("uses strict supported-domain errors at lambda=%s without fallback", lambda => {
    const fixture = config({ policy: { type: "count-conditioned", lambda }, primary: 0 });
    fixture.pronunciation.stress.secondary.heavyWeight = Number.MAX_VALUE;
    fixture.pronunciation.stress.secondary.lightWeight = Number.MAX_VALUE;
    expect(() => word(fixture, 4)).toThrow(/finite|weight|range|sum/i);
  });
  it("rejects a huge finite penalty under the unchanged conservative bound", () => {
    expect(() => word(config({ policy: { type: "count-conditioned", lambda: 1000 } }))).toThrow(/1024/);
  });
});
