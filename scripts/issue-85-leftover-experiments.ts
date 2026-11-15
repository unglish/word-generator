#!/usr/bin/env tsx
/**
 * Parallel leftover-28 experiments for #85 / closed-class follow-ups.
 *
 * Usage:
 *   npx tsx scripts/issue-85-leftover-experiments.ts <experiment-id> [--count N]
 *
 * Experiments write JSON under memory/issue-85-experiments/<id>.json
 */
import fs from "fs";
import path from "path";
import { englishConfig } from "../src/config/english.js";
import type { ClosedClassEntry, LanguageConfig } from "../src/config/language.js";
import { createGenerator } from "../src/core/generate.js";
import { buildGraphemeMaps } from "../src/elements/graphemes/index.js";
import { createSeededRng } from "../src/utils/random.js";
import {
  buildClosedClassCatalog,
  buildCoverageReport,
  buildGapSpellingCatalog,
  loadCommonWordsFromDemoWorker,
  runCoverage,
  summarizeNearMissBuckets,
  traceMissingWords,
} from "./lib/common-word-coverage-core.mjs";

const MISSING_28 = [
  "i", "as", "at", "but", "by", "or", "an", "their", "up", "if", "about", "go",
  "make", "like", "no", "take", "into", "your", "see", "look", "only", "also",
  "work", "first", "even", "because", "these", "us",
] as const;

/**
 * Extra shorts used by expand-* experiments when measuring a *larger* catalog
 * than englishConfig. After the catalog follow-up ships these in englishConfig,
 * expand-* still re-adds them only if missing (idempotent).
 */
const EXPANDED_SHORTS: ClosedClassEntry[] = [
  { name: "i", phonemes: ["aɪ"], spelling: "i" },
  { name: "as", phonemes: ["æ", "z"], spelling: "as" },
  { name: "at", phonemes: ["æ", "t"], spelling: "at" },
  { name: "but", phonemes: ["b", "ʌ", "t"], spelling: "but" },
  { name: "by", phonemes: ["b", "aɪ"], spelling: "by" },
  { name: "or", phonemes: ["ɔ", "r"], spelling: "or" },
  { name: "an", phonemes: ["æ", "n"], spelling: "an" },
  { name: "up", phonemes: ["ʌ", "p"], spelling: "up" },
  { name: "if", phonemes: ["ɪ", "f"], spelling: "if" },
  { name: "go", phonemes: ["g", "əʊ"], spelling: "go" },
  { name: "no", phonemes: ["n", "əʊ"], spelling: "no" },
  { name: "us", phonemes: ["ʌ", "s"], spelling: "us" },
  { name: "their", phonemes: ["ð", "ɚ"], spelling: "their" },
  { name: "your", phonemes: ["j", "ɔ", "r"], spelling: "your" },
];

const SEED = 85;
const DEFAULT_COUNT = 2_000_000;

function parseArgs(argv: string[]) {
  const id = argv[0];
  if (!id) {
    throw new Error(
      "Usage: issue-85-leftover-experiments.ts <id> [--count N]",
    );
  }
  let count = DEFAULT_COUNT;
  const countIdx = argv.indexOf("--count");
  if (countIdx !== -1) {
    count = Number.parseInt(argv[countIdx + 1] ?? "", 10);
    if (!Number.isFinite(count) || count < 1) {
      throw new Error(`Invalid --count: ${argv[countIdx + 1]}`);
    }
  }
  return { id, count };
}

function withExpandedClosedClass(
  probability = englishConfig.closedClass!.probability,
): LanguageConfig {
  const existing = englishConfig.closedClass?.entries ?? [];
  const existingNames = new Set(existing.map((entry) => entry.name));
  const extras = EXPANDED_SHORTS.filter((entry) => !existingNames.has(entry.name));
  return {
    ...englishConfig,
    closedClass: {
      probability,
      entries: [...existing, ...extras],
    },
  };
}

function withBareWeightBump(bareWeight: number): LanguageConfig {
  const morph = englishConfig.morphology!;
  const lexicon = { ...morph.templateWeights.lexicon };
  const others = lexicon.suffixed + lexicon.prefixed + lexicon.both;
  // Keep non-bare ratios; scale so bare gets bareWeight share of 100.
  const scale = (100 - bareWeight) / others;
  return {
    ...englishConfig,
    morphology: {
      ...morph,
      templateWeights: {
        ...morph.templateWeights,
        lexicon: {
          bare: bareWeight,
          suffixed: Math.round(lexicon.suffixed * scale),
          prefixed: Math.round(lexicon.prefixed * scale),
          both: Math.round(lexicon.both * scale),
        },
      },
    },
  };
}

function withEirBoost(factor: number): LanguageConfig {
  const graphemes = englishConfig.graphemes.map((g) => {
    if (g.phoneme === "ɚ" && g.form === "eir") {
      return {
        ...g,
        frequency: (g.frequency ?? 0) * factor,
        startWord: (g.startWord ?? 0) * factor,
        midWord: (g.midWord ?? 0) * factor,
        endWord: (g.endWord ?? 0) * factor,
      };
    }
    return g;
  });
  const { graphemeMaps } = buildGraphemeMaps(graphemes);
  return { ...englishConfig, graphemes, graphemeMaps };
}

function runCoverageExperiment(
  id: string,
  config: LanguageConfig,
  count: number,
  label: string,
) {
  const gen = createGenerator(config);
  const rand = createSeededRng(SEED);
  const workerSource = fs.readFileSync(
    path.join(process.cwd(), "demo", "commonWordsWorker.js"),
    "utf8",
  );
  const targetWords = loadCommonWordsFromDemoWorker(workerSource);
  const gapSpellingCatalog = buildGapSpellingCatalog(config.gapSpellings ?? []);
  const closedClassCatalog = buildClosedClassCatalog(
    config.closedClass?.entries ?? [],
  );

  const started = Date.now();
  const coverageRun = runCoverage({
    targetWords,
    minCount: count,
    maxCount: count,
    trackUnique: false,
    nextWord: () =>
      gen.generateWord({
        rand,
        mode: "lexicon",
        morphology: true,
      }),
  });

  const report = buildCoverageReport({
    tracker: coverageRun.tracker,
    totalIterations: coverageRun.totalIterations,
    trackedUniqueCount: false,
    uniqueGeneratedCount: null,
    stopReason: coverageRun.stopReason,
    gapSpellingCatalog,
    closedClassCatalog,
    config: {
      seed: SEED,
      minCount: count,
      maxCount: count,
      mode: "lexicon",
      morphology: true,
      trackUnique: false,
    },
    targetSource: "demo/commonWordsWorker.js",
  });

  const stillMissing = MISSING_28.filter((w) => report.missingWords.includes(w));
  const recovered = MISSING_28.filter((w) => !report.missingWords.includes(w));
  const recoveredDetail = recovered.map((word) => {
    const row = report.words.find((r) => r.word === word)!;
    return {
      word,
      firstSeenGeneration: row.firstSeenGeneration,
      firstSeenOrigin: row.firstSeenOrigin,
      hits: row.hits,
    };
  });

  return {
    id,
    label,
    elapsedMs: Date.now() - started,
    count,
    found: report.summary.foundCount,
    missing: report.summary.missingCount,
    missingWords: report.missingWords,
    stillMissingOf28: stillMissing,
    recoveredOf28: recovered,
    recoveredDetail,
    firstSeenOriginCounts: report.summary.firstSeenOriginCounts,
    closedClassEntryCount: config.closedClass?.entries.length ?? 0,
    closedClassProbability: config.closedClass?.probability ?? 0,
  };
}

function runTraceMissExperiment(id: string, iterations: number) {
  const gen = createGenerator(englishConfig);
  const rand = createSeededRng(SEED);
  const gapSpellingCatalog = buildGapSpellingCatalog(
    englishConfig.gapSpellings ?? [],
  );
  const closedClassCatalog = buildClosedClassCatalog(
    englishConfig.closedClass?.entries ?? [],
  );
  const started = Date.now();
  const traceRun = traceMissingWords({
    missingWords: [...MISSING_28],
    maxIterations: iterations,
    maxCandidatesPerWord: 3,
    gapSpellingCatalog,
    closedClassCatalog,
    nextWord: () =>
      gen.generateWord({
        rand,
        mode: "lexicon",
        morphology: true,
        trace: true,
      }),
  });
  return {
    id,
    label: `trace-miss remaining-28 (${iterations} iters, 3 candidates)`,
    elapsedMs: Date.now() - started,
    sampledIterations: traceRun.sampledIterations,
    buckets: summarizeNearMissBuckets(traceRun.analyses),
    analyses: traceRun.analyses.map((a) => ({
      target: a.target,
      bucket: a.bucket,
      note: a.note,
      spellingPath: a.spellingPath,
      bestNearMiss: a.candidates[0]
        ? {
          word: a.candidates[0].word,
          distance: a.candidates[0].distance,
          morphologyTemplate: a.candidates[0].traceSummary?.morphologyTemplate,
          repairs: a.candidates[0].traceSummary?.repairs?.slice(0, 5),
          graphemes: a.candidates[0].traceSummary?.graphemes?.slice(0, 6),
        }
        : null,
    })),
  };
}

function main() {
  const { id, count } = parseArgs(process.argv.slice(2));
  const outDir = path.join(process.cwd(), "memory", "issue-85-experiments");
  fs.mkdirSync(outDir, { recursive: true });

  let result: unknown;
  switch (id) {
    case "baseline-2m":
      result = runCoverageExperiment(
        id,
        englishConfig,
        count,
        "current closed-class (11 entries, p=0.0005)",
      );
      break;
    case "expand-catalog-2m":
      result = runCoverageExperiment(
        id,
        withExpandedClosedClass(0.0005),
        count,
        "expanded closed-class (+14 shorts, p=0.0005)",
      );
      break;
    case "expand-catalog-p001-2m":
      result = runCoverageExperiment(
        id,
        withExpandedClosedClass(0.001),
        count,
        "expanded closed-class (+14 shorts, p=0.001)",
      );
      break;
    case "bare-bump-2m":
      result = runCoverageExperiment(
        id,
        withBareWeightBump(50),
        count,
        "lexicon bare weight 30→50 (current closed-class)",
      );
      break;
    case "eir-boost-2m":
      result = runCoverageExperiment(
        id,
        withEirBoost(8),
        count,
        "ɚ→eir positional weights ×8 (current closed-class)",
      );
      break;
    case "trace-miss-250k":
      result = runTraceMissExperiment(id, Math.min(count, 250_000));
      break;
    default:
      throw new Error(`Unknown experiment id: ${id}`);
  }

  const outPath = path.join(outDir, `${id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: true, outPath, summary: summarize(result) }, null, 2));
}

function summarize(result: unknown) {
  const r = result as Record<string, unknown>;
  if (r.recoveredOf28) {
    return {
      found: r.found,
      recoveredOf28: r.recoveredOf28,
      stillMissingOf28: r.stillMissingOf28,
      elapsedMs: r.elapsedMs,
    };
  }
  return {
    buckets: (r.buckets as { bucket: string; words: string[] }[] | undefined)?.map(
      (b) => `${b.bucket}: ${b.words.length}`,
    ),
    elapsedMs: r.elapsedMs,
  };
}

main();
