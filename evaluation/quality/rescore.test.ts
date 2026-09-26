import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as generator from "../../src/index.js";
import { captureRun, readRun, rescoreRun } from "./capture.js";
import { compareSummaries } from "./compare.js";
import type { ArchivedProvenance, Draw, Manifest, Protocol, SourceArchive } from "./model.js";
import { digest } from "./serialization.js";

const root = resolve(import.meta.dirname, "../..");
const protocol: Protocol = {
  schemaVersion: 1, id: "rescore-test", wordsPerReplicate: 8, reviewDrawsPerReplicate: 2,
  profiles: [{ id: "lexicon", options: { mode: "lexicon", morphology: true }, seeds: { development: [42, 123], validation: [456, 789] } }],
};
const rawFile = "words/lexicon-42.jsonl.gz";

async function json<T>(directory: string, file: string): Promise<T> {
  const bytes = await readFile(join(directory, file));
  return JSON.parse((file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString()) as T;
}

async function replaceArtifact(directory: string, manifest: Manifest, file: string, bytes: Buffer): Promise<void> {
  await writeFile(join(directory, file), bytes);
  Object.assign(manifest.artifacts.find(item => item.file === file)!, {
    sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length,
  });
}

async function saveManifest(directory: string, manifest: Manifest): Promise<void> {
  await writeFile(join(directory, "manifest.json"), JSON.stringify({ manifest, digest: digest(manifest) }));
}

describe("offline quality rescoring", () => {
  let directory: string;
  let input: string;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "unglish-rescore-"));
    input = join(directory, "original");
    await captureRun({ root, out: input, id: "original", cohort: "development", protocol });
  });
  afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

  it("never generates, preserves exact archived bytes, and matches an unchanged recapture", async () => {
    const out = join(directory, "rescored");
    const generate = vi.spyOn(generator, "generateWord").mockImplementation(() => { throw new Error("Rescoring must not generate words."); });
    try {
      await rescoreRun({ root, input, out, id: "rescored" });
      expect(generate).not.toHaveBeenCalled();
    } finally {
      generate.mockRestore();
    }
    const original = await readRun(input, true);
    const rescored = await readRun(out, true);
    expect(rescored.manifest.generator).toEqual(original.manifest.generator);
    expect(rescored.manifest.environment).toEqual(original.manifest.environment);
    expect(rescored.manifest.rescore).toEqual({ parentId: "original", parentManifestDigest: digest(original.manifest), parentEvaluatorDigest: original.manifest.evaluatorDigest });
    for (const artifact of original.manifest.artifacts.filter(item => item.file.startsWith("words/"))) {
      expect(rescored.manifest.artifacts.find(item => item.file === artifact.file)).toEqual(artifact);
      expect(await readFile(join(out, artifact.file))).toEqual(await readFile(join(input, artifact.file)));
    }
    const current = await captureRun({ root, out: join(directory, "recaptured"), id: "recaptured", cohort: "development", protocol });
    expect(rescored.summary.profiles).toEqual(current.profiles);
    expect(() => compareSummaries(rescored.summary, current)).not.toThrow();
    for (const file of ["review-samples.json.gz", "witnesses.json.gz", "distributions.json.gz"]) {
      expect(await readFile(join(out, file))).toEqual(await readFile(join(directory, "recaptured", file)));
    }
  });

  it("upgrades a historical evaluator while retaining original sources, references, and generation environment", async () => {
    const historical = join(directory, "historical");
    await cp(input, historical, { recursive: true });
    const original = await readRun(historical);
    const sources = await json<SourceArchive>(historical, "sources.json.gz");
    sources.evaluator = [{ path: "evaluation/quality/legacy.ts", content: "// Historical evaluator fixture\n" }];
    sources.generator[0].content += "\n// Historical generator source fixture\n";
    sources.references.find(file => file.path === "data/cmu/cmu-lexicon-phonemes.json")!.content = JSON.stringify({ "ə": 123 });
    original.manifest.generator.commit = "historical-revision";
    original.manifest.generator.sourceDigest = digest(sources.generator);
    original.manifest.environment.node = "historical-runtime";
    original.manifest.evaluatorDigest = digest({ files: sources.evaluator, definitions: original.summary.definitions });
    original.manifest.referenceDigest = digest(sources.references);
    original.summary.evaluatorDigest = original.manifest.evaluatorDigest;
    original.summary.referenceDigest = original.manifest.referenceDigest;
    await replaceArtifact(historical, original.manifest, "sources.json.gz", gzipSync(JSON.stringify(sources)));
    await replaceArtifact(historical, original.manifest, "summary.json", Buffer.from(JSON.stringify(original.summary)));
    await saveManifest(historical, original.manifest);
    const out = join(directory, "upgraded");
    await rescoreRun({ root, input: historical, out, id: "upgraded" });
    const upgraded = await readRun(out, true);
    expect(upgraded.manifest.generator).toEqual(original.manifest.generator);
    expect(upgraded.manifest.environment).toEqual(original.manifest.environment);
    expect(upgraded.manifest.evaluationEnvironment?.node).toBe(process.version);
    expect(upgraded.manifest.evaluatorDigest).not.toBe(original.manifest.evaluatorDigest);
    const updatedSources = await json<SourceArchive>(out, "sources.json.gz");
    expect(updatedSources.generator).toEqual(sources.generator);
    expect(updatedSources.references).toEqual(sources.references);
    expect(updatedSources.packageFiles).toEqual(sources.packageFiles);
    expect(updatedSources.evaluator).not.toEqual(sources.evaluator);
    expect(updatedSources.evaluatorPackageFiles).toBeDefined();
    const provenance = await json<ArchivedProvenance[]>(out, "provenance.json.gz");
    expect(provenance).toEqual([{ manifest: original.manifest, digest: digest(original.manifest), sources }]);
    await writeFile(join(historical, rawFile), "altered after rescoring");
    await expect(readRun(out, true)).resolves.toBeDefined();
  });

  it("retains the complete provenance chain when rescoring an already rescored corpus", async () => {
    const first = join(directory, "chain-one");
    const second = join(directory, "chain-two");
    await rescoreRun({ root, input, out: first, id: "chain-one" });
    await rescoreRun({ root, input: first, out: second, id: "chain-two" });
    const provenance = await json<ArchivedProvenance[]>(second, "provenance.json.gz");
    expect(provenance.map(item => item.manifest.id)).toEqual(["original", "chain-one"]);
    const result = await readRun(second, true);
    expect(result.manifest.generator).toEqual((await readRun(input)).manifest.generator);
    expect(result.manifest.rescore?.parentId).toBe("chain-one");
  });

  it("rejects corruption before creating an output and never overwrites a completed run", async () => {
    const corrupted = join(directory, "corrupted");
    await cp(input, corrupted, { recursive: true });
    await writeFile(join(corrupted, rawFile), "corrupt");
    const out = join(directory, "failed-corruption");
    await expect(rescoreRun({ root, input: corrupted, out, id: "corrupt" })).rejects.toThrow("Artifact verification failed");
    await expect(readFile(join(out, "sources.json.gz"))).rejects.toThrow();
    await expect(rescoreRun({ root, input, out: input, id: "overwrite" })).rejects.toThrow();
    await expect(readRun(input, true)).resolves.toBeDefined();
  });

  it.each(["identity", "order", "short", "long"])("rejects a repinned %s stream instead of silently rescoring different draws", async kind => {
    const malformed = join(directory, `malformed-${kind}`);
    await cp(input, malformed, { recursive: true });
    const { manifest } = await readRun(malformed);
    const draws = gunzipSync(await readFile(join(malformed, rawFile))).toString().trim().split("\n").map(line => JSON.parse(line) as Draw);
    if (kind === "identity") draws[0].seed = 999;
    if (kind === "order") [draws[0], draws[1]] = [draws[1], draws[0]];
    if (kind === "short") draws.pop();
    if (kind === "long") draws.push({ ...draws[0], drawIndex: 8 });
    await replaceArtifact(malformed, manifest, rawFile, gzipSync(draws.map(draw => JSON.stringify(draw)).join("\n") + "\n"));
    await saveManifest(malformed, manifest);
    const out = join(directory, `failed-${kind}`);
    await expect(rescoreRun({ root, input: malformed, out, id: "malformed" })).rejects.toThrow(/Invalid draw identity|Incomplete stream/);
    await expect(readFile(join(out, "manifest.json"))).rejects.toThrow();
  });

  it("refuses an unpinned raw stream even if its file exists", async () => {
    const unpinned = join(directory, "unpinned");
    await cp(input, unpinned, { recursive: true });
    const { manifest } = await readRun(unpinned);
    manifest.artifacts = manifest.artifacts.filter(item => item.file !== rawFile);
    await saveManifest(unpinned, manifest);
    await expect(rescoreRun({ root, input: unpinned, out: join(directory, "failed-unpinned"), id: "unpinned" })).rejects.toThrow("Manifest must pin exactly one words/");
  });
});
