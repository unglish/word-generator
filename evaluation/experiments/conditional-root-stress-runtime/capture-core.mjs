import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants, createReadStream, createWriteStream } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip, gunzipSync, gzipSync } from "node:zlib";
import { canonical, digest } from "../../quality/serialization.ts";
import { readRun, rescoreRun, validateProtocol } from "../../quality/capture.ts";
import { absent } from "./parity.mjs";
import { METRIC_DEFINITIONS } from "../../quality/metrics.ts";

export const RAW_SCHEMA = "q09-raw-capture-v1";
export const PRODUCER_KIND = "configured-public-api-capture-v1";
const json = value => `${JSON.stringify(value)}\n`;
const shardFiles = protocol => protocol.profiles.flatMap(profile => profile.seeds.development.map(seed => `words/${profile.id}-${seed}.jsonl.gz`));
const lockDigest = sources => digest(sources.packageFiles.find(file => file.path === "package-lock.json").content);
async function save(out, file, value) {
  const bytes = Buffer.from(json(value));
  await writeFile(join(out, file), file.endsWith(".gz") ? gzipSync(bytes) : bytes, { flag: "wx" });
}
async function artifact(out, file) {
  const hash = createHash("sha256"); let bytes = 0;
  assert.equal((await lstat(join(out, file))).isFile(), true, file);
  for await (const chunk of createReadStream(join(out, file))) { hash.update(chunk); bytes += chunk.length; }
  return { file, bytes, sha256: hash.digest("hex") };
}
function validateIdentity(id, producer) {
  assert.match(id, /^[a-z0-9][a-z0-9-]{0,79}$/);
  assert.equal(producer.kind, PRODUCER_KIND);
  assert.equal(producer.rawSummarySchema, RAW_SCHEMA);
  assert.equal(producer.metricStatus, "not-evaluated");
}
function checkCoordinate(draw, profile, seed, drawIndex, previousRngCalls) {
  assert.equal(draw.profile, profile.id); assert.equal(draw.seed, seed); assert.equal(draw.drawIndex, drawIndex);
  assert(draw.word && typeof draw.word === "object" && draw.word.trace, "Every raw draw requires a complete traced word");
  assert(Number.isSafeInteger(draw.rng?.before) && Number.isSafeInteger(draw.rng?.after));
  assert.equal(draw.rng.before, previousRngCalls); assert(draw.rng.after >= draw.rng.before);
}

/**
 * Raw summary is deliberately NOT RunSummary: its distinct schema discriminator
 * makes frozen compareSummaries reject it, while readRun/rescoreRun can consume
 * the pinned words. No zero/empty core-score result is asserted here.
 */
export async function writeRawCapture({ out, id, protocol, sources, generator, producer, source, accounting, after, progress = () => {} }) {
  validateProtocol(protocol); validateIdentity(id, producer);
  assert.equal(digest(protocol), producer.scheduleDigest, "Producer schedule binding differs");
  assert.equal(generator.sourceDigest, digest(sources.generator));
  await mkdir(out); // Existing or interrupted publications are retained.
  await mkdir(join(out, "words"));
  const files = ["sources.json.gz", "summary.json", "generation-accounting.json", ...shardFiles(protocol)];
  const summary = { schemaVersion: RAW_SCHEMA, id, cohort: "development", protocolDigest: digest(protocol),
    evaluatorDigest: digest({ files: sources.evaluator, definitions: [] }), referenceDigest: digest(sources.references),
    definitions: [], profiles: [], captureOnly: { metricStatus: "not-evaluated", words: 0, streams: [] } };
  try {
    await save(out, "sources.json.gz", sources);
    for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
      let count = 0; let previousRngCalls = 0;
      async function* lines() {
        for await (const draw of source(profile, seed)) {
          assert(count < protocol.wordsPerReplicate, "Unexpected extra draw");
          checkCoordinate(draw, profile, seed, count, previousRngCalls); previousRngCalls = draw.rng.after;
          count++; summary.captureOnly.words++;
          yield json(draw);
        }
        assert.equal(count, protocol.wordsPerReplicate, "Incomplete raw stream");
      }
      const file = `words/${profile.id}-${seed}.jsonl.gz`;
      await pipeline(Readable.from(lines()), createGzip(), createWriteStream(join(out, file), { flags: "wx" }));
      summary.captureOnly.streams.push({ profile: profile.id, seed, words: count });
      progress(`${summary.captureOnly.streams.length}/${shardFiles(protocol).length} streams: ${profile.id}/${seed}`);
    }
    await save(out, "generation-accounting.json", accounting());
    await save(out, "summary.json", summary);
    await after(); // Source/config/engine preservation must pass before manifest publication.
    const manifest = { schemaVersion: 1, id, createdAt: new Date().toISOString(), cohort: "development", protocol,
      protocolDigest: summary.protocolDigest, evaluatorDigest: summary.evaluatorDigest, referenceDigest: summary.referenceDigest,
      generator, producer, environment: { node: producer.engine.version, platform: producer.engine.platform, arch: producer.engine.arch,
        packageLockDigest: lockDigest(sources) }, artifacts: await Promise.all(files.map(file => artifact(out, file))) };
    await save(out, "manifest.json", { manifest, digest: digest(manifest) });
    return { manifest, summary };
  } catch (error) {
    await save(out, "failure.json", { passed: false, completed: summary.captureOnly, accounting: accounting(),
      error: { name: error.name, message: error.message, stack: error.stack } });
    throw error;
  }
}

export async function* readRawDraws(path) {
  const input = createReadStream(path); const unzip = createGunzip();
  input.on("error", error => unzip.destroy(error)); input.pipe(unzip); unzip.setEncoding("utf8");
  let pending = "";
  try {
    for await (const chunk of unzip) {
      pending += chunk;
      let end;
      while ((end = pending.indexOf("\n")) >= 0) {
        yield JSON.parse(pending.slice(0, end)); pending = pending.slice(end + 1);
      }
    }
    assert.equal(pending, "", "Raw shard must end with a complete newline-delimited record");
  } finally { input.destroy(); unzip.destroy(); }
}
async function exactDirectory(directory, files) {
  const actual = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "words") { assert(entry.isDirectory()); continue; }
    assert(entry.isFile(), `Unexpected directory or alias ${entry.name}`); actual.push(entry.name);
  }
  for (const entry of await readdir(join(directory, "words"), { withFileTypes: true })) {
    assert(entry.isFile(), `Unexpected shard directory or alias ${entry.name}`); actual.push(`words/${entry.name}`);
  }
  assert.deepStrictEqual(actual.sort(), [...files].sort(), "Raw filesystem artifact set differs");
}
export async function verifyRawCapture({ input, expectedProducer, expectedConfig, expectedSources }) {
  const { manifest, summary } = await readRun(input, true);
  validateIdentity(manifest.id, manifest.producer);
  assert.deepStrictEqual(manifest.producer, expectedProducer, "Raw producer identity differs from trusted input");
  assert.deepStrictEqual(manifest.generator.effectiveConfig, canonical(expectedConfig), "Effective configuration differs from trusted input");
  assert.equal(summary.schemaVersion, RAW_SCHEMA); assert.equal(manifest.cohort, "development");
  validateProtocol(manifest.protocol);
  assert.equal(digest(manifest.protocol), expectedProducer.scheduleDigest, "Raw schedule differs from trusted producer");
  assert.deepStrictEqual(summary.definitions, []); assert.deepStrictEqual(summary.profiles, []);
  assert.equal(summary.captureOnly.metricStatus, "not-evaluated");
  const expectedFiles = ["sources.json.gz", "summary.json", "generation-accounting.json", ...shardFiles(manifest.protocol)];
  assert.deepStrictEqual(manifest.artifacts.map(item => item.file).sort(), [...expectedFiles].sort());
  await exactDirectory(input, ["manifest.json", ...expectedFiles]);
  const sources = JSON.parse(gunzipSync(await readFile(join(input, "sources.json.gz"))));
  assert.deepStrictEqual(sources, expectedSources, "Archived source bytes differ from trusted input");
  assert.equal(digest(sources.generator), manifest.generator.sourceDigest);
  assert.equal(digest(sources.references), manifest.referenceDigest);
  assert.equal(digest({ files: sources.evaluator, definitions: [] }), manifest.evaluatorDigest);
  assert.deepStrictEqual(manifest.environment, { node: expectedProducer.engine.version, platform: expectedProducer.engine.platform,
    arch: expectedProducer.engine.arch, packageLockDigest: lockDigest(sources) }, "Raw environment differs from trusted producer");
  const streams = []; const observedAccounting = []; let words = 0;
  for (const profile of manifest.protocol.profiles) for (const seed of profile.seeds.development) {
    let count = 0; let previousRngCalls = 0; const boundaries = createHash("sha256");
    for await (const draw of readRawDraws(join(input, `words/${profile.id}-${seed}.jsonl.gz`))) {
      assert(count < manifest.protocol.wordsPerReplicate); checkCoordinate(draw, profile, seed, count, previousRngCalls);
      boundaries.update(json({ drawIndex: count, before: draw.rng.before, after: draw.rng.after }));
      previousRngCalls = draw.rng.after; count++;
    }
    observedAccounting.push({ profile: profile.id, seed, generationRngCalls: previousRngCalls, boundariesSha256: boundaries.digest("hex") });
    assert.equal(count, manifest.protocol.wordsPerReplicate); words += count;
    streams.push({ profile: profile.id, seed, words: count });
  }
  assert.equal(summary.captureOnly.words, words); assert.deepStrictEqual(summary.captureOnly.streams, streams);
  const accounting = JSON.parse(await readFile(join(input, "generation-accounting.json")));
  assert.equal(accounting.schemaVersion, "q09-generation-accounting-v1");
  assert.equal(accounting.attemptedGenerationCalls, words); assert.equal(accounting.completedGenerationCalls, words);
  assert.equal(accounting.streams.length, observedAccounting.length);
  for (const [index, expected] of observedAccounting.entries()) {
    const actual = accounting.streams[index];
    assert.match(actual.rngBytesSha256, /^[a-f0-9]{64}$/);
    const { rngBytesSha256, ...comparable } = actual;
    assert.deepStrictEqual(comparable, expected);
  }
  // Rehash after record parsing so a stale pre-read archive cannot pass.
  for (const expected of manifest.artifacts) assert.deepStrictEqual(await artifact(input, expected.file), expected);
  const envelope = JSON.parse(await readFile(join(input, "manifest.json")));
  assert.deepStrictEqual(envelope, { manifest, digest: digest(manifest) });
  return { manifest, summary, sources };
}

export async function rescoreRawCapture({ root, input, out, id, expectedProducer, expectedConfig, expectedSources, after, progress }) {
  await absent(out);
  const pending = `${out}.pending`; await absent(pending);
  const raw = await verifyRawCapture({ input, expectedProducer, expectedConfig, expectedSources });
  let publicationStarted = false;
  let phase = "frozen-rescore";
  try {
    const result = await rescoreRun({ root, input, out: pending, id, progress });
    const scored = await readRun(pending, true);
    assert.equal(result.schemaVersion, 1); assert.deepStrictEqual(result.definitions, METRIC_DEFINITIONS);
    assert.deepStrictEqual(result.profiles.map(profile => ({ id: profile.id, words: profile.words })),
      raw.manifest.protocol.profiles.map(profile => ({ id: profile.id, words: profile.seeds.development.length * raw.manifest.protocol.wordsPerReplicate })));
    assert.deepStrictEqual(scored.manifest.generator, raw.manifest.generator);
    assert.deepStrictEqual(scored.manifest.environment, raw.manifest.environment);
    assert.deepStrictEqual(scored.manifest.producer, raw.manifest.producer);
    assert.equal(scored.manifest.rescore.parentManifestDigest, digest(raw.manifest));
    assert.notEqual(scored.manifest.evaluatorDigest, raw.manifest.evaluatorDigest);
    for (const file of shardFiles(raw.manifest.protocol)) {
      assert.deepStrictEqual(scored.manifest.artifacts.find(record => record.file === file), raw.manifest.artifacts.find(record => record.file === file));
    }
    const provenance = JSON.parse(gunzipSync(await readFile(join(pending, "provenance.json.gz"))));
    assert.deepStrictEqual(provenance.at(-1), { manifest: raw.manifest, digest: digest(raw.manifest), sources: raw.sources });
    // Keep the exact evaluator manifest bytes, but do not expose a completed run
    // until the broader adapter/source checks and exclusive publication pass.
    await rename(join(pending, "manifest.json"), join(pending, "unpublished-manifest.json"));
    phase = "adapter-after-rescore"; await after();
    phase = "exclusive-publication"; await mkdir(out); publicationStarted = true; await mkdir(join(out, "words"));
    for (const record of scored.manifest.artifacts) {
      await copyFile(join(pending, record.file), join(out, record.file), constants.COPYFILE_EXCL);
      assert.deepStrictEqual(await artifact(out, record.file), record);
    }
    phase = "adapter-before-manifest"; await after();
    await copyFile(join(pending, "unpublished-manifest.json"), join(out, "manifest.json"), constants.COPYFILE_EXCL);
    return scored;
  } catch (error) {
    try { await rename(join(pending, "manifest.json"), join(pending, "unpublished-manifest.json")); }
    catch (renameError) { if (renameError.code !== "ENOENT") throw renameError; }
    try { await mkdir(pending); }
    catch (directoryError) { if (directoryError.code !== "EEXIST") throw directoryError; assert((await lstat(pending)).isDirectory()); }
    const failure = { passed: false, phase, error: { name: error.name, message: error.message, stack: error.stack } };
    await save(pending, "adapter-failure.json", failure);
    if (publicationStarted) await save(out, "adapter-failure.json", failure);
    throw error;
  }
}
