import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatorSnapshot, filesDigest, sha, validateReport } from "./shared.js";
import type { ParityReport } from "./shared.js";

const [originalPath, candidatePath, outputPath] = process.argv.slice(2);
assert.ok(originalPath && candidatePath && outputPath, "Usage: compare.ts ORIGINAL.json CANDIDATE.json COMPARISON.json");
const originalText = readFileSync(originalPath, "utf8");
const candidateText = readFileSync(candidatePath, "utf8");
const original: ParityReport = JSON.parse(originalText);
const candidate: ParityReport = JSON.parse(candidateText);
validateReport(original);
validateReport(candidate);
assert.equal(original.mode, "original");
assert.equal(candidate.mode, "candidate");
for (const field of ["node", "evaluatorSha256", "scheduleSha256"] as const) assert.equal(original[field], candidate[field], `Mismatched ${field}`);
assert.equal(candidate.evaluatorSha256, filesDigest(evaluatorSnapshot(dirname(fileURLToPath(import.meta.url)))), "Current evaluator differs from captured evaluator");
assert.deepEqual(candidate.streams, original.streams, "Words, RNG stream, or legacy trace changed");
const comparison = {
  schemaVersion: 1, probe: original.probe, result: "pass",
  generatedWordsPerCheckout: 40000, distinctScheduledDraws: 20000,
  wordsEqual: true, rngCallsAtEveryDrawEqual: true, nextRngEqual: true, legacyTracesEqual: true, traceOnOffEqual: true,
  originalReportSha256: sha(originalText), candidateReportSha256: sha(candidateText),
  originalSourceDigest: original.sourceDigest, candidateSourceDigest: candidate.sourceDigest,
  evaluatorSha256: candidate.evaluatorSha256, scheduleSha256: original.scheduleSha256,
  observations: { original: original.observations, candidate: candidate.observations },
};
writeFileSync(resolve(outputPath), JSON.stringify(comparison, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ result: comparison.result, distinctScheduledDraws: comparison.distinctScheduledDraws, report: resolve(outputPath) }));
