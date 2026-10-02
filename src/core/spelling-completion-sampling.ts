import type { RNG } from "../utils/random.js";

export interface CompletionCandidateWeight {
  inventoryIndex: number;
  weight: number;
  refusal?: string;
}
export interface CompletionWeightEvidence extends CompletionCandidateWeight {
  retainedWeight: number;
  probability: number;
}
export type CompletionSample =
  | { status: "infeasible"; candidates: CompletionWeightEvidence[] }
  | { status: "selected"; candidates: CompletionWeightEvidence[]; inventoryIndex: number; roll?: number };

/** Only weights of already authenticated, supported proposals enter the conditional draw. */
export function sampleCompletion(candidates: readonly CompletionCandidateWeight[], rand: RNG): CompletionSample {
  const ids = new Set<number>();
  for (const candidate of candidates) {
    if (!Number.isSafeInteger(candidate.inventoryIndex) || candidate.inventoryIndex < 0 || ids.has(candidate.inventoryIndex) ||
        !Number.isFinite(candidate.weight) || candidate.weight <= 0 || candidate.refusal === "") throw new Error("Invalid completion candidate weight");
    ids.add(candidate.inventoryIndex);
  }
  const retained = candidates.filter(candidate => candidate.refusal === undefined);
  if (!retained.length) return { status: "infeasible", candidates: candidates.map(candidate => ({ ...candidate, retainedWeight: 0, probability: 0 })) };
  const rawTotal = retained.reduce((sum, candidate) => sum + candidate.weight, 0);
  const scale = Number.isFinite(rawTotal) ? 1 : Math.max(...retained.map(candidate => candidate.weight));
  const weights = retained.map(candidate => candidate.weight / scale);
  if (weights.some(weight => weight === 0)) throw new Error("Unrepresentable completion weight ratio");
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = new Map(retained.map((candidate, index) => [candidate.inventoryIndex, weights[index] / total]));
  const evidence = candidates.map(candidate => ({ ...candidate,
    retainedWeight: candidate.refusal === undefined ? candidate.weight : 0,
    probability: probabilities.get(candidate.inventoryIndex) ?? 0 }));
  if (retained.length === 1) return { status: "selected", candidates: evidence, inventoryIndex: retained[0].inventoryIndex };
  const roll = rand();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Invalid completion random draw");
  const target = roll * total;
  let cumulative = 0;
  for (const [index, candidate] of retained.entries()) {
    cumulative += weights[index];
    if (target < cumulative) return { status: "selected", candidates: evidence, inventoryIndex: candidate.inventoryIndex, roll };
  }
  // Floating-point multiplication can round a value below total up to total.
  return { status: "selected", candidates: evidence, inventoryIndex: retained[retained.length - 1].inventoryIndex, roll };
}
