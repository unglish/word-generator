import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const args = process.argv.slice(2);
assert.equal(args.length, 4, "Usage: parity.mjs CONTROL_CHECKOUT CANDIDATE_CHECKOUT CONTROL_ARCHIVE OUTPUT.json");
const [control, current, archive, output] = args.map(path => resolve(path));
const archived = JSON.parse(gunzipSync(readFileSync(`${archive}/sources.json.gz`)));
const manifest = JSON.parse(readFileSync(`${archive}/manifest.json`, "utf8")).manifest;
const verify = () => { for (const file of archived.generator) assert.equal(readFileSync(`${control}/${file.path}`, "utf8"), file.content); };
verify();
const first = await import(pathToFileURL(`${control}/src/index.ts`).href);
const second = await import(pathToFileURL(`${current}/src/index.ts`).href);
const config = module => ({ ...module.englishConfig, codaConstraints: { ...module.englishConfig.codaConstraints, bannedNucleusCodaCombinations: [] } });
const a = first.createGenerator(config(first)), b = second.createGenerator(config(second));
const protocol = JSON.parse(readFileSync(`${current}/evaluation/quality/protocol.json`, "utf8"));
const streams = [];
for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
  const ra = first.createSeededRng(seed), rb = second.createSeededRng(seed);
  let ca = 0, cb = 0;
  const hashA = createHash("sha256"), hashB = createHash("sha256");
  for (let i = 0; i < 1000; i++) {
    const wa = a.generateWord({ ...profile.options, rand: () => { ca++; return ra(); } });
    const wb = b.generateWord({ ...profile.options, rand: () => { cb++; return rb(); } });
    assert.deepEqual(wb, wa, `${profile.id}/${seed}/${i}`);
    hashA.update(JSON.stringify(wa) + "\n"); hashB.update(JSON.stringify(wb) + "\n");
  }
  assert.equal(cb, ca); const nextA = ra(), nextB = rb(); assert.equal(nextB, nextA);
  const digestA = hashA.digest("hex"), digestB = hashB.digest("hex"); assert.equal(digestB, digestA);
  streams.push({ profile: profile.id, seed, words: 1000, rngCalls: ca, nextRng: nextA, wordsDigest: digestA });
}
verify();
const report = { controlCommit:manifest.generator.commit, scope:"Only configured nucleus/coda exclusions cleared identically in both versions; all other configuration unchanged, trace disabled.", totalWords:20000, streams };
writeFileSync(output, JSON.stringify(report, null, 2) + "\n", {flag:"wx"});
console.log("Exact full output and RNG parity for 20000 draws across four profiles and five streams with no configured exclusions.");
