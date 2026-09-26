import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../../../../src/index.js";
import type { WordTrace } from "../../../../src/core/trace.js";
import type { Draw, Protocol, SourceArchive } from "../../model.js";
import { digest } from "../../serialization.js";
import { analyze, emptyCounts, observe } from "./analyze.js";

function draw(seed = 404): Draw {
  return { profile: "test", seed, drawIndex: 0, word: generateWord({ seed, trace: true }) };
}

function legacyDraw(): Draw {
  const word = createGenerator({
    ...englishConfig,
    morphology: {
      ...englishConfig.morphology!,
      boundaryPolicy: { enablePrefixRootFallback: true, enableRootSuffixFallback: true, fallbackBridgeOnsets: [["h", 100]] },
    },
  }).generateWord({ seed: 3, trace: true });
  assert.equal(word.written.clean, "broing");
  return { profile: "test", seed: 3, drawIndex: 0, word };
}

test("counts historical insertion evidence without inventing opportunity coverage", () => {
  const archived = legacyDraw();
  archived.word.trace!.structural = archived.word.trace!.structural.filter(event => event.event !== "morphHiatusDecision");
  const counts = emptyCounts();
  observe(counts, archived, false);
  assert.equal(counts.affixedWords, 1);
  assert.deepEqual(counts.decisionCoverage, { availableAffixedWords: 0, unknownAffixedWords: 1 });
  assert.equal(counts.bridgeWords, 1);
  assert.deepEqual(counts.bridgeEvents, { "prefix-root": 0, "root-suffix": 1 });
  assert.deepEqual(counts.bridgeSounds, { h: 1 });
  assert.deepEqual(counts.decisions, { "prefix-root": 0, "root-suffix": 0 });
  assert.equal(counts.decisionInsertionEventMismatches, 0);
});

test("counts two preserved boundaries as one affixed word and keeps root events separate", () => {
  const archived = draw(43);
  archived.word.trace!.structural.push({ event: "vowelHiatusFallback", inserted: "h", leftSyllableIndex: 0, rightSyllableIndex: 1 });
  const counts = emptyCounts();
  observe(counts, archived, true);
  assert.equal(counts.affixedWords, 1);
  assert.equal(counts.decisionCoverage.availableAffixedWords, 1);
  assert.deepEqual(counts.decisions, { "prefix-root": 1, "root-suffix": 1 });
  assert.equal(counts.outcomes.preserved, 2);
  assert.equal(counts.surfaceVowelBoundaries, 2);
  assert.equal(counts.bridgeWords, 0);
  assert.equal(counts.rootBridgeEvents, 1);
  assert.equal(counts.finalStructureMismatches, 0);
  assert.equal(counts.decisionInsertionEventMismatches, 0);
});

test("distinguishes a disabled policy from an enabled policy without candidates", () => {
  const archived = draw();
  archived.word = createGenerator({
    ...englishConfig,
    morphology: { ...englishConfig.morphology!, boundaryPolicy: { enableRootSuffixFallback: true, fallbackBridgeOnsets: [] } },
  }).generateWord({ seed: 404, trace: true });
  const counts = emptyCounts();
  observe(counts, archived, true);
  assert.equal(counts.outcomes["no-bridge-candidate"], 1);
  assert.equal(counts.outcomes.preserved, 0);
  assert.equal(counts.bridgeWords, 0);
  assert.equal(counts.finalStructureMismatches, 0);
  assert.equal(counts.decisionInsertionEventMismatches, 0);
});

test("allows subsequent vowel reduction but detects a changed boundary structure", () => {
  const archived = draw();
  const decision = archived.word.trace!.structural.find(event => event.event === "morphHiatusDecision")!;
  assert.equal(decision.event, "morphHiatusDecision");
  const right = archived.word.syllables[decision.rightSyllableIndex];
  right.nucleus = [englishConfig.phonemes.find(phone => phone.sound === "ə")!];
  const reduced = emptyCounts();
  observe(reduced, archived, true);
  assert.equal(reduced.finalStructureMismatches, 0);
  right.onset = [englishConfig.phonemes.find(phone => phone.sound === "h")!];
  const changed = emptyCounts();
  observe(changed, archived, true);
  assert.equal(changed.finalStructureMismatches, 1);
});

test("does not call missing structural data available decision coverage", () => {
  const archived = draw();
  delete (archived.word.trace as Partial<WordTrace>).structural;
  const counts = emptyCounts();
  observe(counts, archived, true);
  assert.equal(counts.unavailableStructuralWords, 1);
  assert.deepEqual(counts.decisionCoverage, { availableAffixedWords: 0, unknownAffixedWords: 1 });
});

test("matches insertion decisions and fallback events one to one in both directions", () => {
  const valid = emptyCounts();
  observe(valid, legacyDraw(), true);
  assert.equal(valid.outcomes.inserted, 1);
  assert.equal(valid.decisionInsertionEventMismatches, 0);
  for (const mutation of ["orphan", "duplicate-decision", "duplicate-fallback", "wrong-sound", "wrong-coordinate", "contradiction"] as const) {
    const archived = legacyDraw();
    const structural = archived.word.trace!.structural;
    const decision = structural.find(event => event.event === "morphHiatusDecision")!;
    const fallback = structural.find(event => event.event === "morphSuffixHiatusFallback")!;
    if (mutation === "orphan") structural.splice(structural.indexOf(decision), 1);
    if (mutation === "duplicate-decision") structural.push(structuredClone(decision));
    if (mutation === "duplicate-fallback") structural.push(structuredClone(fallback));
    if (mutation === "wrong-sound") fallback.inserted = "w";
    if (mutation === "wrong-coordinate") fallback.syllableIndex++;
    if (mutation === "contradiction") {
      decision.outcome = "preserved";
      decision.inserted = undefined;
      archived.word.syllables[decision.rightSyllableIndex].onset = [];
    }
    const counts = emptyCounts();
    observe(counts, archived, true);
    assert.ok(counts.decisionInsertionEventMismatches > 0, mutation);
  }
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "hiatus-archive-test-"));
  await mkdir(join(directory, "words"));
  const protocol: Protocol = {
    schemaVersion: 1, id: "fixture", wordsPerReplicate: 2, reviewDrawsPerReplicate: 1,
    profiles: [{ id: "test", options: { mode: "lexicon", morphology: true }, seeds: { development: [404, 43], validation: [101, 102] } }],
  };
  const sources: SourceArchive = {
    generator: await Promise.all(["src/core/trace.ts", "src/core/morphology/attach.ts"].map(async path => ({ path, content: await readFile(new URL(`../../../../${path}`, import.meta.url), "utf8") }))),
    evaluator: [], references: [], packageFiles: [],
  };
  const manifest = {
    schemaVersion: 1, id: "fixture", cohort: "development", protocol,
    protocolDigest: digest(protocol), evaluatorDigest: digest([]), referenceDigest: digest([]),
    generator: { sourceDigest: digest(sources.generator) },
    artifacts: [] as Array<{ file: string; bytes: number; sha256: string }>,
  };
  const streams = protocol.profiles[0].seeds.development.map(seed => {
    const rand = createSeededRng(seed);
    return { file: `words/test-${seed}.jsonl.gz`, draws: [0, 1].map(drawIndex => ({ profile: "test", seed, drawIndex, word: generateWord({ rand, trace: true }) })) };
  });
  const saveArtifact = async (file: string, bytes: Buffer) => {
    await writeFile(join(directory, file), bytes);
    manifest.artifacts = manifest.artifacts.filter(item => item.file !== file);
    manifest.artifacts.push({ file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  };
  const seal = () => writeFile(join(directory, "manifest.json"), JSON.stringify({ manifest, digest: digest(manifest) }));
  const saveSummary = () => saveArtifact("summary.json", Buffer.from(JSON.stringify({
    schemaVersion: 1, id: manifest.id, cohort: manifest.cohort, protocolDigest: manifest.protocolDigest,
    evaluatorDigest: manifest.evaluatorDigest, referenceDigest: manifest.referenceDigest,
    profiles: [{ id: "test", words: 4, replicates: streams.map(stream => ({ seed: stream.draws[0].seed, words: 2 })) }],
  })));
  const saveSources = async () => {
    manifest.generator.sourceDigest = digest(sources.generator);
    await saveArtifact("sources.json.gz", gzipSync(JSON.stringify(sources)));
    await seal();
  };
  const saveStream = async (index = 0) => {
    const stream = streams[index];
    await saveArtifact(stream.file, gzipSync(stream.draws.map(item => JSON.stringify(item)).join("\n") + "\n"));
    await seal();
  };
  await saveSummary();
  await saveSources();
  await saveStream(0);
  await saveStream(1);
  return { directory, manifest, sources, streams, saveArtifact, saveSources, saveSummary, saveStream, seal };
}

test("verifies complete public-API streams and source-backed decision capability", async () => {
  const archive = await fixture();
  try {
    const result = await analyze(archive.directory);
    assert.equal(result.supportsDecisions, true);
    assert.equal(result.profiles[0].counts.words, 4);
    assert.equal(result.profiles[0].replicates.length, 2);
    assert.equal(result.profiles[0].counts.decisionCoverage.unknownAffixedWords, 0);
    assert.equal(result.profiles[0].counts.decisionInsertionEventMismatches, 0);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("a type declaration without an emitter cannot establish decision coverage", async () => {
  const archive = await fixture();
  try {
    archive.sources.generator = archive.sources.generator.filter(source => source.path !== "src/core/morphology/attach.ts");
    await archive.saveSources();
    const result = await analyze(archive.directory);
    assert.equal(result.supportsDecisions, false);
    assert.equal(result.profiles[0].counts.decisionCoverage.availableAffixedWords, 0);
    assert.ok(result.profiles[0].counts.decisionCoverage.unknownAffixedWords > 0);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("rejects altered manifests, corrupted bytes, reordered and truncated streams", async () => {
  const archive = await fixture();
  try {
    await writeFile(join(archive.directory, "manifest.json"), JSON.stringify({ manifest: archive.manifest, digest: "stale" }));
    await assert.rejects(analyze(archive.directory), /manifest/);
    await archive.seal();
    const file = join(archive.directory, archive.streams[0].file);
    const bytes = await readFile(file);
    bytes[0] ^= 1;
    await writeFile(file, bytes);
    await assert.rejects(analyze(archive.directory), /Artifact verification/);
    archive.streams[0].draws.reverse();
    await archive.saveStream();
    await assert.rejects(analyze(archive.directory), /draw order/);
    archive.streams[0].draws.reverse();
    archive.streams[0].draws.pop();
    await archive.saveStream();
    await assert.rejects(analyze(archive.directory), /Incomplete stream/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("rejects duplicate schedules, unexpected shards and unpinned scheduled shards", async () => {
  const archive = await fixture();
  try {
    archive.manifest.protocol.profiles[0].seeds.development.push(404);
    archive.manifest.protocolDigest = digest(archive.manifest.protocol);
    await archive.saveSummary();
    await archive.seal();
    await assert.rejects(analyze(archive.directory), /distinct/);
    archive.manifest.protocol.profiles[0].seeds.development.pop();
    archive.manifest.protocolDigest = digest(archive.manifest.protocol);
    await archive.saveSummary();
    await archive.seal();
    await writeFile(join(archive.directory, "words/unlisted.jsonl.gz"), gzipSync(""));
    await assert.rejects(analyze(archive.directory), /shard set/);
    await rm(join(archive.directory, "words/unlisted.jsonl.gz"));
    archive.manifest.artifacts = archive.manifest.artifacts.filter(item => item.file !== archive.streams[0].file);
    await archive.seal();
    await assert.rejects(analyze(archive.directory), /shard set/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("rejects source content that does not match its claimed generator fingerprint", async () => {
  const archive = await fixture();
  try {
    archive.manifest.generator.sourceDigest = "stale";
    await archive.seal();
    await assert.rejects(analyze(archive.directory), /source fingerprint/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("checks the pinned summary replicate schedule against raw streams", async () => {
  const archive = await fixture();
  try {
    const summary = JSON.parse(await readFile(join(archive.directory, "summary.json"), "utf8"));
    summary.profiles[0].replicates[0].seed = 999;
    await archive.saveArtifact("summary.json", Buffer.from(JSON.stringify(summary)));
    await archive.seal();
    await assert.rejects(analyze(archive.directory), /Summary replicate schedule/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("requires a pinned source archive", async () => {
  const archive = await fixture();
  try {
    archive.manifest.artifacts = archive.manifest.artifacts.filter(item => item.file !== "sources.json.gz");
    await archive.seal();
    await assert.rejects(analyze(archive.directory), /Unpinned source/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("cross-checks raw counts against pinned summary counts", async () => {
  const archive = await fixture();
  try {
    const summary = JSON.parse((await readFile(join(archive.directory, "summary.json"))).toString());
    summary.profiles[0].words = 5;
    await archive.saveArtifact("summary.json", Buffer.from(JSON.stringify(summary)));
    await archive.seal();
    await assert.rejects(analyze(archive.directory), /Summary profile count mismatch/);
    summary.profiles[0].words = 4;
    summary.profiles[0].replicates[0].words = 3;
    await archive.saveArtifact("summary.json", Buffer.from(JSON.stringify(summary)));
    await archive.seal();
    await assert.rejects(analyze(archive.directory), /Summary replicate count mismatch/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});
