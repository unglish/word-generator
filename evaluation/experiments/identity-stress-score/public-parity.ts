import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import * as candidate from "../../../src/index.js";
import type { WordGenerationOptions } from "../../../src/types.js";
import { loadPinnedReference, type ReferencePin } from "./reference.js";

async function main() {
  const { values } = parseArgs({ options: { base: { type: "string" }, out: { type: "string" } } });
  if (!values.base || !values.out) throw new Error("--base and --out are required.");
  const base = await import(pathToFileURL(resolve(values.base, "src/index.ts")).href) as typeof candidate;
  const protocol = JSON.parse(await readFile(new URL("protocol-v1.json", import.meta.url), "utf8")) as { declaredDataDependency: ReferencePin };
  const reference = await loadPinnedReference(fileURLToPath(new URL("reference.json.gz", import.meta.url)), protocol.declaredDataDependency);
  const scorer = candidate.createIdentityStressScorer(reference);
  const profiles: { name: string; options: WordGenerationOptions; seed: number }[] = [
    { name: "lexicon-default", options: { mode: "lexicon", morphology: true }, seed: 69212153 },
    { name: "lexicon-bare", options: { mode: "lexicon", morphology: false }, seed: 2380207674 },
    { name: "monosyllables-bare", options: { mode: "lexicon", morphology: false, syllableCount: 1 }, seed: 462530651 },
    { name: "text-default", options: { mode: "text", morphology: true }, seed: 4167471042 },
  ];
  const checks = [];
  for (const profile of profiles) {
    const stream = () => {
      const rng = candidate.createSeededRng(profile.seed);
      const state = { calls: 0, rand: () => { state.calls++; return rng(); } };
      return state;
    };
    const states = [stream(), stream(), stream(), stream()], digest = createHash("sha256");
    for (let index = 0; index < 500; index++) {
      const on = candidate.generateWord({ ...profile.options, rand: states[0].rand, trace: true });
      const parent = base.generateWord({ ...profile.options, rand: states[1].rand, trace: true });
      const off = candidate.generateWord({ ...profile.options, rand: states[2].rand });
      const parentOff = base.generateWord({ ...profile.options, rand: states[3].rand });
      assert.deepEqual(on, parent); assert.deepEqual(off, parentOff);
      const payload = { ...on }; delete payload.trace;
      assert.deepEqual(payload, off);
      const before = JSON.stringify(on);
      const observed = candidate.observeWordIdentity(on, { sourceProfile: "english-legacy-v1", layer: "surface" });
      const evidence = candidate.observeSurfaceStressEvidence(observed, on.trace);
      const score = scorer.score(observed, evidence), original = JSON.stringify(score);
      assert.equal(JSON.stringify(scorer.score(observed, evidence)), original);
      score.model.artifactDigest = "changed"; score.evidence.marks[0] = "unavailable"; score.native.tokens[0] = null;
      assert.equal(JSON.stringify(scorer.score(observed, evidence)), original);
      observed.segments[0].rawSound = "changed";
      assert.equal(JSON.stringify(on), before);
      assert.equal(new Set(states.map(state => state.calls)).size, 1);
      digest.update(before + "\n");
    }
    const next = states.map(state => state.rand());
    assert.equal(new Set(next).size, 1);
    checks.push({ profile: profile.name, seed: profile.seed, coordinates: 500, publicCalls: 2000,
      streamSha256: digest.digest("hex"), rngCallsIncludingNextProbe: states[0].calls, nextDraws: next });
  }
  await writeFile(resolve(values.out), `${JSON.stringify({ coordinates: 2000, publicCalls: 8000, checks,
    scope: "Exact parent/candidate public trace-on/off words and draw counts/next probes; scoring has no RNG or generator mutation, returned score state detached. These are regression coordinates, separate from the 600000 archived study." }, null, 2)}\n`, { flag: "wx" });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
