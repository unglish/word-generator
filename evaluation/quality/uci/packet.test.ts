import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateWord } from "../../../src/index.js";
import type { StageSnapshot } from "../../../src/core/trace.js";
import { STAGE_STREAM_SCHEME } from "../../../src/core/stage-streams.js";
import type { Draw, Manifest, Protocol } from "../model.js";
import { digest } from "../serialization.js";
import { insertMover, pairIdentity, summarizeDraws, validateCaptureSchedule, writePacket, type DrawEvidence } from "./packet.js";
import { changedFields, countOutputChanges, generatedPairCounts } from "./output-changes.js";
import { firstStageDifference, traceChanges } from "./trace-difference.js";
import { formatStageDifference } from "./report.js";

const protocol: Protocol = {
  schemaVersion: 1, id: "fixture", wordsPerReplicate: 4, reviewDrawsPerReplicate: 1,
  profiles: [{ id: "lexicon-default", options: { mode: "lexicon", morphology: true }, seeds: { development: [42, 43], validation: [44, 45] } }],
};

function manifest(protocol: Protocol): Manifest {
  return {
    schemaVersion: 1, id: "fixture", createdAt: "", cohort: "development", protocol, protocolDigest: digest(protocol),
    evaluatorDigest: "", referenceDigest: "",
    generator: { commit: "", dirty: false, sourceDigest: "", effectiveConfig: {}, patch: "" },
    environment: { node: "", platform: "", arch: "", packageLockDigest: "" },
    artifacts: protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => ({
      file: `words/${profile.id}-${seed}.jsonl.gz`, sha256: "", bytes: 0,
    }))),
  };
}

function scored(rootSyllables: number, value: number | null): DrawEvidence["before"] {
  const metric = { raw: 1, percentile: value };
  return {
    spelling: "a", ipa: "ə", rootSyllables, selectedAttempt: 0, surface: { kind: "scored", phones: ["AH"], score: {
      length: 1, fold: 0, peers: value === null ? 0 : 1, unigram: metric, bigram: metric,
    } },
  };
}

function row(seed: number, drawIndex: number, before: DrawEvidence["before"], after: DrawEvidence["after"]): DrawEvidence {
  return {
    profile: "lexicon-default", seed, drawIndex, random: { scheme: STAGE_STREAM_SCHEME, key: "0000000000000000" }, before, after,
  };
}

describe("UCI comparison packet", () => {
  it("releases a failed capture's output directory and preserves an existing packet", async () => {
    const parent = await mkdtemp(join(tmpdir(), "unglish-uci-output-"));
    const out = join(parent, "result");
    const absent = join(parent, "absent");
    try {
      await expect(writePacket({ before: absent, after: absent }, out)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(stat(out)).rejects.toMatchObject({ code: "ENOENT" });
      await mkdir(out);
      const path = join(out, "packet.md");
      await writeFile(path, "previous packet");
      await expect(writePacket({ before: absent, after: absent }, out)).rejects.toMatchObject({ code: "EEXIST" });
      expect(await readFile(path, "utf8")).toBe("previous packet");
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("requires the fixed profile sample and all scheduled shard pins", () => {
    const good = manifest(protocol);
    expect(validateCaptureSchedule(good, good, protocol)).toEqual({
      profile: "lexicon-default", cohort: "development", seeds: [42, 43], drawsPerSeed: 4,
    });
    const short = manifest({ ...protocol, wordsPerReplicate: 2 });
    expect(() => validateCaptureSchedule(short, short, protocol)).toThrow("schedule");
    expect(() => validateCaptureSchedule(good, { ...good, artifacts: [] }, protocol)).toThrow("missing");
    expect(() => validateCaptureSchedule(good, { ...good, cohort: "validation" }, protocol)).toThrow("development");
  });

  it("matches each trace stream key and refuses identity or key mismatches", () => {
    function generate(seed: number): Draw {
      return { profile: "lexicon-default", seed: 42, drawIndex: 0, word: generateWord({ trace: true, seed }) };
    }
    const before = generate(42);
    const after = generate(42);
    expect(pairIdentity(before, after)).toMatchObject({
      key: { profile: "lexicon-default", seed: 42, drawIndex: 0, random: { scheme: STAGE_STREAM_SCHEME } },
    });
    expect(() => pairIdentity(before, { ...after, drawIndex: 1 })).toThrow("identities disagree");
    expect(() => pairIdentity(before, generate(43))).toThrow("stream keys disagree");
    expect(() => pairIdentity(before, { ...after, word: { ...after.word, trace: undefined } })).toThrow("trace.random");
  });

  it("locates a substituted onset within the same selected stage and detects added stages", () => {
    const syllable = { onset: ["m"], nucleus: ["ʌ"], coda: ["d"] };
    const stage = (onset: string) => ({ name: "generateSyllables", before: [],
      after: [syllable, { onset: [onset], nucleus: ["ɪ"], coda: ["p"] }] });
    expect(firstStageDifference([stage("t")], [stage("p")])).toEqual({
      kind: "phone", stageIndex: 0, stage: "generateSyllables", snapshot: "after", syllableIndex: 1, slot: "onset", phoneIndex: 0,
      before: { sound: "t", aspirated: false, reduced: false }, after: { sound: "p", aspirated: false, reduced: false },
    });
    expect(firstStageDifference([], [stage("p")])).toEqual({ kind: "stage", stageIndex: 0, before: null, after: "generateSyllables" });
  });

  it("identifies the changed trace section when the syllable snapshots agree", () => {
    const trace = generateWord({ seed: 42, trace: true }).trace!;
    expect(trace.graphemeSelections.length).toBeGreaterThan(0);
    const changed = traceChanges(trace, { ...trace, graphemeSelections: [] });
    expect(changed.firstStageDifference).toBeNull();
    expect(changed.differingSectionsWithMatchingSnapshots).toEqual([{ section: "graphemeSelections", firstIndex: 0 }]);
  });

  it("renders each aspirated sound once and identifies encodings that have the same IPA", () => {
    function stage(sound: string, aspirated: boolean): StageSnapshot {
      return { name: "generateSyllables", before: [], after: [{ onset: [sound], nucleus: ["ɑ"], coda: [],
        aspirated: aspirated ? [{ segment: "onset", index: 0 }] : [] }] };
    }
    const location = "`generateSyllables` (after), syllable 1, onset 1";
    const before = stage("pʰ", true);
    expect(formatStageDifference(firstStageDifference([before], [stage("kʰ", true)]))).toBe(
      `${location} before \`pʰ\`, after \`kʰ\``);
    expect(formatStageDifference(firstStageDifference([stage("pʰ", false)], [stage("p", true)]))).toBe(
      `${location} \`pʰ\` in both snapshots (before \`pʰ\` with aspiration flag false, after \`p\` with aspiration flag true)`);
  });

  it("stratifies each arm by its own realized root, excludes missing percentiles and keeps tail denominators", () => {
    const ineligible: DrawEvidence["after"] = {
      spelling: "a", ipa: "ʔ", rootSyllables: 7, selectedAttempt: 0,
      surface: { kind: "ineligible", reason: "unmapped-phones", phones: [null], unmapped: [{ index: 0, sound: "ʔ" }] },
    };
    const { pooled, bySeed, seedDeltaRanges } = summarizeDraws([
      row(42, 0, scored(5, 9), scored(6, 10)),
      row(42, 1, scored(1, null), scored(5, 44)),
      row(43, 0, scored(1, 20), scored(2, 5)),
      row(43, 1, scored(1, 80), ineligible),
    ], [42, 43]);
    expect(pooled.exactRoot.find(entry => entry.rootSyllables === 7)?.after.ineligible).toBe(1);
    expect(pooled.exactRoot.find(entry => entry.rootSyllables === 1)?.before.noPeers).toBe(1);
    expect(pooled.rootBuckets.find(entry => entry.bucket === "5+")).toMatchObject({
      before: { draws: 1, bigram: { below10: { numerator: 1, denominator: 1 } } },
      after: { draws: 3, bigram: { below10: { numerator: 0, denominator: 2 } } },
    });
    expect(pooled.paired.bigram).toEqual({ pairs: 2, deltaMedian: -7 });
    expect(bySeed.map(seed => seed.overall.delta.bigramMedian)).toEqual([18, -45]);
    expect(seedDeltaRanges.overall.bigramMedian).toEqual({ min: -45, max: 18, seeds: 2 });
  });

  it("counts repeated generated pairs and IPA changes even when percentile comparisons are unavailable", () => {
    function arm(phones: string[], ipa: string): DrawEvidence["before"] {
      const base = scored(1, null);
      const raw = { raw: 1, percentile: null };
      return { ...base, ipa, surface: { kind: "scored", phones, score: { length: phones.length, fold: 0, peers: 0, unigram: raw, bigram: raw } } };
    }
    const a = arm(["A", "A", "A"], "aː");
    const b = arm(["A", "A", "B"], "aːb");
    const unmapped: DrawEvidence["after"] = { ...a, ipa: "ʔ", surface: { kind: "ineligible", reason: "unmapped-phones", phones: [null], unmapped: [{ index: 0, sound: "ʔ" }] } };
    const rows = [row(42, 0, a, b), row(42, 1, a, unmapped), row(43, 0, a, { ...a, ipa: "ˈaː" })];
    expect(changedFields(rows[1])).toEqual(["ipa", "projectionEligibility"]);
    expect(countOutputChanges(rows)).toMatchObject({ draws: 3, any: 3, ipa: 3, comparableProjections: 2, projectedPhones: 1, projectionEligibility: 1 });
    expect(generatedPairCounts(rows)).toEqual({ comparableDraws: 2, excludedDraws: 1, tokens: { before: 4, after: 4 },
      pairs: [{ symbols: ["A", "A"], before: 4, after: 3, delta: -1, beforeShare: 1, afterShare: 0.75 },
        { symbols: ["A", "B"], before: 0, after: 1, delta: 1, beforeShare: 0, afterShare: 0.25 }] });
  });

  it("keeps five signed movers per direction, breaking exact ties by protocol seed order then draw", () => {
    const rows = [
      { seed: 43, drawIndex: 4, bigramDelta: 2 },
      { seed: 42, drawIndex: 4, bigramDelta: 2 },
      { seed: 42, drawIndex: 2, bigramDelta: 2 },
      { seed: 42, drawIndex: 1, bigramDelta: 2.000000001 },
      { seed: 42, drawIndex: 3, bigramDelta: 2 },
      { seed: 42, drawIndex: 5, bigramDelta: 1 },
      { seed: 43, drawIndex: 0, bigramDelta: 0 },
      { seed: 43, drawIndex: 1, bigramDelta: -9 },
      { seed: 43, drawIndex: 2, bigramDelta: -10 },
    ];
    const positive: typeof rows = [];
    const negative: typeof rows = [];
    for (const candidate of rows) {
      insertMover(positive, candidate, 1, [43, 42], () => candidate);
      insertMover(negative, candidate, -1, [43, 42], () => candidate);
    }
    expect(positive.map(entry => [entry.seed, entry.drawIndex])).toEqual([[42, 1], [43, 4], [42, 2], [42, 3], [42, 4]]);
    expect(negative.map(entry => entry.bigramDelta)).toEqual([-10, -9]);
  });
});
