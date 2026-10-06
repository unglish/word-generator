import { createSeededRng } from "../../../src/index.js";
import { digest } from "../snapshot.js";
import { percentile } from "../comparison/comparison-inference.js";
import type { Condition } from "../comparison/comparison-model.js";
import type { ReadAloudExport } from "./model.js";
import type { ReadAloudFactors, ReadAloudInferenceProtocol, ReadAloudWeights } from "./inference-model.js";
import { validateReadAloudInference } from "./inference-protocol.js";
import { AGREEMENT_METRICS, reportReadAloud } from "./report.js";
import type { AgreementMetric, AlternativeEvidence, ReadingMaterial, SourceDrawScores } from "./report.js";

interface Score { reader: number; agreement: SourceDrawScores["scores"][number]["agreement"] }
interface AnalysisDraw {
  condition: Condition; stratum: string; sample_id: string; draw_index: number; spelling: number;
  source_available: boolean; accepted_alternatives: number; scores: Score[];
}
export interface PreparedReadAloudInference { factors: ReadAloudFactors; draws: AnalysisDraw[] }
export interface ReadAloudConditionEstimate {
  agreement: number | null; pool_draws: number; eligible_source_draws: number; covered_draws: number; draw_coverage: number;
  pool_spellings: number; scored_spellings: number; scored_readers: number; available_score_cells: number;
}
function compareStrings(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function fromReport(data: ReadAloudExport, draws: SourceDrawScores[]): PreparedReadAloudInference {
  const people = new Map(data.roster.entries.map(entry => [entry.participant_slot, entry.person_key]));
  const factors = { readers: [...people.values()].sort(compareStrings), spellings: [...new Set(draws.map(draw => draw.spelling))].sort(compareStrings) };
  const readers = new Map(factors.readers.map((reader, index) => [reader, index]));
  const spellings = new Map(factors.spellings.map((spelling, index) => [spelling, index]));
  return { factors, draws: draws.map(draw => ({ condition: draw.condition, stratum: draw.stratum, sample_id: draw.sample_id,
    draw_index: draw.draw_index, spelling: spellings.get(draw.spelling)!, source_available: draw.source_available,
    accepted_alternatives: draw.accepted_alternatives, scores: draw.scores.map(score => ({ reader: readers.get(people.get(score.participant_slot)!)!, agreement: score.agreement })) })) };
}
export function prepareReadAloudInference(data: ReadAloudExport, materials: ReadingMaterial[], evidence: AlternativeEvidence[] = []): PreparedReadAloudInference {
  return fromReport(data, reportReadAloud(data, materials, evidence).source_draws);
}
function scaledWeights(weights: ReadAloudWeights, factors: ReadAloudFactors): ReadAloudWeights {
  if (weights.readers.length !== factors.readers.length || weights.spellings.length !== factors.spellings.length ||
      ![...weights.readers, ...weights.spellings].every(value => Number.isFinite(value) && value > 0)) throw new Error("Every reader and spelling requires one finite positive factor.");
  function axis(values: number[]): number[] {
    const maximum = values.reduce((max, value) => Math.max(max, value), 0), result = values.map(value => value / maximum);
    if (result.some(value => value <= 0)) throw new Error("Factor scaling exceeds representable positive arithmetic.");
    return result;
  }
  return { readers: axis(weights.readers), spellings: axis(weights.spellings) };
}
function conditionEstimate(prepared: PreparedReadAloudInference, weights: ReadAloudWeights, condition: Condition,
  stratum: string | null, metric: AgreementMetric): ReadAloudConditionEstimate {
  let numerator = 0, denominator = 0, poolDraws = 0, eligibleDraws = 0, coveredDraws = 0, cells = 0;
  const readers = new Set<number>(), spellings = new Set<number>(), poolSpellings = new Set<number>();
  for (const draw of prepared.draws) {
    if (draw.condition !== condition || (stratum !== null && draw.stratum !== stratum)) continue;
    poolDraws++; eligibleDraws += Number(draw.source_available); poolSpellings.add(draw.spelling);
    const available = draw.scores.filter(score => score.agreement[metric] !== null);
    if (!available.length) continue;
    for (const score of available) {
      const mass = weights.spellings[draw.spelling] * weights.readers[score.reader] / available.length;
      if (!Number.isFinite(mass) || mass <= 0) throw new Error("Original draw score mass is outside finite positive arithmetic.");
      numerator += mass * Number(score.agreement[metric]); denominator += mass; readers.add(score.reader);
    }
    coveredDraws++; cells += available.length; spellings.add(draw.spelling);
  }
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) throw new Error("Original draw totals overflowed.");
  return { agreement: denominator > 0 ? numerator / denominator : null, pool_draws: poolDraws, eligible_source_draws: eligibleDraws,
    covered_draws: coveredDraws, draw_coverage: poolDraws ? coveredDraws / poolDraws : 0, pool_spellings: poolSpellings.size,
    scored_spellings: spellings.size, scored_readers: readers.size, available_score_cells: cells };
}
export function weightedReadAloudCondition(prepared: PreparedReadAloudInference, weights: ReadAloudWeights, condition: Condition,
  stratum: string | null, metric: AgreementMetric): ReadAloudConditionEstimate {
  return conditionEstimate(prepared, scaledWeights(weights, prepared.factors), condition, stratum, metric);
}
function estimate(prepared: PreparedReadAloudInference, weights: ReadAloudWeights, stratum: string | null, metric: AgreementMetric) {
  const baseline = conditionEstimate(prepared, weights, "baseline", stratum, metric), candidate = conditionEstimate(prepared, weights, "candidate", stratum, metric);
  return { baseline, candidate, candidate_minus_baseline: baseline.agreement === null || candidate.agreement === null ? null : candidate.agreement - baseline.agreement };
}
function withholding(point: ReturnType<typeof estimate>, protocol: ReadAloudInferenceProtocol): string[] {
  const reasons: string[] = [];
  for (const condition of ["baseline", "candidate"] as const) {
    if (point[condition].scored_readers < protocol.minimum_scored_readers_per_condition) reasons.push(`${condition}: insufficient scored readers`);
    if (point[condition].scored_spellings < protocol.minimum_scored_spellings_per_condition) reasons.push(`${condition}: insufficient scored spellings`);
    if (point[condition].draw_coverage < protocol.minimum_draw_coverage) reasons.push(`${condition}: insufficient covered original draws`);
  }
  return reasons;
}
/** Numerical kernel for independently reconstructed simulation inputs; no material authentication. */
export function resampleReadAloud(prepared: PreparedReadAloudInference, protocol: ReadAloudInferenceProtocol, strata: string[]) {
  validateReadAloudInference(protocol);
  if (!strata.length || new Set(strata).size !== strata.length || strata.some(stratum => typeof stratum !== "string" || !stratum)) throw new Error("Numerical contexts require unique registered strata.");
  const unit = { readers: prepared.factors.readers.map(() => 1), spellings: prepared.factors.spellings.map(() => 1) };
  const contexts = [null, ...strata].flatMap(stratum =>
    AGREEMENT_METRICS.map(metric => ({ stratum, metric, point: estimate(prepared, unit, stratum, metric), replicates: [] as (number | null)[] })));
  const rng = createSeededRng(protocol.seed), binHashes: string[] = [], readerCount = prepared.factors.readers.length;
  const factorCount = readerCount + prepared.factors.spellings.length;
  for (let replicate = 0; replicate < protocol.replicates; replicate++) {
    const bins = Array.from({ length: factorCount }, () => Math.floor(rng() * 4294967296));
    const positive = bins.map(bin => -Math.log((bin + 0.5) / 4294967296));
    const weights = scaledWeights({ readers: positive.slice(0, readerCount), spellings: positive.slice(readerCount) }, prepared.factors);
    binHashes.push(digest(bins));
    for (const context of contexts) context.replicates.push(estimate(prepared, weights, context.stratum, context.metric).candidate_minus_baseline);
  }
  const results = contexts.map(context => {
    const reasons = withholding(context.point, protocol);
    const valid = context.replicates.filter((value): value is number => value !== null && Number.isFinite(value));
    if (valid.length !== context.replicates.length) reasons.push("unavailable replicates retained");
    const tail = (1 - protocol.confidence) / 2;
    return { stratum: context.stratum, metric: context.metric, primary: context.stratum === null && context.metric === protocol.primary_metric,
      point: context.point, interval_withheld_reasons: reasons, stability_interval: reasons.length ? null : [percentile(valid, tail), percentile(valid, 1 - tail)],
      valid_replicates: valid.length, unavailable_replicates: context.replicates.length - valid.length, replicates: context.replicates };
  });
  return { rng_integer_bin_hashes: binHashes, rng_draws: protocol.replicates * factorCount, results };
}

export function inferReadAloud(data: ReadAloudExport, materials: ReadingMaterial[], evidence: AlternativeEvidence[] = []) {
  const protocol = data.comparison.registration.inference;
  if (!protocol) throw new Error("Freeze the read-aloud stability protocol before observations.");
  validateReadAloudInference(protocol);
  const report = reportReadAloud(data, materials, evidence), prepared = fromReport(data, report.source_draws);
  const resampled = resampleReadAloud(prepared, protocol, data.comparison.registration.strata.map(stratum => stratum.id));
  return { version: "read-aloud-crossed-stability-v1", comparison_digest: data.comparison.digest, plan_digest: data.plan.digest, roster_digest: data.roster.digest,
    export_digest: digest(data), report_digest: digest(report), protocol, protocol_digest: digest(protocol), factors: prepared.factors,
    rng_integer_bin_hashes: resampled.rng_integer_bin_hashes, rng_draws: resampled.rng_draws, report, results: resampled.results,
    calibration: "not-established", population_intervals: null,
    method: "Shared positive exponential reader and spelling factors across arms, strata and all four metrics. Every original source draw remains separate; fixed metric-available reader count divides its observation mass before global weighted aggregation. Axis scaling preserves each ratio. Same-bin midpoint transform and type-7 percentile endpoints.",
    scope: "Uncalibrated engineering stability output, conditional on observed definite readings and source-target availability. No population interval, informative-missingness correction, independent identity/coding proof, causal spelling-only estimate or quality verdict. Exactly one preregistered metric/overall context is primary; other intervals are exploratory and unadjusted. Categorical pronunciation calibration must preserve joint conflicting-target/accepted/stress scores and unavailable states; written-rating calibration is insufficient." };
}
