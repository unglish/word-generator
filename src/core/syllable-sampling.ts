import type { LanguageConfig } from "../config/language.js";
import type { GenerationMode } from "../types.js";
import type { RNG } from "../utils/random.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { computePhonemeTargetBounds, resolveRootPhonemeTarget } from "./length-semantics.js";

export type RootLengthPolicy = Pick<LanguageConfig, "phonemeLengthWeights" | "phonemeToSyllableWeights"> & {
  maxOnsetLength: number;
  maxCodaLength: number;
};

type Weights = [number, number][];

function syllableShare(row: Weights | undefined, count: number): number {
  if (!row?.length) return 0;
  const total = row.reduce((sum, [, weight]) => sum + weight, 0);
  return total > 0 ? (row.find(([syllables]) => syllables === count)?.[1] ?? 0) / total : 0;
}

function weightsForRequestedSyllables(
  weights: Weights,
  table: Record<number, Weights> | undefined,
  { minRoot, maxRoot }: ReturnType<typeof computePhonemeTargetBounds>,
): Weights {
  const feasible = weights.filter(([phonemes]) => phonemes >= minRoot && phonemes <= maxRoot);
  const conditioned: Weights = feasible.map(([phonemes, weight]): [number, number] =>
    [phonemes, weight * syllableShare(table?.[phonemes], minRoot)],
  ).filter(([, weight]) => weight > 0);
  if (conditioned.length) return conditioned;
  return feasible.length ? feasible : weights;
}

export function sampleRootLengths(
  policy: RootLengthPolicy,
  mode: GenerationMode,
  rand: RNG,
  requestedSyllables?: number,
): { phonemes: number; syllables: number } {
  const { maxOnsetLength, maxCodaLength } = policy;
  const bounds = computePhonemeTargetBounds(requestedSyllables, maxOnsetLength, maxCodaLength);
  const phonemeWeights = policy.phonemeLengthWeights[mode];
  const table = policy.phonemeToSyllableWeights[mode];
  if (!phonemeWeights?.length) throw new Error(`Missing phonemeLengthWeights.${mode} in language config`);
  const candidates = requestedSyllables
    ? weightsForRequestedSyllables(phonemeWeights, table, bounds)
    : phonemeWeights;
  const phonemes = resolveRootPhonemeTarget(getWeightedOption(candidates, rand), bounds);
  if (requestedSyllables) return { phonemes, syllables: requestedSyllables };
  if (!table) throw new Error(`Missing phonemeToSyllableWeights.${mode} in language config`);
  const syllableWeights = table[phonemes];
  if (!syllableWeights?.length) throw new Error(`Missing phonemeToSyllableWeights entry for phoneme count ${phonemes}`);
  const feasible = syllableWeights.filter(([count]) =>
    phonemes <= computePhonemeTargetBounds(count, maxOnsetLength, maxCodaLength).maxRoot,
  );
  return { phonemes, syllables: getWeightedOption(feasible.length ? feasible : syllableWeights, rand) };
}
