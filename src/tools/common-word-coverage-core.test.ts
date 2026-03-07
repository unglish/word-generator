import { describe, expect, it } from "vitest";
import { generateWord } from "../core/generate.js";
import { createSeededRng } from "../utils/random.js";
import {
  buildCoverageReport,
  createCoverageTracker,
  parseCommonWordCoverageArgs,
  runCoverage,
  summarizeNearMissBuckets,
  traceMissingWords,
} from "../../scripts/lib/common-word-coverage-core.mjs";

describe("common-word-coverage-core", () => {
  it("parses deterministic coverage defaults and trace-miss flags", () => {
    expect(parseCommonWordCoverageArgs([])).toEqual({
      seed: 85,
      minCount: 2_000_000,
      maxCount: 10_000_000,
      mode: "lexicon",
      morphology: true,
      traceMisses: 0,
    });

    expect(parseCommonWordCoverageArgs([
      "--seed", "42",
      "--min-count", "10",
      "--max-count", "25",
      "--mode", "text",
      "--morphology", "false",
      "--trace-misses",
    ])).toEqual({
      seed: 42,
      minCount: 10,
      maxCount: 25,
      mode: "text",
      morphology: false,
      traceMisses: 2,
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
      uniqueGeneratedCount: 6,
      stopReason: "max-count-reached",
      config: {
        seed: 1,
        minCount: 10,
        maxCount: 12,
        mode: "lexicon",
        morphology: true,
      },
      targetSource: "demo/commonWordsWorker.js",
    });

    expect(report.words).toEqual([
      { word: "be", hits: 2, firstSeenGeneration: 4, found: true },
      { word: "to", hits: 1, firstSeenGeneration: 2, found: true },
    ]);
  });

  it("is deterministic with a shared seeded RNG and preserves first-hit generations", () => {
    const makeReport = () => {
      const rand = createSeededRng(85);
      const run = runCoverage({
        targetWords: ["the", "and", "all", "from"],
        minCount: 200,
        maxCount: 500,
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
        uniqueGeneratedCount: run.uniqueGeneratedCount,
        stopReason: run.stopReason,
        config: {
          seed: 85,
          minCount: 200,
          maxCount: 500,
          mode: "lexicon",
          morphology: true,
        },
        targetSource: "demo/commonWordsWorker.js",
      });
    };

    const first = makeReport();
    const second = makeReport();
    expect(first.words).toEqual(second.words);
    expect(first.summary).toEqual(second.summary);
    expect(first.config).toEqual(second.config);
  });

  it("classifies wh near misses as grapheme competition", () => {
    const traceRun = traceMissingWords({
      missingWords: ["which"],
      maxIterations: 1,
      maxCandidatesPerWord: 1,
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
    expect(summarizeNearMissBuckets(traceRun.analyses)).toEqual([
      {
        bucket: "grapheme competition / orthography-selection miss",
        note: "Best traced competitors suggest the word shape exists but loses to a competing spelling.",
        words: ["which"],
      },
    ]);
  });
});
