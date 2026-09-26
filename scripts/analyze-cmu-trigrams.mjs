#!/usr/bin/env node

/**
 * Canonical trigram analysis against CMU lexicon baseline.
 *
 * Defaults to 2,000,000 generated words:
 *   5 seeds × 400,000 words (lexicon mode, morphology off)
 *
 * Outputs:
 *   - memory/trigram-2m-analysis.json
 *   - memory/trigram-2m-analysis.md
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compareDistributions, pearson } from "../dist/core/distribution-quality.js";
import { SAMPLING_METHOD, parseSeeds, sampleWords, traceWitnesses, validateSampleCount } from "./lib/analyzer-sampling.mjs";

const DEFAULT_SEEDS = [42, 123, 456, 789, 1337];
const DEFAULT_COUNT_PER_SEED = 400_000;
const DEFAULT_MODE = "lexicon";
const DEFAULT_MORPHOLOGY = false;
const DEFAULT_MIN_OVERREP_BASELINE_FREQ = 0.001;
const DEFAULT_MIN_UNDERREP_BASELINE_FREQ = 0.0005;

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function loadCmuFrequencies() {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "data", "cmu", "cmu-lexicon-trigrams.json"), "utf8"));
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0);
  const freq = {};
  for (const [tri, count] of Object.entries(raw)) {
    freq[tri] = count / total;
  }
  return freq;
}

function isAlphaTrigram(s) {
  return /^[a-z]{3}$/.test(s);
}

function countSampleTrigrams({ seed, count, mode, morphology }) {
  const trigramCounts = {};
  const firstOccurrences = {};
  let totalTrigrams = 0;

  for (const draw of sampleWords({ seed, count, mode, morphology })) {
    const word = draw.word.written.clean.toLowerCase();
    for (let j = 0; j < word.length - 2; j++) {
      const tri = word.slice(j, j + 3);
      if (!isAlphaTrigram(tri)) continue;
      firstOccurrences[tri] ??= { seed, drawIndex: draw.drawIndex };
      trigramCounts[tri] = (trigramCounts[tri] || 0) + 1;
      totalTrigrams++;
    }
  }

  return { trigramCounts, totalTrigrams, firstOccurrences };
}

export function deriveMetrics({ trigramCounts, totalTrigrams, cmuFreq, minOverrepFreq, minUnderrepFreq }) {
  const generatedFreq = {};
  for (const [tri, count] of Object.entries(trigramCounts)) {
    generatedFreq[tri] = totalTrigrams ? count / totalTrigrams : 0;
  }

  const sharedKeys = Object.keys(generatedFreq).filter(k => cmuFreq[k] !== undefined);
  const px = sharedKeys.map(k => generatedFreq[k]);
  const py = sharedKeys.map(k => cmuFreq[k]);
  const r = pearson(px, py);

  const overRep = sharedKeys
    .filter(k => cmuFreq[k] > minOverrepFreq)
    .map(k => ({
      trigram: k,
      generatedFreq: generatedFreq[k],
      baselineFreq: cmuFreq[k],
      ratio: generatedFreq[k] / cmuFreq[k],
      gap: generatedFreq[k] - cmuFreq[k],
    }))
    .sort((a, b) => b.ratio - a.ratio);

  const underRep = Object.keys(cmuFreq)
    .filter(k => cmuFreq[k] > minUnderrepFreq)
    .map(k => {
      const gf = generatedFreq[k] || 0;
      return {
        trigram: k,
        generatedFreq: gf,
        baselineFreq: cmuFreq[k],
        ratio: gf / cmuFreq[k],
        gap: gf - cmuFreq[k],
      };
    })
    .sort((a, b) => a.ratio - b.ratio);

  const unionKeys = [...new Set([...Object.keys(generatedFreq), ...Object.keys(cmuFreq)])];
  const absGap = unionKeys
    .map(k => ({
      trigram: k,
      generatedFreq: generatedFreq[k] || 0,
      baselineFreq: cmuFreq[k] || 0,
      ratio: cmuFreq[k] ? (generatedFreq[k] || 0) / cmuFreq[k] : null,
      gap: (generatedFreq[k] || 0) - (cmuFreq[k] || 0),
      absGap: Math.abs((generatedFreq[k] || 0) - (cmuFreq[k] || 0)),
    }))
    .sort((a, b) => b.absGap - a.absGap);

  return {
    ...compareDistributions(trigramCounts, cmuFreq),
    sharedKeyCount: sharedKeys.length,
    pearsonR: r,
    topOverRepresented: overRep.slice(0, 25),
    topUnderRepresented: underRep.slice(0, 25),
    topAbsoluteGap: absGap.slice(0, 25),
  };
}

function formatPct(x) {
  return `${(x * 100).toFixed(4)}%`;
}

function formatRatio(x) {
  return x === null ? "no baseline" : `${x.toFixed(3)}x`;
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# Trigram Analysis — ${report.config.totalWords.toLocaleString()} words`);
  lines.push(``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(``);
  lines.push(`## Configuration`);
  lines.push(`- Seeds: ${report.config.seeds.join(", ")}`);
  lines.push(`- Sampling: ${report.config.sampling}`);
  lines.push(`- Words per seed: ${report.config.countPerSeed.toLocaleString()}`);
  lines.push(`- Total generated words: ${report.config.totalWords.toLocaleString()}`);
  lines.push(`- Mode: ${report.config.mode}`);
  lines.push(`- Morphology: ${String(report.config.morphology)}`);
  lines.push(`- Min over-rep CMU frequency: ${report.config.minOverrepBaselineFreq}`);
  lines.push(`- Min under-rep CMU frequency: ${report.config.minUnderrepBaselineFreq}`);
  lines.push(``);
  lines.push(`## Aggregate Metrics`);
  lines.push(`- Shared trigram keys: ${report.aggregate.sharedKeyCount}`);
  lines.push(`- Shared-key Pearson r (historical): ${report.aggregate.pearsonR.toFixed(4)}`);
  lines.push(`- Union-key Pearson r: ${report.aggregate.unionPearsonR.toFixed(4)}`);
  lines.push(`- Missing reference mass: ${report.aggregate.missingReferenceMassPct.toFixed(4)}%`);
  lines.push(`- Generated-only mass: ${report.aggregate.nonReferenceMassPct.toFixed(4)}%`);
  lines.push(`- Jensen–Shannon divergence (bits): ${report.aggregate.jensenShannonBits?.toFixed(6) ?? 'unavailable'}`);
  lines.push('Traced witnesses for present outlier categories are included in the JSON report.');
  lines.push(``);

  const sections = [
    ["Top Over-Represented Trigrams", report.aggregate.topOverRepresented],
    ["Top Under-Represented Trigrams", report.aggregate.topUnderRepresented],
    ["Top Absolute-Gap Trigrams", report.aggregate.topAbsoluteGap],
  ];

  for (const [title, rows] of sections) {
    lines.push(`## ${title}`);
    lines.push(`| Trigram | Generated | CMU | Ratio | Gap |`);
    lines.push(`|---|---:|---:|---:|---:|`);
    for (const row of rows.slice(0, 15)) {
      lines.push(
        `| ${row.trigram} | ${formatPct(row.generatedFreq)} | ${formatPct(row.baselineFreq)} | ${formatRatio(row.ratio)} | ${formatPct(row.gap)} |`
      );
    }
    lines.push(``);
  }

  lines.push(`## Per-Seed Worsts`);
  lines.push(`| Seed | Over-Rep | Ratio | Under-Rep | Ratio |`);
  lines.push(`|---:|---|---:|---|---:|`);
  for (const seedEntry of report.bySeed) {
    const over = seedEntry.metrics.topOverRepresented[0] ?? { trigram: "n/a", ratio: null };
    const under = seedEntry.metrics.topUnderRepresented[0] ?? { trigram: "n/a", ratio: null };
    lines.push(
      `| ${seedEntry.seed} | ${over.trigram} | ${formatRatio(over.ratio)} | ${under.trigram} | ${formatRatio(under.ratio)} |`
    );
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const seeds = parseSeeds(getArg("seeds", DEFAULT_SEEDS.join(",")));
  const countPerSeed = Number(getArg("count-per-seed", String(DEFAULT_COUNT_PER_SEED)));
  const mode = getArg("mode", DEFAULT_MODE);
  const morphology = getArg("morphology", String(DEFAULT_MORPHOLOGY)) === "true";
  const minOverrepBaselineFreq = Number(getArg("min-overrep-freq", String(DEFAULT_MIN_OVERREP_BASELINE_FREQ)));
  const minUnderrepBaselineFreq = Number(getArg("min-underrep-freq", String(DEFAULT_MIN_UNDERREP_BASELINE_FREQ)));
  const reportBasename = getArg("output", "trigram-2m-analysis");

  if (seeds.length === 0) {
    throw new Error("At least one seed is required.");
  }
  validateSampleCount(countPerSeed);

  const cmuFreq = loadCmuFrequencies();

  const bySeed = [];
  const aggregateCounts = {};
  const firstOccurrences = {};
  let aggregateTotal = 0;

  for (const seed of seeds) {
    console.log(`Analyzing seed ${seed} (${countPerSeed.toLocaleString()} words)...`);
    const sample = countSampleTrigrams({ seed, count: countPerSeed, mode, morphology });
    for (const [tri, count] of Object.entries(sample.trigramCounts)) {
      aggregateCounts[tri] = (aggregateCounts[tri] || 0) + count;
    }
    aggregateTotal += sample.totalTrigrams;
    for (const [trigram, location] of Object.entries(sample.firstOccurrences)) firstOccurrences[trigram] ??= location;

    const metrics = deriveMetrics({
      trigramCounts: sample.trigramCounts,
      totalTrigrams: sample.totalTrigrams,
      cmuFreq,
      minOverrepFreq: minOverrepBaselineFreq,
      minUnderrepFreq: minUnderrepBaselineFreq,
    });

    bySeed.push({
      seed,
      wordCount: countPerSeed,
      trigramTotal: sample.totalTrigrams,
      metrics,
    });
  }

  const aggregate = deriveMetrics({
    trigramCounts: aggregateCounts,
    totalTrigrams: aggregateTotal,
    cmuFreq,
    minOverrepFreq: minOverrepBaselineFreq,
    minUnderrepFreq: minUnderrepBaselineFreq,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      sampling: SAMPLING_METHOD,
      seeds,
      countPerSeed,
      totalWords: countPerSeed * seeds.length,
      mode,
      morphology,
      minOverrepBaselineFreq,
      minUnderrepBaselineFreq,
      outputBasename: reportBasename,
    },
    aggregate,
    bySeed,
    traceWitnesses: traceWitnesses(Object.fromEntries(
      [...aggregate.topOverRepresented, ...aggregate.topUnderRepresented, ...aggregate.topAbsoluteGap]
        .map(row => [row.trigram, firstOccurrences[row.trigram]])
    ), { mode, morphology }),
    artifacts: {
      storage: "memory",
      json: `memory/${reportBasename}.json`,
      markdown: `memory/${reportBasename}.md`,
    },
  };

  const outputDir = join(process.cwd(), "memory");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, `${reportBasename}.json`);
  const mdPath = join(outputDir, `${reportBasename}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, toMarkdown(report));

  console.log(`Saved JSON report: ${jsonPath}`);
  console.log(`Saved Markdown report: ${mdPath}`);
  console.log(`Aggregate Pearson r: ${aggregate.pearsonR.toFixed(4)}`);
  if (aggregate.topOverRepresented[0]) console.log(`Worst over-represented: ${aggregate.topOverRepresented[0].trigram} (${formatRatio(aggregate.topOverRepresented[0].ratio)})`);
  if (aggregate.topUnderRepresented[0]) console.log(`Worst under-represented: ${aggregate.topUnderRepresented[0].trigram} (${formatRatio(aggregate.topUnderRepresented[0].ratio)})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
