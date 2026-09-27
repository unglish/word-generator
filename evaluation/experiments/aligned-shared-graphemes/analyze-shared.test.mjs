import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, readFile, writeFile, access, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { analyze, expectedStreams, regularArtifact, sha } from "./analyze-shared.mjs";
import { canonical } from "../../quality/serialization.ts";
import { englishConfig, createGenerator } from "../../../src/index.ts";

const registrationPath = new URL("./protocol.json", import.meta.url);
const registrationBytes = await readFile(registrationPath);
const word = createGenerator({ ...englishConfig, sharedSpellings: undefined }).generateWord({ seed: 129, trace: true });
async function fixture(modify = rows => rows, variant = "control") {
  const config = { ...englishConfig, sharedSpellings: variant === "candidate" ? englishConfig.sharedSpellings : undefined };
  const fixtureWord = variant === "candidate" ? createGenerator(config).generateWord({ seed: 129, trace: true }) : word;
  const root = await mkdtemp(join(tmpdir(), "q13b-runner-test-")); const archive = join(root, "archive");
  await mkdir(join(archive, "words"), { recursive: true });
  const protocol = { schemaVersion: 1, wordsPerReplicate: 1, profiles: [
    { id: "fixture", seeds: { development: [1, 2] } },
  ] };
  const protocolPath = join(root, "protocol.json"); const protocolBytes = Buffer.from(JSON.stringify(protocol));
  await writeFile(protocolPath, protocolBytes);
  const artifacts = [];
  for (const seed of [1, 2]) {
    const rows = modify([{ profile: "fixture", seed, drawIndex: 0, word: fixtureWord }]);
    const bytes = gzipSync(rows.map(row => JSON.stringify(row) + "\n").join(""));
    const file = `words/fixture-${seed}.jsonl.gz`; await writeFile(join(archive, file), bytes);
    artifacts.push({ file, bytes: bytes.length, sha256: sha(bytes) });
  }
  const envelope = { manifest: { schemaVersion: 1, cohort: "development", protocol,
    generator: { sourceDigest: "1".repeat(64), effectiveConfig: canonical(config) }, artifacts } };
  const manifestBytes = Buffer.from(JSON.stringify(envelope)); await writeFile(join(archive, "manifest.json"), manifestBytes);
  return { root, archive, envelope, options: { archive, out: join(root, "out"), variant,
    protocol: protocolPath, "protocol-sha256": sha(protocolBytes), registration: registrationPath,
    "registration-sha256": sha(registrationBytes), "manifest-sha256": sha(manifestBytes), "source-digest": "1".repeat(64) } };
}
test("runs a complete bounded archive through stream validation, aggregation and production replay", async () => {
  const f = await fixture(); const report = await analyze(f.options);
  assert.equal(report.version, "q13b-shared-corpus-v1");
  assert.equal(report.words, 2); assert.equal(report.streams.length, 2);
  const all = report.groups.find(g => g.dimensions[0] === "all");
  assert.equal(all.sharedCounts, null); assert.equal(all.repairReplay.words, 2);
  assert.equal(all.sharedAvailability.unavailableWords, 2);
  assert.equal(JSON.parse(await readFile(join(f.options.out, "report.json"))).words, 2);
  await assert.rejects(access(join(f.options.out, "failure.json")));
});
test("rejects a wrong external manifest authority before creating an output", async () => {
  const f = await fixture(); f.options["manifest-sha256"] = "0".repeat(64);
  await assert.rejects(analyze(f.options), /Authority mismatch/);
  await assert.rejects(access(f.options.out));
});
test("rejects archive-byte tampering before creating an output", async () => {
  const f = await fixture(); await writeFile(join(f.archive, "words/fixture-1.jsonl.gz"), "corrupt");
  await assert.rejects(analyze(f.options)); await assert.rejects(access(f.options.out));
});
test("retains an explicit failure and no completion report for duplicate draws", async () => {
  const f = await fixture(rows => [...rows, ...rows]);
  await assert.rejects(analyze(f.options), /Extra draw|strictly equal/);
  await access(join(f.options.out, "failure.json")); await assert.rejects(access(join(f.options.out, "report.json")));
});
test("requires every scheduled stream", async () => {
  const f = await fixture(); f.envelope.manifest.artifacts.pop();
  const bytes = Buffer.from(JSON.stringify(f.envelope)); await writeFile(join(f.archive, "manifest.json"), bytes);
  f.options["manifest-sha256"] = sha(bytes);
  await assert.rejects(analyze(f.options), /Wrong stream set/);
});
test("rejects malformed and aliased artifact paths", async () => {
  const f = await fixture(); await symlink(join(f.archive, "words/fixture-1.jsonl.gz"), join(f.archive, "alias.gz"));
  for (const file of ["../escape", "words//fixture-1.jsonl.gz", "alias.gz"]) await assert.rejects(regularArtifact(f.archive, file));
});
test("does not allow an output parent symlink to redirect into the archive", async () => {
  const f = await fixture(); await symlink(f.archive, join(f.root, "link"));
  f.options.out = join(f.root, "link", "out"); await assert.rejects(analyze(f.options), /outside input/);
});
test("rejects overlapping seeds before any corpus processing", () => {
  assert.throws(() => expectedStreams({ schemaVersion: 1, wordsPerReplicate: 1,
    profiles: [{ id: "a", seeds: { development: [1] } }, { id: "b", seeds: { development: [1] } }] }));
});

for (const variant of ["control", "candidate"]) test(`independent pinned ${variant} archive recount accepts complete report and rejects rehashed corruptions`, async () => {
  const f = await fixture(undefined, variant); const report = await analyze(f.options);
  const reportPath = join(f.options.out, "report.json");
  const authority = JSON.parse(await readFile(join(f.options.out, "authority.json")));
  const script = fileURLToPath(new URL("./recount-corpus.py", import.meta.url));
  let attempt = 0;
  async function verify(candidate) {
    const bytes = Buffer.from(JSON.stringify(candidate)); await writeFile(reportPath, bytes);
    const out = join(f.root, `independent-${attempt++}.json`);
    const options = { archive: f.archive, "manifest-sha256": f.options["manifest-sha256"], report: reportPath,
      "report-sha256": sha(bytes), protocol: f.options.protocol, "protocol-sha256": f.options["protocol-sha256"],
      registration: fileURLToPath(registrationPath), "registration-sha256": f.options["registration-sha256"],
      "source-root": authority.sourceRoot, out };
    const result = spawnSync("python3", [script, ...Object.entries(options).flatMap(([name, value]) => [`--${name}`, value])],
      { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    return { result, output: await readFile(out, "utf8") };
  }
  const valid = await verify(report);
  assert.equal(valid.result.status, 0, valid.result.stderr);
  assert.equal(JSON.parse(valid.output).words, 2);
  assert.equal(report.groups[0].sharedAvailability.status, variant === "candidate" ? "available" : "unavailable");
  for (const mutate of [candidate => { candidate.groups[0].repairReplay.words++; },
    candidate => { candidate.groups[0].doublingCounts.units++; },
    candidate => { candidate.groups[0].sharedCounts = {}; },
    candidate => { candidate.streams.pop(); },
    candidate => { candidate.version = 1; }]) {
    const candidate = structuredClone(report); mutate(candidate);
    const invalid = await verify(candidate);
    assert.notEqual(invalid.result.status, 0);
    assert.equal(invalid.output, "");
  }
});
