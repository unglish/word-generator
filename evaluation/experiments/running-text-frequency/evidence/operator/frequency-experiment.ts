import { frequencyObservations, fitFrequencyCounts, selectFrequencySmoothing,
  scoreFrequencyPopulation, splitFrequencySpellings, type FrequencyWordScore } from "./frequency-model.js";
import { bindLiteralPosRows, joinFrequencyPronunciations, type FrequencyEntry,
  type LiteralPosRow } from "./frequency-source.js";
import type { SelectedCmuEntry } from "./cmu.js";

export const FREQUENCY_EXPERIMENT = {
  version: "running-text-frequency-fit-v1", seed: "q19-2026-10-02",
  alphaGrid: [0.5, 1, 2, 4, 8, 16, 32, 64],
} as const;

function frequencyBand(count: number): string {
  if (count === 1) return "1";
  if (count < 10) return "2-9";
  if (count < 100) return "10-99";
  if (count < 1000) return "100-999";
  return "1000+";
}

function summarizeStrata(baseline: readonly FrequencyWordScore[], candidate: readonly FrequencyWordScore[]) {
  if (baseline.length !== candidate.length) throw new Error("Score populations differ.");
  const bands = new Map<string, { types: number; tokens: number; phones: number;
    baselineObjectiveSum: number; candidateObjectiveSum: number }>();
  for (let index = 0; index < baseline.length; index++) {
    const before = baseline[index];
    const after = candidate[index];
    if (before.spelling !== after.spelling || before.count !== after.count
      || before.phoneCount !== after.phoneCount) throw new Error("Score identities differ.");
    const id = frequencyBand(before.count);
    const row = bands.get(id) ?? { types: 0, tokens: 0, phones: 0,
      baselineObjectiveSum: 0, candidateObjectiveSum: 0 };
    row.types++;
    row.tokens += before.count;
    row.phones += before.count * before.phoneCount;
    row.baselineObjectiveSum += before.count * before.objective;
    row.candidateObjectiveSum += after.count * after.objective;
    bands.set(id, row);
  }
  return [...bands].map(([id, row]) => ({ id, ...row,
    baselineMeanObjective: row.baselineObjectiveSum / row.tokens,
    candidateMeanObjective: row.candidateObjectiveSum / row.tokens }));
}

/** Both development choices are fixed before held-out observations are constructed. */
export function fitFrequencyExperiment(frequencies: readonly FrequencyEntry[],
  pronunciations: readonly SelectedCmuEntry[], literalPos: readonly LiteralPosRow[]) {
  const boundPos = bindLiteralPosRows(frequencies, literalPos);
  const source = joinFrequencyPronunciations(frequencies, pronunciations);
  const split = splitFrequencySpellings(source.joined.map(entry =>
    ({ spelling: entry.frequency.spelling, ...entry })), FREQUENCY_EXPERIMENT.seed);
  const training = frequencyObservations(split.training);
  const development = frequencyObservations(split.development);
  const baseline = fitFrequencyCounts(training, "types");
  const candidate = fitFrequencyCounts(training, "tokens");
  const choices = {
    baseline: selectFrequencySmoothing(baseline, development, FREQUENCY_EXPERIMENT.alphaGrid),
    candidate: selectFrequencySmoothing(candidate, development, FREQUENCY_EXPERIMENT.alphaGrid),
  };
  const heldOut = frequencyObservations(split.heldOut);
  const scores = {
    baseline: scoreFrequencyPopulation(baseline, heldOut, choices.baseline.alpha),
    candidate: scoreFrequencyPopulation(candidate, heldOut, choices.candidate.alpha),
  };
  return {
    registration: FREQUENCY_EXPERIMENT,
    coverage: source.coverage,
    missingPronunciations: source.missing,
    split: Object.fromEntries(Object.entries(split).map(([id, rows]) =>
      [id, rows.map(entry => entry.spelling)])),
    models: { baseline, candidate }, choices, scores,
    frequencyStrata: summarizeStrata(scores.baseline.words, scores.candidate.words),
    // Keep exact per-row rational allocations and raw discrepancies available to independent analysis.
    pos: frequencies.map(entry => ({ spelling: entry.spelling, ...boundPos.get(entry.spelling)! })),
    interpretation: "Token-weighted citation forms; lexical-type holdout; POS allocations are modeled, not observed token partitions.",
  };
}
