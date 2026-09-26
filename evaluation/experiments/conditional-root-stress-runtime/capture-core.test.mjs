import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import test from "node:test";
import { canonical, digest } from "../../quality/serialization.ts";
import { readRun } from "../../quality/capture.ts";
import { compareSummaries } from "../../quality/compare.ts";
import { PRODUCER_KIND, RAW_SCHEMA, rescoreRawCapture, verifyRawCapture, writeRawCapture } from "./capture-core.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const protocol = { schemaVersion: 1, id: "synthetic-only", wordsPerReplicate: 2, reviewDrawsPerReplicate: 1,
  profiles: [{ id: "fixture", options: { mode: "lexicon", morphology: false }, seeds: { development: [1, 2], validation: [3, 4] } }] };
const producer = { kind: PRODUCER_KIND, rawSummarySchema: RAW_SCHEMA, metricStatus: "not-evaluated", scheduleDigest: digest(protocol), syntheticFixture: true,
  engine: { version: process.version, platform: process.platform, arch: process.arch } };
const config = { syntheticFixture: true };
function word() {
  return { syllables: [{ onset: [{ sound: "k" }], nucleus: [{ sound: "æ" }], coda: [{ sound: "t" }], stress: "ˈ" }],
    pronunciation: "/kæt/", written: { clean: "cat", hyphenated: "cat" }, trace: { syllableCount: 1, attempts: 0,
      structural: [], stages: [], graphemeSelections: [], repairs: [], summary: { totalDecisions: 0, repairCount: 0, morphologyApplied: false } } };
}
async function sources() {
  const refs = (await readdir(join(root, "data/cmu"))).filter(file => /\.(ts|js|mjs|json)$/.test(file)).sort();
  const read = async path => ({ path, content: await readFile(join(root, path), "utf8") });
  return { generator: [], evaluator: [await read("evaluation/experiments/conditional-root-stress-runtime/capture-core.mjs")],
    references: await Promise.all(refs.map(file => read(`data/cmu/${file}`))), packageFiles: await Promise.all(["package.json", "package-lock.json"].map(read)) };
}
async function fixture(directory, options = {}) {
  const sourceFiles = await sources(); const out = join(directory, "raw");
  const source = async function* (profile, seed) {
    for (let drawIndex = 0; drawIndex < 2; drawIndex++) yield { profile: profile.id, seed, drawIndex, rng: { before: 0, after: 0 }, word: word() };
  };
  const result = await writeRawCapture({ out, id: "synthetic-raw", protocol, sources: sourceFiles,
    generator: { commit: "synthetic-no-generation", dirty: false, sourceDigest: digest(sourceFiles.generator), effectiveConfig: canonical(config), patch: "" },
    producer, source, accounting: () => ({ schemaVersion: "q09-generation-accounting-v1", syntheticFixture: true,
      attemptedGenerationCalls: 4, completedGenerationCalls: 4, streams: [1, 2].map(seed => ({ profile: "fixture", seed, generationRngCalls: 0,
        rngBytesSha256: createHash("sha256").digest("hex"), boundariesSha256: createHash("sha256").update([0, 1].map(drawIndex =>
          JSON.stringify({ drawIndex, before: 0, after: 0 }) + "\n").join("")).digest("hex") })) }), after: async () => {}, ...options });
  return { out, ...result };
}
async function temporary(run) {
  const directory = await mkdtemp(join(tmpdir(), "q09-capture-synthetic-"));
  try { await run(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}
async function redigest(out, file, bytes) {
  await writeFile(join(out, file), bytes);
  const envelope = JSON.parse(await readFile(join(out, "manifest.json")));
  const item = envelope.manifest.artifacts.find(record => record.file === file);
  item.bytes = bytes.length; item.sha256 = createHash("sha256").update(bytes).digest("hex");
  envelope.digest = digest(envelope.manifest);
  await writeFile(join(out, "manifest.json"), JSON.stringify(envelope));
}
const verify = async input => verifyRawCapture({ input, expectedProducer: producer, expectedConfig: config, expectedSources: await sources() });

test("frozen reader/rescorer preserve exact words and producer while raw summaries cannot be compared", () => temporary(async directory => {
  const raw = await fixture(directory);
  const loaded = await readRun(raw.out, true);
  assert.equal(loaded.summary.schemaVersion, RAW_SCHEMA);
  assert.throws(() => compareSummaries(loaded.summary, loaded.summary), /Unsupported quality summary schema/);
  const verified = await verify(raw.out); assert.equal(verified.summary.captureOnly.words, 4);
  const out = join(directory, "scored");
  const scored = await rescoreRawCapture({ root, input: raw.out, out, id: "synthetic-scored", expectedProducer: producer,
    expectedConfig: config, expectedSources: await sources(), after: async () => {} });
  assert.equal(scored.summary.schemaVersion, 1); assert.equal(scored.summary.profiles[0].words, 4);
  assert.equal(scored.summary.profiles[0].metrics.orthography_trace_missing.hits, 4);
  assert.throws(() => compareSummaries(raw.summary, scored.summary), /Unsupported quality summary schema/);
  assert.equal(compareSummaries(scored.summary, scored.summary).profiles[0].words, 4);
  for (const seed of [1, 2]) assert.deepStrictEqual(await readFile(join(out, `words/fixture-${seed}.jsonl.gz`)), await readFile(join(raw.out, `words/fixture-${seed}.jsonl.gz`)));
}));
test("raw identity requires externally expected producer and effective configuration", () => temporary(async directory => {
  const raw = await fixture(directory);
  await assert.rejects(verifyRawCapture({ input: raw.out, expectedProducer: { ...producer, syntheticFixture: false }, expectedConfig: config, expectedSources: await sources() }), /producer identity/);
  await assert.rejects(verifyRawCapture({ input: raw.out, expectedProducer: producer, expectedConfig: {}, expectedSources: await sources() }), /Effective configuration/);
}));
test("raw publication retains incomplete schedule failures and refuses existing output", () => temporary(async directory => {
  const source = async function* (profile, seed) { yield { profile: profile.id, seed, drawIndex: 0, rng: { before: 0, after: 0 }, word: word() }; };
  await assert.rejects(fixture(directory, { source }), /Incomplete raw stream/);
  const failure = JSON.parse(await readFile(join(directory, "raw/failure.json")));
  assert.equal(failure.passed, false); assert.equal(failure.completed.words, 1);
  await assert.rejects(readFile(join(directory, "raw/manifest.json")), /ENOENT/);
  await assert.rejects(fixture(directory), /EEXIST/);
}));
test("a source preservation failure prevents completed manifest publication", () => temporary(async directory => {
  await assert.rejects(fixture(directory, { after: async () => { throw new Error("source changed"); } }), /source changed/);
  const failure = JSON.parse(await readFile(join(directory, "raw/failure.json")));
  assert.equal(failure.completed.words, 4); assert.equal(failure.passed, false);
  await assert.rejects(readFile(join(directory, "raw/manifest.json")), /ENOENT/);
}));
test("coordinate forgery remains invalid even with coherent compressed hashes", () => temporary(async directory => {
  const raw = await fixture(directory); const file = "words/fixture-1.jsonl.gz";
  const rows = gunzipSync(await readFile(join(raw.out, file))).toString().trimEnd().split("\n").map(JSON.parse);
  rows[1].drawIndex = 0;
  await redigest(raw.out, file, gzipSync(rows.map(row => JSON.stringify(row)).join("\n") + "\n"));
  await assert.rejects(verify(raw.out));
}));
test("dropped, extra, and malformed raw artifacts cannot pass the strict capture reader", async () => {
  for (const mutate of [
    async out => { await writeFile(join(out, "unlisted.json"), "{}"); },
    async out => { await rm(join(out, "words/fixture-2.jsonl.gz")); },
    async out => {
      const file = "summary.json"; const summary = JSON.parse(await readFile(join(out, file)));
      summary.schemaVersion = 1; await redigest(out, file, Buffer.from(JSON.stringify(summary)));
    },
    async out => {
      const file = "summary.json"; const summary = JSON.parse(await readFile(join(out, file)));
      summary.captureOnly.words = 3; await redigest(out, file, Buffer.from(JSON.stringify(summary)));
    },
  ]) await temporary(async directory => { const raw = await fixture(directory); await mutate(raw.out); await assert.rejects(verify(raw.out)); });
});

test("self-consistent source and accounting forgeries are not trusted", async () => {
  for (const mutate of [
    async out => {
      const file = "sources.json.gz"; const source = JSON.parse(gunzipSync(await readFile(join(out, file))));
      source.generator = [{ path: "src/forged.ts", content: "forged" }];
      await redigest(out, file, gzipSync(JSON.stringify(source)));
      const envelope = JSON.parse(await readFile(join(out, "manifest.json")));
      envelope.manifest.generator.sourceDigest = digest(source.generator); envelope.digest = digest(envelope.manifest);
      await writeFile(join(out, "manifest.json"), JSON.stringify(envelope));
    },
    async out => {
      const file = "generation-accounting.json"; const value = JSON.parse(await readFile(join(out, file)));
      value.attemptedGenerationCalls = 3; await redigest(out, file, Buffer.from(JSON.stringify(value)));
    },
    async out => {
      const file = "generation-accounting.json"; const value = JSON.parse(await readFile(join(out, file)));
      value.streams[0].generationRngCalls = 1; await redigest(out, file, Buffer.from(JSON.stringify(value)));
    },
  ]) await temporary(async directory => { const raw = await fixture(directory); await mutate(raw.out); await assert.rejects(verify(raw.out)); });
});

test("coherently redigested shorter or reordered schedules remain bound to the reviewed producer", async () => {
  for (const kind of ["shorter", "reordered"]) await temporary(async directory => {
    const raw = await fixture(directory);
    const envelope = JSON.parse(await readFile(join(raw.out, "manifest.json")));
    const summary = JSON.parse(await readFile(join(raw.out, "summary.json")));
    const account = JSON.parse(await readFile(join(raw.out, "generation-accounting.json")));
    if (kind === "shorter") {
      envelope.manifest.protocol.wordsPerReplicate = 1;
      summary.captureOnly.words = 2; summary.captureOnly.streams.forEach(stream => { stream.words = 1; });
      account.attemptedGenerationCalls = 2; account.completedGenerationCalls = 2;
      for (const seed of [1, 2]) {
        const file = `words/fixture-${seed}.jsonl.gz`;
        const first = gunzipSync(await readFile(join(raw.out, file))).toString().split("\n")[0];
        await redigest(raw.out, file, gzipSync(first + "\n"));
      }
      account.streams.forEach(stream => { stream.boundariesSha256 = createHash("sha256").update(JSON.stringify({ drawIndex: 0, before: 0, after: 0 }) + "\n").digest("hex"); });
    } else {
      envelope.manifest.protocol.profiles[0].seeds.development.reverse();
      summary.captureOnly.streams.reverse(); account.streams.reverse();
    }
    summary.protocolDigest = digest(envelope.manifest.protocol);
    await redigest(raw.out, "summary.json", Buffer.from(JSON.stringify(summary)));
    await redigest(raw.out, "generation-accounting.json", Buffer.from(JSON.stringify(account)));
    const updated = JSON.parse(await readFile(join(raw.out, "manifest.json")));
    updated.manifest.protocol = envelope.manifest.protocol;
    updated.manifest.protocolDigest = digest(updated.manifest.protocol); updated.digest = digest(updated.manifest);
    await writeFile(join(raw.out, "manifest.json"), JSON.stringify(updated));
    await readRun(raw.out, true); // This forgery is internally coherent.
    await assert.rejects(verify(raw.out), /schedule differs from trusted producer/);
  });
});
test("generation environment cannot differ from the externally reviewed engine", () => temporary(async directory => {
  const raw = await fixture(directory);
  const envelope = JSON.parse(await readFile(join(raw.out, "manifest.json")));
  envelope.manifest.environment.node = "forged-engine"; envelope.digest = digest(envelope.manifest);
  await writeFile(join(raw.out, "manifest.json"), JSON.stringify(envelope));
  await readRun(raw.out, true);
  await assert.rejects(verify(raw.out), /environment differs from trusted producer/);
}));

test("adapter after-failure retains staged bytes without any completed scored manifest", () => temporary(async directory => {
  const raw = await fixture(directory); const out = join(directory, "scored");
  await assert.rejects(rescoreRawCapture({ root, input: raw.out, out, id: "synthetic-scored", expectedProducer: producer,
    expectedConfig: config, expectedSources: await sources(), after: async () => { throw new Error("broader adapter source changed"); } }), /broader adapter source changed/);
  await assert.rejects(readRun(out, true), /ENOENT/);
  await assert.rejects(readRun(`${out}.pending`, true), /ENOENT/);
  const manifest = JSON.parse(await readFile(join(`${out}.pending`, "unpublished-manifest.json")));
  assert.equal(manifest.manifest.id, "synthetic-scored");
  const failure = JSON.parse(await readFile(join(`${out}.pending`, "adapter-failure.json")));
  assert.equal(failure.passed, false); assert.equal(failure.phase, "adapter-after-rescore");
  assert.deepStrictEqual(await readFile(join(`${out}.pending`, "words/fixture-1.jsonl.gz")), await readFile(join(raw.out, "words/fixture-1.jsonl.gz")));
}));
test("late publication gate failure leaves only explicitly incomplete final files", () => temporary(async directory => {
  const raw = await fixture(directory); const out = join(directory, "scored"); let gates = 0;
  await assert.rejects(rescoreRawCapture({ root, input: raw.out, out, id: "synthetic-scored", expectedProducer: producer,
    expectedConfig: config, expectedSources: await sources(), after: async () => { if (++gates === 2) throw new Error("late source changed"); } }), /late source changed/);
  await assert.rejects(readRun(out, true), /ENOENT/);
  const failure = JSON.parse(await readFile(join(out, "adapter-failure.json")));
  assert.equal(failure.passed, false); assert.equal(failure.phase, "adapter-before-manifest");
}));

test("early frozen-rescore rejection preserves the original error in an incomplete pending directory", () => temporary(async directory => {
  const raw = await fixture(directory); const out = join(directory, "scored");
  await assert.rejects(rescoreRawCapture({ root, input: raw.out, out, id: "INVALID ID", expectedProducer: producer,
    expectedConfig: config, expectedSources: await sources(), after: async () => {} }), /Run ID must be a lowercase slug/);
  await assert.rejects(readRun(out, true), /ENOENT/);
  await assert.rejects(readRun(`${out}.pending`, true), /ENOENT/);
  const failure = JSON.parse(await readFile(join(`${out}.pending`, "adapter-failure.json")));
  assert.equal(failure.phase, "frozen-rescore"); assert.match(failure.error.message, /Run ID must be a lowercase slug/);
}));
