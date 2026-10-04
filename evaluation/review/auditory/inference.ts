import { createSeededRng } from "../../../src/index.js";
import { digest } from "../snapshot.js";
import { percentile } from "../comparison/comparison-inference.js";
import type { Condition } from "../comparison/comparison-model.js";
import { verifyReleaseFiles } from "./audio.js";
import type { AssetMaterial } from "./audio.js";
import { validateAuditoryExport } from "./report.js";
import { validateAuditoryInference, validateAuditoryRoster } from "./inference-protocol.js";
import type { AuditoryCohort, AuditoryFactors, AuditoryInferenceProtocol, AuditoryRoster, AuditoryWeights } from "./inference-model.js";
import type { AuditoryExport } from "./model.js";

interface Rating { listener: number; favorable: 0 | 1; familiar: boolean }
interface AnalysisItem { id: string; condition: Condition; stratum: string; target: number; draws: number; ratings: Rating[] }
export interface PreparedAuditoryInference {
  factors: AuditoryFactors;
  items: AnalysisItem[];
  identity_basis: "development-fixture" | "owner-attested-enrollment";
}
export interface AuditoryConditionEstimate {
  share_4_5: number | null;
  pool_draws: number;
  covered_draws: number;
  draw_coverage: number;
  pool_targets: number;
  rated_targets: number;
  rated_listeners: number;
  eligible_ratings: number;
}
function compareStrings(first: string, second: string): number { return first < second ? -1 : first > second ? 1 : 0; }
export function prepareAuditoryInference(data: AuditoryExport, materials: AssetMaterial[], roster?: AuditoryRoster): PreparedAuditoryInference {
  validateAuditoryExport(data);
  verifyReleaseFiles(data.comparison, data.release, materials);
  const protocol = data.comparison.registration.inference;
  if (!protocol) throw new Error("Freeze an auditory stability protocol before observations.");
  validateAuditoryInference(protocol);
  if (data.comparison.registration.purpose === "human-study" && !roster) throw new Error("Human auditory inference requires an owner-attested listener roster.");
  if (roster) validateAuditoryRoster(data.comparison, roster);
  const people = new Map(roster?.entries.map(entry => [entry.participant_slot, entry.person_key]) ??
    data.comparison.registration.participant_slots.map(slot => [slot, slot]));
  const factors = { listeners: [...people.values()].sort(compareStrings), targets: [...new Set(data.comparison.items.map(item => item.target.digest))].sort(compareStrings) };
  const listeners = new Map(factors.listeners.map((listener, index) => [listener, index]));
  const targets = new Map(factors.targets.map((target, index) => [target, index]));
  const sessions = new Map(data.plan.sessions.map(session => [session.id, session]));
  const byItem = new Map<string, Rating[]>();
  for (const response of data.responses) {
    if (response.answer.status !== "rated") continue;
    const person = people.get(sessions.get(response.session_id)!.participant_slot)!;
    const ratings = byItem.get(response.item_id) ?? [];
    ratings.push({ listener: listeners.get(person)!, favorable: response.answer.rating >= 4 ? 1 : 0, familiar: response.answer.familiar });
    byItem.set(response.item_id, ratings);
  }
  return { factors, identity_basis: roster ? "owner-attested-enrollment" : "development-fixture",
    items: data.comparison.items.map(item => ({ id: item.id, condition: item.condition, stratum: item.stratum,
      target: targets.get(item.target.digest)!, draws: item.draws.length, ratings: byItem.get(item.id) ?? [] })) };
}

function scaledWeights(weights: AuditoryWeights, factors: AuditoryFactors): AuditoryWeights {
  if (weights.listeners.length !== factors.listeners.length || weights.targets.length !== factors.targets.length ||
      ![...weights.listeners, ...weights.targets].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error("Every listener and pronunciation target requires a finite positive factor.");
  }
  function axis(values: number[]): number[] {
    const maximum = values.reduce((max, value) => Math.max(max, value), 0), result = values.map(value => value / maximum);
    if (result.some(value => value <= 0)) throw new Error("Factor scaling exceeds representable positive arithmetic.");
    return result;
  }
  return { listeners: axis(weights.listeners), targets: axis(weights.targets) };
}
function eligible(rating: Rating, cohort: AuditoryCohort): boolean { return cohort === "all-ratings" || !rating.familiar; }
function conditionEstimate(prepared: PreparedAuditoryInference, weights: AuditoryWeights, condition: Condition,
  stratum: string | null, cohort: AuditoryCohort): AuditoryConditionEstimate {
  let numerator = 0, denominator = 0, poolDraws = 0, coveredDraws = 0, ratings = 0;
  const listeners = new Set<number>(), targets = new Set<number>(), poolTargets = new Set<number>();
  for (const item of prepared.items) {
    if (item.condition !== condition || (stratum !== null && item.stratum !== stratum)) continue;
    poolDraws += item.draws; poolTargets.add(item.target);
    const available = item.ratings.filter(rating => eligible(rating, cohort));
    if (!available.length) continue;
    for (const rating of available) {
      const mass = item.draws / available.length * weights.targets[item.target] * weights.listeners[rating.listener];
      if (!Number.isFinite(mass) || mass <= 0) throw new Error("Original auditory draw rating mass is outside finite positive arithmetic.");
      numerator += mass * rating.favorable; denominator += mass; listeners.add(rating.listener);
    }
    coveredDraws += item.draws; targets.add(item.target); ratings += available.length;
  }
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) throw new Error("Auditory condition totals overflowed.");
  return { share_4_5: denominator > 0 ? numerator / denominator : null, pool_draws: poolDraws, covered_draws: coveredDraws,
    draw_coverage: poolDraws ? coveredDraws / poolDraws : 0, pool_targets: poolTargets.size, rated_targets: targets.size,
    rated_listeners: listeners.size, eligible_ratings: ratings };
}
export function weightedAuditoryCondition(prepared: PreparedAuditoryInference, weights: AuditoryWeights, condition: Condition,
  stratum: string | null, cohort: AuditoryCohort): AuditoryConditionEstimate {
  return conditionEstimate(prepared, scaledWeights(weights, prepared.factors), condition, stratum, cohort);
}
function estimate(prepared: PreparedAuditoryInference, weights: AuditoryWeights, stratum: string | null, cohort: AuditoryCohort) {
  const baseline = conditionEstimate(prepared, weights, "baseline", stratum, cohort), candidate = conditionEstimate(prepared, weights, "candidate", stratum, cohort);
  return { baseline, candidate, candidate_minus_baseline: baseline.share_4_5 === null || candidate.share_4_5 === null ? null : candidate.share_4_5 - baseline.share_4_5 };
}
function withholding(point: ReturnType<typeof estimate>, protocol: AuditoryInferenceProtocol): string[] {
  const reasons: string[] = [];
  for (const condition of ["baseline", "candidate"] as const) {
    if (point[condition].rated_listeners < protocol.minimum_rated_listeners_per_condition) reasons.push(`${condition}: insufficient rated listeners`);
    if (point[condition].rated_targets < protocol.minimum_rated_targets_per_condition) reasons.push(`${condition}: insufficient rated targets`);
    if (point[condition].draw_coverage < protocol.minimum_draw_coverage) reasons.push(`${condition}: insufficient covered original draws`);
  }
  return reasons;
}
/** Numerical kernel for independently reconstructed synthetic inputs; authenticates no audio or people. */
export function resampleAuditory(prepared: PreparedAuditoryInference, protocol: AuditoryInferenceProtocol, strata: string[]) {
  validateAuditoryInference(protocol);
  if (!strata.length || new Set(strata).size !== strata.length || strata.some(stratum => typeof stratum !== "string" || !stratum)) throw new Error("Numerical contexts require unique registered strata.");
  const unit = { listeners: prepared.factors.listeners.map(() => 1), targets: prepared.factors.targets.map(() => 1) };
  const cohorts: AuditoryCohort[] = ["all-ratings", "unfamiliar-only"];
  const contexts = [null, ...strata].flatMap(stratum => cohorts.map(cohort => ({ stratum, cohort,
    point: estimate(prepared, unit, stratum, cohort), replicates: [] as (number | null)[] })));
  const rng = createSeededRng(protocol.seed), binHashes: string[] = [], listenerCount = prepared.factors.listeners.length;
  const factorCount = listenerCount + prepared.factors.targets.length;
  for (let replicate = 0; replicate < protocol.replicates; replicate++) {
    const bins = Array.from({ length: factorCount }, () => Math.floor(rng() * 4294967296));
    const positive = bins.map(bin => -Math.log((bin + 0.5) / 4294967296));
    const weights = scaledWeights({ listeners: positive.slice(0, listenerCount), targets: positive.slice(listenerCount) }, prepared.factors);
    binHashes.push(digest(bins));
    for (const context of contexts) context.replicates.push(estimate(prepared, weights, context.stratum, context.cohort).candidate_minus_baseline);
  }
  const results = contexts.map(context => {
    const reasons = withholding(context.point, protocol), valid = context.replicates.filter((value): value is number => value !== null && Number.isFinite(value));
    if (valid.length !== context.replicates.length) reasons.push("unavailable replicates retained");
    const tail = (1 - protocol.confidence) / 2;
    return { stratum: context.stratum, cohort: context.cohort, primary: context.stratum === null && context.cohort === protocol.primary_cohort,
      point: context.point, interval_withheld_reasons: reasons, stability_interval: reasons.length ? null : [percentile(valid, tail), percentile(valid, 1 - tail)],
      valid_replicates: valid.length, unavailable_replicates: context.replicates.length - valid.length, replicates: context.replicates };
  });
  return { rng_integer_bin_hashes: binHashes, rng_draws: protocol.replicates * factorCount, results };
}
export function inferAuditory(data: AuditoryExport, materials: AssetMaterial[], roster?: AuditoryRoster) {
  const prepared = prepareAuditoryInference(data, materials, roster), protocol = data.comparison.registration.inference!;
  const resampled = resampleAuditory(prepared, protocol, data.comparison.registration.strata.map(stratum => stratum.id));
  return { version: "auditory-crossed-stability-v1", comparison_digest: data.comparison.digest, plan_digest: data.plan.digest,
    release_digest: data.release.digest, export_digest: digest(data), protocol, protocol_digest: digest(protocol), roster_digest: roster?.digest ?? null,
    identity_basis: prepared.identity_basis, purpose: data.comparison.registration.purpose, factors: prepared.factors, ...resampled,
    calibration: "not-established", population_intervals: null,
    method: "Shared positive exponential listener and pronunciation-target factors across conditions, cohorts and strata. Target identity includes policy, syllable phones and stress. Original draw multiplicity divided by fixed cohort-eligible rating count precedes global weighted aggregation. Axis scaling preserves ratios; exact-bin midpoint transform and type-7 percentile endpoints.",
    scope: "Uncalibrated engineering stability output conditional on observed eligible ratings and the registered production contract. No population interval, informative-missingness or familiarity-selection correction, independent identity/attention proof, fixed-phone causal spelling contrast, multiple-speaker generalization or human quality verdict. One preregistered overall cohort is primary; other contexts exploratory and unadjusted. Written spelling or read-aloud agreement calibration cannot establish auditory rating coverage." };
}
