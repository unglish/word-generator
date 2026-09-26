import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createGunzip, gunzipSync } from "node:zlib";
import type { Word } from "../../../../src/types.js";
import { observeHistoricalNormalization, type Counts } from "./observe.js";

const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
  return value;
}
const digest = (value: unknown): string => sha(JSON.stringify(canonical(value)));
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../../../..");
interface FilePin { file: string; bytes: number; sha256: string }
interface Registration { protocolSha256: string; files: FilePin[]; runtimeFiles: FilePin[] }
interface Protocol { control: { archiveSourceDigest: string; archiveManifestSha256: string; protocolDigest: string; evaluatorDigest: string; referenceDigest: string } }
interface Manifest {
  id: string; cohort: string; generator: { sourceDigest: string };
  protocolDigest: string; evaluatorDigest: string; referenceDigest: string;
  protocol: { wordsPerReplicate: number; profiles: Array<{ id: string; seeds: { development: number[] } }> };
  artifacts: FilePin[];
}
const registrationBytes = readFileSync(join(directory, "registration.json"));
const registration = JSON.parse(registrationBytes.toString("utf8")) as Registration;
const protocolBytes = readFileSync(join(directory, "protocol.json"));
const protocol = JSON.parse(protocolBytes.toString("utf8")) as Protocol;
assert.equal(sha(protocolBytes), registration.protocolSha256);

function verifyFiles(parent: string, files: FilePin[]): void {
  for (const pin of files) {
    const bytes = readFileSync(join(parent, pin.file));
    assert.equal(bytes.length, pin.bytes, pin.file); assert.equal(sha(bytes), pin.sha256, pin.file);
  }
}
function verifyObserver(): void {
  assert.deepEqual(readFileSync(join(directory, "registration.json")), registrationBytes);
  verifyFiles(directory, registration.files); verifyFiles(root, registration.runtimeFiles);
}
const [runArg, outputArg] = process.argv.slice(2);
assert.ok(runArg && outputArg, "Usage: analyze.ts IMMUTABLE_CONTROL NEW_REPORT.json");
const run = resolve(runArg); const output = resolve(outputArg);
assert.ok(!output.startsWith(directory + "/") && !output.startsWith(run + "/"));
verifyObserver();
const manifestBytes = readFileSync(join(run, "manifest.json"));
const envelope = JSON.parse(manifestBytes.toString("utf8")) as { manifest: Manifest; digest: string };
const manifest = envelope.manifest;
assert.equal(digest(manifest), envelope.digest);
assert.equal(sha(manifestBytes), protocol.control.archiveManifestSha256);
assert.equal(digest(manifest.protocol), protocol.control.protocolDigest);
for (const field of ["protocolDigest", "evaluatorDigest", "referenceDigest"] as const) assert.equal(manifest[field], protocol.control[field]);
assert.equal(manifest.generator.sourceDigest, protocol.control.archiveSourceDigest);
assert.equal(manifest.cohort, "development"); assert.equal(manifest.protocol.wordsPerReplicate, 10000);
verifyFiles(run, manifest.artifacts);
const source = JSON.parse(gunzipSync(readFileSync(join(run, "sources.json.gz"))).toString("utf8")) as { generator: unknown };
assert.equal(digest(source.generator), protocol.control.archiveSourceDigest);
const expected = manifest.protocol.profiles.flatMap(profile => profile.seeds.development
  .map(seed => `${profile.id}-${seed}.jsonl.gz`)).sort();
const entries = readdirSync(join(run, "words"), { withFileTypes: true });
assert.ok(entries.every(entry => entry.isFile() && !entry.isSymbolicLink()));
assert.deepEqual(entries.map(entry => entry.name).sort(), expected);
assert.deepEqual(manifest.artifacts.filter(pin => pin.file.startsWith("words/")).map(pin => pin.file.slice(6)).sort(), expected);

const total: Counts = {}; const profiles: Record<string, Counts> = {};
const streams: Record<string, Counts> = {}; const strata: Record<string, Counts> = {};
const accumulate = (to: Counts, counts: Counts): void => {
  for (const [key, value] of Object.entries(counts)) to[key] = (to[key] ?? 0) + value;
};
function morphologyStratum(word: Word): string {
  const morphology = word.trace!.morphology;
  const resolved = morphology?.realization;
  const forms = resolved ?? morphology;
  const prefix = !!forms?.prefix; const suffix = !!forms?.suffix;
  let stratum = "bare";
  if (prefix && suffix) stratum = "both";
  else if (prefix) stratum = "prefix";
  else if (suffix) stratum = "suffix";
  return !resolved && (prefix || suffix) ? `planned-only:${stratum}` : stratum;
}
for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
  let index = 0; const counts: Counts = {};
  const lines = createInterface({ input: createReadStream(join(run, "words", `${profile.id}-${seed}.jsonl.gz`)).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) {
    assert.ok(line);
    const draw = JSON.parse(line) as { profile: string; seed: number; drawIndex: number; word: Word };
    assert.equal(draw.profile, profile.id); assert.equal(draw.seed, seed); assert.equal(draw.drawIndex, index++);
    assert.ok(draw.word.trace?.baseSpelling);
    const observed = observeHistoricalNormalization(draw.word.trace.baseSpelling);
    accumulate(counts, observed); accumulate(total, observed); accumulate(profiles[profile.id] ??= {}, observed);
    const stratum = morphologyStratum(draw.word);
    accumulate(strata[`${profile.id}/${stratum}`] ??= {}, observed);
  }
  assert.equal(index, 10000); streams[`${profile.id}/${seed}`] = counts;
  console.log(`${profile.id}/${seed}: ${index} exact historical ledgers observed`);
}
assert.equal(total.words, 200000);
assert.deepEqual(readFileSync(join(run, "manifest.json")), manifestBytes);
verifyFiles(run, manifest.artifacts); verifyObserver();
writeFileSync(output, JSON.stringify({ version: 1, scope: "Historical structural replay and counts; no English reading/probability certification and no generation",
  registrationSha256: sha(registrationBytes), protocolSha256: registration.protocolSha256,
  observerFiles: registration.files, runtimeFiles: registration.runtimeFiles,
  archiveManifestSha256: sha(manifestBytes), archiveSourceDigest: manifest.generator.sourceDigest,
  total, profiles, streams, strata }, null, 2) + "\n", { flag: "wx" });
