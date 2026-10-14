import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { generateWord } from "../../../../src/index.js";
import { digest } from "../../serialization.js";
import type { Draw, Manifest, MetricCounts, Protocol, RunSummary, SourceArchive } from "../../model.js";
import { readArchive, sha, verifiedDraws } from "./archive.js";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });

async function fixture(): Promise<{ directory: string; manifest: Manifest; draws: Draw[] }> {
  const directory = await mkdtemp(join(tmpdir(), "weight-archive-"));
  directories.push(directory);
  await mkdir(join(directory, "words"));
  const protocol: Protocol = { schemaVersion: 1, id: "fixture", wordsPerReplicate: 2, reviewDrawsPerReplicate: 1, profiles: [{ id: "fixture", options: { mode: "lexicon", morphology: false }, seeds: { development: [1, 2], validation: [3, 4] } }] };
  const sources: SourceArchive = { generator: [{ path: "src/fixture.ts", content: "fixture" }], evaluator: [], references: [], packageFiles: [{ path: "package-lock.json", content: "fixture" }] };
  const summary: RunSummary = {
    schemaVersion: 1, id: "fixture", cohort: "development", protocolDigest: digest(protocol), evaluatorDigest: digest({ files: [], definitions: [] }), referenceDigest: digest([]), definitions: [],
    profiles: [{ id: "fixture", words: 4, uniqueSpellings: 2, meanLetters: 0, syllableCounts: {}, phonemeLengths: {}, morphologyCounts: {}, distributions: {} as RunSummary["profiles"][number]["distributions"], metrics: {} as MetricCounts, replicates: [1, 2].map(seed => ({ seed, words: 2, metrics: {} as MetricCounts })), strata: [] }],
  };
  const manifest: Manifest = {
    schemaVersion: 1, id: "fixture", createdAt: "fixture", cohort: "development", protocol,
    protocolDigest: summary.protocolDigest, evaluatorDigest: summary.evaluatorDigest, referenceDigest: summary.referenceDigest,
    generator: { commit: "fixture", dirty: false, sourceDigest: digest(sources.generator), effectiveConfig: {}, patch: "" },
    environment: { node: process.version, platform: process.platform, arch: process.arch, packageLockDigest: digest("fixture") }, artifacts: [],
  };
  await save(directory, manifest, "summary.json", Buffer.from(JSON.stringify(summary)));
  await save(directory, manifest, "sources.json.gz", gzipSync(JSON.stringify(sources)));
  const words = [generateWord({ seed: 1, morphology: false, trace: true }), generateWord({ seed: 2, morphology: false, trace: true })];
  const draws = words.map((word, drawIndex) => ({ profile: "fixture", seed: 1, drawIndex, word }));
  for (const seed of [1, 2]) await save(directory, manifest, `words/fixture-${seed}.jsonl.gz`, gzipSync(draws.map(draw => JSON.stringify({ ...draw, seed })).join("\n") + "\n"));
  return { directory, manifest, draws };
}

async function save(directory: string, manifest: Manifest, file: string, bytes: Buffer): Promise<void> {
  await writeFile(join(directory, file), bytes);
  const artifact = { file, bytes: bytes.length, sha256: sha(bytes) };
  const index = manifest.artifacts.findIndex(item => item.file === file);
  if (index < 0) manifest.artifacts.push(artifact);
  else manifest.artifacts[index] = artifact;
  await writeFile(join(directory, "manifest.json"), JSON.stringify({ manifest, digest: digest(manifest) }));
}

async function allDraws(directory: string): Promise<Draw[]> {
  const archive = await readArchive(directory);
  const result: Draw[] = [];
  for (const stream of archive.schedule) for await (const draw of verifiedDraws(archive, stream)) result.push(draw);
  return result;
}

describe("full weight-control archive integrity", () => {
  it("accepts the full checked schedule and every public word", async () => {
    const { directory } = await fixture();
    const draws = await allDraws(directory);
    expect(draws).toHaveLength(4);
    expect(draws.map(draw => [draw.seed, draw.drawIndex])).toEqual([[1, 0], [1, 1], [2, 0], [2, 1]]);
  });

  it("rejects altered manifests and corrupt compressed bytes", async () => {
    const { directory } = await fixture();
    const envelope = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
    envelope.manifest.id = "altered";
    await writeFile(join(directory, "manifest.json"), JSON.stringify(envelope));
    await expect(readArchive(directory)).rejects.toThrow(/manifest/);
    const other = await fixture();
    await writeFile(join(other.directory, "words/fixture-1.jsonl.gz"), "corrupt");
    await expect(readArchive(other.directory)).rejects.toThrow(/verification/);
  });

  it("rejects unlisted and omitted shard sets", async () => {
    const { directory } = await fixture();
    await writeFile(join(directory, "words/unlisted.jsonl.gz"), gzipSync(""));
    await expect(readArchive(directory)).rejects.toThrow(/Filesystem shard/);
    const other = await fixture();
    other.manifest.artifacts = other.manifest.artifacts.filter(item => item.file !== "words/fixture-1.jsonl.gz");
    await writeFile(join(other.directory, "manifest.json"), JSON.stringify({ manifest: other.manifest, digest: digest(other.manifest) }));
    await expect(readArchive(other.directory)).rejects.toThrow(/Manifest shard/);
  });

  it.each(["truncated", "reordered", "duplicate", "wrong-profile", "wrong-seed"])("rejects a repinned %s stream", async kind => {
    const { directory, manifest, draws } = await fixture();
    if (kind === "truncated") draws.pop();
    if (kind === "reordered") draws.reverse();
    if (kind === "duplicate") draws[1] = draws[0];
    if (kind === "wrong-profile") draws[0].profile = "wrong";
    if (kind === "wrong-seed") draws[0].seed = 42;
    await save(directory, manifest, "words/fixture-1.jsonl.gz", gzipSync(draws.map(draw => JSON.stringify(draw)).join("\n") + "\n"));
    await expect(allDraws(directory)).rejects.toThrow();
  });

  it("rejects a repinned source archive with stale generator provenance", async () => {
    const { directory, manifest } = await fixture();
    await save(directory, manifest, "sources.json.gz", gzipSync(JSON.stringify({ generator: [], evaluator: [], references: [], packageFiles: [] })));
    await expect(readArchive(directory)).rejects.toThrow(/generator source/);
  });
});
