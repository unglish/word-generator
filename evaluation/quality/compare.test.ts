import { describe, expect, it } from "vitest";
import { compareSummaries, comparisonMarkdown } from "./compare.js";
import { METRIC_DEFINITIONS } from "./metrics.js";
import type { MetricCount, MetricCounts, RunSummary } from "./model.js";

const METRIC = "polysyllable_missing_primary";

function count(hits: number, eligible: number): MetricCount {
  return { hits, eligible, rate: eligible ? hits / eligible : null };
}

function counts(words: number, hits = 0, eligible = words): MetricCounts {
  const values = Object.fromEntries(METRIC_DEFINITIONS.map(definition => [definition.id, count(0, words)])) as MetricCounts;
  values[METRIC] = count(hits, eligible);
  return values;
}

function summary(id: string, hits = [6, 6], eligible = [40, 40]): RunSummary {
  const totalHits = hits.reduce((sum, value) => sum + value, 0);
  const totalEligible = eligible.reduce((sum, value) => sum + value, 0);
  const distributions = {
    phonemes: { jensenShannonBits: 0.02, missingReferenceMass: 0.01, unseenGeneratedMass: 0.003 },
    trigrams: { jensenShannonBits: 0.2, missingReferenceMass: 0.1, unseenGeneratedMass: 0.03 },
  };
  return {
    schemaVersion: 1, id, cohort: "development", protocolDigest: "protocol", evaluatorDigest: "evaluator", referenceDigest: "reference",
    definitions: METRIC_DEFINITIONS,
    profiles: [{
      id: "default-lexicon", words: 100, uniqueSpellings: 95, meanLetters: 7,
      syllableCounts: { "1": 20, "2": 80 }, phonemeLengths: { "3": 20, "6": 80 },
      morphologyCounts: { bare: 100 }, distributions,
      metrics: counts(100, totalHits, totalEligible),
      replicates: hits.map((value, index) => ({ seed: 11 + index * 11, words: 50, metrics: counts(50, value, eligible[index]) })),
      strata: [
        { id: "bare:1", words: 20, metrics: counts(20, 0, 0) },
        { id: "bare:2", words: 80, metrics: counts(80, totalHits, totalEligible) },
      ],
    }],
  };
}

describe("quality comparison", () => {
  it("preserves cumulative improvement and a regression from the previous step", () => {
    const baseline = summary("baseline", [8, 8]);
    const previous = summary("step-one", [1, 1]);
    const candidate = summary("step-two", [2, 4]);
    const report = compareSummaries(baseline, candidate, previous);
    const metric = report.profiles[0].metrics.find(value => value.id === METRIC)!;

    expect(metric.baseline).toEqual(count(16, 80));
    expect(metric.candidate).toEqual(count(6, 80));
    expect(metric.previous).toEqual(count(2, 80));
    expect(metric.deltaPercentagePoints).toBeCloseTo(-12.5);
    expect(metric.deltaVsPreviousPercentagePoints).toBeCloseTo(5);
    expect(metric.replicatesVsBaseline.values.map(value => value.seed)).toEqual([11, 22]);
    expect(metric.replicatesVsBaseline.values[0].deltaPercentagePoints).toBeCloseTo(-15);
    expect(metric.replicatesVsBaseline.minimumPercentagePoints).toBeCloseTo(-15);
    expect(metric.replicatesVsBaseline.maximumPercentagePoints).toBeCloseTo(-10);
    expect(metric.replicatesVsPrevious?.values[1].deltaPercentagePoints).toBeCloseTo(7.5);
    expect(report).not.toHaveProperty("passed");
  });

  it("reports changed eligibility without pretending the same words were paired", () => {
    const report = compareSummaries(summary("baseline", [4, 4], [40, 40]), summary("candidate", [4, 4], [20, 20]));
    const metric = report.profiles[0].metrics.find(value => value.id === METRIC)!;
    expect(metric.eligibleDelta).toBe(-40);
    expect(metric.deltaPercentagePoints).toBeCloseTo(10);
    expect(metric.candidate.hits).toBe(metric.baseline.hits);
    expect(metric).not.toHaveProperty("deltaVsPreviousPercentagePoints");
  });

  it("leaves rates and deltas unavailable when an endpoint has no eligible cases", () => {
    const report = compareSummaries(summary("baseline", [0, 0], [0, 0]), summary("candidate", [0, 0], [20, 20]));
    const metric = report.profiles[0].metrics.find(value => value.id === METRIC)!;
    expect(metric.baseline.rate).toBeNull();
    expect(metric.candidate.rate).toBe(0);
    expect(metric.deltaPercentagePoints).toBeNull();
    expect(metric.replicatesVsBaseline.minimumPercentagePoints).toBeNull();
    expect(metric.replicatesVsBaseline.maximumPercentagePoints).toBeNull();
    expect(metric.replicatesVsBaseline.values.every(value => value.deltaPercentagePoints === null)).toBe(true);
    expect(comparisonMarkdown(report)).toContain("0/0 (n/a)");
  });

  it("retains disappearing, new, and previous-only strata with null missing rates", () => {
    const baseline = summary("baseline");
    const candidate = summary("candidate");
    const previous = summary("previous");
    candidate.profiles[0].strata = [
      { id: "affixed:3", words: 100, metrics: counts(100, 12, 80) },
    ];
    candidate.profiles[0].morphologyCounts = { affixed: 100 };
    candidate.profiles[0].syllableCounts = { "3": 100 };
    candidate.profiles[0].phonemeLengths = { "9": 100 };
    candidate.profiles[0].uniqueSpellings = 75;
    candidate.profiles[0].meanLetters = 9;
    previous.profiles[0].strata = [{ id: "affixed:4", words: 100, metrics: counts(100, 12, 80) }];
    const profile = compareSummaries(baseline, candidate, previous).profiles[0];
    const disappeared = profile.strata.find(stratum => stratum.id === "bare:2")!;
    const added = profile.strata.find(stratum => stratum.id === "affixed:3")!;
    const priorOnly = profile.strata.find(stratum => stratum.id === "affixed:4")!;

    expect(disappeared.words).toMatchObject({ baseline: 80, candidate: 0, delta: -80 });
    expect(disappeared.metrics[METRIC].candidate).toEqual(count(0, 0));
    expect(disappeared.metrics[METRIC].deltaPercentagePoints).toBeNull();
    expect(added.share).toMatchObject({ baseline: 0, candidate: 1, delta: 1 });
    expect(added.metrics[METRIC].baseline.rate).toBeNull();
    expect(priorOnly.words).toMatchObject({ baseline: 0, candidate: 0, previous: 100 });
    expect(priorOnly.metrics[METRIC].previous).toEqual(count(12, 80));
    expect(profile.syllableCounts["3"]).toMatchObject({ baseline: 0, candidate: 100 });
    expect(profile.phonemeLengths["9"]).toMatchObject({ baseline: 0, candidate: 100 });
    expect(profile.morphologyCounts.bare).toMatchObject({ baseline: 100, candidate: 0 });
    expect(profile.uniqueSpellings.delta).toBe(-20);
    expect(profile.meanLetters.delta).toBe(2);
  });

  it("reports corpus changes without classifying them as quality gains", () => {
    const baseline = summary("baseline");
    const candidate = summary("candidate");
    const previous = summary("previous");
    candidate.profiles[0].distributions.phonemes.jensenShannonBits = 0.01;
    candidate.profiles[0].distributions.trigrams.unseenGeneratedMass = null;
    previous.profiles[0].distributions.phonemes.jensenShannonBits = 0.005;
    const report = compareSummaries(baseline, candidate, previous);
    expect(report.profiles[0].distributions.phonemes.jensenShannonBits).toEqual({
      baseline: 0.02, candidate: 0.01, delta: -0.01, previous: 0.005, deltaVsPrevious: 0.005,
    });
    expect(report.profiles[0].distributions.trigrams.unseenGeneratedMass.delta).toBeNull();
    expect(comparisonMarkdown(report)).toContain("Lower distance alone does not establish better output quality");
  });

  it.each([
    ["schema", (run: RunSummary) => { Object.assign(run, { schemaVersion: 2 }); }],
    ["cohort", (run: RunSummary) => { run.cohort = "validation"; }],
    ["protocol", (run: RunSummary) => { run.protocolDigest = "different"; }],
    ["evaluator", (run: RunSummary) => { run.evaluatorDigest = "different"; }],
    ["reference", (run: RunSummary) => { run.referenceDigest = "different"; }],
    ["definition", (run: RunSummary) => { run.definitions = run.definitions.map(value => ({ ...value, description: "Changed meaning" })); }],
    ["profile", (run: RunSummary) => { run.profiles[0].id = "other"; }],
    ["seed", (run: RunSummary) => { run.profiles[0].replicates[0].seed = 99; }],
    ["draw count", (run: RunSummary) => { run.profiles[0].replicates[0].words++; run.profiles[0].words++; }],
  ] as const)("rejects incompatible %s in candidate and previous summaries", (_, change) => {
    const incompatible = summary("incompatible");
    change(incompatible);
    expect(() => compareSummaries(summary("baseline"), incompatible)).toThrow();
    expect(() => compareSummaries(summary("baseline"), summary("candidate"), incompatible)).toThrow();
  });

  it("matches replicate identities rather than their array position", () => {
    const candidate = summary("candidate", [2, 4]);
    candidate.profiles[0].replicates.reverse();
    const metric = compareSummaries(summary("baseline", [8, 8]), candidate).profiles[0].metrics.find(value => value.id === METRIC)!;
    expect(metric.replicatesVsBaseline.values[0].deltaPercentagePoints).toBeCloseTo(-15);
    expect(metric.replicatesVsBaseline.values[1].deltaPercentagePoints).toBeCloseTo(-10);
  });

  it("rejects duplicated profiles, duplicated streams, and inconsistent rates", () => {
    const duplicateProfiles = summary("duplicate");
    duplicateProfiles.profiles.push(duplicateProfiles.profiles[0]);
    expect(() => compareSummaries(summary("baseline"), duplicateProfiles)).toThrow("Duplicate profile");
    const duplicateSeeds = summary("duplicate-seeds");
    duplicateSeeds.profiles[0].replicates[1].seed = duplicateSeeds.profiles[0].replicates[0].seed;
    expect(() => compareSummaries(summary("baseline"), duplicateSeeds)).toThrow("replicate seeds");
    const invalidRate = summary("invalid-rate");
    invalidRate.profiles[0].metrics[METRIC].rate = 1;
    expect(() => compareSummaries(summary("baseline"), invalidRate)).toThrow("Invalid metric counts or rate");
  });

  it.each([
    ["replicate metric", (run: RunSummary) => { run.profiles[0].replicates[0].metrics[METRIC] = count(1, 40); }],
    ["stratum metric", (run: RunSummary) => { run.profiles[0].strata[1].metrics[METRIC] = count(1, 80); }],
    ["stratum draws", (run: RunSummary) => { run.profiles[0].strata.pop(); }],
    ["syllable histogram", (run: RunSummary) => { run.profiles[0].syllableCounts["1"]++; }],
    ["morphology histogram", (run: RunSummary) => { run.profiles[0].morphologyCounts.bare--; }],
    ["phoneme histogram", (run: RunSummary) => { run.profiles[0].phonemeLengths["3"] = -1; }],
    ["zero diversity", (run: RunSummary) => { run.profiles[0].uniqueSpellings = 0; }],
    ["excess diversity", (run: RunSummary) => { run.profiles[0].uniqueSpellings = 101; }],
    ["nonfinite length", (run: RunSummary) => { run.profiles[0].meanLetters = NaN; }],
    ["negative length", (run: RunSummary) => { run.profiles[0].meanLetters = -1; }],
  ] as const)("rejects inconsistent %s aggregates", (_, change) => {
    const inconsistent = summary("inconsistent");
    change(inconsistent);
    expect(() => compareSummaries(summary("baseline"), inconsistent)).toThrow();
  });

  it("explains inference limits and identifies both references in Markdown", () => {
    const markdown = comparisonMarkdown(compareSummaries(summary("baseline"), summary("candidate"), summary("previous")));
    expect(markdown).toContain("sample observations, not paired words or human-quality proof");
    expect(markdown).toContain("not confidence intervals");
    expect(markdown).toContain("does not prove the invariant for every possible output");
    expect(markdown).toContain("Original baseline: baseline");
    expect(markdown).toContain("Previous step: previous");
    expect(markdown).toContain("Δ eligible vs previous");
  });
});
