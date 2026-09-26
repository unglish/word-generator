import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { createSeededRng, generateWord } from "../../../../src/index.js";
import { englishConfig } from "../../../../src/config/english.js";
import { analyzeRun, digest } from "./analyze.mjs";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "coda-archive-test-"));
  await mkdir(join(directory, "words"));
  const file = "words/test-42.jsonl.gz";
  const rand = createSeededRng(42);
  const draws = [0, 1].map(drawIndex => ({
    profile: "test", seed: 42, drawIndex,
    word: generateWord({ rand, morphology: false, trace: true }),
  }));
  const protocol = { profiles: [{ id: "test", seeds: { development: [42] } }], wordsPerReplicate: 2 };
  const manifest = {
    id: "fixture", cohort: "development", protocol, protocolDigest: digest(protocol),
    generator: { sourceDigest: "fixture", effectiveConfig: { clusterLimits: englishConfig.clusterLimits } },
    artifacts: [] as Array<{ file: string; bytes: number; sha256: string }>,
  };
  const saveArtifact = async (name: string, bytes: Buffer) => {
    await writeFile(join(directory, name), bytes);
    manifest.artifacts = manifest.artifacts.filter(item => item.file !== name);
    manifest.artifacts.push({ file: name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  };
  const seal = () => writeFile(join(directory, "manifest.json"), JSON.stringify({ manifest, digest: digest(manifest) }));
  const saveDraws = async () => { await saveArtifact(file, gzipSync(draws.map(draw => JSON.stringify(draw)).join("\n") + "\n")); await seal(); };
  await saveArtifact("summary.json", Buffer.from(JSON.stringify({ profiles: [{ id: "test", words: 2, metrics: { adjacent_duplicate_coda: { hits: 0 } } }] })));
  await saveArtifact("sources.json.gz", gzipSync(JSON.stringify({ generator: [] })));
  await saveDraws();
  return { directory, file, draws, manifest, saveDraws, seal };
}

test("verifies a complete archive generated through the public API", async () => {
  const archive = await fixture();
  try {
    const result = await analyzeRun(archive.directory);
    assert.equal(result.total.counts.words, 2);
    assert.equal(result.total.counts.duplicateWords, 0);
    assert.equal(result.rejectedExtensionInstrumentation, "historically-unobserved");
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("rejects unpinned or corrupted archived bytes", async () => {
  const archive = await fixture();
  try {
    await writeFile(join(archive.directory, "words/extra.jsonl.gz"), "extra");
    await assert.rejects(analyzeRun(archive.directory), /Unexpected word directory/);
    await rm(join(archive.directory, "words/extra.jsonl.gz"));
    const bytes = await readFile(join(archive.directory, archive.file));
    bytes[0] ^= 1;
    await writeFile(join(archive.directory, archive.file), bytes);
    await assert.rejects(analyzeRun(archive.directory), /checksum mismatch/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("rejects truncated and reordered draws even when their new bytes are pinned", async () => {
  const archive = await fixture();
  try {
    archive.draws.reverse();
    await archive.saveDraws();
    await assert.rejects(analyzeRun(archive.directory));
    archive.draws.pop();
    await archive.saveDraws();
    await assert.rejects(analyzeRun(archive.directory), /Incorrect draw count/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("rejects mutated manifests and duplicate stream schedules", async () => {
  const archive = await fixture();
  try {
    archive.manifest.id = "changed";
    await writeFile(join(archive.directory, "manifest.json"), JSON.stringify({ manifest: archive.manifest, digest: "stale" }));
    await assert.rejects(analyzeRun(archive.directory), /Manifest checksum mismatch/);
    archive.manifest.protocol.profiles[0].seeds.development.push(42);
    archive.manifest.protocolDigest = digest(archive.manifest.protocol);
    await archive.seal();
    await assert.rejects(analyzeRun(archive.directory), /Unexpected manifest shard set/);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});

test("the CLI refuses to overwrite an existing evidence report", async () => {
  const archive = await fixture();
  try {
    const output = join(archive.directory, "report.json");
    const execFile = promisify(execFileCallback);
    const args = [fileURLToPath(new URL("./analyze.mjs", import.meta.url)), archive.directory, archive.directory, output];
    await execFile(process.execPath, args);
    const original = await readFile(output, "utf8");
    await assert.rejects(execFile(process.execPath, args), /EEXIST/);
    assert.equal(await readFile(output, "utf8"), original);
  } finally { await rm(archive.directory, { recursive: true, force: true }); }
});
