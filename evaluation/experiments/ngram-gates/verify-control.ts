import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { generateWords } from "../../../src/index.js";

const [runDirectory, output] = process.argv.slice(2);
assert.ok(runDirectory && output, "Usage: verify-control.ts RUN NEW_REPORT.json");
const control = JSON.parse(readFileSync(resolve(runDirectory, "control.json"), "utf8"));
assert.equal(control.seed, 42);
assert.equal(control.words, 200000);
const raw = readFileSync(resolve(runDirectory, "control-written.jsonl.gz"));
const digest = createHash("sha256").update(raw).digest("hex");
assert.equal(control.artifacts.find((item: { file: string }) => item.file === "control-written.jsonl.gz").sha256, digest);
const rows = gunzipSync(raw).toString("utf8").trimEnd().split("\n").map(line => JSON.parse(line));
const words = generateWords(200000, { seed: 42 });
assert.equal(rows.length, words.length);
for (const [index, word] of words.entries()) {
  assert.equal(rows[index].draw, index);
  assert.equal(rows[index].written, word.written.clean);
}
const report = { words: words.length, seed: 42, publicBatchMatchesEveryArchivedSpelling: true,
  controlArchiveSha256: digest, verifierSha256: createHash("sha256").update(readFileSync(new URL(import.meta.url))).digest("hex") };
writeFileSync(resolve(output), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(report));
