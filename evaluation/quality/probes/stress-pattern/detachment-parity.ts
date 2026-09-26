import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { draws, filesDigest, profiles, runtimeFile, scheduleSha256, sha, sourceSnapshot } from "../syllable-weight/shared.js";
import type { Word } from "../../../../src/types.js";

type API = typeof import("../../../../src/index.js");
const scriptPath = fileURLToPath(import.meta.url);
const sharedPath = fileURLToPath(new URL("../syllable-weight/shared.ts", import.meta.url));
const toolFingerprint = () => filesDigest({ script: sha(readFileSync(scriptPath)), shared: sha(readFileSync(sharedPath)) });
const [rootArg, reference, outputArg] = process.argv.slice(2);
assert.ok(rootArg && reference && outputArg, "Usage: detachment-parity.ts CHECKOUT FULL_COMMIT REPORT.json");
assert.match(reference, /^[a-f0-9]{40}$/);
const root = resolve(rootArg);
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const sources = sourceSnapshot(root);
const expectedPaths = [...git("ls-tree", "--name-only", "-r", reference, "--", "src").trim().split("\n").filter(runtimeFile), "package.json", "package-lock.json", "tsconfig.json"].sort();
assert.deepEqual(Object.keys(sources).sort(), expectedPaths, "Unexpected runtime source set");
for (const path of expectedPaths) assert.equal(sources[path], sha(git("show", `${reference}:${path}`)), `Uncommitted source: ${path}`);
const toolSha256 = toolFingerprint();
const api: API = await import(pathToFileURL(resolve(root, "src/index.ts")).href);
const streams = [];
for (const profile of profiles) for (const seed of profile.seeds) {
  const variants = [];
  for (const tracing of [false, true]) {
    const rng = api.createSeededRng(seed);
    let calls = 0;
    const rand = () => { calls++; return rng(); };
    const words = createHash("sha256");
    const traces = createHash("sha256");
    const boundaries = createHash("sha256");
    for (let draw = 0; draw < draws; draw++) {
      const word = api.generateWord({ ...profile.options, rand, trace: tracing });
      const output: Word = { ...word };
      delete output.trace;
      words.update(JSON.stringify(output) + "\n");
      boundaries.update(`${draw}:${calls}\n`);
      if (tracing) {
        assert.ok(word.trace);
        // No field is stripped: the clone correction must preserve the full old trace.
        traces.update(JSON.stringify(word.trace) + "\n");
      }
    }
    variants.push({ tracing, wordHash: words.digest("hex"), traceHash: tracing ? traces.digest("hex") : null, rngBoundaryHash: boundaries.digest("hex"), rngCalls: calls, nextRng: rng() });
  }
  for (const field of ["wordHash", "rngBoundaryHash", "rngCalls", "nextRng"] as const) assert.equal(variants[0][field], variants[1][field], `Trace parity: ${profile.id}/${seed}/${field}`);
  streams.push({ profile: profile.id, options: profile.options, seed, draws, variants });
}
assert.deepEqual(sourceSnapshot(root), sources, "Runtime changed during parity capture");
assert.equal(toolFingerprint(), toolSha256, "Parity tool changed during capture");
const report = {
  schemaVersion: 1, probe: "stress-view-detachment-parity-v1", createdAt: new Date().toISOString(),
  node: process.version, reference, checkout: root, sources, sourceDigest: filesDigest(sources),
  toolSha256, scheduleSha256, distinctScheduledDraws: draws * streams.length,
  generatedWords: 2 * draws * streams.length, streams,
};
writeFileSync(resolve(outputArg), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ report: resolve(outputArg), reference, sourceDigest: report.sourceDigest, distinctScheduledDraws: report.distinctScheduledDraws }));
