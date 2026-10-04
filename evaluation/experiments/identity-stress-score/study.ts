import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createGunzip, createGzip, gunzipSync } from "node:zlib";
import { readRun, validateProtocol } from "../../quality/capture.js";
import { digest } from "../../quality/serialization.js";
import type { Draw, SourceArchive, RunSummary } from "../../quality/model.js";
import { observeWordIdentity } from "../../../src/phonology/identity.js";
import { createIdentityStressScorer, observeSurfaceStressEvidence, type ProjectedScore } from "../../../src/phonology/identity-stress-score.js";
import { loadPinnedReference, type ReferencePin } from "./reference.js";

interface StudyProtocol {
  declaredDataDependency: ReferencePin;
  archives: { role: string; path: string; words: number; streams: number }[];
}
interface FrozenSources {
  files: { path: string; bytes: number; sha256: string }[];
  archives: { role: string; manifestFile: { bytes: number; sha256: string } }[];
}
interface Metric {
  words: number; transitions: number; sum: number; sumSquares: number;
  minimum: number | null; maximum: number | null; unavailable: Record<string, number>;
}
interface Counts {
  words: number; segments: number; matchedExplicit: number; matchedTrace: number;
  coarse: Metric; nativeExplicit: Metric; nativeTrace: Metric;
  matchedExplicitCoarse: Metric; matchedTraceCoarse: Metric;
  matchedExplicitNative: Metric; matchedTraceNative: Metric;
  losses: Record<string, number>;
}

const root = fileURLToPath(new URL("../../../", import.meta.url));
const experiment = join(root, "evaluation/experiments/identity-stress-score");
const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const metric = (): Metric => ({ words: 0, transitions: 0, sum: 0, sumSquares: 0, minimum: null, maximum: null, unavailable: {} });
const counts = (): Counts => ({ words: 0, segments: 0, matchedExplicit: 0, matchedTrace: 0,
  coarse: metric(), nativeExplicit: metric(), nativeTrace: metric(), matchedExplicitCoarse: metric(), matchedTraceCoarse: metric(),
  matchedExplicitNative: metric(), matchedTraceNative: metric(), losses: {} });
function increment(target: Record<string, number>, key: string): void { target[key] = (target[key] ?? 0) + 1; }
function accumulate(target: Metric, score: ProjectedScore): void {
  if (score.status === "unavailable") { for (const reason of score.unavailable) increment(target.unavailable, reason); return; }
  const value = score.bitsPerTransition!;
  target.words++; target.transitions += score.transitions; target.sum += value; target.sumSquares += value * value;
  target.minimum = target.minimum === null ? value : Math.min(target.minimum, value);
  target.maximum = target.maximum === null ? value : Math.max(target.maximum, value);
}
function aggregate(target: Counts, row: ReturnType<typeof project>): void {
  target.words++; target.segments += row.segments;
  accumulate(target.coarse, row.coarse); accumulate(target.nativeExplicit, row.nativeExplicit); accumulate(target.nativeTrace, row.nativeTrace);
  if (row.coarse.status === "scored" && row.nativeExplicit.status === "scored") {
    target.matchedExplicit++; accumulate(target.matchedExplicitCoarse, row.coarse); accumulate(target.matchedExplicitNative, row.nativeExplicit);
  }
  if (row.coarse.status === "scored" && row.nativeTrace.status === "scored") {
    target.matchedTrace++; accumulate(target.matchedTraceCoarse, row.coarse); accumulate(target.matchedTraceNative, row.nativeTrace);
  }
  for (const item of row.losses) for (const [loss, present] of Object.entries(item.losses)) if (present) increment(target.losses, loss);
}
function project(draw: Draw, scorer: ReturnType<typeof createIdentityStressScorer>) {
  const observed = observeWordIdentity(draw.word, { sourceProfile: "english-legacy-v1", layer: "surface" });
  const explicit = scorer.score(observed);
  const trace = scorer.score(observed, observeSurfaceStressEvidence(observed, draw.word.trace));
  const morphology = draw.word.trace?.morphology;
  const actual = morphology && morphology.template !== "bare" && (morphology.prefix || morphology.suffix) ? morphology.template : "bare";
  return { profile: draw.profile, seed: draw.seed, drawIndex: draw.drawIndex,
    syllables: observed.syllables.length, segments: observed.segments.length,
    writtenCodePoints: writtenLength(draw.word.written.clean), morphology: actual,
    coarse: explicit.coarse, nativeExplicit: explicit.native, nativeTrace: trace.native,
    explicitEvidence: explicit.evidence, traceEvidence: trace.evidence, losses: explicit.losses };
}
async function verifySources(frozen: FrozenSources): Promise<void> {
  for (const expected of frozen.files) {
    if (expected.path.includes("..") || expected.path.startsWith("/")) throw new Error("Unsafe source path.");
    const bytes = await readFile(join(root, expected.path));
    if (bytes.length !== expected.bytes || sha(bytes) !== expected.sha256) throw new Error(`Frozen source differs: ${expected.path}`);
  }
}
export function writtenLength(clean: string): number {
  return Array.from(clean).length;
}
async function pin(path: string) {
  const hash = createHash("sha256"); let bytes = 0;
  for await (const block of createReadStream(path)) { bytes += block.length; hash.update(block); }
  return { bytes, sha256: hash.digest("hex") };
}
export function verifySummarySchedule(summary: RunSummary, expected: { id: string; words: number; replicates: { seed: number; words: number }[] }[]): void {
  const raw = summary as unknown as { schemaVersion: string; profiles: unknown[]; captureOnly: { metricStatus: string; words: number; streams: { profile: string; seed: number; words: number }[] } };
  if (raw.schemaVersion === "q09-raw-capture-v1") {
    const expectedStreams = expected.flatMap(profile => profile.replicates.map(replicate => ({ profile: profile.id, ...replicate })));
    const words = expected.reduce((sum, profile) => sum + profile.words, 0);
    if (raw.profiles.length !== 0 || raw.captureOnly.metricStatus !== "not-evaluated" || raw.captureOnly.words !== words || digest(raw.captureOnly.streams) !== digest(expectedStreams)) throw new Error("Capture-only summary schedule differs.");
    return;
  }
  const schedule = summary.profiles.map(profile => ({ id: profile.id, words: profile.words,
    replicates: profile.replicates.map(replicate => ({ seed: replicate.seed, words: replicate.words })) }));
  if (digest(schedule) !== digest(expected)) throw new Error("Summary schedule differs.");
}
async function measure(archive: StudyProtocol["archives"][number], scorer: ReturnType<typeof createIdentityStressScorer>, out: string, frozen: FrozenSources) {
  const { manifest, summary } = await readRun(archive.path, true);
  const expected = frozen.archives.find(item => item.role === archive.role);
  if (!expected || digest(await pin(join(archive.path, "manifest.json"))) !== digest(expected.manifestFile)) throw new Error("Preregistered archive manifest differs.");
  const archived = JSON.parse(gunzipSync(await readFile(join(archive.path, "sources.json.gz"))).toString("utf8")) as SourceArchive;
  if (digest(archived.generator) !== manifest.generator.sourceDigest || digest({ files: archived.evaluator, definitions: summary.definitions }) !== manifest.evaluatorDigest) throw new Error("Archive source/evaluator provenance differs.");
  validateProtocol(manifest.protocol);
  if (manifest.cohort !== "development") throw new Error("Only the registered development archives are permitted.");
  const expectedShards = manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`)).sort();
  const pinned = manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort();
  const actualShards = (await readdir(join(archive.path, "words"))).map(file => `words/${file}`).sort();
  if (digest(expectedShards) !== digest(pinned) || digest(pinned) !== digest(actualShards) || pinned.length !== archive.streams) throw new Error("Archive shard sets differ.");
  const expectedSchedule = manifest.protocol.profiles.map(profile => ({ id: profile.id, words: profile.seeds.development.length * manifest.protocol.wordsPerReplicate,
    replicates: profile.seeds.development.map(seed => ({ seed, words: manifest.protocol.wordsPerReplicate })) }));
  verifySummarySchedule(summary, expectedSchedule);
  const totals = counts(), profiles: Record<string, Counts> = {}, streams = [], strata: Record<string, Counts> = {}, witnesses: Record<string, Draw> = {};
  for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
    const relative = `words/${profile.id}-${seed}.jsonl.gz`, target = `${archive.role}-${profile.id}-${seed}.jsonl.gz`;
    const compressed = createReadStream(join(archive.path, relative)), gunzip = createGunzip();
    compressed.on("error", error => gunzip.destroy(error));
    const lines = createInterface({ input: compressed.pipe(gunzip), crlfDelay: Infinity });
    const gzip = createGzip(), output = createWriteStream(join(out, target), { flags: "wx" });
    const finished = once(output, "close");
    gzip.on("error", error => output.destroy(error)); output.on("error", error => gzip.destroy(error)); gzip.pipe(output);
    const stream = counts();
    try {
      for await (const line of lines) {
        const draw = JSON.parse(line) as Draw;
        if (draw.profile !== profile.id || draw.seed !== seed || draw.drawIndex !== stream.words || stream.words >= manifest.protocol.wordsPerReplicate) throw new Error(`Draw order differs in ${relative}.`);
        const row = project(draw, scorer);
        aggregate(stream, row); aggregate(totals, row); aggregate(profiles[profile.id] ??= counts(), row);
        const stratum = `${profile.id}/${row.morphology}/syllables:${row.syllables}/segments:${row.segments}/writtenCodePoints:${row.writtenCodePoints}`;
        aggregate(strata[stratum] ??= counts(), row);
        for (const [view, score] of Object.entries({ coarse: row.coarse, nativeExplicit: row.nativeExplicit, nativeTrace: row.nativeTrace })) {
          witnesses[`${profile.id}/${view}/${score.status}`] ??= draw;
          for (const reason of score.unavailable) witnesses[`${profile.id}/${view}/${reason}`] ??= draw;
        }
        if (!gzip.write(`${JSON.stringify(row)}\n`)) await once(gzip, "drain");
      }
      if (stream.words !== manifest.protocol.wordsPerReplicate) throw new Error(`Incomplete stream ${relative}.`);
      gzip.end(); await finished;
    } finally { lines.close(); compressed.destroy(); gunzip.destroy(); gzip.destroy(); output.destroy(); }
    streams.push({ profile: profile.id, seed, counts: stream, scoreStream: { file: target, ...await pin(join(out, target)) } });
    console.log(`${archive.role}/${profile.id}/${seed}: ${stream.words} observed`);
  }
  if (totals.words !== archive.words || digest((await readRun(archive.path, true)).manifest) !== digest(manifest)) throw new Error("Archive changed or word count differs.");
  return { role: archive.role, path: archive.path, manifestFile: await pin(join(archive.path, "manifest.json")), manifestDigest: digest(manifest),
    generator: manifest.generator, rawArtifacts: manifest.artifacts, totals, profiles, streams, strata, witnesses };
}
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { out: { type: "string" } } });
  if (!values.out) throw new Error("--out is required; the directory must not exist.");
  const frozenBytes = await readFile(join(experiment, "freeze-v1.json")), frozen = JSON.parse(frozenBytes.toString()) as FrozenSources;
  await verifySources(frozen);
  const protocol = JSON.parse(await readFile(join(experiment, "protocol-v1.json"), "utf8")) as StudyProtocol;
  const reference = await loadPinnedReference(join(experiment, "reference.json.gz"), protocol.declaredDataDependency);
  const scorer = createIdentityStressScorer(reference), out = resolve(values.out);
  await mkdir(out);
  const arms = [];
  for (const archive of protocol.archives) arms.push(await measure(archive, scorer, out, frozen));
  await verifySources(frozen);
  if (sha(await readFile(join(experiment, "freeze-v1.json"))) !== sha(frozenBytes)) throw new Error("Source registration changed.");
  await loadPinnedReference(join(experiment, "reference.json.gz"), protocol.declaredDataDependency);
  await writeFile(join(out, "report.json"), `${JSON.stringify({ version: "q16b-identity-stress-score-report-v1", freezeSha256: sha(frozenBytes),
    model: reference.identity, alpha: 0.5, sourceProfile: "english-legacy-v1", referenceProfile: "rhotic-general-american-reference-v1",
    scope: "Archived observations only. Native/coarse alphabets differ; scores are separate diagnostics, not human quality or a dialect claim. Missing stress is unavailable unless an aligned final surface snapshot supplies explicit unmarked evidence.", arms })}\n`, { flag: "wx" });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1; });
