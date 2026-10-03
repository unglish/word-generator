import { createSeededRng } from "../../../src/index.js";
import { digest } from "../snapshot.js";
import { validateComparisonExport } from "./comparison-report.js";
import { CONDITIONS } from "./comparison-freeze.js";
import { validateEnrollment, validateInferenceProtocol } from "./inference-protocol.js";
import type { ComparisonExport, Condition } from "./comparison-model.js";
import type { CrossedFactors, CrossedWeights, EnrollmentRoster, WrittenInferenceProtocol } from "./inference-model.js";

interface Rating { participant: number; favorable: 0 | 1 }
interface AnalysisItem {
  id: string; condition: Condition; stratum: string; spelling: number; draws: number; ratings: Rating[];
}
export interface PreparedInference { factors: CrossedFactors; items: AnalysisItem[]; identity_basis: "development-fixture" | "owner-attested-enrollment" }
function compareStrings(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
export function prepareInference(data: ComparisonExport, protocol: WrittenInferenceProtocol, roster?: EnrollmentRoster): PreparedInference {
  validateComparisonExport(data); validateInferenceProtocol(protocol);
  if (!data.comparison.registration.inference || digest(data.comparison.registration.inference) !== digest(protocol)) throw new Error("Inference must match the protocol frozen before observations.");
  const comparison = data.comparison;
  if (comparison.registration.purpose === "human-study" && !roster) throw new Error("Human inference requires a bound owner-attested enrollment roster.");
  if (roster) validateEnrollment(comparison, roster);
  const people = new Map(roster?.entries.map(entry => [entry.participant_slot, entry.person_key]) ??
    comparison.registration.participant_slots.map(slot => [slot, slot]));
  const factors = { participants: [...people.values()].sort(compareStrings),
    spellings: [...new Set(comparison.items.map(item => item.spelling))].sort(compareStrings) };
  const participantIndices = new Map(factors.participants.map((person, index) => [person, index]));
  const spellingIndices = new Map(factors.spellings.map((spelling, index) => [spelling, index]));
  const sessions = new Map(data.plan.sessions.map(session => [session.id, session]));
  const byItem = new Map<string, Rating[]>();
  for (const response of data.responses) {
    if (response.answer.status !== "rated" || (protocol.cohort === "unfamiliar-only" && response.answer.familiar)) continue;
    const person = people.get(sessions.get(response.session_id)!.participant_slot)!;
    const ratings = byItem.get(response.item_id) ?? [];
    ratings.push({ participant: participantIndices.get(person)!, favorable: response.answer.rating >= 4 ? 1 : 0 });
    byItem.set(response.item_id, ratings);
  }
  return { factors, identity_basis: roster ? "owner-attested-enrollment" : "development-fixture",
    items: comparison.items.map(item => ({ id: item.id, condition: item.condition, stratum: item.stratum,
      spelling: spellingIndices.get(item.spelling)!, draws: item.draws.length, ratings: byItem.get(item.id) ?? [] })) };
}
function validateWeights(weights: CrossedWeights, factors: CrossedFactors): void {
  if (weights.participants.length !== factors.participants.length || weights.spellings.length !== factors.spellings.length ||
      ![...weights.participants, ...weights.spellings].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error("Every participant and spelling factor requires one finite, strictly positive weight.");
  }
}
function scaledWeights(weights: CrossedWeights, factors: CrossedFactors): CrossedWeights {
  validateWeights(weights, factors);
  function axis(values: number[]): number[] {
    const maximum = values.reduce((max, value) => Math.max(max, value), 0);
    const scaled = values.map(value => value / maximum);
    if (scaled.some(value => value <= 0)) throw new Error("Factor scaling exceeds representable positive arithmetic.");
    return scaled;
  }
  return { participants: axis(weights.participants), spellings: axis(weights.spellings) };
}
function conditionStatistic(prepared: PreparedInference, weights: CrossedWeights, condition: Condition, stratum: string | null) {
  let numerator = 0, denominator = 0, coveredDraws = 0, poolDraws = 0;
  const people = new Set<number>(), spellings = new Set<number>();
  for (const item of prepared.items) {
    if (item.condition !== condition || (stratum !== null && item.stratum !== stratum)) continue;
    poolDraws += item.draws;
    if (!item.ratings.length) continue;
    const drawMassPerRating = item.draws / item.ratings.length;
    for (const rating of item.ratings) {
      const mass = drawMassPerRating * weights.spellings[item.spelling] * weights.participants[rating.participant];
      if (!Number.isFinite(mass) || mass <= 0) throw new Error("Weighted observation mass is outside finite positive arithmetic.");
      numerator += mass * rating.favorable; denominator += mass; people.add(rating.participant);
    }
    coveredDraws += item.draws; spellings.add(item.spelling);
  }
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) throw new Error("Weighted condition totals overflowed.");
  return { share_4_5: denominator > 0 ? numerator / denominator : null, covered_draws: coveredDraws,
    pool_draws: poolDraws, draw_coverage: poolDraws ? coveredDraws / poolDraws : 0,
    rated_participants: people.size, rated_spellings: spellings.size };
}
export function weightedCondition(prepared: PreparedInference, weights: CrossedWeights, condition: Condition, stratum: string | null) {
  return conditionStatistic(prepared, scaledWeights(weights, prepared.factors), condition, stratum);
}
function estimate(prepared: PreparedInference, weights: CrossedWeights, stratum: string | null) {
  const baseline = conditionStatistic(prepared, weights, "baseline", stratum);
  const candidate = conditionStatistic(prepared, weights, "candidate", stratum);
  return { baseline, candidate, candidate_minus_baseline: baseline.share_4_5 !== null && candidate.share_4_5 !== null
    ? candidate.share_4_5 - baseline.share_4_5 : null };
}
export function percentile(values: number[], probability: number): number {
  if (!values.length || values.some(value => !Number.isFinite(value)) || !Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("Invalid percentile input.");
  }
  const sorted = [...values].sort((a, b) => a - b), index = probability * (sorted.length - 1), lower = Math.floor(index);
  return sorted[lower] + (index - lower) * (sorted[Math.ceil(index)] - sorted[lower]);
}
function withholdingReasons(point: ReturnType<typeof estimate>, protocol: WrittenInferenceProtocol): string[] {
  const reasons: string[] = [];
  for (const condition of CONDITIONS) {
    if (point[condition].rated_participants < protocol.minimum_rated_participants) reasons.push(`${condition}: insufficient rated participants`);
    if (point[condition].rated_spellings < protocol.minimum_spellings_per_condition) reasons.push(`${condition}: insufficient rated spellings`);
    if (point[condition].draw_coverage < protocol.minimum_draw_coverage) reasons.push(`${condition}: insufficient covered draws`);
  }
  return reasons;
}
export function inferWrittenComparison(data: ComparisonExport, roster?: EnrollmentRoster) {
  const protocol = data.comparison.registration.inference;
  if (!protocol) throw new Error("Freeze an inference protocol before collecting observations.");
  const prepared = prepareInference(data, protocol, roster);
  const unitWeights = { participants: prepared.factors.participants.map(() => 1), spellings: prepared.factors.spellings.map(() => 1) };
  const contexts = [null, ...data.comparison.registration.strata.map(stratum => stratum.id)].map(stratum => ({ stratum,
    point: estimate(prepared, unitWeights, stratum), replicates: [] as (number | null)[] }));
  const rand = createSeededRng(protocol.seed), binHashes: string[] = [];
  const factorCount = prepared.factors.participants.length + prepared.factors.spellings.length;
  for (let replicate = 0; replicate < protocol.replicates; replicate++) {
    const bins = Array.from({ length: factorCount }, () => Math.floor(rand() * 4294967296));
    const positive = bins.map(bin => -Math.log((bin + 0.5) / 4294967296));
    const weights = scaledWeights({ participants: positive.slice(0, prepared.factors.participants.length),
      spellings: positive.slice(prepared.factors.participants.length) }, prepared.factors);
    binHashes.push(digest(bins));
    for (const context of contexts) context.replicates.push(estimate(prepared, weights, context.stratum).candidate_minus_baseline);
  }
  const results = contexts.map(context => {
    const reasons = withholdingReasons(context.point, protocol);
    if (context.replicates.some(value => value === null || !Number.isFinite(value))) reasons.push("unavailable bootstrap replicates retained");
    const values = context.replicates.filter((value): value is number => value !== null && Number.isFinite(value));
    const tail = (1 - protocol.confidence) / 2;
    return { stratum: context.stratum, primary: context.stratum === null, point: context.point, interval_withheld_reasons: reasons,
      interval: reasons.length ? null : [percentile(values, tail), percentile(values, 1 - tail)],
      valid_replicates: values.length, unavailable_replicates: context.replicates.length - values.length, replicates: context.replicates };
  });
  return { version: "written-crossed-inference-v2", comparison_digest: data.comparison.digest, plan_digest: data.plan.digest,
    export_digest: digest(data), protocol, protocol_digest: digest(protocol), enrollment_digest: roster?.digest ?? null,
    identity_basis: prepared.identity_basis, purpose: data.comparison.registration.purpose, factors: prepared.factors,
    rng_integer_bin_hashes: binHashes, rng_draws: protocol.replicates * factorCount, results,
    method: "Independent positive exponential factor weights, shared across conditions/strata for the same person and spelling; observation weights equal original draws divided by fixed eligible rating count, times person and spelling factors; factor axes rescaled by their maxima without changing the ratio; linear interpolated percentile endpoints.",
    scope: "Approximate crossed-factor stability intervals under registered assumptions, conditional on observed missingness. Weighted ratio/percentile calibration is an engineering extension, not established by the cited mean-variance theorem. No correction for informative missingness, independent identity proof, population-generalization guarantee or automatic promotion. Stratum intervals are exploratory and unadjusted for multiplicity; development fixtures are not human ratings." };
}
