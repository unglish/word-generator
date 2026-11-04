import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { generateWord } from "../../src/index.js";
import { canonicalJson, jsonDigest } from "../corpus/identity.js";
import { buildJointReference } from "../corpus/joint.js";
import { validateJointEnvelope, projectPhones, writeJointArtifact, type JointEnvelope } from "../corpus/joint-artifact.js";
import { originalDraws, validateOriginalManifest, type OriginalManifest } from "../corpus/archive.js";

const packageRoot = resolve("evaluation/experiments/cmu-matched-reference");
const reference = JSON.parse(gunzipSync(readFileSync(join(packageRoot, "reference.json.gz"))).toString("utf8")) as JointEnvelope;
const manifest = JSON.parse(gunzipSync(readFileSync(join(packageRoot, "baseline-manifest.json.gz"))).toString("utf8"));
const fresh = (): JointEnvelope => structuredClone(reference);
function redigest(envelope: JointEnvelope): JointEnvelope { envelope.digest = jsonDigest(envelope.artifact); return envelope; }

describe("immutable matched-population reference", () => {
  it("validates the published integer tables and exact original population", () => {
    expect(() => validateJointEnvelope(reference, reference.artifact.implementation.sources)).not.toThrow();
    expect(reference.artifact.reference.phones.native.total).toBe(742333);
    expect(reference.artifact.reference.population.accepted).toBe(117485);
    expect(reference.artifact.legacy.phones.denominator).toBeNull();
  });
  it.each([
    ["percentage in integer table", (e: JointEnvelope) => { e.artifact.reference.phones.native.counts.AE1 = 4.5; }],
    ["wrong entry set", (e: JointEnvelope) => { e.artifact.reference.population.entryDigest = "0".repeat(64); }],
    ["missing policy", (e: JointEnvelope) => { Reflect.deleteProperty(e.artifact.reference.population.definition, "traversal"); }],
    ["extra policy", (e: JointEnvelope) => { Object.assign(e.artifact.reference.population.definition, { dialect: "guessed" }); }],
    ["wrong projection", (e: JointEnvelope) => { Object.assign(e.artifact.reference.projections.base, { id: "unknown" }); }],
    ["missing conditional entries", (e: JointEnvelope) => { delete e.artifact.reference.lengths.bySyllables["1"]; }],
    ["source stress merged", (e: JointEnvelope) => { delete e.artifact.reference.phones.native.counts.AH0; }],
    ["old percent denominator invented", (e: JointEnvelope) => { Object.assign(e.artifact.legacy.phones, { denominator: 100 }); }],
    ["legacy counts changed", (e: JointEnvelope) => { e.artifact.legacy.characters.counts.letters.counts.a++; }],
    ["joint bins moved with totals conserved", (e: JointEnvelope) => { e.artifact.reference.characters.letters.counts.a++; e.artifact.reference.characters.letters.counts.b--; }],
    ["legacy population changed", (e: JointEnvelope) => { e.artifact.legacy.lengths.accepted++; }],
    ["coherent forged normalization", (e: JointEnvelope) => {
      const file = e.artifact.legacy.artifacts.find(item => item.path.endsWith("/phoneme-normalization.json"))!;
      const normalization = JSON.parse(file.content); normalization.arpabetToIpa.AH = "ʌ"; file.content = JSON.stringify(normalization);
      e.artifact.comparisonProjection = projectPhones(e.artifact.reference.phones.base, normalization.arpabetToIpa);
    }],
    ["license replaced and rehashed", (e: JointEnvelope) => { e.artifact.license.content = "fake"; e.artifact.license.sha256 = createHash("sha256").update("fake").digest("hex"); }],
    ["extra artifact field", (e: JointEnvelope) => { Object.assign(e.artifact, { accepted: true }); }],
    ["derived syllabification changed", (e: JointEnvelope) => { e.artifact.reference.derived.initial_onsets.push("INVALID"); }],
  ] as const)("rejects re-digested corruption: %s", (_name, mutate) => {
    const copy = fresh(); mutate(copy);
    expect(() => validateJointEnvelope(redigest(copy))).toThrow();
  });
  it("pins externally expected implementation, separately from self-consistency", () => {
    const copy = fresh(); copy.artifact.implementation.sources[0].content += "\n";
    copy.artifact.implementation.digest = jsonDigest(copy.artifact.implementation.sources);
    expect(() => validateJointEnvelope(redigest(copy), reference.artifact.implementation.sources)).toThrow(/expected implementation/);
  });
  it("rejects a corrupt envelope digest and truncation of the raw source", () => {
    const copy = fresh(); copy.digest = "0".repeat(64);
    expect(() => validateJointEnvelope(copy)).toThrow(/digest/);
    expect(() => buildJointReference("cat K AE1 T\n")).toThrow(/pinned/);
  });
  it("fails before overwriting a destination when the source is wrong", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cmu-joint-wrong-source-"));
    try {
      const source = join(directory, "source"), out = join(directory, "out");
      await writeFile(source, "cat K AE1 T\n"); await writeFile(out, "preserve");
      await expect(writeJointArtifact(resolve("."), source, out)).rejects.toThrow(/source bytes/);
      expect(await readFile(out, "utf8")).toBe("preserve");
    } finally { await rm(directory, { recursive: true }); }
  });
  it("retains unmapped phone events and projects without mutating inputs", () => {
    const counts = { total: 5, counts: { AH: 2, ER: 3 } }, map = { AH: "ə" };
    const projected = projectPhones(counts, map); map.AH = "mutated";
    expect(projected.mapped).toEqual({ total: 2, counts: { ə: 2 } });
    expect(projected.unmapped).toEqual({ total: 3, counts: { ER: 3 } });
    expect(projected.mapping).toEqual({ AH: "ə" }); expect(counts.total).toBe(5);
  });
  it("has stable JSON identities and refuses silent JSON loss", () => {
    expect(jsonDigest({ b: 2, a: 1 })).toBe(jsonDigest({ a: 1, b: 2 }));
    for (const value of [NaN, Infinity, undefined, { a: undefined }, new Set([1])]) expect(() => canonicalJson(value)).toThrow();
  });
});

describe("original archive integrity", () => {
  it("pins the entire original development manifest, including cohort and source", () => {
    expect(() => validateOriginalManifest(manifest)).not.toThrow();
    const copy = structuredClone(manifest); copy.manifest.cohort = "validation"; copy.digest = jsonDigest(copy.manifest);
    expect(() => validateOriginalManifest(copy)).toThrow(/immutable original/);
  });
  it.each(["valid", "bad-compressed-hash", "truncated-draws", "wrong-order", "extra-draw"])("checks streamed bytes and coordinates: %s", async mode => {
    const directory = await mkdtemp(join(tmpdir(), "cmu-shard-integrity-"));
    try {
      await mkdir(join(directory, "words"));
      const word = generateWord({ seed: 12, trace: true });
      const draws = [0, 1].map(drawIndex => ({ profile: "fixture", seed: 9, drawIndex, word }));
      if (mode === "truncated-draws") draws.pop();
      if (mode === "wrong-order") draws[0].drawIndex = 1;
      if (mode === "extra-draw") draws.push({ profile: "fixture", seed: 9, drawIndex: 2, word });
      const bytes = gzipSync(draws.map(draw => JSON.stringify(draw) + "\n").join(""));
      const file = "words/fixture-9.jsonl.gz"; await writeFile(join(directory, file), bytes);
      const input = { protocol: { wordsPerReplicate: 2 }, artifacts: [{ file, bytes: bytes.length,
        sha256: mode === "bad-compressed-hash" ? "0".repeat(64) : createHash("sha256").update(bytes).digest("hex") }] } as OriginalManifest;
      const collect = async () => { const result = []; for await (const draw of originalDraws(directory, input, "fixture", 9)) result.push(draw); return result; };
      if (mode === "valid") await expect(collect()).resolves.toHaveLength(2);
      else await expect(collect()).rejects.toThrow();
    } finally { await rm(directory, { recursive: true }); }
  });
});
