import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as control from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-control/word-generator/src/index.ts";
import * as candidate from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/src/index.ts";
import { treePins } from "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator/evaluation/experiments/following-letter-conditions/freeze-capture.mjs";
const candidateRoot = "/Users/ryanbetts/.codex/worktrees/linguistic-q02-resumed/word-generator", controlRoot = "/Users/ryanbetts/.codex/worktrees/linguistic-q02-control/word-generator";
const registrationBytes = await readFile(`${candidateRoot}/evaluation/experiments/final-word-ownership/measurement.json`);
const r = JSON.parse(registrationBytes), protocolBytes = await readFile(`${candidateRoot}/evaluation/quality/protocol.json`);
const sha = b => createHash("sha256").update(b).digest("hex");
assert.equal(sha(protocolBytes), r.protocolSha256);
const protocol = JSON.parse(protocolBytes);
const before = { candidate: await treePins(`${candidateRoot}/src`), control: await treePins(`${controlRoot}/src`) };
for (const [arm, pins] of [["final-word-provenance", before.candidate], ["spelling-stress-control", before.control]]) {
 const frozen = JSON.parse(await readFile(`/private/tmp/q02-${arm}-v1-freeze/before.json`));
 assert.deepEqual(pins, frozen.before.files.src);
}
let comparisons = 0, draws = 0, probes = 0;
const strata = [];
for (const enabled of [false, true]) {
 const config = api => ({ ...api.englishConfig, ...(enabled ? { splitVowels: r.configuration.splitVowels, followingLetters: r.configuration.followingLetters } : {}) });
 const a = control.createGenerator(config(control)), b = candidate.createGenerator(config(candidate));
 for (const profile of protocol.profiles) for (const seed of profile.seeds.development) {
  const ar = control.createSeededRng(seed), br = candidate.createSeededRng(seed);
  let ac = 0, bc = 0;
  for (let drawIndex = 0; drawIndex < 500; drawIndex++) {
   const options = { ...profile.options, trace: false };
   const expected = a.generateWord({ ...options, rand: () => { ac++; return ar(); } });
   const actual = b.generateWord({ ...options, rand: () => { bc++; return br(); } });
   assert.deepEqual(actual, expected, `${enabled}/${profile.id}/${seed}/${drawIndex}`);
   assert.equal(bc, ac, `Draw-count mismatch at ${enabled}/${profile.id}/${seed}/${drawIndex}`);
   comparisons++;
  }
  assert.equal(ar(), br()); probes++; draws += ac;
  strata.push({ enabled, profile: profile.id, seed, comparisons: 500, draws: ac, nextProbe: true });
  console.log(JSON.stringify(strata.at(-1)));
 }
}
assert.deepEqual(await treePins(`${candidateRoot}/src`), before.candidate);
assert.deepEqual(await treePins(`${controlRoot}/src`), before.control);
await writeFile("/private/tmp/q02-registered-rng-parity.json", JSON.stringify({ passed: true, comparisons, publicCalls: comparisons * 2, draws, nextValueProbes: probes,
 rngDrawAndNextProbeDifferences: 0, strata, source: before, registrationSha256: sha(registrationBytes), protocolSha256: sha(protocolBytes),
 runnerSha256: sha(await readFile(new URL(import.meta.url))), node: process.version,
 scope: "First 500 successive untraced words of every registered development stream, under default and active policies. Full 200,000-word traced archive equality is a separate check." }, null, 2) + "\n", { flag: "wx" });
