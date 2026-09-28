import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generateWords } from "./generate.js";
import { computePhonemeQualityMetrics } from "./phoneme-quality.js";
import { normalizeGeneratedPhoneme, PhonemeNormalization } from "./phoneme-normalization.js";

interface PhonemeThresholds {
  sampleSize: number;
  seed: number;
  minCommonBaselinePct: number;
  maxOverRepresentation: number;
  minRepresentation: number;
  maxAbsoluteGapPct: number;
  minSharedPearsonR: number;
  maxGeneratedOnlyMassPct: number;
  generatedOnlyEscalationThresholdPct: number;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function extractJsConst<T>(source: string, constName: string): T {
  const match = source.match(new RegExp(`const ${constName} = (\\{[\\s\\S]*?\\});`));
  if (!match) {
    throw new Error(`Could not extract ${constName} from demo/cmuBaselines.js`);
  }
  return JSON.parse(match[1]) as T;
}

function loadNormalization(repoRoot: string): PhonemeNormalization {
  const path = join(repoRoot, "data", "cmu", "phoneme-normalization.json");
  if (existsSync(path)) return loadJson<PhonemeNormalization>(path);
  const demoBaselines = readFileSync(join(repoRoot, "demo", "cmuBaselines.js"), "utf8");
  return extractJsConst<PhonemeNormalization>(demoBaselines, "phonemeNormalization");
}

function loadBaselineCounts(repoRoot: string): Record<string, number> {
  const path = join(repoRoot, "data", "cmu", "cmu-lexicon-phonemes.json");
  if (existsSync(path)) return loadJson<Record<string, number>>(path);
  const demoBaselines = readFileSync(join(repoRoot, "demo", "cmuBaselines.js"), "utf8");
  // Percentages are fine here because metric code re-normalizes to percentages.
  return extractJsConst<Record<string, number>>(demoBaselines, "cmuPhonemes");
}

describe("Phoneme quality gates", () => {
  it("meets phoneme distribution guardrails", async () => {
    const repoRoot = join(__dirname, "..", "..");
    const thresholds = loadJson<PhonemeThresholds>(join(repoRoot, "src", "config", "phoneme-thresholds.json"));
    const normalization = loadNormalization(repoRoot);
    const baselineCounts = loadBaselineCounts(repoRoot);

    const words = generateWords(thresholds.sampleSize, {
      seed: thresholds.seed,
      mode: "lexicon",
      morphology: false,
    });

    const generatedCounts: Record<string, number> = {};
    const normalizationLosses: Record<string, number> = {};
    for (const word of words) {
      for (const syllable of word.syllables) {
        for (const p of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
          const sound = normalizeGeneratedPhoneme(p.sound, normalization);
          if (!sound) {
            normalizationLosses[p.sound] = (normalizationLosses[p.sound] || 0) + 1;
            continue;
          }
          generatedCounts[sound] = (generatedCounts[sound] || 0) + 1;
        }
      }
    }

    const metrics = computePhonemeQualityMetrics(
      generatedCounts,
      baselineCounts,
      thresholds.minCommonBaselinePct,
    );
    expect(normalizationLosses).toEqual({});

    const worstOver = metrics.topOverRepresented[0];
    const worstUnder = metrics.topUnderRepresented[0];
    const worstGap = metrics.topAbsoluteGap[0];

    console.log(`Shared phoneme Pearson r: ${metrics.sharedPearsonR.toFixed(4)} (threshold: ${thresholds.minSharedPearsonR})`);
    console.log(`Non-CMU generated mass: ${metrics.nonCmuMassPct.toFixed(4)}% (threshold: ${thresholds.maxGeneratedOnlyMassPct}%)`);
    if (worstOver) console.log(`Worst over-rep: ${worstOver.phoneme} at ${worstOver.ratio.toFixed(3)}x (threshold: ${thresholds.maxOverRepresentation}x)`);
    if (worstUnder) console.log(`Worst under-rep: ${worstUnder.phoneme} at ${worstUnder.ratio.toFixed(3)}x (threshold: ${thresholds.minRepresentation}x)`);
    if (worstGap) console.log(`Worst absolute gap: ${worstGap.phoneme} at ${worstGap.absGapPct.toFixed(3)}% (threshold: ${thresholds.maxAbsoluteGapPct}%)`);
    console.log(`CMU phonemes never generated: ${metrics.cmuOnlyKeyCount} (threshold: 0)`);

    expect(metrics.sharedPearsonR).toBeGreaterThanOrEqual(thresholds.minSharedPearsonR);
    expect(metrics.nonCmuMassPct).toBeLessThanOrEqual(thresholds.maxGeneratedOnlyMassPct);
    if (worstOver) expect(worstOver.ratio).toBeLessThanOrEqual(thresholds.maxOverRepresentation);
    if (worstUnder) expect(worstUnder.ratio).toBeGreaterThanOrEqual(thresholds.minRepresentation);
    if (worstGap) expect(worstGap.absGapPct).toBeLessThanOrEqual(thresholds.maxAbsoluteGapPct);
    // Rankings skip phones below minCommonBaselinePct, so absence is gated separately.
    expect(metrics.cmuOnlyKeyCount).toBe(0);
  }, 120_000);
});
