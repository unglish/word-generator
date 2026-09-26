import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { createGunzip, gunzipSync } from "node:zlib";
import type { Word } from "../../src/types.js";
import { jsonDigest } from "./identity.js";
import type { SourceFile } from "./joint-artifact.js";

export const ORIGINAL_MANIFEST_DIGEST = "a23414ae34d3611c4367d07ad677afb99e7d89a4be7886e6ed95018c2ff3f3da";
interface Artifact { file: string; bytes: number; sha256: string }
export interface OriginalManifest {
  schemaVersion: number; id: string; cohort: "development";
  protocol: { wordsPerReplicate: number; profiles: Array<{ id: string; seeds: { development: number[] } }> };
  protocolDigest: string; evaluatorDigest: string; referenceDigest: string;
  generator: { sourceDigest: string };
  environment: { packageLockDigest: string };
  artifacts: Artifact[];
}
export interface OriginalSources { generator: SourceFile[]; evaluator: SourceFile[]; references: SourceFile[]; packageFiles: SourceFile[] }
export interface OriginalSummary {
  id: string; cohort: string; protocolDigest: string; evaluatorDigest: string; referenceDigest: string; definitions: unknown[];
  profiles: Array<{ id: string; words: number; syllableCounts: Record<string, number>; phonemeLengths: Record<string, number> }>;
}
export interface ArchivedDraw { profile: string; seed: number; drawIndex: number; word: Word }
function ensure(ok: boolean, message: string): asserts ok { if (!ok) throw new Error(message); }
const byteHash = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

export function validateOriginalManifest(envelope: { manifest: OriginalManifest; digest: string }): OriginalManifest {
  const { manifest } = envelope;
  ensure(envelope.digest === ORIGINAL_MANIFEST_DIGEST && jsonDigest(manifest) === envelope.digest, "Expected the immutable original development manifest.");
  ensure(manifest.schemaVersion === 1 && manifest.id === "baseline-development-v1" && manifest.cohort === "development", "Wrong archive cohort or schema.");
  ensure(jsonDigest(manifest.protocol) === manifest.protocolDigest, "Protocol digest mismatch.");
  ensure(new Set(manifest.artifacts.map(item => item.file)).size === manifest.artifacts.length, "Duplicate artifact paths.");
  for (const artifact of manifest.artifacts) ensure(artifact.file === basename(artifact.file) || /^words\/[a-z0-9-]+\.jsonl\.gz$/.test(artifact.file), "Invalid archive path.");
  const expected = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`)).sort();
  ensure(jsonDigest(expected) === jsonDigest(manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort()), "Incomplete shard set.");
  return manifest;
}

export async function readPinnedArchiveJson<T>(directory: string, manifest: OriginalManifest, file: string): Promise<T> {
  const expected = manifest.artifacts.find(item => item.file === file);
  ensure(Boolean(expected), `Archive does not pin ${file}.`);
  const bytes = await readFile(join(directory, file));
  ensure(bytes.length === expected!.bytes && byteHash(bytes) === expected!.sha256, `Corrupt archive artifact: ${file}`);
  return JSON.parse((file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8")) as T;
}

/** All nonword bytes are verified here; every compressed word byte is checked while streamed. */
export async function openOriginalArchive(directory: string): Promise<{ manifest: OriginalManifest; sources: OriginalSources; summary: OriginalSummary }> {
  const manifest = validateOriginalManifest(JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")));
  const actualShards = (await readdir(join(directory, "words"), { withFileTypes: true })).map(entry => {
    ensure(entry.isFile(), "Unexpected directory or symbolic link in archived shards.");
    return `words/${entry.name}`;
  }).sort();
  ensure(jsonDigest(actualShards) === jsonDigest(manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort()), "Unpinned or missing filesystem shard.");
  for (const item of manifest.artifacts.filter(item => !item.file.startsWith("words/"))) await readPinnedArchiveJson(directory, manifest, item.file);
  const sources = await readPinnedArchiveJson<OriginalSources>(directory, manifest, "sources.json.gz");
  const summary = await readPinnedArchiveJson<OriginalSummary>(directory, manifest, "summary.json");
  ensure(jsonDigest(sources.generator) === manifest.generator.sourceDigest, "Generator source digest mismatch.");
  ensure(jsonDigest(sources.references) === manifest.referenceDigest, "Reference source digest mismatch.");
  ensure(jsonDigest({ files: sources.evaluator, definitions: summary.definitions }) === manifest.evaluatorDigest, "Archived evaluator digest mismatch.");
  const lock = sources.packageFiles.find(file => file.path === "package-lock.json");
  ensure(Boolean(lock) && jsonDigest(lock!.content) === manifest.environment.packageLockDigest, "Archived dependency digest mismatch.");
  for (const key of ["id", "cohort", "protocolDigest", "evaluatorDigest", "referenceDigest"] as const) ensure(summary[key] === manifest[key], `Summary ${key} mismatch.`);
  return { manifest, sources, summary };
}

/** Reads only pinned development shards, checks compressed bytes and every draw coordinate. */
export async function* originalDraws(directory: string, manifest: OriginalManifest, profile: string, seed: number): AsyncGenerator<ArchivedDraw> {
  const file = `words/${profile}-${seed}.jsonl.gz`;
  const expected = manifest.artifacts.find(item => item.file === file);
  ensure(Boolean(expected), "Unpinned word shard.");
  const input = createReadStream(join(directory, file)), output = createGunzip();
  const hash = createHash("sha256");
  let bytes = 0, remaining = "", index = 0;
  input.on("data", chunk => { hash.update(chunk); bytes += chunk.length; });
  input.on("error", error => output.destroy(error));
  input.pipe(output); output.setEncoding("utf8");
  const parse = (line: string): ArchivedDraw => {
    const draw = JSON.parse(line) as ArchivedDraw;
    ensure(draw.profile === profile && draw.seed === seed && draw.drawIndex === index && index < manifest.protocol.wordsPerReplicate, "Invalid archived draw coordinate/order.");
    ensure(Boolean(draw.word.trace) && typeof draw.word.written.clean === "string" && Array.isArray(draw.word.syllables), "Incomplete trace-first word.");
    index++; return draw;
  };
  try {
    for await (const chunk of output) {
      remaining += chunk;
      let end: number;
      while ((end = remaining.indexOf("\n")) !== -1) {
        yield parse(remaining.slice(0, end)); remaining = remaining.slice(end + 1);
      }
    }
    if (remaining) yield parse(remaining);
    ensure(index === manifest.protocol.wordsPerReplicate, "Incomplete draw stream.");
    ensure(bytes === expected!.bytes && hash.digest("hex") === expected!.sha256, `Corrupt word shard: ${file}`);
  } finally { input.destroy(); output.destroy(); }
}
