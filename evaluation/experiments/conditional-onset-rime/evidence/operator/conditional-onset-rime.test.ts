import { describe, expect, it } from "vitest";
import { parseCmuRecords, selectCompatibleCmu, VOWELS } from "../../corpus/cmu.js";
import { baseLogProbability, constituentLogProbability, constituentObservations, conditionalContextKey,
  fitConditionalModel, NUCLEUS_CLASSES, splitEntries, trainingInitialOnsets,
  type ConstituentObservation } from "../../corpus/conditional-onset-rime.js";
import { compareConditionalModels, likelihoodSummary, selectSmoothing, unseenSupportMass } from "../../corpus/conditional-experiment.js";

const entries = (text: string) => selectCompatibleCmu(parseCmuRecords(text)).entries;
const training = entries("alpha K AE0 T\nbeta P AE0 T\n");
const query = (tokens: string[]): ConstituentObservation => ({ spelling: "probe", syllable: 0, tokens,
  context: { constituent: "onset", wordInitial: true, wordFinal: true, stress: 0, nucleusClass: "monophthong" } });

describe("conditional onset/rime offline model", () => {
  it("partitions the declared native vowel inventory without overlapping classes", () => {
    const vowels = NUCLEUS_CLASSES.flatMap(group => [...group.vowels]);
    expect(new Set(vowels).size).toBe(vowels.length);
    expect([...vowels].sort()).toEqual([...VOWELS].sort());
  });

  it("assigns spelling groups deterministically independent of input order", () => {
    const source = entries(Array.from({ length: 676 }, (_, index) =>
      `word${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + index % 26)} K AE1 T`).join("\n"));
    const forward = splitEntries(source, "q17-2026-10-02");
    const reverse = splitEntries([...source].reverse(), "q17-2026-10-02");
    for (const split of ["training", "development", "heldOut"] as const) {
      expect(forward[split].length).toBeGreaterThan(0);
      expect(forward[split].map(entry => entry.spelling).sort()).toEqual(reverse[split].map(entry => entry.spelling).sort());
    }
    const all = Object.values(forward).flat();
    expect(all).toHaveLength(source.length);
    expect(new Set(all.map(entry => entry.spelling)).size).toBe(source.length);
    expect(() => splitEntries([...source, source[0]], "seed")).toThrow("unique");
  });

  it("keeps held-out initial clusters out of inferred segmentation support", () => {
    const onsets = trainingInitialOnsets(entries("kray K R EY1"));
    const held = entries("azhaz AA0 ZH HH AE1\nzhha ZH HH AE1");
    const observations = constituentObservations(held, onsets);
    expect(onsets.has("ZH HH")).toBe(false);
    expect(observations.find(item => item.spelling === "azhaz" && item.syllable === 1 && item.context.constituent === "onset")!.tokens).toEqual([]);
    expect(observations.find(item => item.spelling === "azhaz" && item.syllable === 0 && item.context.constituent === "rime")!.tokens).toEqual(["AA", "ZH", "HH"]);
  });

  it("preserves all native stress levels and independent word-edge flags", () => {
    const source = entries("alpha K AE0 T\nbeta K AE1 T\ngamma K AE2 T\ndelta D EH1 L T AH0");
    const observations = constituentObservations(source, trainingInitialOnsets(source));
    expect(observations.filter(item => item.context.constituent === "onset").map(item => item.context.stress)).toEqual([0, 1, 2, 1, 0]);
    const delta = observations.filter(item => item.spelling === "delta" && item.context.constituent === "onset");
    expect(delta.map(item => [item.context.wordInitial, item.context.wordFinal])).toEqual([[true, false], [false, true]]);
  });

  it("counts phone occurrences once and retains hand-counted constituent rows", () => {
    const model = fitConditionalModel(training);
    expect(model.base.consonants).toEqual({ K: 1, T: 2, P: 1 });
    expect(model.base.vowels).toEqual({ AE: 2 });
    expect(model.base.lengths).toEqual({ onset: { events: 2, phones: 2 }, coda: { events: 2, phones: 2 } });
    expect(model.levels.full[conditionalContextKey(query([]).context, "full")]).toEqual({ total: 2, counts: { K: 1, P: 1 } });
    expect(fitConditionalModel(training)).toEqual(model);
  });

  it("normalizes the finite seen support plus the exact open-support remainder", () => {
    const model = fitConditionalModel(training), alpha = 4;
    const baseSeen = ["K", "P"].reduce((sum, token) => sum + Math.exp(baseLogProbability(model, query([token]))), 0);
    for (const kind of ["baseline", "candidate"] as const) {
      const seen = ["K", "P"].reduce((sum, token) => sum + Math.exp(constituentLogProbability(model, query([token]), alpha, kind)), 0);
      const tailCoefficient = (alpha / (2 + alpha)) ** (kind === "baseline" ? 1 : 3);
      expect(seen + tailCoefficient * (1 - baseSeen)).toBeCloseTo(1, 12);
    }
  });

  it("backs completely unseen stress/edge rows off to the class distribution", () => {
    const model = fitConditionalModel(training), observation = query(["ZH", "HH"]);
    observation.context.stress = 2; observation.context.wordInitial = false;
    expect(constituentLogProbability(model, observation, 8, "candidate")).toBeCloseTo(constituentLogProbability(model, observation, 8, "baseline"), 12);
  });

  it("keeps extreme rare-event likelihoods finite in log space without clipping", () => {
    const model = fitConditionalModel(training);
    const log = constituentLogProbability(model, query(Array(1000).fill("ZH")), 8, "candidate");
    expect(Number.isFinite(log)).toBe(true);
    expect(log).toBeLessThan(-1000);
  });

  it("rejects inconsistent source phones, cross-class rimes and invalid smoothing", () => {
    const forged = structuredClone(training);
    forged[0].phones[1] = { kind: "vowel", raw: "AE1", base: "AE", stress: 1 };
    expect(() => fitConditionalModel(forged)).toThrow("disagree");
    expect(() => fitConditionalModel([...training, training[0]])).toThrow("unique");
    const model = fitConditionalModel(training), rime = query(["OY"]);
    rime.context.constituent = "rime";
    expect(() => constituentLogProbability(model, rime, 8, "candidate")).toThrow("class");
    for (const alpha of [0, -1, Infinity, NaN]) expect(() => constituentLogProbability(model, query([]), alpha, "candidate")).toThrow("positive");
  });

  it("selects smoothing from development observations, retaining every grid trial", () => {
    const model = fitConditionalModel(training);
    for (const kind of ["baseline", "candidate"] as const) {
      const familiar = selectSmoothing(model, [query(["K"])], [64, 0.5, 8], kind);
      const novel = selectSmoothing(model, [query(["ZH"])], [64, 0.5, 8], kind);
      expect(familiar.alpha).toBe(0.5);
      expect(novel.alpha).toBe(64);
      expect(familiar.trials.map(trial => trial.alpha)).toEqual([0.5, 8, 64]);
    }
    expect(() => selectSmoothing(model, [query(["K"])], [8, 8], "candidate")).toThrow("distinct");
    expect(() => selectSmoothing(model, [], [8], "candidate")).toThrow("observations");
  });

  it("reports per-word likelihood and paired changes with hand-calculated values", () => {
    const model = fitConditionalModel(training), observations = [query(["K"]), query(["P"])];
    const baselineNll = -2 * Math.log(0.4046875);
    const candidateNll = -2 * Math.log(0.4961875);
    const summary = likelihoodSummary(model, observations, 0.5, "baseline");
    expect(summary.words).toBe(1); expect(summary.events).toBe(2);
    expect(summary.meanPerWord).toBeCloseTo(baselineNll, 12);
    expect(summary.meanPerEvent).toBeCloseTo(baselineNll / 2, 12);
    const comparison = compareConditionalModels(model, observations, 0.5, 0.5);
    expect(comparison.words).toHaveLength(1);
    expect(comparison.words[0].delta).toBeCloseTo(candidateNll - baselineNll, 12);
    expect(comparison.bins["trainingFrequency/1"].events).toBe(2);
    expect(comparison.bins.all.unseenFullContextEvents).toBe(0);
  });

  it("retains analytic novel mass, including empty unseen contexts", () => {
    const model = fitConditionalModel(training), context = query([]).context;
    expect(unseenSupportMass(model, context, [["K"], ["P"]], 4, "baseline")).toBeCloseTo(0.953125 * (2 / 3), 12);
    expect(unseenSupportMass(model, context, [["K"], ["P"]], 4, "candidate")).toBeCloseTo(0.953125 * (2 / 3) ** 3, 12);
    expect(unseenSupportMass(model, context, [], 4, "candidate")).toBeCloseTo(1, 12);
    expect(() => unseenSupportMass(model, context, [["K"], ["K"]], 4, "candidate")).toThrow("unique");
  });
});
