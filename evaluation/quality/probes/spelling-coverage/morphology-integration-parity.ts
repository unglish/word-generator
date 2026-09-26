import { snapshotWordDifference, verifyMorphologyIntegration } from "./morphology-integration.js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { DoublingConfig, LanguageConfig } from "../../../../src/config/language.js";
import type { WordGenerationOptions } from "../../../../src/types.js";

type API = typeof import("../../../../src/index.js");
const [originalArg, candidateArg, reportArg] = process.argv.slice(2);
assert.ok(originalArg && candidateArg && reportArg, "Usage: refactor-parity.ts ORIGINAL CANDIDATE REPORT.json");
const original = resolve(originalArg);
const candidate = resolve(candidateArg);
const sha = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");
function sources(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  function walk(relative: string): void {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(relative, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|js|json)$/.test(entry.name) && !/\.(test|bench)\./.test(entry.name)) files[path] = sha(readFileSync(join(root, path)));
    }
  }
  walk("src");
  return files;
}
const before = [sources(original), sources(candidate)];
const apis: API[] = await Promise.all([original, candidate].map(root => import(pathToFileURL(join(root, "src/index.ts")).href)));
const protocol = JSON.parse(readFileSync(join(candidate, "evaluation/quality/protocol.json"), "utf8")) as {
  profiles: Array<{ id: string; options: WordGenerationOptions; seeds: { development: number[] } }>;
};
const streams = [];
const legacyWriter = await import(pathToFileURL(join(original, "src/core/write.ts")).href);
const maximum = apis[0].englishConfig.writtenFormConstraints!.maxConsonantLetters!;
let changedWritten = 0;
const witnesses: unknown[] = [];
for (const profile of protocol.profiles) {
  for (const seed of profile.seeds.development) {
    const variants = apis.flatMap(api => [true, false].map(trace => {
      const rng = api.createSeededRng(seed);
      let calls = 0;
      return { api, trace, rand: () => { calls++; return rng(); }, calls: () => calls, next: rng };
    }));
    const hash = createHash("sha256");
    const candidateHash = createHash("sha256");
    const rngHash = createHash("sha256");
    for (let draw = 0; draw < 1000; draw++) {
      const words = variants.map(({ api, trace, rand }) => api.generateWord({ ...profile.options, trace, rand }));
      const changed = verifyMorphologyIntegration(words[0], words[2], maximum, legacyWriter.repairConsonantLetters);
      if (changed) {
        changedWritten++;
        if (witnesses.length < 8) witnesses.push({ profile: profile.id, seed, drawIndex: draw, ...snapshotWordDifference(words[0], words[2]) });
      }
      hash.update(JSON.stringify(words[0]) + "\n");
      candidateHash.update(JSON.stringify(words[2]) + "\n");
      delete words[0].trace;
      delete words[2].trace;
      assert.deepEqual(words[1], words[0], `${profile.id}/${seed}/${draw}: original trace parity`);
      assert.deepEqual(words[3], words[2], `${profile.id}/${seed}/${draw}: candidate trace parity`);
      const calls = variants.map(variant => variant.calls());
      assert.ok(calls.every(count => count === calls[0]), "RNG call count changed");
      rngHash.update(`${draw}:${calls[0]}\n`);
    }
    const next = variants.map(variant => variant.next());
    assert.ok(next.every(value => value === next[0]), "Next RNG changed");
    streams.push({ profile: profile.id, seed, draws: 1000, originalFullTraceDigest: hash.digest("hex"), candidateFullTraceDigest: candidateHash.digest("hex"), rngBoundaryDigest: rngHash.digest("hex"), calls: variants[0].calls(), nextRng: next[0] });
    console.log(`${profile.id}/${seed}: 1000 verified Q06-only differences and exact RNG boundaries`);
  }
}
const customOverrides: Partial<DoublingConfig>[] = [
  { enabled: false }, { probability: 0 }, { probability: 100 },
  { probability: 100, unstressedModifier: 1 }, { maxPerWord: 0 }, { maxPerWord: 3 },
  { trigger: "gemination", probability: 100 },
  { neverDouble: [], finalDoublingOnly: [], neverDoubleFinal: [], probability: 100 },
];
const custom = [];
for (const override of customOverrides) {
  const generators = apis.map(api => api.createGenerator({
    ...api.englishConfig, doubling: { ...api.englishConfig.doubling!, ...override },
  }));
  const rngs = apis.map(api => api.createSeededRng(744));
  const calls = [0, 0];
  const hash = createHash("sha256");
  for (let draw = 0; draw < 200; draw++) {
    const words = generators.map((generator, index) => generator.generateWord({
      trace: true, morphology: false, rand: () => { calls[index]++; return rngs[index](); },
    }));
    assert.deepEqual(words[0], words[1], `Custom doubling ${JSON.stringify(override)} draw ${draw}`);
    assert.equal(calls[0], calls[1]);
    hash.update(JSON.stringify(words[0]) + "\n");
  }
  const next = rngs.map(rng => rng());
  assert.equal(next[0], next[1]);
  custom.push({ override, seed: 744, draws: 200, calls: calls[0], nextRng: next[0], originalFullTraceDigest: hash.digest("hex") });
}
const mutations: Array<{ id: string; initialEnabled: boolean; mutate: (config: LanguageConfig) => void }> = [
  { id: "replace-maps", initialEnabled: true, mutate: config => { config.graphemeMaps = { onset: new Map(), nucleus: new Map(), coda: new Map() }; } },
  { id: "replace-doubling", initialEnabled: true, mutate: config => { config.doubling = { ...config.doubling!, maxPerWord: 0 }; } },
  { id: "disable-after-creation", initialEnabled: true, mutate: config => { config.doubling!.enabled = false; } },
  { id: "enable-after-creation", initialEnabled: false, mutate: config => { config.doubling!.enabled = true; } },
];
const mutationCases = [];
for (const mutation of mutations) {
  const generators = apis.map(api => {
    const config: LanguageConfig = { ...api.englishConfig, doubling: { ...api.englishConfig.doubling!, enabled: mutation.initialEnabled } };
    const generator = api.createGenerator(config);
    mutation.mutate(config);
    return generator;
  });
  const rngs = apis.map(api => api.createSeededRng(744));
  const calls = [0, 0];
  const hash = createHash("sha256");
  for (let draw = 0; draw < 200; draw++) {
    const words = generators.map((generator, index) => generator.generateWord({
      trace: true, morphology: false, rand: () => { calls[index]++; return rngs[index](); },
    }));
    assert.deepEqual(words[0], words[1], `${mutation.id}/${draw}`);
    assert.equal(calls[0], calls[1]);
    hash.update(JSON.stringify(words[0]) + "\n");
  }
  const next = rngs.map(rng => rng());
  assert.equal(next[0], next[1]);
  mutationCases.push({ id: mutation.id, seed: 744, draws: 200, calls: calls[0], nextRng: next[0], originalFullTraceDigest: hash.digest("hex") });
}
assert.deepEqual([sources(original), sources(candidate)], before, "Runtime source changed during parity");
assert.equal(streams.length, 20);
const report = {
  id: "spelling-morphology-dependency-parity", result: "pass", createdAt: new Date().toISOString(),
  original, candidate, node: process.version, sourceFiles: { original: before[0], candidate: before[1] },
  probeSha256: sha(readFileSync(fileURLToPath(import.meta.url))), protocolSha256: sha(JSON.stringify(protocol)),
  integrationVerifierSha256: sha(readFileSync(fileURLToPath(new URL("./morphology-integration.ts", import.meta.url)))),
  changedWritten, witnesses,
  comparedDraws: 20000, customDraws: 1600, mutationDraws: 800, apiCalls: 84800, streams, custom, mutationCases,
};
writeFileSync(resolve(reportArg), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ result: report.result, compared: report.comparedDraws, apiCalls: report.apiCalls }));
