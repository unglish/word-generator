import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { draws, filesDigest, profiles, scheduleSha256, sha } from "../syllable-weight/shared.js";

type Variant = { tracing: boolean; wordHash: string; traceHash: string | null; rngBoundaryHash: string; rngCalls: number; nextRng: number };
interface Parity {
  schemaVersion: number;
  probe: string;
  mode: "control" | "candidate";
  node: string;
  reference: string;
  sources: Record<string, string>;
  sourceDigest: string;
  toolSha256: string;
  scheduleSha256: string;
  distinctScheduledDraws: number;
  generatedWords: number;
  streams: Array<{ profile: string; options: unknown; seed: number; draws: number; variants: Variant[] }>;
}
export function compareParity(before: Parity, after: Parity) {
  for (const [index, report] of [before, after].entries()) {
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.probe, "complete-stress-pattern-parity-v1");
    assert.equal(report.mode, index === 0 ? "control" : "candidate");
    assert.match(report.reference, /^[a-f0-9]{40}$/);
    assert.equal(report.sourceDigest, filesDigest(report.sources));
    assert.equal(report.scheduleSha256, scheduleSha256);
    assert.equal(report.distinctScheduledDraws, 20000);
    assert.equal(report.generatedWords, 40000);
    assert.equal(report.streams.length, 20);
    let streamIndex = 0;
    for (const profile of profiles) for (const seed of profile.seeds) {
      const stream = report.streams[streamIndex++];
      assert.equal(stream.profile, profile.id); assert.equal(stream.seed, seed); assert.equal(stream.draws, draws);
      assert.deepEqual(stream.options, profile.options); assert.equal(stream.variants.length, 2);
      for (const [index, variant] of stream.variants.entries()) {
        assert.equal(variant.tracing, index === 1);
        for (const hash of [variant.wordHash, variant.rngBoundaryHash]) assert.match(hash, /^[a-f0-9]{64}$/);
        if (variant.tracing) assert.match(variant.traceHash!, /^[a-f0-9]{64}$/);
        else assert.equal(variant.traceHash, null);
        assert.ok(Number.isSafeInteger(variant.rngCalls) && variant.rngCalls > 0);
        assert.ok(Number.isFinite(variant.nextRng) && variant.nextRng >= 0 && variant.nextRng < 1);
      }
      for (const field of ["wordHash", "rngBoundaryHash", "rngCalls", "nextRng"] as const) assert.equal(stream.variants[0][field], stream.variants[1][field]);
    }
  }
  assert.deepEqual(Object.keys(after.sources).sort(), [...Object.keys(before.sources), "src/core/stress-pattern.ts"].sort());
  for (const field of ["node", "toolSha256", "scheduleSha256", "streams"] as const) assert.deepEqual(before[field], after[field], `Source parity differs: ${field}`);
  return { schemaVersion: 1, probe: "complete-stress-pattern-rng-comparison-v1", result: "pass", distinctScheduledDraws: 20000,
    traceOnOffEqual: true, completeWordsAndLegacyTracesEqual: true, rngBoundariesTotalsNextEqual: true,
    control: { commit: before.reference, sources: before.sources, sourceDigest: before.sourceDigest },
    candidate: { commit: after.reference, sources: after.sources, sourceDigest: after.sourceDigest },
    toolSha256: before.toolSha256, scheduleSha256 };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [before, after, output] = process.argv.slice(2);
  assert.ok(before && after && output, "Usage: compare-parity.ts CONTROL.json CANDIDATE.json OUTPUT.json");
  const bytes = await Promise.all([before, after].map(path => readFile(resolve(path))));
  const report = compareParity(...bytes.map(bytes => JSON.parse(bytes.toString())) as [Parity, Parity]);
  await writeFile(resolve(output), JSON.stringify({ ...report, inputSha256: bytes.map(sha), comparatorSha256: sha(await readFile(fileURLToPath(import.meta.url))) }, null, 2) + "\n", { flag: "wx" });
}
