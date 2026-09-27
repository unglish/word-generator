import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, access, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { analyze, expectedStreams, regularArtifact, sha } from "./analyze-doubling.mjs";
import { canonical } from "../../quality/serialization.ts";
import { englishConfig } from "../../../src/index.ts";

const registrationPath = new URL("./protocol.json", import.meta.url);
const registrationBytes = await readFile(registrationPath);
const witnesses = JSON.parse(gunzipSync(await readFile(new URL("./exploration/inventory.json.gz", import.meta.url))));
const word = witnesses.firstWitnessPerSuccessfulOrDirectRelation.find(w => w.key[0] === "s" && w.key[1] === "c").word;
async function fixture(modify = rows => rows) {
  const root = await mkdtemp(join(tmpdir(), "q12c-runner-test-")); const archive = join(root, "archive");
  await mkdir(join(archive, "words"), { recursive: true });
  const protocol = { schemaVersion: 1, wordsPerReplicate: 1, profiles: [
    { id: "fixture", seeds: { development: [1, 2] } },
  ] };
  const protocolPath = join(root, "protocol.json"); const protocolBytes = Buffer.from(JSON.stringify(protocol));
  await writeFile(protocolPath, protocolBytes);
  const artifacts = [];
  for (const seed of [1, 2]) {
    const rows = modify([{ profile: "fixture", seed, drawIndex: 0, word }]);
    const bytes = gzipSync(rows.map(row => JSON.stringify(row) + "\n").join(""));
    const file = `words/fixture-${seed}.jsonl.gz`; await writeFile(join(archive, file), bytes);
    artifacts.push({ file, bytes: bytes.length, sha256: sha(bytes) });
  }
  const config = { ...englishConfig, doubling: { ...englishConfig.doubling, realizations: undefined } };
  const envelope = { manifest: { schemaVersion: 1, cohort: "development", protocol,
    generator: { sourceDigest: "1".repeat(64), effectiveConfig: canonical(config) }, artifacts } };
  const manifestBytes = Buffer.from(JSON.stringify(envelope)); await writeFile(join(archive, "manifest.json"), manifestBytes);
  return { root, archive, envelope, options: { archive, out: join(root, "out"), variant: "control",
    protocol: protocolPath, "protocol-sha256": sha(protocolBytes), registration: registrationPath,
    "registration-sha256": sha(registrationBytes), "manifest-sha256": sha(manifestBytes), "source-digest": "1".repeat(64) } };
}
test("runs a complete bounded archive through stream validation, aggregation and production replay", async () => {
  const f = await fixture(); const report = await analyze(f.options);
  assert.equal(report.words, 2); assert.equal(report.streams.length, 2);
  const all = report.groups.find(g => g.dimensions[0] === "all");
  assert.equal(all.counts.sToCkExpansions, 2); assert.equal(all.productionReplay.words, 2);
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

async function independent(f, reportPath, out) {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  return promisify(execFile)("python3", ["-B", fileURLToPath(new URL("./recount-doubling.py", import.meta.url)),
    "--archive", f.archive, "--manifest-sha256", f.options["manifest-sha256"],
    "--report", reportPath, "--report-sha256", sha(await readFile(reportPath)),
    "--protocol", f.options.protocol, "--protocol-sha256", f.options["protocol-sha256"],
    "--registration", fileURLToPath(registrationPath), "--registration-sha256", sha(registrationBytes),
    "--source-root", root, "--out", out]);
}
test("independent Python reconstructs every bounded group/event and complete witness", async () => {
  const f = await fixture(); await analyze(f.options);
  const proofPath = join(f.root, "proof.json");
  await independent(f, join(f.options.out, "report.json"), proofPath);
  const proof = JSON.parse(await readFile(proofPath));
  assert.equal(proof.passed, true); assert.equal(proof.words, 2); assert(proof.integerComparisons > 0);
});
for (const mutation of ["count", "group", "witness", "boolean-denominator"]) {
  test(`independent Python rejects forged ${mutation} even with a newly supplied report hash`, async () => {
    const f = await fixture(); const report = await analyze(f.options);
    if (mutation === "count") report.groups[0].counts.units++;
    if (mutation === "group") report.groups.pop();
    if (mutation === "witness") report.witnesses[0].word.written.clean = "forged";
    if (mutation === "boolean-denominator") report.groups[0].productionReplay.words = true;
    const reportPath = join(f.options.out, "altered-report.json");
    await writeFile(reportPath, JSON.stringify(report));
    await assert.rejects(independent(f, reportPath, join(f.root, "proof.json")));
    assert.equal((await readFile(join(f.root, "proof.json"))).length, 0);
  });
}

test("complete archived bare-template row passes both analyzers without fabricated affix resolution", async () => {
  const bare = JSON.parse(await readFile(new URL("./measurement-fixtures/bare-control-row.json", import.meta.url)));
  const f = await fixture(rows => rows.map(row => ({ ...row, word: bare.word })));
  const report = await analyze(f.options);
  assert.equal(report.groups.find(g => g.dimensions[0] === "morphology").dimensions[2], "none/none");
  const proof = join(f.root, "bare-proof.json");
  await independent(f, join(f.options.out, "report.json"), proof);
  assert.equal(JSON.parse(await readFile(proof)).words, 2);
});
