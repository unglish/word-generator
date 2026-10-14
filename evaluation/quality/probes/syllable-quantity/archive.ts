import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createGunzip, gunzipSync } from "node:zlib";
import { readRun, validateProtocol } from "../../capture.js";
import { digest } from "../../serialization.js";
import type { Draw, Manifest, RunSummary, SourceArchive } from "../../model.js";

export const sha = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");
export interface VerifiedArchive {
  directory: string;
  manifest: Manifest;
  summary: RunSummary;
  sources: SourceArchive;
  schedule: Array<{ file: string; profile: string; seed: number; words: number }>;
}

export async function pinnedBytes(directory: string, manifest: Manifest, file: string): Promise<Buffer> {
  const matches = manifest.artifacts.filter(artifact => artifact.file === file);
  assert.equal(matches.length, 1, `Expected one pinned artifact: ${file}`);
  const bytes = await readFile(join(directory, file));
  assert.equal(bytes.length, matches[0].bytes, `Wrong artifact length: ${file}`);
  assert.equal(sha(bytes), matches[0].sha256, `Wrong artifact checksum: ${file}`);
  return bytes;
}

export async function pinnedJson<T>(directory: string, manifest: Manifest, file: string): Promise<T> {
  const bytes = await pinnedBytes(directory, manifest, file);
  return JSON.parse((file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8")) as T;
}

export async function readArchive(directory: string): Promise<VerifiedArchive> {
  const { manifest, summary } = await readRun(directory, true);
  validateProtocol(manifest.protocol);
  assert.equal(manifest.cohort, "development");
  const schedule = manifest.protocol.profiles.flatMap(profile => profile.seeds[manifest.cohort].map(seed => ({
    file: `words/${profile.id}-${seed}.jsonl.gz`, profile: profile.id, seed, words: manifest.protocol.wordsPerReplicate,
  })));
  const expected = schedule.map(item => item.file).sort();
  assert.deepEqual(manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort(), expected, "Manifest shard set differs from schedule");
  assert.deepEqual((await readdir(join(directory, "words"))).map(file => `words/${file}`).sort(), expected, "Filesystem shard set differs from schedule");
  assert.deepEqual(summary.profiles.map(profile => profile.id), manifest.protocol.profiles.map(profile => profile.id));
  for (const [index, profile] of summary.profiles.entries()) {
    const seeds = manifest.protocol.profiles[index].seeds[manifest.cohort];
    assert.equal(profile.words, seeds.length * manifest.protocol.wordsPerReplicate);
    assert.deepEqual(profile.replicates.map(replicate => ({ seed: replicate.seed, words: replicate.words })), seeds.map(seed => ({ seed, words: manifest.protocol.wordsPerReplicate })));
  }
  const sources = await pinnedJson<SourceArchive>(directory, manifest, "sources.json.gz");
  assert.equal(digest(sources.generator), manifest.generator.sourceDigest, "Archived generator source mismatch");
  assert.equal(digest({ files: sources.evaluator, definitions: summary.definitions }), manifest.evaluatorDigest, "Archived evaluator source mismatch");
  assert.equal(digest(sources.references), manifest.referenceDigest, "Archived reference mismatch");
  const lock = sources.packageFiles.find(file => file.path === "package-lock.json");
  assert.ok(lock, "Missing generator dependency lock");
  assert.equal(digest(lock.content), manifest.environment.packageLockDigest);
  const evaluatorLock = (sources.evaluatorPackageFiles ?? sources.packageFiles).find(file => file.path === "package-lock.json");
  assert.ok(evaluatorLock, "Missing evaluator dependency lock");
  assert.equal(digest(evaluatorLock.content), (manifest.evaluationEnvironment ?? manifest.environment).packageLockDigest);
  return { directory, manifest, summary, sources, schedule };
}

/** Parse the exact compressed bytes that were verified, not a second file read. */
export async function* verifiedDraws(archive: VerifiedArchive, stream: VerifiedArchive["schedule"][number]): AsyncGenerator<Draw> {
  const bytes = await pinnedBytes(archive.directory, archive.manifest, stream.file);
  const input = Readable.from([bytes]);
  const decompressed = input.pipe(createGunzip());
  decompressed.setEncoding("utf8");
  let pending = "";
  let count = 0;
  const parse = (line: string): Draw => {
    const draw = JSON.parse(line) as Draw;
    assert.equal(draw.profile, stream.profile, "Wrong draw profile");
    assert.equal(draw.seed, stream.seed, "Wrong draw seed");
    assert.equal(draw.drawIndex, count, "Wrong draw index/order");
    assert.ok(count < stream.words, "Extra draw");
    count++;
    return draw;
  };
  try {
    for await (const chunk of decompressed) {
      pending += chunk;
      let end: number;
      while ((end = pending.indexOf("\n")) !== -1) {
        yield parse(pending.slice(0, end));
        pending = pending.slice(end + 1);
      }
    }
    if (pending) yield parse(pending);
    assert.equal(count, stream.words, "Incomplete stream");
  } finally {
    input.destroy();
    decompressed.destroy();
  }
}
