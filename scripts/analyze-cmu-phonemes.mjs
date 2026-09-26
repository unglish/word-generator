#!/usr/bin/env node

/**
 * Canonical phoneme analysis against CMU lexicon baseline.
 *
 * Defaults to 2,000,000 generated words:
 *   5 seeds × 400,000 words (lexicon mode, morphology off)
 *
 * Outputs:
 *   - memory/phoneme-2m-analysis.json
 *   - memory/phoneme-2m-analysis.md
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { computePhonemeQualityMetrics } from '../dist/core/phoneme-quality.js';
import { normalizeGeneratedPhoneme } from '../dist/core/phoneme-normalization.js';
import { SAMPLING_METHOD, parseSeeds, sampleWords, traceWitnesses, validateSampleCount } from './lib/analyzer-sampling.mjs';
import {
  loadPhonemeNormalization,
  toPercentMap,
  sortByValueDesc,
} from './lib/phoneme-normalization.mjs';

const DEFAULT_SEEDS = [42, 123, 456, 789, 1337];
const DEFAULT_COUNT_PER_SEED = 400_000;
const DEFAULT_MODE = 'lexicon';
const DEFAULT_MORPHOLOGY = false;
const DEFAULT_MIN_COMMON_BASELINE_PCT = 0.5;
const DEFAULT_OUTPUT = 'phoneme-2m-analysis';

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function loadCmuPhonemeCounts() {
  return JSON.parse(readFileSync(join(process.cwd(), 'data', 'cmu', 'cmu-lexicon-phonemes.json'), 'utf8'));
}

function countSamplePhonemes({ seed, count, mode, morphology }) {
  const phonemeCounts = {};
  const normalizationLosses = {};
  const firstOccurrences = {};
  let totalPhonemes = 0;

  for (const { word, drawIndex } of sampleWords({ seed, count, mode, morphology })) {
    for (const syllable of word.syllables) {
      for (const p of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
        const normalized = normalizeGeneratedPhoneme(p.sound, loadPhonemeNormalization());
        if (!normalized) {
          normalizationLosses[p.sound] = (normalizationLosses[p.sound] || 0) + 1;
          continue;
        }
        firstOccurrences[normalized] ??= { seed, drawIndex };
        phonemeCounts[normalized] = (phonemeCounts[normalized] || 0) + 1;
        totalPhonemes++;
      }
    }
  }

  return { phonemeCounts, totalPhonemes, normalizationLosses, firstOccurrences };
}

export function deriveMetrics({ phonemeCounts, cmuFreqPct, minCommonBaselinePct }) {
  const generatedFreqPct = toPercentMap(phonemeCounts);
  const generatedKeys = new Set(Object.keys(generatedFreqPct).filter(key => generatedFreqPct[key] > 0));
  const cmuKeys = new Set(Object.keys(cmuFreqPct).filter(key => cmuFreqPct[key] > 0));
  const sharedKeys = [...generatedKeys].filter(k => cmuKeys.has(k));
  const generatedOnlyKeys = [...generatedKeys].filter(k => !cmuKeys.has(k));
  const cmuOnlyKeys = [...cmuKeys].filter(k => !generatedKeys.has(k));
  const metrics = computePhonemeQualityMetrics(phonemeCounts, cmuFreqPct, minCommonBaselinePct);
  return {
    ...metrics,
    buckets: {
      shared: sortByValueDesc(Object.fromEntries(sharedKeys.map(k => [k, generatedFreqPct[k]]))),
      generatedOnly: sortByValueDesc(Object.fromEntries(generatedOnlyKeys.map(k => [k, generatedFreqPct[k]]))),
      cmuOnly: sortByValueDesc(Object.fromEntries(cmuOnlyKeys.map(k => [k, cmuFreqPct[k]]))),
    },
    topOverRepresented: metrics.topOverRepresented.slice(0, 25),
    topUnderRepresented: metrics.topUnderRepresented.slice(0, 25),
    topAbsoluteGap: metrics.topAbsoluteGap.slice(0, 25),
  };
}

function formatPct(x) {
  return `${x.toFixed(4)}%`;
}

function formatRatio(x) {
  return `${x.toFixed(3)}x`;
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# Phoneme Analysis — ${report.config.totalWords.toLocaleString()} words`);
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Configuration');
  lines.push(`- Seeds: ${report.config.seeds.join(', ')}`);
  lines.push(`- Sampling: ${report.config.sampling}`);
  lines.push(`- Words per seed: ${report.config.countPerSeed.toLocaleString()}`);
  lines.push(`- Total generated words: ${report.config.totalWords.toLocaleString()}`);
  lines.push(`- Mode: ${report.config.mode}`);
  lines.push(`- Morphology: ${String(report.config.morphology)}`);
  lines.push(`- Min common baseline %: ${report.config.minCommonBaselinePct}`);
  lines.push(`- Generated-only escalation threshold %: ${report.config.generatedOnlyEscalationThresholdPct}`);
  lines.push('');
  lines.push('## Aggregate Metrics');
  lines.push(`- Shared phoneme keys: ${report.aggregate.sharedKeyCount}`);
  lines.push(`- Generated-only keys: ${report.aggregate.generatedOnlyKeyCount}`);
  lines.push(`- CMU-only keys: ${report.aggregate.cmuOnlyKeyCount}`);
  lines.push(`- Shared-key Pearson r: ${report.aggregate.sharedPearsonR.toFixed(4)}`);
  lines.push(`- Non-CMU generated mass: ${report.aggregate.nonCmuMassPct.toFixed(4)}%`);
  lines.push(`- Coverage-adjusted r: ${report.aggregate.coverageAdjustedR.toFixed(4)}`);
  lines.push(`- Union-key Pearson r: ${report.aggregate.unionPearsonR.toFixed(4)}`);
  lines.push(`- Missing reference mass: ${report.aggregate.missingReferenceMassPct.toFixed(4)}%`);
  lines.push(`- Jensen–Shannon divergence (bits): ${report.aggregate.jensenShannonBits?.toFixed(6) ?? 'unavailable'}`);
  lines.push(`- Phonemes rejected by normalization: ${Object.values(report.normalizationLosses).reduce((a, b) => a + b, 0)}`);
  lines.push('Shared-key and coverage-adjusted correlations are retained for historical comparison; neither measures missing reference mass.');
  lines.push('Traced witnesses for present outlier categories are included in the JSON report.');
  lines.push('');

  lines.push('## Generated-Only Phonemes');
  lines.push('| Phoneme | Generated % |');
  lines.push('|---|---:|');
  for (const row of report.aggregate.generatedOnlyPhonemes.slice(0, 20)) {
    lines.push(`| ${row.phoneme} | ${formatPct(row.generatedPct)} |`);
  }
  if (report.aggregate.generatedOnlyPhonemes.length === 0) lines.push('| (none) | 0.0000% |');
  lines.push('');

  const sections = [
    ['Top Over-Represented Phonemes', report.aggregate.topOverRepresented],
    ['Top Under-Represented Phonemes', report.aggregate.topUnderRepresented],
    ['Top Absolute-Gap Phonemes', report.aggregate.topAbsoluteGap],
  ];

  for (const [title, rows] of sections) {
    lines.push(`## ${title}`);
    lines.push('| Phoneme | Generated | CMU | Ratio | Gap |');
    lines.push('|---|---:|---:|---:|---:|');
    for (const row of rows.slice(0, 15)) {
      lines.push(`| ${row.phoneme} | ${formatPct(row.generatedPct)} | ${formatPct(row.baselinePct)} | ${formatRatio(row.ratio)} | ${formatPct(row.gapPct)} |`);
    }
    lines.push('');
  }

  lines.push('## Per-Seed Worsts');
  lines.push('| Seed | Over-Rep | Ratio | Under-Rep | Ratio | Non-CMU Mass |');
  lines.push('|---:|---|---:|---|---:|---:|');
  for (const seedEntry of report.bySeed) {
    const over = seedEntry.metrics.topOverRepresented[0] || { phoneme: 'n/a', ratio: 0 };
    const under = seedEntry.metrics.topUnderRepresented[0] || { phoneme: 'n/a', ratio: 0 };
    lines.push(`| ${seedEntry.seed} | ${over.phoneme} | ${formatRatio(over.ratio)} | ${under.phoneme} | ${formatRatio(under.ratio)} | ${seedEntry.metrics.nonCmuMassPct.toFixed(4)}% |`);
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const normalization = loadPhonemeNormalization();

  const seeds = parseSeeds(getArg('seeds', DEFAULT_SEEDS.join(',')));
  const countPerSeed = Number(getArg('count-per-seed', String(DEFAULT_COUNT_PER_SEED)));
  const mode = getArg('mode', DEFAULT_MODE);
  const morphology = getArg('morphology', String(DEFAULT_MORPHOLOGY)) === 'true';
  const minCommonBaselinePct = Number(getArg('min-common-baseline-pct', String(DEFAULT_MIN_COMMON_BASELINE_PCT)));
  const reportBasename = getArg('output', DEFAULT_OUTPUT);

  if (seeds.length === 0) throw new Error('At least one seed is required.');
  validateSampleCount(countPerSeed);

  const cmuCounts = loadCmuPhonemeCounts();
  const cmuFreqPct = toPercentMap(cmuCounts);

  const bySeed = [];
  const aggregateCounts = {};
  const normalizationLosses = {};
  const firstOccurrences = {};
  let aggregateTotal = 0;

  for (const seed of seeds) {
    console.log(`Analyzing seed ${seed} (${countPerSeed.toLocaleString()} words)...`);
    const sample = countSamplePhonemes({ seed, count: countPerSeed, mode, morphology });
    for (const [phoneme, count] of Object.entries(sample.phonemeCounts)) {
      aggregateCounts[phoneme] = (aggregateCounts[phoneme] || 0) + count;
    }
    aggregateTotal += sample.totalPhonemes;
    for (const [sound, count] of Object.entries(sample.normalizationLosses)) normalizationLosses[sound] = (normalizationLosses[sound] || 0) + count;
    for (const [sound, location] of Object.entries(sample.firstOccurrences)) firstOccurrences[sound] ??= location;

    const metrics = deriveMetrics({
      phonemeCounts: sample.phonemeCounts,
      totalPhonemes: sample.totalPhonemes,
      cmuFreqPct,
      minCommonBaselinePct,
    });

    bySeed.push({
      seed,
      phonemeTotal: sample.totalPhonemes,
      normalizationLosses: sample.normalizationLosses,
      metrics,
    });
  }

  const aggregate = deriveMetrics({
    phonemeCounts: aggregateCounts,
    totalPhonemes: aggregateTotal,
    cmuFreqPct,
    minCommonBaselinePct,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      sampling: SAMPLING_METHOD,
      seeds,
      countPerSeed,
      totalWords: seeds.length * countPerSeed,
      mode,
      morphology,
      minCommonBaselinePct,
      generatedOnlyEscalationThresholdPct: normalization.generatedOnlyEscalationThresholdPct,
    },
    aggregate,
    bySeed,
    normalizationLosses,
    traceWitnesses: traceWitnesses(Object.fromEntries(
      [...aggregate.topOverRepresented, ...aggregate.topUnderRepresented, ...aggregate.topAbsoluteGap, ...aggregate.generatedOnlyPhonemes]
        .map(row => [row.phoneme, firstOccurrences[row.phoneme]])
    ), { mode, morphology }),
    artifacts: {
      cmuBaseline: 'data/cmu/cmu-lexicon-phonemes.json',
      normalization: 'data/cmu/phoneme-normalization.json',
    },
  };

  const outputDir = join(process.cwd(), 'memory');
  mkdirSync(outputDir, { recursive: true });
  const outJson = join(outputDir, `${reportBasename}.json`);
  const outMd = join(outputDir, `${reportBasename}.md`);

  writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(outMd, toMarkdown(report));

  console.log(`Saved JSON report: ${outJson}`);
  console.log(`Saved Markdown report: ${outMd}`);
  console.log(`Aggregate shared Pearson r: ${aggregate.sharedPearsonR.toFixed(4)}`);
  console.log(`Non-CMU generated mass: ${aggregate.nonCmuMassPct.toFixed(4)}%`);
  console.log(`Coverage-adjusted r: ${aggregate.coverageAdjustedR.toFixed(4)}`);
  if (aggregate.topOverRepresented[0]) {
    console.log(`Worst over-represented: ${aggregate.topOverRepresented[0].phoneme} (${formatRatio(aggregate.topOverRepresented[0].ratio)})`);
  }
  if (aggregate.topUnderRepresented[0]) {
    console.log(`Worst under-represented: ${aggregate.topUnderRepresented[0].phoneme} (${formatRatio(aggregate.topUnderRepresented[0].ratio)})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
