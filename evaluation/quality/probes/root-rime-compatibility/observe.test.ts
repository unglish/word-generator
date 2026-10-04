import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm, cp, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { englishConfig, generateWord } from "../../../../src/index.js";
import { captureRun } from "../../capture.js";
import { digest } from "../../serialization.js";
import type { Draw, Manifest, Protocol } from "../../model.js";
import { emptyObservation, observe, pairSet, reconcile } from "./observe.js";
import { analyzeRun } from "./analyze.js";

const pairs = pairSet([{ nucleus: ["æ", "ɚ"], coda: ["ŋ"] }]);
const shape = (nucleus: string[], coda: string[]) => ({ onset: ["b"], nucleus, coda });
function fixture(): Draw {
  const word = generateWord({ seed: 4, morphology: false, trace: true });
  word.trace!.repairs = [{ rule: "repairStressedNuclei", before: "ə", after: "æ" }];
  const before = [shape(["ə"], ["ŋ"])], after = [shape(["æ"], ["ŋ"])];
  word.trace!.stages = [
    { name: "generateSyllables", before: [], after: before },
    { name: "applyStress", before, after: before },
    { name: "repairStressedNuclei", before, after },
    { name: "repairNucleusWordPositions", before: after, after },
    { name: "generateWrittenForm", before: after, after },
  ];
  return { profile: "fixture", seed: 4, drawIndex: 0, word };
}

describe("selected-root pair observation", () => {
  it("counts each forbidden Cartesian segment pair once despite duplicate rules", () => {
    const draw = fixture();
    draw.word.trace!.stages[0].after = [shape(["u", "æ", "æ"], ["t", "ŋ", "ŋ"])];
    const rules = pairSet([{ nucleus: ["æ"], coda: ["ŋ"] }, { nucleus: ["æ"], coda: ["ŋ"] }]);
    const result = emptyObservation(); observe(draw, result, rules, false); reconcile(result);
    expect(result.layers.generatedRoot).toMatchObject({ nuclearSegments: 3, codaSegments: 3, crossPairs: 9, violatingPairs: 4, violatingNuclei: 2, violatingSyllables: 1 });
  });
  it("distinguishes sampling from a stress-created pair and later surface observations", () => {
    const result = emptyObservation(); observe(fixture(), result, pairs, false); reconcile(result);
    expect(result.layers.generatedRoot.violatingPairs).toBe(0);
    expect(result.layers.preparedRoot.violatingPairs).toBe(1);
    expect(result.transitions.stressRepair).toMatchObject({ introduced: 1, removed: 0 });
  });
  it("records missing stages as unavailable and rejects ambiguous duplicates", () => {
    const draw = fixture(); draw.word.trace!.stages = [];
    const result = emptyObservation(); observe(draw, result, pairs, false); reconcile(result);
    expect(result.layers.preparedRoot.unavailableWords).toBe(1);
    const duplicate = fixture(); duplicate.word.trace!.stages.push(duplicate.word.trace!.stages[0]);
    expect(() => observe(duplicate, emptyObservation(), pairs, false)).toThrow(/Duplicate stage/);
  });
  it("rejects malformed snapshots and a coda changed during nucleus repair", () => {
    const malformed = fixture(); malformed.word.trace!.stages[0].after[0].nucleus = [undefined as unknown as string];
    expect(() => observe(malformed, emptyObservation(), pairs, false)).toThrow(/Malformed/);
    const changed = fixture(); changed.word.trace!.stages[2].after = [shape(["u"], [])];
    expect(() => observe(changed, emptyObservation(), pairs, false)).toThrow(/retained coda/);
  });
  it.each(["missing", "duplicate"])("rejects a forged %s repair event despite valid stage snapshots", kind => {
    const draw = fixture();
    if (kind === "missing") draw.word.trace!.repairs = [];
    else draw.word.trace!.repairs.push(draw.word.trace!.repairs[0]);
    expect(() => observe(draw, emptyObservation(), pairs, true)).toThrow(/stage changes/);
    expect(() => observe(draw, emptyObservation(), pairs, false)).toThrow(/stage changes/);
  });
  it("rejects an onset mutation during nucleus repair", () => {
    const draw = fixture(); draw.word.trace!.stages[2].after = [{ ...shape(["æ"], ["ŋ"]), onset: ["d"] }];
    expect(() => observe(draw, emptyObservation(), pairs, false)).toThrow(/changed the onset/);
  });
  it("requires candidate repair details while leaving historical absence unknown", () => {
    const draw = fixture(); draw.word.trace!.repairs = [{ rule: "repairStressedNuclei", before: "ə", after: "æ" }];
    const result = emptyObservation(); observe(draw, result, pairs, false);
    expect(result.replacements.stressRepair.unavailableDetails).toBe(1);
    expect(() => observe(draw, emptyObservation(), pairs, true)).toThrow(/lacks structured details/);
  });
  it("checks structured selection evidence and a retained-coda-compatible choice", () => {
    const draw = fixture(); draw.word.trace!.stages[2].after = [shape(["u"], ["ŋ"])];
    const replacement = { rule: "repairStressedNuclei", before: "ə", after: "u", nucleusReplacement: {
      domain: "lexical-root" as const, syllableIndex: 0, nucleusIndex: 0, coda: ["ŋ"], edges: { initial: false, final: false },
      weighting: "nucleus-only" as const, eligibleCandidateEntries: 2, positivePairExclusions: 1, totalWeight: 5,
    } };
    draw.word.trace!.repairs = [replacement];
    const result = emptyObservation(); observe(draw, result, pairs, true); reconcile(result);
    expect(result.replacements.stressRepair).toMatchObject({ detailedRepairs: 1, positivePairExclusions: 1, repairsWithPairExclusions: 1 });
    replacement.nucleusReplacement.totalWeight = 0;
    expect(() => observe(draw, emptyObservation(), pairs, true)).toThrow();
  });
});

let temporary: string, original: string;
const root = fileURLToPath(new URL("../../../../", import.meta.url));
async function envelope(directory: string) { return JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as { manifest: Manifest; digest: string }; }
async function updateArtifact(directory: string, file: string, bytes: Buffer): Promise<void> {
  await writeFile(join(directory, file), bytes);
  const saved = await envelope(directory), artifact = saved.manifest.artifacts.find(item => item.file === file)!;
  artifact.bytes = bytes.length; artifact.sha256 = createHash("sha256").update(bytes).digest("hex");
  saved.digest = digest(saved.manifest); await writeFile(join(directory, "manifest.json"), JSON.stringify(saved));
}
async function clone(name: string): Promise<string> { const path = join(temporary, name); await cp(original, path, { recursive: true }); return path; }
beforeAll(async () => {
  temporary = await mkdtemp(join(tmpdir(), "root-rime-probe-")); original = join(temporary, "valid");
  const protocol = JSON.parse(await readFile(join(root, "evaluation/quality/protocol.json"), "utf8")) as Protocol;
  protocol.wordsPerReplicate = 2; protocol.reviewDrawsPerReplicate = 1; protocol.profiles = protocol.profiles.slice(0, 1);
  protocol.profiles[0].seeds = { development: [4, 5], validation: [6, 7] };
  await captureRun({ root, out: original, id: "fixture", cohort: "development", protocol });
});
afterAll(async () => { if (temporary) await rm(temporary, { recursive: true, force: true }); });

describe("archive provenance and exact draw stream", () => {
  it("observes the exact tiny public-API archive", async () => {
    const report = await analyzeRun(original, "control");
    expect(report.profiles[0].totals.words).toBe(4);
    expect(report.configuredPairs).toEqual([...pairSet(englishConfig.codaConstraints!.bannedNucleusCodaCombinations!)].sort());
  });
  it.each(["missing", "extra", "corrupt"])("rejects %s shard bytes", async kind => {
    const path = await clone(kind), files = await readdir(join(path, "words"));
    if (kind === "missing") await rm(join(path, "words", files[0]));
    if (kind === "extra") await cp(join(path, "words", files[0]), join(path, "words", "extra.jsonl.gz"));
    if (kind === "corrupt") await writeFile(join(path, "words", files[0]), "corrupt");
    await expect(analyzeRun(path, "control")).rejects.toThrow();
  });
  it.each(["dropped", "duplicate", "reordered", "wrong-profile"])("rejects rehashed %s draws", async kind => {
    const path = await clone(kind), file = `words/${(await readdir(join(path, "words")))[0]}`;
    const lines = gunzipSync(await readFile(join(path, file))).toString("utf8").trimEnd().split("\n");
    if (kind === "dropped") lines.pop();
    if (kind === "duplicate") lines[1] = lines[0];
    if (kind === "reordered") lines.reverse();
    if (kind === "wrong-profile") { const draw = JSON.parse(lines[0]); draw.profile = "wrong"; lines[0] = JSON.stringify(draw); }
    await updateArtifact(path, file, gzipSync(lines.join("\n") + "\n"));
    await expect(analyzeRun(path, "control")).rejects.toThrow();
  });
  it("rejects rehashed source changes and summary identity changes", async () => {
    const path = await clone("source"), sources = JSON.parse(gunzipSync(await readFile(join(path, "sources.json.gz"))).toString("utf8"));
    sources.generator.pop(); await updateArtifact(path, "sources.json.gz", gzipSync(JSON.stringify(sources)));
    await expect(analyzeRun(path, "control")).rejects.toThrow(/source digest/);
    const other = await clone("summary"), summary = JSON.parse(await readFile(join(other, "summary.json"), "utf8"));
    summary.profiles[0].replicates.reverse(); await updateArtifact(other, "summary.json", Buffer.from(JSON.stringify(summary)));
    await expect(analyzeRun(other, "control")).rejects.toThrow(/schedule/);
  });
  it("rejects duplicate pinned shards even when the manifest is rehashed", async () => {
    const path = await clone("duplicate-pinned"), saved = await envelope(path);
    saved.manifest.artifacts.push(saved.manifest.artifacts.find(item => item.file.startsWith("words/"))!);
    saved.digest = digest(saved.manifest); await writeFile(join(path, "manifest.json"), JSON.stringify(saved));
    await expect(analyzeRun(path, "control")).rejects.toThrow();
  });
});
