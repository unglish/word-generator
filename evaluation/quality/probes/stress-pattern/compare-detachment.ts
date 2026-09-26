import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readRun } from "../../capture.js";
import { digest } from "../../serialization.js";
import type { SourceArchive } from "../../model.js";
import { gunzipSync } from "node:zlib";
import { draws, filesDigest, profiles, scheduleSha256, sha } from "../syllable-weight/shared.js";

type Variant = { tracing: boolean; wordHash: string; traceHash: string | null; rngBoundaryHash: string; rngCalls: number; nextRng: number };
interface Parity {
  schemaVersion: number;
  probe: string;
  node: string;
  reference: string;
  sources: Record<string, string>;
  sourceDigest: string;
  toolSha256: string;
  scheduleSha256: string;
  distinctScheduledDraws: number;
  generatedWords: number;
  streams: Array<{ profile: string; options: unknown; seed: number; draws: number; variants: Variant[] }>;
}

function validateParity(report: Parity): void {
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.probe, "stress-view-detachment-parity-v1");
  assert.equal(report.scheduleSha256, scheduleSha256);
  assert.equal(report.sourceDigest, filesDigest(report.sources));
  assert.equal(report.distinctScheduledDraws, 20000);
  assert.equal(report.generatedWords, 40000);
  assert.equal(report.streams.length, 20);
  let index = 0;
  for (const profile of profiles) for (const seed of profile.seeds) {
    const stream = report.streams[index++];
    assert.equal(stream.profile, profile.id);
    assert.equal(stream.seed, seed);
    assert.equal(stream.draws, draws);
    assert.deepEqual(stream.options, profile.options);
    assert.equal(stream.variants.length, 2);
    for (const [variantIndex, variant] of stream.variants.entries()) {
      assert.equal(variant.tracing, variantIndex === 1);
      for (const hash of [variant.wordHash, variant.rngBoundaryHash]) assert.match(hash, /^[a-f0-9]{64}$/);
      if (variant.tracing) assert.match(variant.traceHash!, /^[a-f0-9]{64}$/);
      else assert.equal(variant.traceHash, null);
      assert.ok(Number.isSafeInteger(variant.rngCalls) && variant.rngCalls > 0);
      assert.ok(Number.isFinite(variant.nextRng) && variant.nextRng >= 0 && variant.nextRng < 1);
    }
    for (const field of ["wordHash", "rngBoundaryHash", "rngCalls", "nextRng"] as const) assert.equal(stream.variants[0][field], stream.variants[1][field]);
  }
}

const [beforeRunArg, afterRunArg, beforeParityArg, afterParityArg, outputArg] = process.argv.slice(2);
assert.ok(beforeRunArg && afterRunArg && beforeParityArg && afterParityArg && outputArg,
  "Usage: compare-detachment.ts BEFORE_RUN AFTER_RUN BEFORE_PARITY.json AFTER_PARITY.json REPORT.json");
const parityBytes = await Promise.all([beforeParityArg, afterParityArg].map(path => readFile(resolve(path))));
const reports: Parity[] = parityBytes.map(bytes => JSON.parse(bytes.toString()));
for (const report of reports) validateParity(report);
for (const field of ["node", "toolSha256", "scheduleSha256", "streams"] as const) assert.deepEqual(reports[0][field], reports[1][field], `Parity mismatch: ${field}`);
const directories = [beforeRunArg, afterRunArg].map(path => resolve(path));
const runs = await Promise.all(directories.map(directory => readRun(directory, true)));
const expected = runs[0].manifest.protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`));
for (const [index, run] of runs.entries()) {
  const manifest = run.manifest;
  assert.equal(manifest.cohort, "development");
  assert.equal(manifest.protocol.wordsPerReplicate, 10000);
  assert.equal(manifest.evaluatorDigest, "ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007");
  assert.equal(manifest.generator.commit, reports[index].reference);
  assert.equal(manifest.environment.node, reports[index].node);
  assert.deepEqual(manifest.protocol.profiles.map(profile => ({ id: profile.id, options: profile.options, seeds: profile.seeds.development })), profiles);
  assert.deepEqual(manifest.artifacts.filter(item => item.file.startsWith("words/")).map(item => item.file).sort(), [...expected].sort());
  assert.deepEqual((await readdir(resolve(directories[index], "words"))).map(file => `words/${file}`).sort(), [...expected].sort());
  const sourceBytes = await readFile(resolve(directories[index], "sources.json.gz"));
  const sources: SourceArchive = JSON.parse(gunzipSync(sourceBytes).toString());
  assert.equal(digest(sources.generator), manifest.generator.sourceDigest);
  for (const file of [...sources.generator, ...sources.packageFiles]) assert.equal(sha(file.content), reports[index].sources[file.path], `Parity/archive source mismatch: ${file.path}`);
}
for (const field of ["protocolDigest", "evaluatorDigest", "referenceDigest", "environment"] as const) assert.deepEqual(runs[0].manifest[field], runs[1].manifest[field]);
assert.deepEqual(runs[0].manifest.generator.effectiveConfig, runs[1].manifest.generator.effectiveConfig);
assert.deepEqual(runs[0].summary.profiles, runs[1].summary.profiles, "Frozen summary changed");
const shards = expected.map(file => {
  const before = runs[0].manifest.artifacts.find(item => item.file === file)!;
  const after = runs[1].manifest.artifacts.find(item => item.file === file)!;
  assert.deepEqual(before, after, `Raw word archive changed: ${file}`);
  return before;
});
const report = {
  schemaVersion: 1, probe: "stress-view-detachment-comparison-v1", result: "pass",
  completeWordsCompared: 200000, completeRawShardsByteIdentical: true, fullLegacyTracesEqual: true,
  rngScheduledDraws: 20000, rngBoundariesCallsNextValueEqual: true, traceOnOffEqual: true,
  before: { commit: reports[0].reference, generatorDigest: runs[0].manifest.generator.sourceDigest, manifestDigest: digest(runs[0].manifest), parityReportSha256: sha(parityBytes[0]) },
  after: { commit: reports[1].reference, generatorDigest: runs[1].manifest.generator.sourceDigest, manifestDigest: digest(runs[1].manifest), parityReportSha256: sha(parityBytes[1]) },
  parityToolSha256: reports[0].toolSha256, comparatorSha256: sha(await readFile(fileURLToPath(import.meta.url))), shards,
};
await writeFile(resolve(outputArg), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ result: report.result, completeWordsCompared: report.completeWordsCompared, rngScheduledDraws: report.rngScheduledDraws, report: resolve(outputArg) }));
