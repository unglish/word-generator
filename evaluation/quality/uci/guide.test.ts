import { describe, expect, it } from "vitest";
import { STAGE_STREAM_SCHEME } from "../../../src/core/stage-streams.js";
import { duplicateRate, fitMembership, fitPhoneTrigram, RARE_PAIR_MAX_ROWS, TRIGRAM_SMOOTHING } from "./guide.js";
import { summarizeGuide } from "./guide-summary.js";
import type { DrawEvidence } from "./packet.js";
import { foldFor, type ReferenceDescriptor } from "./scorer.js";

const descriptor: ReferenceDescriptor = {
  schemaVersion: 1, id: "fixture", sampling: "one vote per spelling", projection: "opaque tokens",
  fold: { count: 2, algorithm: "sha256-first-u64be-mod", encoding: "json-string-array-v1" },
  provenance: { source: "unit-test" },
};

describe("phone trigram scorer", () => {
  it("holds out the scored word's fold, keeps homophones together and ranks against same-fold peers", () => {
    const homophone = ["a b", "c"];
    const rows = [homophone, homophone, ["a", "b c"], ["a b", "c", "g"], ["x"]];
    const fold = foldFor(homophone, descriptor.fold);
    const scorer = fitPhoneTrigram(descriptor, rows);
    // Symbols are opaque: "a b" and "a", "b c" are four different outcomes, plus the word end.
    expect(scorer.vocabulary).toBe(7);
    const training = rows.filter(row => foldFor(row, descriptor.fold) !== fold);
    const log = (count: number, context: number) => Math.log((count + TRIGRAM_SMOOTHING) / (context + TRIGRAM_SMOOTHING * 7));
    const starts = training.length;
    const after = (symbol: string) => training.filter(row => row[0] === symbol).length;
    const expected = (log(after("a b"), starts) + log(training.filter(row => row[0] === "a b" && row[1] === "c").length, after("a b")) +
      log(training.filter(row => row.length === 2 && row[0] === "a b" && row[1] === "c").length,
        training.filter(row => row[0] === "a b" && row[1] === "c").length)) / 3;
    const score = scorer.score(homophone);
    expect(score.fold).toBe(fold);
    expect(score.raw).toBeCloseTo(expected, 12);
    const peers = rows.filter(row => row.length === 2 && foldFor(row, descriptor.fold) === fold);
    expect(score.peers).toBe(peers.length);
  });

  it("scores a context independently of where it occurs, unlike the positional UCI model", () => {
    const rows = [["p", "a", "t"], ["s", "p", "a", "t"], ["s", "p", "a", "t"], ["t", "a", "p"]];
    const scorer = fitPhoneTrigram({ ...descriptor, fold: { ...descriptor.fold, count: 1009 } }, rows);
    const unseen = scorer.score(["z", "z", "z"]);
    expect(unseen.peers).toBe(0);
    expect(unseen.percentile).toBeNull();
    expect(Number.isFinite(unseen.raw)).toBe(true);
    expect(() => fitPhoneTrigram(descriptor, [])).toThrow("nonempty");
  });
});

describe("reference membership", () => {
  it("counts each reference row once per pair and treats the threshold as inclusive", () => {
    const rare = Array.from({ length: RARE_PAIR_MAX_ROWS }, () => ["q", "q", "q", "u"]);
    // Removing its own vote leaves a common row with five others, above the threshold.
    const common = Array.from({ length: RARE_PAIR_MAX_ROWS + 2 }, () => ["k", "u"]);
    const rows = [...rare, ...common];
    const membership = fitMembership(rows, rows.map((_, i) => `w${i}`));
    expect(membership.rarePairs(["q", "q", "k", "u", "z", "z"])).toEqual([
      { symbols: ["q", "q"], referenceRows: 4 },
      { symbols: ["q", "k"], referenceRows: 0 },
      { symbols: ["u", "z"], referenceRows: 0 },
      { symbols: ["z", "z"], referenceRows: 0 },
    ]);
    expect(membership.rarePairs(["k", "u"])).toEqual([]);
    // With its own vote removed, a reference word with q-q sees three other rows.
    expect(membership.referenceRarePairRate).toEqual({ numerator: 4, denominator: 10, rate: 0.4 });
    expect(membership.isReferencePronunciation(["k", "u"])).toBe(true);
    expect(membership.isReferencePronunciation(["k u"])).toBe(false);
    expect(membership.isReferenceSpelling("W3")).toBe(true);
    expect(() => fitMembership(rows, [])).toThrow("spelling");
  });

  it("counts repeats of an earlier form in one batch", () => {
    expect(duplicateRate(["a", "b", "a", "a"])).toEqual({ draws: 4, distinct: 2, rate: 0.5 });
    expect(duplicateRate([])).toEqual({ draws: 0, distinct: 0, rate: null });
  });
});

function arm(spelling: string, percentile: number | null, rare: boolean, real: boolean): DrawEvidence["before"] {
  const metric = { raw: 1, percentile: null };
  return {
    spelling, ipa: spelling, rootSyllables: 1, selectedAttempt: 0, realSpelling: real,
    surface: { kind: "scored", phones: [spelling], score: { length: 1, fold: 0, peers: 0, unigram: metric, bigram: metric }, guide: {
      trigram: { raw: -1, percentile, fold: 0, peers: 1 },
      rarePairs: rare ? [{ symbols: ["Q", "Q"], referenceRows: 0 }] : [], realPronunciation: real,
    } },
  };
}

function draw(seed: number, drawIndex: number, before: DrawEvidence["before"], after: DrawEvidence["after"]): DrawEvidence {
  return { profile: "lexicon-default", seed, drawIndex, random: { scheme: STAGE_STREAM_SCHEME, key: "0000000000000000" }, before, after };
}

describe("guide summary", () => {
  it("counts duplicates only within one seed's batch and reports seed spread", () => {
    const rows = [
      draw(1, 0, arm("ba", 5, true, false), arm("ba", 40, false, true)),
      draw(1, 1, arm("ba", 30, false, false), arm("do", 60, false, false)),
      draw(2, 0, arm("ba", 70, false, true), arm("ba", 20, true, false)),
    ];
    const guide = summarizeGuide(rows, [1, 2]);
    expect(guide.bySeed[0].before.duplicates.spelling).toEqual({ draws: 2, distinct: 1, rate: 0.5 });
    expect(guide.bySeed[1].before.duplicates.spelling).toEqual({ draws: 1, distinct: 1, rate: 0 });
    expect(guide.seedRanges.before.duplicateSpellingRate).toEqual({ min: 0, max: 0.5, mean: 0.25, seeds: 2 });
    expect(guide.pooled.before).toMatchObject({
      projected: 3, trigram: { median: 30, below10: { numerator: 1, denominator: 3 } },
      rarePair: { numerator: 1, denominator: 3 }, realPronunciation: { numerator: 1, denominator: 3 },
    });
    expect(guide.pooled.delta.rarePairRate).toBe(0);
    expect(guide.bySeed[0].delta.trigramMedian).toBe(32.5);
    expect(guide.rarePairs.top).toEqual({
      before: [{ symbols: ["Q", "Q"], referenceRows: 0, before: 1, after: 1 }],
      after: [{ symbols: ["Q", "Q"], referenceRows: 0, before: 1, after: 1 }],
    });
  });
});
