import { keyOf } from "../review/wordlikeness/model.js";
import { baseLogProbability, conditionalContextKey, constituentLogProbability,
  type ConditionalModel, type ConstituentContext, type ConstituentObservation } from "./conditional-onset-rime.js";

export interface LikelihoodSummary {
  words: number;
  events: number;
  negativeLogLikelihood: number;
  meanPerWord: number;
  meanPerEvent: number;
}
export interface SmoothingSelection {
  kind: "baseline" | "candidate";
  alpha: number;
  trials: Array<{ alpha: number; score: LikelihoodSummary }>;
}
export interface ComparisonBin {
  events: number;
  baselineNegativeLogLikelihood: number;
  candidateNegativeLogLikelihood: number;
  unseenFullContextEvents: number;
  unseenClassEvents: number;
}
export interface WordLikelihood {
  spelling: string;
  events: number;
  baseline: number;
  candidate: number;
  delta: number;
}

export function likelihoodSummary(model: ConditionalModel, observations: readonly ConstituentObservation[], alpha: number, kind: "baseline" | "candidate"): LikelihoodSummary {
  if (!observations.length) throw new Error("Likelihood evaluation requires observations.");
  const words = new Set(observations.map(observation => observation.spelling)).size;
  let negativeLogLikelihood = 0;
  for (const observation of observations) negativeLogLikelihood -= constituentLogProbability(model, observation, alpha, kind);
  return { words, events: observations.length, negativeLogLikelihood,
    meanPerWord: negativeLogLikelihood / words, meanPerEvent: negativeLogLikelihood / observations.length };
}

/** The caller passes only the registered development cohort; held-out evaluation is separate. */
export function selectSmoothing(model: ConditionalModel, development: readonly ConstituentObservation[], grid: readonly number[], kind: "baseline" | "candidate"): SmoothingSelection {
  if (!grid.length || new Set(grid).size !== grid.length || grid.some(alpha => !(alpha > 0 && Number.isFinite(alpha)))) {
    throw new Error("Smoothing grid must contain distinct finite positive strengths.");
  }
  const trials = [...grid].sort((a, b) => a - b).map(alpha => ({ alpha, score: likelihoodSummary(model, development, alpha, kind) }));
  let selected = trials[0];
  for (const trial of trials.slice(1)) if (trial.score.meanPerWord < selected.score.meanPerWord) selected = trial;
  return { kind, alpha: selected.alpha, trials };
}

function frequencyBand(count: number): string {
  if (count <= 2) return String(count);
  if (count <= 5) return "3-5";
  if (count <= 20) return "6-20";
  return ">20";
}
function comparisonKeys(context: ConstituentContext, count: number): string[] {
  return ["all", `constituent/${context.constituent}`, `stress/${context.stress}`,
    `nucleusClass/${context.nucleusClass}`, `edges/${Number(context.wordInitial)}/${Number(context.wordFinal)}`,
    `trainingFrequency/${frequencyBand(count)}`, `fullContext/${conditionalContextKey(context, "full")}`];
}

export function compareConditionalModels(model: ConditionalModel, observations: readonly ConstituentObservation[], baselineAlpha: number, candidateAlpha: number): {
  bins: Record<string, ComparisonBin>; words: WordLikelihood[];
} {
  if (!observations.length) throw new Error("Comparison requires observations.");
  const bins: Record<string, ComparisonBin> = {};
  const words = new Map<string, WordLikelihood>();
  for (const observation of observations) {
    const token = keyOf(observation.tokens);
    const count = model.levels.full[conditionalContextKey(observation.context, "full")]?.counts[token] ?? 0;
    const classCount = model.levels.class[conditionalContextKey(observation.context, "class")]?.counts[token] ?? 0;
    const baseline = -constituentLogProbability(model, observation, baselineAlpha, "baseline");
    const candidate = -constituentLogProbability(model, observation, candidateAlpha, "candidate");
    for (const key of comparisonKeys(observation.context, count)) {
      const bin = bins[key] ??= { events: 0, baselineNegativeLogLikelihood: 0, candidateNegativeLogLikelihood: 0,
        unseenFullContextEvents: 0, unseenClassEvents: 0 };
      bin.events++; bin.baselineNegativeLogLikelihood += baseline; bin.candidateNegativeLogLikelihood += candidate;
      bin.unseenFullContextEvents += Number(count === 0); bin.unseenClassEvents += Number(classCount === 0);
    }
    const word = words.get(observation.spelling) ?? { spelling: observation.spelling, events: 0, baseline: 0, candidate: 0, delta: 0 };
    word.events++; word.baseline += baseline; word.candidate += candidate; word.delta += candidate - baseline;
    words.set(word.spelling, word);
  }
  return { bins, words: [...words.values()].sort((a, b) => a.spelling < b.spelling ? -1 : a.spelling > b.spelling ? 1 : 0) };
}

/** Compute novel mass through complement counts, avoiding subtraction of near-unit fitted mass. */
export function unseenSupportMass(model: ConditionalModel, context: ConstituentContext, tokens: readonly string[][], alpha: number, kind: "baseline" | "candidate"): number {
  if (!(alpha > 0 && Number.isFinite(alpha))) throw new Error("Smoothing strength must be finite and positive.");
  if (kind !== "baseline" && kind !== "candidate") throw new Error("Unknown model kind.");
  const keys = new Set(tokens.map(keyOf));
  if (keys.size !== tokens.length) throw new Error("Support tokens must be unique.");
  let mass = 1;
  for (const sequence of tokens) mass -= Math.exp(baseLogProbability(model, { spelling: "support", syllable: 0, context, tokens: sequence }));
  if (mass < 0 || !Number.isFinite(mass)) throw new Error("Invalid open-base complement mass.");
  for (const level of kind === "baseline" ? ["class"] as const : ["class", "stress", "full"] as const) {
    const row = model.levels[level][conditionalContextKey(context, level)];
    let seenCounts = 0;
    for (const key of keys) seenCounts += row?.counts[key] ?? 0;
    mass = ((row?.total ?? 0) - seenCounts + alpha * mass) / ((row?.total ?? 0) + alpha);
  }
  if (!(mass >= 0 && mass <= 1 && Number.isFinite(mass))) throw new Error("Invalid fitted complement mass.");
  return mass;
}

export function conditionalSupportDiagnostics(model: ConditionalModel, baselineAlpha: number, candidateAlpha: number): Array<{
  context: ConstituentContext; trainingEvents: number; observedSupport: number;
  baselineNovelMass: number; candidateNovelMass: number; baselineTopTenObservedMass: number; candidateTopTenObservedMass: number;
}> {
  return Object.entries(model.levels.full).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, row]) => {
    const context: ConstituentContext = JSON.parse(key);
    const tokens = Object.keys(row.counts).map(token => token ? token.split(" ") : []);
    const topTen = (alpha: number, kind: "baseline" | "candidate") => tokens.map(sequence =>
      Math.exp(constituentLogProbability(model, { spelling: "support", syllable: 0, context, tokens: sequence }, alpha, kind)))
      .sort((a, b) => b - a).slice(0, 10).reduce((sum, value) => sum + value, 0);
    return { context, trainingEvents: row.total, observedSupport: tokens.length,
      baselineNovelMass: unseenSupportMass(model, context, tokens, baselineAlpha, "baseline"),
      candidateNovelMass: unseenSupportMass(model, context, tokens, candidateAlpha, "candidate"),
      baselineTopTenObservedMass: topTen(baselineAlpha, "baseline"), candidateTopTenObservedMass: topTen(candidateAlpha, "candidate") };
  });
}
