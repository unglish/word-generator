import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { WordGenerationOptions } from "../../../../src/types.js";
import { createBaseSpellingEvidenceVerifier } from "../../../../src/core/spelling-evidence.js";

const [runtimeArg, reportArg] = process.argv.slice(2);
assert.ok(runtimeArg && reportArg, "Usage: active-parity.ts RUNTIME NEW_REPORT.json");
const runtime = resolve(runtimeArg);
const sha = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");
function sources(): Record<string, string> {
  const files: Record<string, string> = {};
  function walk(relative: string): void {
    for (const entry of readdirSync(join(runtime, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(relative, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|js|json)$/.test(entry.name) && !/\.(test|bench)\./.test(entry.name)) files[path] = sha(readFileSync(join(runtime, path)));
    }
  }
  walk("src"); return files;
}
const before = sources();
const api = await import(pathToFileURL(join(runtime, "src/index.ts")).href) as typeof import("../../../../src/index.js");
const verify = createBaseSpellingEvidenceVerifier(api.englishConfig);
const protocolText = readFileSync(join(runtime, "evaluation/quality/protocol.json"), "utf8");
const protocol = JSON.parse(protocolText) as { profiles: Array<{ id: string; options: WordGenerationOptions; seeds: { development: number[] } }> };
const streams = [];
let verifiedCertificates = 0;
for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
  const rngs = [api.createSeededRng(seed), api.createSeededRng(seed)];
  const calls = [0, 0]; const wordHash = createHash("sha256"); const rngHash = createHash("sha256");
  for (let draw = 0; draw < 1000; draw++) {
    const words = rngs.map((rng, i) => api.generateWord({ ...profile.options, trace: i === 0, rand: () => { calls[i]++; return rng(); } }));
    verifiedCertificates += verify(words[0].trace!.baseSpelling!).verifiedCertificates;
    delete words[0].trace;
    assert.deepEqual(words[0], words[1], `${profile.id}/${seed}/${draw}: trace flag changed output`);
    assert.equal(calls[0], calls[1], "trace flag changed RNG count");
    wordHash.update(JSON.stringify(words[0]) + "\n"); rngHash.update(`${draw}:${calls[0]}\n`);
  }
  const next = rngs.map(rng => rng()); assert.equal(next[0], next[1]);
  streams.push({ profile: profile.id, seed, draws: 1000, calls: calls[0], nextRng: next[0], commonWordDigest: wordHash.digest("hex"), rngBoundaryDigest: rngHash.digest("hex") });
  console.log(`${profile.id}/${seed}: 1000 output/RNG matches and exact ledgers`);
}
assert.deepEqual(sources(), before, "Runtime changed during parity");
assert.equal(streams.length, 20);
const report = { id: "spelling-coverage-active-trace-parity", result: "pass", createdAt: new Date().toISOString(), runtime,
  node: process.version, sourceFiles: before, probeSha256: sha(readFileSync(fileURLToPath(import.meta.url))), protocolSha256: sha(protocolText),
  comparedDraws: 20000, apiCalls: 40000, verifiedCertificates, streams };
writeFileSync(resolve(reportArg), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ result: report.result, compared: report.comparedDraws, certificates: verifiedCertificates }));
