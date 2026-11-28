import type { DrawEvidence } from "./packet.js";
import { duplicateRate } from "./guide.js";
import { median } from "./statistics.js";

const ARMS = ["before", "after"] as const;
type Arm = typeof ARMS[number];
const TAIL_THRESHOLD = 10;
const RARE_PAIRS_LISTED = 10;

function share(numerator: number, denominator: number) {
  return { numerator, denominator, rate: denominator ? numerator / denominator : null };
}

function armMetrics(rows: readonly DrawEvidence[], arm: Arm) {
  const trigram: number[] = [];
  let projected = 0, rare = 0, realPronunciation = 0;
  for (const row of rows) {
    const { surface } = row[arm];
    if (surface.kind !== "scored") continue;
    projected++;
    if (surface.guide.trigram.percentile !== null) trigram.push(surface.guide.trigram.percentile);
    if (surface.guide.rarePairs.length) rare++;
    if (surface.guide.realPronunciation) realPronunciation++;
  }
  return {
    draws: rows.length, projected,
    trigram: { median: median(trigram), below10: share(trigram.filter(value => value < TAIL_THRESHOLD).length, trigram.length) },
    rarePair: share(rare, projected),
    realPronunciation: share(realPronunciation, projected),
    realSpelling: share(rows.filter(row => row[arm].realSpelling).length, rows.length),
  };
}

type Metrics = ReturnType<typeof armMetrics>;
type Duplicates = Record<"spelling" | "ipa", ReturnType<typeof duplicateRate>>;

function duplicates(rows: readonly DrawEvidence[], arm: Arm): Duplicates {
  return { spelling: duplicateRate(rows.map(row => row[arm].spelling)), ipa: duplicateRate(rows.map(row => row[arm].ipa)) };
}

/** The scalars the packet compares across arms and seeds. Duplicates exist only within one seed's batch. */
function scalars(m: Metrics, dup: Duplicates | null) {
  return {
    trigramMedian: m.trigram.median, trigramBelow10Rate: m.trigram.below10.rate, rarePairRate: m.rarePair.rate,
    realPronunciationRate: m.realPronunciation.rate, realSpellingRate: m.realSpelling.rate,
    duplicateSpellingRate: dup?.spelling.rate ?? null, duplicateIpaRate: dup?.ipa.rate ?? null,
  };
}
type Scalars = ReturnType<typeof scalars>;
type Scalar = keyof Scalars;

function changes(before: Scalars, after: Scalars): Record<Scalar, number | null> {
  const keys = Object.keys(before) as Scalar[];
  return Object.fromEntries(keys.map(key => {
    const a = before[key], b = after[key];
    return [key, a === null || b === null ? null : b - a];
  })) as Record<Scalar, number | null>;
}

function range(list: ReadonlyArray<number | null>) {
  const present = list.filter((value): value is number => value !== null);
  if (!present.length) return null;
  return { min: Math.min(...present), max: Math.max(...present),
    mean: present.reduce((sum, value) => sum + value, 0) / present.length, seeds: present.length };
}

/** Rare pairs by the number of draws containing them in each arm. */
function rarePairCounts(rows: readonly DrawEvidence[]) {
  const pairs = new Map<string, { symbols: [string, string]; referenceRows: number; before: number; after: number }>();
  for (const row of rows) {
    for (const arm of ARMS) {
      const { surface } = row[arm];
      if (surface.kind !== "scored") continue;
      const seen = new Set<string>();
      for (const pair of surface.guide.rarePairs) {
        const key = JSON.stringify(pair.symbols);
        if (seen.has(key)) continue;
        seen.add(key);
        const entry = pairs.get(key) ?? { ...pair, before: 0, after: 0 };
        entry[arm]++;
        pairs.set(key, entry);
      }
    }
  }
  const all = [...pairs.keys()].sort().map(key => pairs.get(key)!);
  const top = (arm: Arm) => [...all].filter(pair => pair[arm] > 0).sort((a, b) => b[arm] - a[arm]).slice(0, RARE_PAIRS_LISTED);
  return { distinct: all.length, top: { before: top("before"), after: top("after") }, pairs: all };
}

/**
 * Guide metrics for each arm, pooled and by seed. A batch is one seed's draws, so duplicates
 * are only counted within a seed; the pooled row reports their mean and range across seeds.
 */
export function summarizeGuide(rows: readonly DrawEvidence[], seeds: readonly number[]) {
  const bySeed = seeds.map(seed => {
    const sample = rows.filter(row => row.seed === seed);
    const side = (arm: Arm) => {
      const metrics = armMetrics(sample, arm);
      const dup = duplicates(sample, arm);
      return { ...metrics, duplicates: dup, values: scalars(metrics, dup) };
    };
    const before = side("before"), after = side("after");
    return { seed, before, after, delta: changes(before.values, after.values) };
  });
  const keys = Object.keys(bySeed[0]?.delta ?? {}) as Scalar[];
  const spread = (read: (seed: typeof bySeed[number]) => Record<Scalar, number | null>) =>
    Object.fromEntries(keys.map(key => [key, range(bySeed.map(seed => read(seed)[key]))])) as Record<Scalar, ReturnType<typeof range>>;
  const before = armMetrics(rows, "before"), after = armMetrics(rows, "after");
  return {
    pooled: { before, after, delta: changes(scalars(before, null), scalars(after, null)) },
    bySeed,
    seedRanges: { before: spread(seed => seed.before.values), after: spread(seed => seed.after.values), delta: spread(seed => seed.delta) },
    rarePairs: rarePairCounts(rows),
  };
}
