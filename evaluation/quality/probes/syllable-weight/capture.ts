import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Word } from "../../../../src/types.js";
import { draws, emptyObservation, evaluatorSnapshot, filesDigest, observe, originalRef, profiles, runtimeFile, scheduleSha256, sourceSnapshot, validateReport } from "./shared.js";
import type { ParityReport, Variant } from "./shared.js";

type API = typeof import("../../../../src/index.js");
const [rootArg, outputArg, mode] = process.argv.slice(2);
assert.ok(rootArg && outputArg && (mode === "original" || mode === "candidate"), "Usage: capture.ts CHECKOUT REPORT.json original|candidate");
const root = resolve(rootArg);
const probeDirectory = dirname(fileURLToPath(import.meta.url));
const evaluatorFiles = evaluatorSnapshot(probeDirectory);
const sourceFiles = sourceSnapshot(root);
if (mode === "original") {
  execFileSync("git", ["diff", "--exit-code", originalRef, "--", "src", "package.json", "package-lock.json", "tsconfig.json"], { cwd: root });
  const pinnedFiles = execFileSync("git", ["ls-tree", "--name-only", "-r", originalRef, "--", "src"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(runtimeFile);
  assert.deepEqual(Object.keys(sourceFiles).sort(), [...pinnedFiles, "package.json", "package-lock.json", "tsconfig.json"].sort(), "Original has untracked runtime files");
}
const api: API = await import(pathToFileURL(join(root, "src/index.ts")).href);
const streams: ParityReport["streams"] = [];
const observations: ParityReport["observations"] = [];
for (const profile of profiles) for (const seed of profile.seeds) {
  const result = emptyObservation();
  const variants: Variant[] = [];
  for (const tracing of [false, true]) {
    const rng = api.createSeededRng(seed);
    let calls = 0;
    const rand = (): number => { calls++; return rng(); };
    const wordHash = createHash("sha256");
    const rngHash = createHash("sha256");
    const traceHash = createHash("sha256");
    for (let draw = 0; draw < draws; draw++) {
      const word = api.generateWord({ ...profile.options, rand, trace: tracing });
      const output: Word = { ...word };
      delete output.trace;
      wordHash.update(JSON.stringify(output) + "\n");
      rngHash.update(`${draw}:${calls}\n`);
      if (tracing) {
        const legacy = { ...word.trace! };
        delete legacy.stressWeight;
        traceHash.update(JSON.stringify(legacy) + "\n");
        observe(word, draw, mode, result);
      }
    }
    variants.push({ tracing, wordHash: wordHash.digest("hex"), rngBoundaryHash: rngHash.digest("hex"), rngCalls: calls, nextRng: rng(), legacyTraceHash: tracing ? traceHash.digest("hex") : null });
  }
  streams.push({ profile: profile.id, options: profile.options, seed, draws, variants });
  observations.push({ profile: profile.id, seed, result });
}
assert.deepEqual(sourceSnapshot(root), sourceFiles, "Runtime source changed during capture");
assert.deepEqual(evaluatorSnapshot(probeDirectory), evaluatorFiles, "Evaluator changed during capture");
const report: ParityReport = {
  schemaVersion: 1, probe: "syllable-weight-parity-v1", mode,
  createdAt: new Date().toISOString(), node: process.version, checkout: root,
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  sourceFiles, sourceDigest: filesDigest(sourceFiles), evaluatorFiles, evaluatorSha256: filesDigest(evaluatorFiles),
  scheduleSha256, generatedWords: draws * streams.length * 2, streams, observations,
};
validateReport(report);
writeFileSync(resolve(outputArg), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ mode, sourceDigest: report.sourceDigest, generatedWords: report.generatedWords, report: resolve(outputArg) }));
