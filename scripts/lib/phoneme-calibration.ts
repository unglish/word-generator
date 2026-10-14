export interface SeedResult {
  seed: number;
  draws: number;
  normalizationLosses: number;
  sharedPearsonR: number;
  nonCmuMassPct: number;
  maxOverRepresentation: number;
  maxOverPhoneme: string;
  minRepresentation: number;
  minRepPhoneme: string;
  maxAbsoluteGapPct: number;
  maxGapPhoneme: string;
  cmuOnlyKeyCount: number;
}

/** Gate limits, their direction, and the precision they are rounded outward to. */
const LIMITS = [
  { limit: "minSharedPearsonR", metric: "sharedPearsonR", bound: "lower", decimals: 4 },
  { limit: "maxOverRepresentation", metric: "maxOverRepresentation", bound: "upper", decimals: 3 },
  { limit: "minRepresentation", metric: "minRepresentation", bound: "lower", decimals: 3 },
  { limit: "maxAbsoluteGapPct", metric: "maxAbsoluteGapPct", bound: "upper", decimals: 3 },
] as const;

/** Inventory coverage is a fixed policy, independent of observed spread. */
const FIXED_LIMITS = [
  { limit: "maxGeneratedOnlyMassPct", metric: "nonCmuMassPct", bound: "upper" },
  { limit: "maxCmuOnlyKeyCount", metric: "cmuOnlyKeyCount", bound: "upper" },
] as const;

function validateCoverage(results: SeedResult[]): void {
  const violations: string[] = [];
  for (const result of results) {
    if (result.normalizationLosses !== 0) {
      violations.push(`seed ${result.seed}: ${result.normalizationLosses} rejected phoneme tokens`);
    }
    if (result.nonCmuMassPct !== 0) {
      violations.push(`seed ${result.seed}: non-CMU generated mass ${result.nonCmuMassPct}% (required: 0%)`);
    }
    if (result.cmuOnlyKeyCount !== 0) {
      violations.push(`seed ${result.seed}: ${result.cmuOnlyKeyCount} missing CMU phonemes (required: 0)`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`Cannot calibrate phoneme limits: coverage requirements failed.\n${violations.join("\n")}`);
  }
}

function summarize(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1);
  return { min: Math.min(...values), max: Math.max(...values), mean, sd: Math.sqrt(variance) };
}

function roundOutward(value: number, decimals: number, bound: "lower" | "upper"): number {
  const scale = 10 ** decimals;
  const rounded = bound === "upper" ? Math.ceil(value * scale - 1e-9) : Math.floor(value * scale + 1e-9);
  return rounded / scale;
}

export function proposeLimits(results: SeedResult[], k: number) {
  validateCoverage(results);
  const calibrated = LIMITS.map(({ limit, metric, bound, decimals }) => {
    const stats = summarize(results.map(r => r[metric]));
    const raw = bound === "upper" ? stats.max + k * stats.sd : stats.min - k * stats.sd;
    return { limit, metric, bound, ...stats, proposed: roundOutward(raw, decimals, bound) };
  });
  const fixed = FIXED_LIMITS.map(({ limit, metric, bound }) => ({
    limit, metric, bound, ...summarize(results.map(r => r[metric])), proposed: 0,
  }));
  return [...calibrated, ...fixed];
}

