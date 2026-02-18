import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateWords } from './generate.js';
import { computePhonemeQualityMetrics } from './phoneme-quality.js';

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
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function normalizeGeneratedPhoneme(sound: string): string | null {
  if (!sound) return null;
  return sound.replace(/\u02B0/g, '');
}

describe('Phoneme quality gates', () => {
  it('meets phoneme distribution guardrails', async () => {
    const repoRoot = join(__dirname, '..', '..');
    const thresholds = loadJson<PhonemeThresholds>(join(repoRoot, 'src', 'config', 'phoneme-thresholds.json'));
    const baselineCounts = loadJson<Record<string, number>>(join(repoRoot, 'memory', 'cmu-lexicon-phonemes.json'));

    const words = generateWords(thresholds.sampleSize, {
      seed: thresholds.seed,
      mode: 'lexicon',
      morphology: false,
    });

    const generatedCounts: Record<string, number> = {};
    for (const word of words) {
      for (const syllable of word.syllables) {
        for (const p of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
          const sound = normalizeGeneratedPhoneme(p.sound);
          if (!sound) continue;
          generatedCounts[sound] = (generatedCounts[sound] || 0) + 1;
        }
      }
    }

    const metrics = computePhonemeQualityMetrics(
      generatedCounts,
      baselineCounts,
      thresholds.minCommonBaselinePct,
    );

    const worstOver = metrics.topOverRepresented[0];
    const worstUnder = metrics.topUnderRepresented[0];
    const worstGap = metrics.topAbsoluteGap[0];

    console.log(`Shared phoneme Pearson r: ${metrics.sharedPearsonR.toFixed(4)} (threshold: ${thresholds.minSharedPearsonR})`);
    console.log(`Non-CMU generated mass: ${metrics.nonCmuMassPct.toFixed(4)}% (threshold: ${thresholds.maxGeneratedOnlyMassPct}%)`);
    if (worstOver) console.log(`Worst over-rep: ${worstOver.phoneme} at ${worstOver.ratio.toFixed(3)}x (threshold: ${thresholds.maxOverRepresentation}x)`);
    if (worstUnder) console.log(`Worst under-rep: ${worstUnder.phoneme} at ${worstUnder.ratio.toFixed(3)}x (threshold: ${thresholds.minRepresentation}x)`);
    if (worstGap) console.log(`Worst absolute gap: ${worstGap.phoneme} at ${worstGap.absGapPct.toFixed(3)}% (threshold: ${thresholds.maxAbsoluteGapPct}%)`);

    expect(metrics.sharedPearsonR).toBeGreaterThanOrEqual(thresholds.minSharedPearsonR);
    expect(metrics.nonCmuMassPct).toBeLessThanOrEqual(thresholds.maxGeneratedOnlyMassPct);
    if (worstOver) expect(worstOver.ratio).toBeLessThanOrEqual(thresholds.maxOverRepresentation);
    if (worstUnder) expect(worstUnder.ratio).toBeGreaterThanOrEqual(thresholds.minRepresentation);
    if (worstGap) expect(worstGap.absGapPct).toBeLessThanOrEqual(thresholds.maxAbsoluteGapPct);
  }, 120_000);
});
