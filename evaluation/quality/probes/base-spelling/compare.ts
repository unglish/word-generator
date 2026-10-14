import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [originalPath, candidatePath, outputPath] = process.argv.slice(2);
assert.ok(
  originalPath && candidatePath && outputPath,
  "Usage: compare.ts ORIGINAL.json CANDIDATE.json COMPARISON.json",
);
const originalText = readFileSync(originalPath, "utf8");
const candidateText = readFileSync(candidatePath, "utf8");
const original = JSON.parse(originalText);
const candidate = JSON.parse(candidateText);
assert.equal(original.mode, "original");
assert.equal(candidate.mode, "candidate");
for (const field of [
  "schemaVersion",
  "probe",
  "node",
  "evaluatorSha256",
  "scheduleSha256",
  "generatedWords",
])
  assert.equal(candidate[field], original[field], `Mismatched ${field}`);
assert.equal(candidate.generatedWords, 40000);
assert.equal(candidate.verifiedLedgers, 20000);
assert.equal(original.streams.length, 20);
assert.equal(candidate.streams.length, 20);
assert.deepEqual(
  candidate.streams,
  original.streams,
  "Words, RNG stream, or legacy trace changed",
);
const sha = (text: string): string =>
  createHash("sha256").update(text).digest("hex");
const comparison = {
  schemaVersion: 1,
  probe: original.probe,
  result: "pass",
  generatedWordsPerCheckout: 40000,
  distinctScheduledDraws: 20000,
  verifiedLedgers: candidate.verifiedLedgers,
  wordsEqual: true,
  rngCallsAtEveryDrawEqual: true,
  nextRngEqual: true,
  legacyTracesEqual: true,
  traceOnOffEqual: true,
  originalReportSha256: sha(originalText),
  candidateReportSha256: sha(candidateText),
  originalSourceDigest: original.sourceDigest,
  candidateSourceDigest: candidate.sourceDigest,
  captureEvaluatorSha256: original.evaluatorSha256,
  comparisonEvaluatorSha256: sha(
    readFileSync(fileURLToPath(import.meta.url), "utf8"),
  ),
  scheduleSha256: original.scheduleSha256,
};
writeFileSync(resolve(outputPath), JSON.stringify(comparison, null, 2) + "\n");
console.log(JSON.stringify(comparison));
