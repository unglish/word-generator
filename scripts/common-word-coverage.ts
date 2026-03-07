#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { generateWord } from "../src/core/generate.js";
import { createSeededRng } from "../src/utils/random.js";
import {
  buildCoverageReport,
  loadCommonWordsFromDemoWorker,
  parseCommonWordCoverageArgs,
  renderCoverageCsv,
  renderCoverageMarkdown,
  runCoverage,
  summarizeNearMissBuckets,
  traceMissingWords,
} from "./lib/common-word-coverage-core.mjs";

const TRACE_SAMPLE_LIMIT = 250_000;

function main() {
  const options = parseCommonWordCoverageArgs(process.argv.slice(2));
  const workerPath = path.join(process.cwd(), "demo", "commonWordsWorker.js");
  const workerSource = fs.readFileSync(workerPath, "utf8");
  const targetWords = loadCommonWordsFromDemoWorker(workerSource);

  const coverageRand = createSeededRng(options.seed);
  const coverageRun = runCoverage({
    targetWords,
    minCount: options.minCount,
    maxCount: options.maxCount,
    nextWord: () =>
      generateWord({
        rand: coverageRand,
        mode: options.mode,
        morphology: options.morphology,
      }),
  });

  let nearMisses = [];
  let nearMissBuckets = [];
  let traceMissDiagnostics;
  if (options.traceMisses > 0 && coverageRun.tracker.foundCount < targetWords.length) {
    const traceRand = createSeededRng(options.seed);
    const traceRun = traceMissingWords({
      missingWords: coverageRun.tracker.rows.filter((row) => row.firstSeenGeneration === null).map((row) => row.word),
      maxIterations: Math.min(options.maxCount, TRACE_SAMPLE_LIMIT),
      maxCandidatesPerWord: options.traceMisses,
      nextWord: () =>
        generateWord({
          rand: traceRand,
          mode: options.mode,
          morphology: options.morphology,
          trace: true,
        }),
    });
    nearMisses = traceRun.analyses;
    nearMissBuckets = summarizeNearMissBuckets(traceRun.analyses);
    traceMissDiagnostics = {
      sampledIterations: traceRun.sampledIterations,
      maxCandidatesPerWord: options.traceMisses,
      seed: options.seed,
    };
  }

  const report = buildCoverageReport({
    tracker: coverageRun.tracker,
    totalIterations: coverageRun.totalIterations,
    uniqueGeneratedCount: coverageRun.uniqueGeneratedCount,
    stopReason: coverageRun.stopReason,
    config: {
      seed: options.seed,
      minCount: options.minCount,
      maxCount: options.maxCount,
      mode: options.mode,
      morphology: options.morphology,
    },
    targetSource: "demo/commonWordsWorker.js",
    nearMisses,
    nearMissBuckets,
    traceMissDiagnostics,
  });

  const outputDir = path.join(process.cwd(), "memory");
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "common-word-coverage.json");
  const csvPath = path.join(outputDir, "common-word-coverage.csv");
  const markdownPath = path.join(outputDir, "common-word-coverage.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(csvPath, renderCoverageCsv(report));
  fs.writeFileSync(markdownPath, renderCoverageMarkdown(report));

  console.log("common-word-coverage");
  console.log(`- Target source: demo/commonWordsWorker.js (${targetWords.length} words)`);
  console.log(`- Stop reason: ${report.summary.stopReason}`);
  console.log(`- Total iterations: ${report.summary.totalIterations.toLocaleString()}`);
  console.log(`- Found: ${report.summary.foundCount}/${report.summary.targetCount}`);
  console.log(`- Missing: ${report.summary.missingCount}`);
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- CSV: ${csvPath}`);
  console.log(`- Markdown: ${markdownPath}`);
}

main();
