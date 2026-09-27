import { createGenerator, createSeededRng, englishConfig } from "../../src/index.js";
import { englishSplitVowelSupports } from "../../src/elements/graphemes/split-vowels.js";
import { canonical } from "./serialization.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { captureRun, readRun, validateProtocol } from "./capture.js";
import type { Draw, Protocol, RunSummary } from "./model.js";

const root = resolve(import.meta.dirname, "../..");
const protocol: Protocol = {
  schemaVersion: 1, id: "capture-test", wordsPerReplicate: 8, reviewDrawsPerReplicate: 2,
  profiles: [{ id: "lexicon", options: { mode: "lexicon", morphology: true }, seeds: { development: [42, 123], validation: [456, 789] } }],
};

describe("frozen quality capture", () => {
  let directory: string;
  let first: RunSummary;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "unglish-quality-"));
    first = await captureRun({ root, out: join(directory, "first"), id: "fixture", cohort: "development", protocol });
  });
  afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

  it("replays deterministically with complete traces and predefined review selection", async () => {
    const second = await captureRun({ root, out: join(directory, "second"), id: "fixture", cohort: "development", protocol });
    expect(second).toEqual(first);
    const one = await readRun(join(directory, "first"), true);
    const two = await readRun(join(directory, "second"), true);
    expect(one.manifest.artifacts).toEqual(two.manifest.artifacts);
    const archive = gunzipSync(await readFile(join(directory, "first/words/lexicon-42.jsonl.gz"))).toString().trim().split("\n").map(line => JSON.parse(line) as Draw);
    expect(archive.map(draw => draw.drawIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(archive.every(draw => draw.word.trace !== undefined)).toBe(true);
    const reviews = JSON.parse(gunzipSync(await readFile(join(directory, "first/review-samples.json.gz"))).toString()) as Draw[];
    expect(reviews.map(draw => [draw.seed, draw.drawIndex])).toEqual([[42, 0], [42, 1], [123, 0], [123, 1]]);
    expect(first.profiles[0].strata.reduce((total, stratum) => total + stratum.words, 0)).toBe(16);
  });

  it("captures explicit configuration and its v5 outputs without changing English defaults", async () => {
    const configuration = { ...englishConfig, splitVowels: { supports: englishSplitVowelSupports, routes: {
      syllable: { forms: ["ae", "ie", "oe", "ue", "ye"], probability: 95 },
      word: { swaps: englishConfig.silentE!.swaps, probability: 35, monosyllableMultiplier: 2 },
    } } };
    const expectedConfig = canonical(configuration);
    const expectedGenerator = createGenerator(structuredClone(configuration));
    const out = join(directory, "configured");
    const capturing = captureRun({ root, out, id: "configured", cohort: "development", protocol, configuration });
    // The caller changing its input after dispatch must not change the frozen run.
    configuration.splitVowels.routes.word.probability = 0;
    await capturing;
    const run = await readRun(out, true);
    expect(run.manifest.generator.effectiveConfig).toEqual(expectedConfig);
    const archive = gunzipSync(await readFile(join(out, "words/lexicon-42.jsonl.gz"))).toString().trim().split("\n").map(line => JSON.parse(line) as Draw);
    const rand = createSeededRng(42);
    for (const draw of archive) {
      expect(draw.word).toEqual(expectedGenerator.generateWord({ ...protocol.profiles[0].options, rand, trace: true }));
      expect(draw.word.trace!.baseSpelling!.version).toBe(5);
    }
    expect(englishConfig.splitVowels).toBeUndefined();
  });

  it("refuses to replace a completed baseline", async () => {
    await expect(captureRun({ root, out: join(directory, "first"), id: "fixture", cohort: "development", protocol })).rejects.toThrow();
    await expect(readRun(join(directory, "first"), true)).resolves.toBeDefined();
  });

  it("detects modified summaries before comparison", async () => {
    const path = join(directory, "first/summary.json");
    const original = await readFile(path);
    await writeFile(path, "{}\n");
    await expect(readRun(join(directory, "first"))).rejects.toThrow("Artifact verification failed: summary.json");
    await writeFile(path, original);
  });

  it("detects corrupted full trace archives", async () => {
    const path = join(directory, "first/words/lexicon-42.jsonl.gz");
    const original = await readFile(path);
    await writeFile(path, "corrupt");
    await expect(readRun(join(directory, "first"), true)).rejects.toThrow("Artifact verification failed");
    await writeFile(path, original);
  });

  it("rejects overlapping streams and invalid fixed sample selections", () => {
    const duplicate = structuredClone(protocol);
    duplicate.profiles[0].seeds.validation[0] = 42;
    expect(() => validateProtocol(duplicate)).toThrow("globally distinct");
    expect(() => validateProtocol({ ...protocol, reviewDrawsPerReplicate: 9 })).toThrow("Review sample size");
  });
});
