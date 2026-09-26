export interface DistributionScore {
  jensenShannonBits: number | null;
  missingReferenceMass: number | null;
  unseenGeneratedMass: number | null;
}

function normalize(weights: Record<string, number>): Map<string, number> | null {
  const entries = Object.entries(weights);
  let maximum = 0;
  for (const [category, weight] of entries) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`Distribution weight for ${JSON.stringify(category)} must be finite and nonnegative.`);
    }
    maximum = Math.max(maximum, weight);
  }
  if (maximum === 0) return null;

  // Scaling first avoids overflow when individually finite weights sum above Number.MAX_VALUE.
  const scaled = entries.map(([category, weight]): [string, number] => [category, weight / maximum]);
  const total = scaled.reduce((sum, [, weight]) => sum + weight, 0);
  return new Map(scaled.map(([category, weight]) => [category, weight / total]));
}

function divergenceContribution(probability: number, combined: number): number {
  if (probability === 0) return 0;
  // log2(2p / (p + q)) without halving subnormal probabilities to zero.
  return probability * (1 + Math.log2(probability) - Math.log2(combined));
}

/** Jensen–Shannon divergence in bits and directional coverage over the union of categories. */
export function distributionDistance(
  generated: Record<string, number>,
  reference: Record<string, number>,
): DistributionScore {
  const generatedProbabilities = normalize(generated);
  const referenceProbabilities = normalize(reference);
  if (generatedProbabilities === null || referenceProbabilities === null) {
    return { jensenShannonBits: null, missingReferenceMass: null, unseenGeneratedMass: null };
  }

  let jensenShannonBits = 0;
  let missingReferenceMass = 0;
  let unseenGeneratedMass = 0;
  const categories = new Set([...generatedProbabilities.keys(), ...referenceProbabilities.keys()]);
  for (const category of categories) {
    const generatedProbability = generatedProbabilities.get(category) ?? 0;
    const referenceProbability = referenceProbabilities.get(category) ?? 0;
    const combined = generatedProbability + referenceProbability;
    jensenShannonBits += (
      divergenceContribution(generatedProbability, combined)
      + divergenceContribution(referenceProbability, combined)
    ) / 2;
    if (generatedProbability === 0) missingReferenceMass += referenceProbability;
    if (referenceProbability === 0) unseenGeneratedMass += generatedProbability;
  }

  // Floating-point cancellation can put nearly identical distributions a few ulps below zero.
  return { jensenShannonBits: Math.max(0, Math.min(1, jensenShannonBits)), missingReferenceMass, unseenGeneratedMass };
}
