import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { draws, filesDigest, originalRef, profiles, sourceSnapshot } from "../syllable-weight/shared.js";

type API = typeof import("../../../../src/index.js");
const [originalArg, candidateArg, outputArg] = process.argv.slice(2);
assert.ok(originalArg && candidateArg && outputArg, "Usage: legacy-opt-out.ts ORIGINAL_CHECKOUT CANDIDATE_CHECKOUT REPORT.json");
const roots = [resolve(originalArg), resolve(candidateArg)];
const ownPath = fileURLToPath(import.meta.url);
const dependencyPath = resolve(dirname(ownPath), "../syllable-weight/shared.ts");
const evaluatorSources = [ownPath, dependencyPath].map(path => ({ path, content: readFileSync(path, "utf8") }));
const sources = roots.map(sourceSnapshot);
execFileSync("git", ["diff", "--exit-code", originalRef, "--", "src", "package.json", "package-lock.json", "tsconfig.json"], { cwd: roots[0] });
const apis: API[] = await Promise.all(roots.map(root => import(pathToFileURL(join(root, "src/index.ts")).href)));
const generators = apis.map((api, index) => api.createGenerator(index === 0 ? api.englishConfig : {
  ...api.englishConfig,
  pronunciation: {
    ...api.englishConfig.pronunciation,
    stress: { ...api.englishConfig.pronunciation.stress, syllableWeight: { type: "legacy-segment-count" } },
  },
}));
const streams = [];
for (const profile of profiles) for (const seed of profile.seeds) {
  const variants = [];
  for (const tracing of [false, true]) {
    const rngs = apis.map(api => api.createSeededRng(seed));
    const calls = [0, 0];
    const hashes = apis.map(() => createHash("sha256"));
    const boundaryHash = createHash("sha256");
    let declaredQuantities = 0;
    for (let draw = 0; draw < draws; draw++) {
      const words = generators.map((generator, index) => generator.generateWord({
        ...profile.options, trace: tracing, rand: () => { calls[index]++; return rngs[index](); },
      }));
      const normalized = words.map(word => JSON.stringify(word, (key, value) =>
        key === "nuclearQuantity" || key === "stressWeight" ? undefined : value));
      assert.equal(normalized[0], normalized[1], `Legacy opt-out changed ${profile.id}/${seed}/${draw}/${tracing}`);
      assert.equal(calls[0], calls[1], "RNG call boundary changed");
      normalized.forEach((word, index) => hashes[index].update(word + "\n"));
      boundaryHash.update(`${draw}:${calls[0]}\n`);
      if (tracing) {
        const evidence = words[1].trace!.stressWeight!;
        assert.deepEqual(evidence.policy, { type: "legacy-segment-count" });
        const before = words[1].trace!.stages.find(stage => stage.name === "applyStress")!.before;
        for (const [index, syllable] of evidence.syllables.entries()) {
          assert.equal(syllable.analytical.weight, "unknown");
          assert.equal(syllable.nucleusMoras, null);
          assert.deepEqual(syllable.operational, {
            weight: before[index].coda.length || before[index].nucleus.length > 1 ? "heavy" : "light", basis: "legacy-rule",
          });
          for (const phone of syllable.nucleus) {
            assert.equal(phone.quantity.status, "unknown");
            if (phone.declared) declaredQuantities++;
          }
        }
      }
    }
    const next = rngs.map(rng => rng());
    assert.equal(next[0], next[1]);
    variants.push({ tracing, draws, normalizedWordHashes: hashes.map(hash => hash.digest("hex")), rngCalls: calls, rngBoundaryHash: boundaryHash.digest("hex"), nextRng: next, declaredQuantities });
  }
  streams.push({ profile: profile.id, seed, variants });
}
assert.deepEqual(roots.map(sourceSnapshot), sources, "Runtime source changed during opt-out verification");
assert.deepEqual(evaluatorSources.map(source => readFileSync(source.path, "utf8")), evaluatorSources.map(source => source.content), "Opt-out evaluator changed");
const report = {
  schemaVersion: 1, createdAt: new Date().toISOString(), probe: "partial-quantity-legacy-opt-out-v1",
  node: process.version, distinctScheduledDraws: draws * streams.length, executionsPerCheckout: draws * streams.length * 2,
  comparison: "Complete words and legacy traces with only nuclearQuantity and the additive stressWeight observation excluded. Candidate stressWeight is separately checked against root geometry under explicit legacy policy.",
  sources, sourceDigests: sources.map(filesDigest), evaluatorSources, streams,
};
writeFileSync(resolve(outputArg), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ report: resolve(outputArg), distinctScheduledDraws: report.distinctScheduledDraws, executionsPerCheckout: report.executionsPerCheckout, exactParity: true }));
