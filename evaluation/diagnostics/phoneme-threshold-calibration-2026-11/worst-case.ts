/**
 * How far can a distribution drift from CMU while passing every per-phoneme limit?
 *
 *   node --import tsx evaluation/diagnostics/phoneme-threshold-calibration-2026-11/worst-case.ts [trials] [seed]
 *
 * Seeded random search over distributions that pass the per-phoneme limits in
 * `src/config/phoneme-thresholds.json` exactly as the gate applies them: ratio
 * and absolute-gap limits cover phonemes at or above `minCommonBaselinePct`;
 * rarer phonemes must only stay present. It reports the lowest shared Pearson r
 * and the largest total variation it finds. A search gives a bound that is
 * reachable, not the true extreme.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pearson, toPercentMap, totalVariationPct } from "../../../src/core/distribution-quality.js";
import { createSeededRng } from "../../../src/utils/random.js";

const root = join(import.meta.dirname, "..", "..", "..");
const load = <T>(...parts: string[]): T => JSON.parse(readFileSync(join(root, ...parts), "utf8")) as T;
const limits = load<Record<string, number>>("src", "config", "phoneme-thresholds.json");
const baseline = toPercentMap(load<Record<string, number>>("data", "cmu", "cmu-lexicon-phonemes.json"));
const keys = Object.keys(baseline).filter(key => baseline[key] > 0);
const common = (key: string) => baseline[key] >= limits.minCommonBaselinePct;

function passes(p: Record<string, number>): boolean {
  return keys.every(key => {
    if (!(p[key] > 0)) return false;
    if (!common(key)) return true;
    const ratio = p[key] / baseline[key];
    return ratio <= limits.maxOverRepresentation && ratio >= limits.minRepresentation &&
      Math.abs(p[key] - baseline[key]) <= limits.maxAbsoluteGapPct;
  });
}

const trials = Number(process.argv[2] ?? 300000);
const rand = createSeededRng(Number(process.argv[3] ?? 381));
let feasible = 0;
let lowestR = { r: 1, tv: 0 };
let largestTv = { r: 1, tv: 0 };
for (let trial = 0; trial < trials; trial++) {
  const scale = 0.5 + 0.5 * rand();
  const raw: Record<string, number> = {};
  for (const key of keys) {
    const q = baseline[key];
    const up = common(key) ? Math.min(q * (limits.maxOverRepresentation - 1), limits.maxAbsoluteGapPct) : q * 2;
    const down = common(key) ? Math.min(q * (1 - limits.minRepresentation), limits.maxAbsoluteGapPct) : q * 0.95;
    raw[key] = q + (rand() < 0.5 ? -down : up) * scale;
  }
  const p = toPercentMap(raw);
  if (!passes(p)) continue;
  feasible++;
  const r = pearson(keys.map(key => p[key]), keys.map(key => baseline[key]));
  const tv = totalVariationPct(p, baseline);
  if (r < lowestR.r) lowestR = { r, tv };
  if (tv > largestTv.tv) largestTv = { r, tv };
}
console.log(JSON.stringify({ trials, feasible, rarePhonemes: keys.filter(key => !common(key)).length, lowestR, largestTv }, null, 2));
