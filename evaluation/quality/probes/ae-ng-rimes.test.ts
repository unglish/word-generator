import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import * as generatorApi from "../../../src/index.js";
import { captureRun } from "../capture.js";
import { digest } from "../serialization.js";
import type { Draw, Manifest } from "../model.js";
import { analyzeRimeRun, emptyCounts, observe } from "./ae-ng-rimes.js";

let temporary: string;
let template: string;
let sequence = 0;
const shard = "words/fixture-1.jsonl.gz";
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

beforeAll(async () => {
  temporary = await mkdtemp(join(tmpdir(), "ae-ng-rimes-fixtures-"));
  template = join(temporary, "template");
  await captureRun({ root: process.cwd(), out: template, id: "rime-fixture", cohort: "development", protocol: {
    schemaVersion: 1, id: "rime-fixture", wordsPerReplicate: 2, reviewDrawsPerReplicate: 1,
    profiles: [{ id: "fixture", options: { mode: "lexicon", morphology: false }, seeds: { development: [1, 2], validation: [3, 4] } }],
  } });
});
afterAll(async () => { await rm(temporary, { recursive: true, force: true }); });

async function fixture(): Promise<string> {
  const directory = join(temporary, `case-${sequence++}`);
  await cp(template, directory, { recursive: true });
  return directory;
}
async function editManifest(directory: string, change: (manifest: Manifest) => void): Promise<void> {
  const envelope = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as { manifest: Manifest; digest: string };
  change(envelope.manifest);
  envelope.digest = digest(envelope.manifest);
  await writeFile(join(directory, "manifest.json"), JSON.stringify(envelope));
}
async function replaceArtifact(directory: string, file: string, bytes: Buffer): Promise<void> {
  await writeFile(join(directory, file), bytes);
  await editManifest(directory, manifest => {
    const artifact = manifest.artifacts.find(item => item.file === file)!;
    artifact.bytes = bytes.length; artifact.sha256 = sha(bytes);
  });
}
async function editDraws(directory: string, change: (draws: Draw[]) => Draw[]): Promise<void> {
  const draws = gunzipSync(await readFile(join(directory, shard))).toString("utf8").trim().split("\n").map(line => JSON.parse(line) as Draw);
  await replaceArtifact(directory, shard, gzipSync(change(draws).map(draw => JSON.stringify(draw)).join("\n") + "\n"));
}

describe("rime archive observer integrity", () => {
  it("reads identical archived words without regeneration or mutation", async () => {
    const directory = await fixture();
    const before = await readFile(join(directory, shard));
    const spy = vi.spyOn(generatorApi, "generateWord").mockImplementation(() => { throw new Error("Unexpected regeneration"); });
    try {
      const first = await analyzeRimeRun(directory);
      const second = await analyzeRimeRun(directory);
      expect(first).toEqual(second);
      expect(first.profiles[0].totals.words).toBe(4);
      expect(first.profiles[0].totals.layers.generatedBase.observedWords).toBe(4);
      expect(first.run.rawArchives).toHaveLength(2);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
    expect(await readFile(join(directory, shard))).toEqual(before);
  });

  it.each(["dropped", "extra", "duplicate", "reordered", "wrong-seed", "wrong-profile"])("rejects %s draws even with updated artifact checksums", async kind => {
    const directory = await fixture();
    await editDraws(directory, draws => {
      if (kind === "dropped") return draws.slice(1);
      if (kind === "extra") return [...draws, draws[1]];
      if (kind === "duplicate") return [draws[0], draws[0]];
      if (kind === "reordered") return draws.reverse();
      if (kind === "wrong-seed") draws[0].seed = 999;
      if (kind === "wrong-profile") draws[0].profile = "different";
      return draws;
    });
    await expect(analyzeRimeRun(directory)).rejects.toThrow(/draw identity|Incomplete stream/);
  });

  it.each(["malformed-json", "malformed-word", "corrupt-compression"])("rejects %s input", async kind => {
    const directory = await fixture();
    if (kind === "malformed-json") await replaceArtifact(directory, shard, gzipSync("not json\n"));
    if (kind === "malformed-word") await editDraws(directory, draws => [{ ...draws[0], word: null } as unknown as Draw, draws[1]]);
    if (kind === "corrupt-compression") await replaceArtifact(directory, shard, Buffer.from("not gzip"));
    await expect(analyzeRimeRun(directory)).rejects.toThrow();
  });

  it.each([false, true])("rejects an extra archive with pinned=%s", async pinned => {
    const directory = await fixture();
    const bytes = await readFile(join(directory, shard));
    const file = "words/extra-999.jsonl.gz";
    await writeFile(join(directory, file), bytes);
    if (pinned) await editManifest(directory, manifest => { manifest.artifacts.push({ file, bytes: bytes.length, sha256: sha(bytes) }); });
    await expect(analyzeRimeRun(directory)).rejects.toThrow(/shard sets/);
  });

  it("rejects a dropped archive and duplicate artifact entries", async () => {
    const missing = await fixture();
    await rm(join(missing, shard));
    await expect(analyzeRimeRun(missing)).rejects.toThrow();
    const duplicate = await fixture();
    await editManifest(duplicate, manifest => { manifest.artifacts.push(manifest.artifacts[0]); });
    await expect(analyzeRimeRun(duplicate)).rejects.toThrow(/duplicate artifact/);
  });

  it("requires pinned source contents and their declared generator digest", async () => {
    const unpinned = await fixture();
    await editManifest(unpinned, manifest => { manifest.artifacts = manifest.artifacts.filter(item => item.file !== "sources.json.gz"); });
    await expect(analyzeRimeRun(unpinned)).rejects.toThrow(/source archive must be pinned/);
    const wrongDigest = await fixture();
    await editManifest(wrongDigest, manifest => { manifest.generator.sourceDigest = "incorrect"; });
    await expect(analyzeRimeRun(wrongDigest)).rejects.toThrow(/generator source mismatch/);
  });

  it.each(["profile", "replicate", "count"])("requires the frozen summary %s schedule", async kind => {
    const directory = await fixture();
    const summary = JSON.parse(await readFile(join(directory, "summary.json"), "utf8"));
    if (kind === "profile") summary.profiles[0].id = "other";
    if (kind === "replicate") summary.profiles[0].replicates[0].seed = 999;
    if (kind === "count") summary.profiles[0].words = 3;
    await replaceArtifact(directory, "summary.json", Buffer.from(JSON.stringify(summary)));
    await expect(analyzeRimeRun(directory)).rejects.toThrow(/Summary profile\/replicate schedule/);
  });

  it("refuses sealed validation archives", async () => {
    const directory = await fixture();
    const summary = JSON.parse(await readFile(join(directory, "summary.json"), "utf8"));
    summary.cohort = "validation";
    await replaceArtifact(directory, "summary.json", Buffer.from(JSON.stringify(summary)));
    await editManifest(directory, manifest => { manifest.cohort = "validation"; });
    await expect(analyzeRimeRun(directory)).rejects.toThrow(/development archives only/);
  });
});


describe("rime observation boundaries", () => {
  it("separates initially generated pairs from later stress-repair introduction", () => {
    const word = generatorApi.generateWord({ seed: 1, morphology: false, trace: true });
    const before = [{ onset: ["b"], nucleus: ["ə"], coda: ["ŋ"] }];
    const after = [{ onset: ["b"], nucleus: ["æ"], coda: ["ŋ"] }];
    word.trace!.stages = [
      { name: "generateSyllables", before: [], after: before },
      { name: "repairStressedNuclei", before, after },
      { name: "generateWrittenForm", before: after, after },
    ];
    const counts = emptyCounts();
    observe(counts, { profile: "fixture", seed: 1, drawIndex: 0, word });
    expect(counts.layers.generatedBase.pairs).toBe(0);
    expect(counts.layers.preparedBase.exactPairs).toBe(1);
    expect(counts.transitions.stressRepair.introduced).toBe(1);
    expect(counts.transitions.generationToPrepared.introduced).toBe(1);
    expect(counts.layers.preparedBase.strata["only/unavailable"].pairs).toBe(1);
  });

  it("accounts for nonfirst nucleus/coda matches without treating them as exact rimes", () => {
    const word = generatorApi.generateWord({ seed: 1, morphology: false, trace: true });
    const complex = [{ onset: [], nucleus: ["u", "æ"], coda: ["s", "ŋ"] }];
    word.trace!.stages = [{ name: "generateSyllables", before: [], after: complex }];
    const counts = emptyCounts();
    observe(counts, { profile: "fixture", seed: 1, drawIndex: 0, word });
    expect(counts.layers.generatedBase).toMatchObject({ syllables: 1, pairs: 1, exactPairs: 0, extendedPairs: 1, multiSegmentNuclei: 1 });
    expect(counts.layers.preparedBase.unavailableWords).toBe(1);
    expect(counts.transitions.generationToPrepared.unavailableWords).toBe(1);
    expect(counts.transitions.stressRepair.unavailableWords).toBe(1);
  });

  it.each(["generateSyllables", "generateWrittenForm", "repairStressedNuclei"])("rejects ambiguous duplicate %s stages", name => {
    const word = generatorApi.generateWord({ seed: 1, morphology: false, trace: true });
    const stage = word.trace!.stages.find(candidate => candidate.name === name)!;
    word.trace!.stages.push(structuredClone(stage));
    expect(() => observe(emptyCounts(), { profile: "fixture", seed: 1, drawIndex: 0, word })).toThrow(/duplicate stage/);
  });

  it("treats unmarked surface stress separately from unavailable stage stress", () => {
    const word = generatorApi.generateWord({ seed: 985, syllableCount: 1, morphology: false, trace: true });
    const counts = emptyCounts();
    observe(counts, { profile: "fixture", seed: 985, drawIndex: 0, word });
    expect(counts.layers.generatedBase.strata["only/unavailable"].pairs).toBe(1);
    expect(counts.layers.output.strata["only/unmarked"].pairs).toBe(1);
    expect(counts.layers.output.pairedWords).toBe(1);
  });
});
