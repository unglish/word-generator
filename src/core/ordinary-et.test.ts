import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { createSeededRng, generateWord } from "../index.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";
import { adjacency, archiveSchedule, emptyProbe, jsonDigest, observeWord, validateDraw, verifyShard } from "../../evaluation/quality/probes/ordinary-et/analyze.js";

/** Index of the first /ɛ/ grapheme choice directly followed by /t/, or -1. */
function etPair(word: Word, boundary?: string, selected?: string): number {
  const choices = word.trace!.graphemeSelections;
  return choices.findIndex((choice, i) => choice.phoneme === "ɛ" && choices[i + 1]?.phoneme === "t"
    && (boundary === undefined || adjacency(choice, choices[i + 1]) === boundary)
    && (selected === undefined || choice.selected === selected));
}

describe("ordinary e before /t/", () => {
  it.each([
    { boundary: "cross-syllable", selected: "e" },
    { boundary: "same-rime", selected: "e" },
    { boundary: "same-rime", selected: "ea" },
    { boundary: "cross-syllable", selected: "ea" },
  ])("retains both spelling families: $boundary, $selected", ({ boundary, selected }) => {
    const { word, options } = findExample(w => etPair(w, boundary, selected) >= 0, {
      property: `/ɛ/ written ${selected} before /t/ (${boundary})`, limit: 5000, options: { morphology: false },
    });
    expect(generateWord(options)).toEqual(word);
    const vowel = word.trace!.graphemeSelections[etPair(word, boundary, selected)];
    expect(vowel.afterCondition).toContain("e");
    expect(vowel.afterPosition).toContain("e");
    expect(vowel.selection?.fallback).toBeUndefined();
    expect(vowel.weights.find(([form]) => form === selected)?.[1]).toBeGreaterThan(0);
  });

  it("restores availability throughout a continuous public-API sample without eliminating ea", () => {
    const rand = createSeededRng(42);
    const probe = emptyProbe();
    for (let i = 0; i < 10000; i++) observeWord(probe, generateWord({ rand, morphology: false, trace: true }));
    const counts = probe.counts;
    expect(counts.eligiblePairs).toBeGreaterThan(150);
    expect(counts.eAfterCondition).toBe(counts.eligiblePairs);
    expect(counts.eAfterPosition).toBe(counts.eligiblePairs);
    expect(counts.nonpositiveTracedSelection ?? 0).toBe(0);
    // Unchanged weights give e at least 100/(100+140) probability wherever both
    // spellings survive. Initial-position exclusions and stress only increase it.
    expect(counts["selected:e"] / counts.eligiblePairs).toBeGreaterThan(0.35);
    expect(counts["selected:ea"]).toBeGreaterThan(5);
    for (const boundary of ["same-rime", "cross-syllable"]) {
      const strata = Object.entries(probe.strata).filter(([key]) => key.startsWith(boundary));
      expect(strata.reduce((sum, [, value]) => sum + (value["selected:e"] ?? 0), 0)).toBeGreaterThan(20);
      expect(strata.reduce((sum, [, value]) => sum + (value["selected:ea"] ?? 0), 0)).toBeGreaterThan(0);
    }
  });

  it("distinguishes owned eat from raw output and unavailable final alignment", () => {
    const { word } = findExample(w => {
      const probe = emptyProbe();
      observeWord(probe, w);
      return probe.counts["ownedFinal:eat"] === 1 && probe.counts["rawFinal:eat"] === 1;
    }, { property: "one owned /ɛt/ eat in aligned output", limit: 20000, options: { morphology: false } });
    const unaligned = emptyProbe();
    observeWord(unaligned, { ...word, written: { ...word.written, clean: `eat${word.written.clean}` } });
    expect(unaligned.counts["rawFinal:eat"]).toBe(2);
    expect(unaligned.counts["ownedBase:eat"]).toBe(1);
    expect(unaligned.counts["ownedFinal:eat"]).toBeUndefined();
    expect(unaligned.counts.unknownFinalOwnershipPairs).toBe(1);
  });

  it("separates phonological repairs from subsequent string repairs", () => {
    const { word } = findExample(w => etPair(w) >= 0
      && w.trace!.repairs.some(r => r.rule === "spellingRule:no-final-i")
      && !w.trace!.repairs.some(r => r.rule === "repairStressedNuclei"),
    { property: "/ɛt/ word with only a string repair", limit: 20000, options: { morphology: false } });
    const probe = emptyProbe();
    observeWord(probe, word);
    expect(probe.repairs.repairStressedNuclei).toBeUndefined();
    expect(probe.repairs["spellingRule:no-final-i"].events).toBeGreaterThan(0);
  });
});

describe("ordinary-et archive integrity", () => {
  it("rejects altered manifests, missing shards and duplicate streams", () => {
    const protocol = { wordsPerReplicate: 2, profiles: [{ id: "bare", seeds: { development: [42] } }] };
    const manifest = { schemaVersion: 1, cohort: "development" as const, protocol, protocolDigest: jsonDigest(protocol),
      artifacts: [{ file: "words/bare-42.jsonl.gz", sha256: "unused", bytes: 0 }] };
    expect(archiveSchedule({ manifest, digest: jsonDigest(manifest) })).toHaveLength(1);
    expect(() => archiveSchedule({ manifest, digest: "changed" })).toThrow(/altered/);
    const missing = { ...manifest, artifacts: [] };
    expect(() => archiveSchedule({ manifest: missing, digest: jsonDigest(missing) })).toThrow(/Missing scheduled/);
    const duplicated = { ...manifest, protocol: { ...protocol, profiles: [...protocol.profiles, ...protocol.profiles] } };
    duplicated.protocolDigest = jsonDigest(duplicated.protocol);
    expect(() => archiveSchedule({ manifest: duplicated, digest: jsonDigest(duplicated) })).toThrow(/schedule/);
  });

  it("rejects corrupted bytes and misordered draw coordinates", () => {
    const bytes = Buffer.from("verified");
    const artifact = { file: "words/bare-42.jsonl.gz", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    expect(() => verifyShard(bytes, artifact)).not.toThrow();
    expect(() => verifyShard(Buffer.from("modified"), artifact)).toThrow(/verification failed/);
    const stream = { profile: "bare", seed: 42 };
    expect(() => validateDraw({ ...stream, drawIndex: 0 }, stream, 0)).not.toThrow();
    expect(() => validateDraw({ ...stream, drawIndex: 1 }, stream, 0)).toThrow(/coordinate/);
    expect(() => validateDraw({ ...stream, seed: 43, drawIndex: 0 }, stream, 0)).toThrow(/coordinate/);
  });

  it("rejects complete-checksum archives with incomplete draw schedules and unlisted shards", () => {
    const root = mkdtempSync(join(tmpdir(), "ordinary-et-probe-"));
    const word = generateWord({ seed: 879, morphology: false, trace: true });
    const wordFile = "words/bare-42.jsonl.gz";
    const protocol = { wordsPerReplicate: 2, profiles: [{ id: "bare", seeds: { development: [42] } }] };
    const save = (indices: number[]) => {
      const compressed = gzipSync(indices.map(drawIndex => JSON.stringify({ profile: "bare", seed: 42, drawIndex, word })).join("\n") + "\n");
      const manifest = { schemaVersion: 1, cohort: "development", protocol, protocolDigest: jsonDigest(protocol),
        artifacts: [{ file: wordFile, bytes: compressed.length, sha256: createHash("sha256").update(compressed).digest("hex") }] };
      writeFileSync(join(root, wordFile), compressed);
      writeFileSync(join(root, "manifest.json"), JSON.stringify({ manifest, digest: jsonDigest(manifest) }));
    };
    const run = () => spawnSync(process.execPath, ["--import", "tsx", "evaluation/quality/probes/ordinary-et/analyze.ts", root], { encoding: "utf8" });
    try {
      mkdirSync(join(root, "words"));
      save([0, 1]);
      const valid = run();
      expect(valid.status, valid.stderr).toBe(0);
      expect(JSON.parse(valid.stdout).total.counts.words).toBe(2);
      save([0]);
      const incomplete = run();
      expect(incomplete.status).not.toBe(0);
      expect(incomplete.stderr).toContain("Incomplete stream");
      save([1, 0]);
      expect(run().stderr).toContain("expected stream coordinate");
      save([0, 1]);
      writeFileSync(join(root, "words/extra.jsonl.gz"), gzipSync(""));
      expect(run().stderr).toContain("unlisted shards");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

});
