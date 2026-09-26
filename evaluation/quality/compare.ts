import { digest } from "./serialization.js";
import type { DistributionScore } from "./distribution.js";
import type { MetricDefinition } from "./metrics.js";
import type { MetricCount, MetricCounts, ProfileSummary, RunSummary, StratumSummary } from "./model.js";

interface ValueComparison {
  baseline: number;
  candidate: number;
  delta: number;
  previous?: number;
  deltaVsPrevious?: number;
}

interface MetricComparison {
  baseline: MetricCount;
  candidate: MetricCount;
  deltaPercentagePoints: number | null;
  eligibleDelta: number;
  previous?: MetricCount;
  deltaVsPreviousPercentagePoints?: number | null;
  eligibleDeltaVsPrevious?: number;
}

interface NullableValueComparison {
  baseline: number | null;
  candidate: number | null;
  delta: number | null;
  previous?: number | null;
  deltaVsPrevious?: number | null;
}

type DistributionComparison = { [Metric in keyof DistributionScore]: NullableValueComparison };

interface ReplicateDeltas {
  values: Array<{ seed: number; deltaPercentagePoints: number | null }>;
  minimumPercentagePoints: number | null;
  maximumPercentagePoints: number | null;
}

interface ProfileMetricComparison extends MetricComparison {
  id: string;
  replicatesVsBaseline: ReplicateDeltas;
  replicatesVsPrevious?: ReplicateDeltas;
}

interface StratumComparison {
  id: string;
  words: ValueComparison;
  share: ValueComparison;
  metrics: Record<string, MetricComparison>;
}

export interface ComparisonReport {
  schemaVersion: 1;
  baselineId: string;
  candidateId: string;
  previousId?: string;
  cohort: RunSummary["cohort"];
  protocolDigest: string;
  evaluatorDigest: string;
  referenceDigest: string;
  definitions: readonly MetricDefinition[];
  profiles: Array<{
    id: string;
    words: number;
    uniqueSpellings: ValueComparison;
    meanLetters: ValueComparison;
    syllableCounts: Record<string, ValueComparison>;
    phonemeLengths: Record<string, ValueComparison>;
    morphologyCounts: Record<string, ValueComparison>;
    distributions: { phonemes: DistributionComparison; trigrams: DistributionComparison };
    metrics: ProfileMetricComparison[];
    strata: StratumComparison[];
  }>;
}

function indexById<T extends { id: string }>(items: readonly T[], description: string): Map<string, T> {
  const indexed = new Map(items.map(item => [item.id, item]));
  if (indexed.size !== items.length) throw new Error(`Duplicate ${description} IDs.`);
  return indexed;
}

function metricCount(counts: MetricCounts, id: string): MetricCount {
  const metric = Object.entries(counts).find(([key]) => key === id)?.[1];
  if (!metric) throw new Error(`Missing metric: ${id}.`);
  return metric;
}

function validateMetricCounts(counts: MetricCounts, definitions: readonly MetricDefinition[], words: number): void {
  if (digest(Object.keys(counts).sort()) !== digest(definitions.map(definition => definition.id).sort())) {
    throw new Error("Metric IDs differ from their definitions.");
  }
  for (const definition of definitions) {
    const { hits, eligible, rate } = metricCount(counts, definition.id);
    const expectedRate = eligible > 0 ? hits / eligible : null;
    if (!Number.isSafeInteger(hits) || !Number.isSafeInteger(eligible) || hits < 0 || eligible < hits || eligible > words || rate !== expectedRate) {
      throw new Error(`Invalid metric counts or rate: ${definition.id}.`);
    }
  }
}

function validateAggregate(profile: ProfileSummary, definitions: readonly MetricDefinition[]): void {
  if (!Number.isSafeInteger(profile.uniqueSpellings) || profile.uniqueSpellings < 1 || profile.uniqueSpellings > profile.words ||
      !Number.isFinite(profile.meanLetters) || profile.meanLetters < 0) {
    throw new Error(`Invalid diversity or mean length for profile ${profile.id}.`);
  }
  for (const histogram of [profile.syllableCounts, profile.phonemeLengths, profile.morphologyCounts]) {
    const counts = Object.values(histogram);
    if (counts.some(value => !Number.isSafeInteger(value) || value < 0) || counts.reduce((sum, value) => sum + value, 0) !== profile.words) {
      throw new Error(`Histogram counts do not match profile ${profile.id}.`);
    }
  }
  if (profile.strata.reduce((sum, stratum) => sum + stratum.words, 0) !== profile.words) {
    throw new Error(`Stratum draw counts do not match profile ${profile.id}.`);
  }
  for (const definition of definitions) {
    const expected = metricCount(profile.metrics, definition.id);
    for (const [name, groups] of [["Replicate", profile.replicates], ["Stratum", profile.strata]] as const) {
      const total = { hits: 0, eligible: 0 };
      for (const group of groups) {
        const metric = metricCount(group.metrics, definition.id);
        total.hits += metric.hits;
        total.eligible += metric.eligible;
      }
      if (total.hits !== expected.hits || total.eligible !== expected.eligible) {
        throw new Error(`${name} metric totals do not match profile ${profile.id}: ${definition.id}.`);
      }
    }
  }
}

function validateSummary(summary: RunSummary): void {
  if (summary.schemaVersion !== 1) throw new Error("Unsupported quality summary schema.");
  indexById(summary.definitions, "metric definition");
  indexById(summary.profiles, "profile");
  for (const profile of summary.profiles) {
    if (!Number.isSafeInteger(profile.words) || profile.words < 1 || profile.replicates.length === 0) {
      throw new Error(`Invalid draw count for profile ${profile.id}.`);
    }
    const seeds = new Set(profile.replicates.map(replicate => replicate.seed));
    if (seeds.size !== profile.replicates.length || profile.replicates.reduce((sum, replicate) => sum + replicate.words, 0) !== profile.words) {
      throw new Error(`Invalid replicate seeds or draw counts for profile ${profile.id}.`);
    }
    validateMetricCounts(profile.metrics, summary.definitions, profile.words);
    for (const replicate of profile.replicates) {
      if (!Number.isSafeInteger(replicate.seed) || !Number.isSafeInteger(replicate.words) || replicate.words < 1) {
        throw new Error(`Invalid replicate in profile ${profile.id}.`);
      }
      validateMetricCounts(replicate.metrics, summary.definitions, replicate.words);
    }
    indexById(profile.strata, "stratum");
    for (const stratum of profile.strata) {
      if (!Number.isSafeInteger(stratum.words) || stratum.words < 1 || stratum.words > profile.words) {
        throw new Error(`Invalid stratum draw count for ${stratum.id}.`);
      }
      validateMetricCounts(stratum.metrics, summary.definitions, stratum.words);
    }
    validateAggregate(profile, summary.definitions);
  }
}

function requireCompatible(baseline: RunSummary, candidate: RunSummary): void {
  validateSummary(candidate);
  const fields = ["schemaVersion", "cohort", "protocolDigest", "evaluatorDigest", "referenceDigest"] as const;
  for (const field of fields) {
    if (baseline[field] !== candidate[field]) throw new Error(`Incompatible quality summaries: ${field} differs.`);
  }
  if (digest(baseline.definitions) !== digest(candidate.definitions)) {
    throw new Error("Incompatible quality summaries: metric definitions differ.");
  }
  const profiles = indexById(candidate.profiles, "profile");
  if (profiles.size !== baseline.profiles.length) throw new Error("Incompatible quality summaries: profile IDs differ.");
  for (const profile of baseline.profiles) {
    const other = profiles.get(profile.id);
    if (!other) throw new Error("Incompatible quality summaries: profile IDs differ.");
    const schedule = (value: ProfileSummary) => value.replicates.map(({ seed, words }) => ({ seed, words })).sort((a, b) => a.seed - b.seed);
    if (profile.words !== other.words || digest(schedule(profile)) !== digest(schedule(other))) {
      throw new Error(`Incompatible quality summaries: replicate seeds or draw counts differ for ${profile.id}.`);
    }
  }
}

function compareValue(baseline: number, candidate: number, previous?: number): ValueComparison {
  return {
    baseline, candidate, delta: candidate - baseline,
    ...(previous === undefined ? {} : { previous, deltaVsPrevious: candidate - previous }),
  };
}

function compareNullableValue(baseline: number | null, candidate: number | null, previous?: number | null): NullableValueComparison {
  const difference = (reference: number | null): number | null => reference === null || candidate === null ? null : candidate - reference;
  return {
    baseline, candidate, delta: difference(baseline),
    ...(previous === undefined ? {} : { previous, deltaVsPrevious: difference(previous) }),
  };
}

function compareDistributionScore(baseline: DistributionScore, candidate: DistributionScore, previous?: DistributionScore): DistributionComparison {
  return {
    jensenShannonBits: compareNullableValue(baseline.jensenShannonBits, candidate.jensenShannonBits, previous?.jensenShannonBits),
    missingReferenceMass: compareNullableValue(baseline.missingReferenceMass, candidate.missingReferenceMass, previous?.missingReferenceMass),
    unseenGeneratedMass: compareNullableValue(baseline.unseenGeneratedMass, candidate.unseenGeneratedMass, previous?.unseenGeneratedMass),
  };
}

function deltaPercentagePoints(baseline: MetricCount, candidate: MetricCount): number | null {
  return baseline.rate === null || candidate.rate === null ? null : (candidate.rate - baseline.rate) * 100;
}

function compareMetric(baseline: MetricCount, candidate: MetricCount, previous?: MetricCount): MetricComparison {
  return {
    baseline, candidate, deltaPercentagePoints: deltaPercentagePoints(baseline, candidate),
    eligibleDelta: candidate.eligible - baseline.eligible,
    ...(previous === undefined ? {} : {
      previous, deltaVsPreviousPercentagePoints: deltaPercentagePoints(previous, candidate),
      eligibleDeltaVsPrevious: candidate.eligible - previous.eligible,
    }),
  };
}

function replicateDeltas(baseline: ProfileSummary, candidate: ProfileSummary, metricId: string): ReplicateDeltas {
  const candidateReplicates = new Map(candidate.replicates.map(replicate => [replicate.seed, replicate]));
  const values = baseline.replicates.map(replicate => ({
    seed: replicate.seed,
    deltaPercentagePoints: deltaPercentagePoints(
      metricCount(replicate.metrics, metricId),
      metricCount(candidateReplicates.get(replicate.seed)!.metrics, metricId),
    ),
  }));
  const available = values.map(value => value.deltaPercentagePoints).filter((value): value is number => value !== null);
  return {
    values,
    minimumPercentagePoints: available.length ? Math.min(...available) : null,
    maximumPercentagePoints: available.length ? Math.max(...available) : null,
  };
}

function compareDistribution(baseline: Record<string, number>, candidate: Record<string, number>, previous?: Record<string, number>): Record<string, ValueComparison> {
  const keys = [...new Set([...Object.keys(baseline), ...Object.keys(candidate), ...Object.keys(previous ?? {})])].sort();
  return Object.fromEntries(keys.map(key => [key, compareValue(
    baseline[key] ?? 0, candidate[key] ?? 0, previous === undefined ? undefined : previous[key] ?? 0,
  )]));
}

function stratumMetric(stratum: StratumSummary | undefined, id: string): MetricCount {
  return stratum ? metricCount(stratum.metrics, id) : { hits: 0, eligible: 0, rate: null };
}

function compareStrata(baseline: ProfileSummary, candidate: ProfileSummary, definitions: readonly MetricDefinition[], previous?: ProfileSummary): StratumComparison[] {
  const baselineStrata = indexById(baseline.strata, "stratum");
  const candidateStrata = indexById(candidate.strata, "stratum");
  const previousStrata = previous ? indexById(previous.strata, "stratum") : undefined;
  const ids = [...new Set([...baselineStrata.keys(), ...candidateStrata.keys(), ...(previousStrata?.keys() ?? [])])].sort();
  return ids.map(id => {
    const before = baselineStrata.get(id);
    const after = candidateStrata.get(id);
    const prior = previousStrata?.get(id);
    const words = compareValue(before?.words ?? 0, after?.words ?? 0, previous ? prior?.words ?? 0 : undefined);
    return {
      id, words,
      share: compareValue(words.baseline / baseline.words, words.candidate / candidate.words, previous ? (prior?.words ?? 0) / previous.words : undefined),
      metrics: Object.fromEntries(definitions.map(definition => [definition.id, compareMetric(
        stratumMetric(before, definition.id), stratumMetric(after, definition.id),
        previous ? stratumMetric(prior, definition.id) : undefined,
      )])),
    };
  });
}

export function compareSummaries(baseline: RunSummary, candidate: RunSummary, previous?: RunSummary): ComparisonReport {
  validateSummary(baseline);
  requireCompatible(baseline, candidate);
  if (previous) requireCompatible(baseline, previous);
  const candidates = indexById(candidate.profiles, "profile");
  const previousProfiles = previous ? indexById(previous.profiles, "profile") : undefined;
  return {
    schemaVersion: 1, baselineId: baseline.id, candidateId: candidate.id,
    ...(previous ? { previousId: previous.id } : {}),
    cohort: baseline.cohort, protocolDigest: baseline.protocolDigest,
    evaluatorDigest: baseline.evaluatorDigest, referenceDigest: baseline.referenceDigest,
    definitions: baseline.definitions,
    profiles: baseline.profiles.map(before => {
      const after = candidates.get(before.id)!;
      const prior = previousProfiles?.get(before.id);
      return {
        id: before.id, words: before.words,
        uniqueSpellings: compareValue(before.uniqueSpellings, after.uniqueSpellings, prior?.uniqueSpellings),
        meanLetters: compareValue(before.meanLetters, after.meanLetters, prior?.meanLetters),
        syllableCounts: compareDistribution(before.syllableCounts, after.syllableCounts, prior?.syllableCounts),
        phonemeLengths: compareDistribution(before.phonemeLengths, after.phonemeLengths, prior?.phonemeLengths),
        morphologyCounts: compareDistribution(before.morphologyCounts, after.morphologyCounts, prior?.morphologyCounts),
        distributions: {
          phonemes: compareDistributionScore(before.distributions.phonemes, after.distributions.phonemes, prior?.distributions.phonemes),
          trigrams: compareDistributionScore(before.distributions.trigrams, after.distributions.trigrams, prior?.distributions.trigrams),
        },
        metrics: baseline.definitions.map(definition => ({
          id: definition.id,
          ...compareMetric(metricCount(before.metrics, definition.id), metricCount(after.metrics, definition.id), prior ? metricCount(prior.metrics, definition.id) : undefined),
          replicatesVsBaseline: replicateDeltas(before, after, definition.id),
          ...(prior ? { replicatesVsPrevious: replicateDeltas(prior, after, definition.id) } : {}),
        })),
        strata: compareStrata(before, after, baseline.definitions, prior),
      };
    }),
  };
}

const cell = (value: string): string => value.replace(/\|/g, "\\|").replace(/[\r\n]/g, " ");
const signed = (value: number): string => `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
const delta = (value: number | null): string => value === null ? "n/a" : signed(value);
const observation = (metric: MetricCount): string => `${metric.hits}/${metric.eligible} (${metric.rate === null ? "n/a" : `${(metric.rate * 100).toFixed(3)}%`})`;
const range = (replicates: ReplicateDeltas): string => `${delta(replicates.minimumPercentagePoints)} to ${delta(replicates.maximumPercentagePoints)}`;
const formatNumber = (value: number | null): string => value === null ? "n/a" : value.toFixed(6);

export function comparisonMarkdown(report: ComparisonReport): string {
  const hasPrevious = report.previousId !== undefined;
  const lines = [
    `# Quality comparison: ${cell(report.candidateId)}`, "",
    `Original baseline: ${cell(report.baselineId)}. Cohort: ${report.cohort}.${hasPrevious ? ` Previous step: ${cell(report.previousId!)}.` : ""}`, "",
    "These are sample observations, not paired words or human-quality proof. Changes in RNG consumption can change every later word in a stream. Replicate ranges describe variation across seed streams; they are not confidence intervals. Zero observed invariant violations does not prove the invariant for every possible output. No automatic pass/fail judgment is made.", "",
    "Rates show hits/eligible words; n/a means no eligible words. Deltas are percentage points (candidate minus reference). Changing eligibility and output composition can change aggregate rates; inspect the strata and count distributions in the JSON report. Directions describe individual diagnostics, not an overall quality score.", "",
    `Protocol: ${report.protocolDigest}. Evaluator: ${report.evaluatorDigest}. Reference: ${report.referenceDigest}.`,
  ];
  for (const profile of report.profiles) {
    lines.push("", `## ${cell(profile.id)}`, "", `${profile.words} draws per run.`, "",
      "| Measure | Original baseline | Candidate | Change |" + (hasPrevious ? " Previous step | Change vs previous |" : ""),
      "|---|---:|---:|---:|" + (hasPrevious ? "---:|---:|" : ""));
    for (const [label, value] of [["Unique spellings", profile.uniqueSpellings], ["Mean letters", profile.meanLetters]] as const) {
      lines.push(`| ${label} | ${value.baseline.toFixed(3)} | ${value.candidate.toFixed(3)} | ${signed(value.delta)} |${hasPrevious ? ` ${value.previous!.toFixed(3)} | ${signed(value.deltaVsPrevious!)} |` : ""}`);
    }
    lines.push("", "Corpus distances and missing/unseen mass are descriptive diagnostics. Lower distance alone does not establish better output quality; composition and corpus suitability matter. Mass values are proportions, and divergence is in bits.", "",
      "| Distribution / measure | Original baseline | Candidate | Change |" + (hasPrevious ? " Previous step | Change vs previous |" : ""),
      "|---|---:|---:|---:|" + (hasPrevious ? "---:|---:|" : ""));
    for (const [distribution, measures] of Object.entries(profile.distributions)) {
      for (const [measure, value] of Object.entries(measures)) {
        lines.push(`| ${distribution} / ${measure} | ${formatNumber(value.baseline)} | ${formatNumber(value.candidate)} | ${formatNumber(value.delta)} |${hasPrevious ? ` ${formatNumber(value.previous!)} | ${formatNumber(value.deltaVsPrevious!)} |` : ""}`);
      }
    }
    lines.push("", "| Metric / direction | Original hits/eligible (rate) | Candidate hits/eligible (rate) | Δ pp | Δ eligible | Replicate Δ pp range |" + (hasPrevious ? " Previous hits/eligible (rate) | Δ pp vs previous | Δ eligible vs previous | Replicate Δ pp vs previous |" : ""),
      "|---|---:|---:|---:|---:|---:|" + (hasPrevious ? "---:|---:|---:|---:|" : ""));
    for (const metric of profile.metrics) {
      const definition = report.definitions.find(item => item.id === metric.id)!;
      lines.push(`| ${cell(definition.label)} / ${definition.direction} | ${observation(metric.baseline)} | ${observation(metric.candidate)} | ${delta(metric.deltaPercentagePoints)} | ${metric.eligibleDelta} | ${range(metric.replicatesVsBaseline)} |${hasPrevious ? ` ${observation(metric.previous!)} | ${delta(metric.deltaVsPreviousPercentagePoints!)} | ${metric.eligibleDeltaVsPrevious} | ${range(metric.replicatesVsPrevious!)} |` : ""}`);
    }
    lines.push("", "| Stratum | Original draws | Candidate draws | Change |" + (hasPrevious ? " Previous draws | Change vs previous |" : ""),
      "|---|---:|---:|---:|" + (hasPrevious ? "---:|---:|" : ""));
    for (const stratum of profile.strata) {
      const words = stratum.words;
      lines.push(`| ${cell(stratum.id)} | ${words.baseline} | ${words.candidate} | ${words.delta} |${hasPrevious ? ` ${words.previous} | ${words.deltaVsPrevious} |` : ""}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
