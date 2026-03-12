import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { generateWord } from "../core/generate.js";
import { createSeededRng } from "../utils/random.js";
import {
  buildGapSpellingCatalog,
  buildCoverageReport,
  createCoverageTracker,
  parseCommonWordCoverageArgs,
  runCoverage,
  summarizeNearMissBuckets,
  traceMissingWords,
} from "../../scripts/lib/common-word-coverage-core.mjs";

const GAP_SPELLING_CATALOG = buildGapSpellingCatalog(englishConfig.gapSpellings ?? []);

describe("common-word-coverage-core", () => {
  it("parses deterministic coverage defaults and trace-miss flags", () => {
    expect(parseCommonWordCoverageArgs([])).toEqual({
      seed: 85,
      minCount: 2_000_000,
      maxCount: 10_000_000,
      mode: "lexicon",
      morphology: true,
      traceMisses: 0,
      trackUnique: false,
    });

    expect(parseCommonWordCoverageArgs([
      "--seed", "42",
      "--min-count", "10",
      "--max-count", "25",
      "--mode", "text",
      "--morphology", "false",
      "--trace-misses",
      "--track-unique",
    ])).toEqual({
      seed: 42,
      minCount: 10,
      maxCount: 25,
      mode: "text",
      morphology: false,
      traceMisses: 2,
      trackUnique: true,
    });
  });

  it("tracks hits and first-seen generations deterministically", () => {
    const tracker = createCoverageTracker(["be", "to", "be"]);
    tracker.consume("to", 2);
    tracker.consume("be", 4);
    tracker.consume("be", 9);

    const report = buildCoverageReport({
      tracker,
      totalIterations: 12,
      trackedUniqueCount: false,
      uniqueGeneratedCount: null,
      stopReason: "max-count-reached",
      gapSpellingCatalog: GAP_SPELLING_CATALOG,
      config: {
        seed: 1,
        minCount: 10,
        maxCount: 12,
        mode: "lexicon",
        morphology: true,
        trackUnique: false,
      },
      targetSource: "demo/commonWordsWorker.js",
    });

    expect(report.summary).toMatchObject({
      trackedUniqueCount: false,
      uniqueGeneratedCount: null,
      gapManagedTargetCount: 2,
      productiveTargetCount: 0,
    });
    expect(report.words).toEqual([
      {
        word: "be",
        hits: 2,
        firstSeenGeneration: 4,
        found: true,
        spellingPath: "gap-spelling",
        gapSpellingNames: ["be"],
        gapTargetLayers: ["grapheme"],
      },
      {
        word: "to",
        hits: 1,
        firstSeenGeneration: 2,
        found: true,
        spellingPath: "gap-spelling",
        gapSpellingNames: ["to"],
        gapTargetLayers: ["grapheme"],
      },
    ]);
  });

  it("is deterministic with a shared seeded RNG and preserves first-hit generations", () => {
    const makeReport = () => {
      const rand = createSeededRng(85);
      const run = runCoverage({
        targetWords: ["the", "and", "all", "from"],
        minCount: 200,
        maxCount: 500,
        trackUnique: true,
        nextWord: () =>
          generateWord({
            rand,
            mode: "lexicon",
            morphology: true,
          }),
      });

      return buildCoverageReport({
        tracker: run.tracker,
        totalIterations: run.totalIterations,
        trackedUniqueCount: run.trackedUniqueCount,
        uniqueGeneratedCount: run.uniqueGeneratedCount,
        stopReason: run.stopReason,
        gapSpellingCatalog: GAP_SPELLING_CATALOG,
        config: {
          seed: 85,
          minCount: 200,
          maxCount: 500,
          mode: "lexicon",
          morphology: true,
          trackUnique: true,
        },
        targetSource: "demo/commonWordsWorker.js",
      });
    };

    const first = makeReport();
    const second = makeReport();
    expect(first).toEqual(second);
  });

  it("classifies wh near misses as grapheme competition", () => {
    const traceRun = traceMissingWords({
      missingWords: ["which"],
      maxIterations: 1,
      maxCandidatesPerWord: 1,
      gapSpellingCatalog: GAP_SPELLING_CATALOG,
      nextWord: () => ({
        written: { clean: "wich" },
        pronunciation: "wItS",
        trace: {
          graphemeSelections: [
            { phoneme: "w", selected: "w" },
          ],
          repairs: [],
        },
      }),
    });

    expect(traceRun.analyses).toHaveLength(1);
    expect(traceRun.analyses[0].bucket).toBe("grapheme competition / orthography-selection miss");
    expect(traceRun.analyses[0]).toMatchObject({
      spellingPath: "gap-spelling",
      gapTargetLayers: ["grapheme"],
    });
    expect(summarizeNearMissBuckets(traceRun.analyses)).toEqual([
      {
        bucket: "grapheme competition / orthography-selection miss",
        note: "Best traced competitors suggest the word shape exists but loses to a competing spelling.",
        words: ["which"],
      },
    ]);
  });

  it("classifies gap-spelling-backed near misses with target-layer detail", () => {
    const traceRun = traceMissingWords({
      missingWords: ["to"],
      maxIterations: 1,
      maxCandidatesPerWord: 1,
      gapSpellingCatalog: GAP_SPELLING_CATALOG,
      nextWord: () => ({
        written: { clean: "toe" },
        pronunciation: "tu",
        trace: {
          graphemeSelections: [
            { phoneme: "t", selected: "t" },
          ],
          repairs: [
            { rule: "gapSpelling:to", before: "tu", after: "to", detail: "targetLayer:grapheme" },
          ],
        },
      }),
    });

    expect(traceRun.analyses[0]).toMatchObject({
      bucket: "structural blocker",
      spellingPath: "gap-spelling",
      gapTargetLayers: ["grapheme"],
    });
    expect(traceRun.analyses[0].note).toContain("gap-spelling path");
    expect(traceRun.analyses[0].note).toContain("grapheme");
  });

  it("treats weighted sibling gap spellings as competition instead of a blocker", () => {
    const traceRun = traceMissingWords({
      missingWords: ["two"],
      maxIterations: 1,
      maxCandidatesPerWord: 1,
      gapSpellingCatalog: GAP_SPELLING_CATALOG,
      nextWord: () => ({
        written: { clean: "to" },
        pronunciation: "tu",
        trace: {
          graphemeSelections: [
            { phoneme: "t", selected: "t" },
          ],
          repairs: [
            { rule: "gapSpelling:to", before: "tu", after: "to", detail: "targetLayer:grapheme" },
          ],
        },
      }),
    });

    expect(traceRun.analyses[0]).toMatchObject({
      bucket: "grapheme competition / orthography-selection miss",
      spellingPath: "gap-spelling",
      gapTargetLayers: ["grapheme"],
    });
    expect(traceRun.analyses[0].note).toContain("weighted gap-spelling competition");
    expect(summarizeNearMissBuckets(traceRun.analyses)).toEqual([
      {
        bucket: "grapheme competition / orthography-selection miss",
        note: "Best traced competitors suggest the word shape exists but loses to a competing spelling.",
        words: ["two"],
      },
    ]);
  });
});
