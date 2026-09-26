import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { analyzeCurrent, exactArchive, freezeAnalyzer, protectOutput, readDraws, regularFile } from "./analyze-current.mjs";
const temporary = () => mkdtemp(join(tmpdir(), "q13-analyzer-fixture-"));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function pin(root, file, value) {
  const bytes = Buffer.from(value); await writeFile(join(root, file), bytes);
  return { file, bytes: bytes.length, sha256: sha(bytes) };
}
async function archive() {
  const root = await temporary(); await mkdir(join(root, "words"));
  const manifest = { protocol: { profiles: [{ id: "tiny", seeds: { development: [13] } }] }, artifacts: [] };
  manifest.artifacts.push(await pin(root, "words/tiny-13.jsonl.gz", gzipSync('{"drawIndex":0}\n')));
  manifest.artifacts.push(await pin(root, "summary.json", "{}\n"));
  await writeFile(join(root, "manifest.json"), JSON.stringify(manifest));
  return { root, manifest };
}
test("regular file checks reject root aliases, parent aliases and traversal", async () => {
  const root = await temporary(); await mkdir(join(root, "actual")); await writeFile(join(root, "actual/value"), "x");
  assert.equal(await regularFile(root, "actual/value"), join(root, "actual/value"));
  await symlink(join(root, "actual"), join(root, "alias"));
  await assert.rejects(regularFile(root, "alias/value"));
  await assert.rejects(regularFile(join(root, "alias"), "value"));
  await assert.rejects(regularFile(root, "actual/../actual/value"));
});
test("output protection rejects lexical and resolved input overlap and occupied files", async () => {
  const root = await temporary(); await mkdir(join(root, "source")); await symlink(join(root, "source"), join(root, "alias"));
  await assert.rejects(protectOutput(join(root, "source/new"), [join(root, "source")]));
  await assert.rejects(protectOutput(join(root, "alias/new"), [join(root, "source")]));
  await protectOutput(join(root, "report"), [join(root, "source")]);
  await writeFile(join(root, "report"), "occupied");
  await assert.rejects(protectOutput(join(root, "report"), [join(root, "source")]));
});
test("exact archive checks accept the declared file set and reject extra or missing artifacts", async () => {
  const { root, manifest } = await archive(); await exactArchive(root, manifest);
  await writeFile(join(root, "extra"), "x"); await assert.rejects(exactArchive(root, manifest), /filesystem/);
  const other = await archive(); other.manifest.artifacts.push({ file: "missing", bytes: 0, sha256: sha("") });
  await assert.rejects(exactArchive(other.root, other.manifest), /filesystem/);
});
test("archive checks reject altered bytes, duplicate pins and aliased shards", async () => {
  const changed = await archive(); await writeFile(join(changed.root, "summary.json"), "altered"); await assert.rejects(exactArchive(changed.root, changed.manifest));
  const duplicate = await archive(); duplicate.manifest.artifacts.push(duplicate.manifest.artifacts[0]); await assert.rejects(exactArchive(duplicate.root, duplicate.manifest), /Duplicate/);
  const aliased = await archive(); await symlink(join(aliased.root, "summary.json"), join(aliased.root, "words/extra.jsonl.gz"));
  await assert.rejects(exactArchive(aliased.root, aliased.manifest), /shard/);
});
test("archive checks reject a shard schedule that disagrees with otherwise authentic pins", async () => {
  const { root, manifest } = await archive(); manifest.protocol.profiles[0].seeds.development = [137];
  await assert.rejects(exactArchive(root, manifest));
});
async function parse(contents) {
  const root = await temporary(); const file = join(root, "rows.gz"); await writeFile(file, gzipSync(contents));
  const rows = []; for await (const row of readDraws(file)) rows.push(row); return rows;
}
test("draw parser preserves complete UTF-8 records and rejects blank, malformed and unterminated rows", async () => {
  assert.deepStrictEqual(await parse('{"word":"θ😀"}\n{"word":"ð"}\n'), [{ word: "θ😀" }, { word: "ð" }]);
  await assert.rejects(parse("\n"), /Empty/); await assert.rejects(parse("{bad}\n")); await assert.rejects(parse('{}'), /Unterminated/);
});
test("draw parser propagates missing-file and corrupt-gzip failures", async () => {
  const root = await temporary(); await writeFile(join(root, "bad.gz"), "not gzip");
  async function consume(path) { for await (const row of readDraws(path)) assert(row); }
  await assert.rejects(consume(join(root, "missing.gz"))); await assert.rejects(consume(join(root, "bad.gz")));
});
test("synthetic analyzer freeze binds complete code and preserved preparation without overwriting", async () => {
  const root = await temporary(); const out = join(root, "freeze.json"); const result = await freezeAnalyzer(out);
  const bytes = await readFile(out); assert.equal(sha(bytes), result.sha256);
  const frozen = JSON.parse(bytes); assert.equal(frozen.preparation.length, 10);
  for (const suffix of ["src/core/spelling-normalization-checks.ts", "src/core/spelling-normalization-evidence.ts", "evaluation/quality/probes/unit-normalization/analyze-current.mjs", "evaluation/quality/probes/unit-normalization/observe-historical-current.ts"]) {
    assert(frozen.files.some(file => file.file === suffix), suffix);
  }
  await assert.rejects(freezeAnalyzer(out), /already exists/);
});

test("analysis refuses an unreviewed freeze and a coherently rehashed source-pin change before reading outcomes", async () => {
  const root = await temporary(); const freeze = join(root, "freeze.json"); const run = join(root, "empty-run"); await mkdir(run);
  const output = join(root, "report.json"); const result = await freezeAnalyzer(freeze);
  await assert.rejects(analyzeCurrent({ freeze, expectedFreeze: "0".repeat(64), run, expectedManifest: "0".repeat(64), out: output }), /Unreviewed analyzer freeze/);
  const value = JSON.parse(await readFile(freeze)); value.files[0].sha256 = "0".repeat(64);
  const bytes = Buffer.from(JSON.stringify(value)); await writeFile(freeze, bytes);
  await assert.rejects(analyzeCurrent({ freeze, expectedFreeze: sha(bytes), run, expectedManifest: "0".repeat(64), out: output }));
  await assert.rejects(readFile(output), { code: "ENOENT" });
  assert.notEqual(result.sha256, sha(bytes));
});
