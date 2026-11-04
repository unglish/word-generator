import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { jsonDigest } from "../corpus/identity.js";
import { parsePhonemeArgs } from "../corpus/phoneme-cli.js";
import { createPhonemeEnvelope, PHONEME_PARENT_PATH, PHONEME_POLICY, PHONEME_SOURCE_PATHS,
  PHONEME_UNITS, readPhonemeInputs, validatePhonemeEnvelope, validatePhonemeOutputPath,
  writePhonemeArtifact, type PhonemeReferenceEnvelope } from "../corpus/phoneme-builder.js";

const root = resolve(".");
let inputs: Awaited<ReturnType<typeof readPhonemeInputs>>;
let envelope: PhonemeReferenceEnvelope;
const temporary: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), "cmu-phoneme-builder-")); temporary.push(path); return path; }
beforeAll(async () => { inputs = await readPhonemeInputs(root); envelope = createPhonemeEnvelope(inputs.parent, inputs.sources); });
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

describe("explicit phoneme artifact", () => {
  it("retains every independently verified parent bin and explicit stress/loss units", () => {
    validatePhonemeEnvelope(envelope, inputs.parent, inputs.sources);
    expect(envelope.artifact.population.accepted).toBe(117485);
    for (const view of ["native", "base"] as const) {
      const { projection, ...histogram } = envelope.artifact.phones[view];
      expect(histogram).toEqual(inputs.parent.artifact.reference.phones[view]);
      expect(histogram.total).toBe(742333);
      expect(projection).toEqual(inputs.parent.artifact.reference.projections[view]);
    }
    for (const token of ["AH0", "AH1", "AH2", "ER0", "ER1", "ER2"]) expect(envelope.artifact.phones.native.counts[token]).toBeGreaterThan(0);
    expect(envelope.artifact.phones.comparison).toEqual(inputs.parent.artifact.comparisonProjection);
    expect(envelope.artifact.implementation.sources.map(source => source.path)).toEqual([...PHONEME_SOURCE_PATHS]);
  });

  it.each([
    ["percentage counts", (e: PhonemeReferenceEnvelope) => { e.artifact.phones.native.counts.AH0 = 12.5; }],
    ["same-total substituted native bins", (e: PhonemeReferenceEnvelope) => { e.artifact.phones.native.counts.AH0++; e.artifact.phones.native.counts.AH1--; }],
    ["same-total substituted base bins", (e: PhonemeReferenceEnvelope) => { e.artifact.phones.base.counts.AH++; e.artifact.phones.base.counts.ER--; }],
    ["stress merged", (e: PhonemeReferenceEnvelope) => { delete e.artifact.phones.native.counts.ER0; }],
    ["unsupported native token", (e: PhonemeReferenceEnvelope) => { e.artifact.phones.native.counts.AH9 = 1; }],
    ["wrong source", (e: PhonemeReferenceEnvelope) => { e.artifact.source.sha256 = "0".repeat(64); }],
    ["wrong population", (e: PhonemeReferenceEnvelope) => { e.artifact.population.accepted++; }],
    ["wrong policy", (e: PhonemeReferenceEnvelope) => { Object.assign(e.artifact, { policy: "all-lines" }); }],
    ["wrong units", (e: PhonemeReferenceEnvelope) => { Object.assign(e.artifact, { units: "percentages" }); }],
    ["wrong projection", (e: PhonemeReferenceEnvelope) => { Object.assign(e.artifact.phones.base.projection, { id: "native" }); }],
    ["wrong losses", (e: PhonemeReferenceEnvelope) => { Object.assign(e.artifact.phones.comparison, { losses: "none" }); }],
    ["changed mapping", (e: PhonemeReferenceEnvelope) => { e.artifact.phones.comparison.mapping.ER = "ŋ"; }],
    ["lost event", (e: PhonemeReferenceEnvelope) => { e.artifact.phones.comparison.inputEvents--; }],
    ["missing license", (e: PhonemeReferenceEnvelope) => { Reflect.deleteProperty(e.artifact, "license"); }],
    ["missing normalization", (e: PhonemeReferenceEnvelope) => { Reflect.deleteProperty(e.artifact, "normalization"); }],
    ["changed license", (e: PhonemeReferenceEnvelope) => { e.artifact.license.content = "fake"; }],
    ["parent digest", (e: PhonemeReferenceEnvelope) => { e.artifact.parentReference.artifactDigest = "0".repeat(64); }],
    ["lockfile identity", (e: PhonemeReferenceEnvelope) => { e.artifact.implementation.packageLockSha256 = "0".repeat(64); }],
    ["extra nested field", (e: PhonemeReferenceEnvelope) => { Object.assign(e.artifact.phones.native, { meaning: "guessed" }); }],
    ["extra envelope field", (e: PhonemeReferenceEnvelope) => { Object.assign(e, { verified: true }); }],
  ] as const)("rejects re-digested corruption: %s", (_label, mutate) => {
    const copy = structuredClone(envelope); mutate(copy); copy.digest = jsonDigest(copy.artifact);
    expect(() => validatePhonemeEnvelope(copy, inputs.parent, inputs.sources)).toThrow();
  });

  it("requires external implementation identity, not just coherent embedded source digests", () => {
    const sources = structuredClone(inputs.sources);
    sources.find(source => source.path.endsWith("phoneme-cli.ts"))!.content += "\n// changed\n";
    const altered = createPhonemeEnvelope(inputs.parent, sources);
    expect(() => validatePhonemeEnvelope(altered, inputs.parent, inputs.sources)).toThrow(/expected implementation/);
    expect(() => validatePhonemeEnvelope(altered, inputs.parent, sources)).not.toThrow();
    expect(() => validatePhonemeEnvelope({ AH: 12 }, inputs.parent, inputs.sources)).toThrow();
  });

  it("detaches published snapshots from mutable caller objects", () => {
    const parent = structuredClone(inputs.parent), sources = structuredClone(inputs.sources);
    const result = createPhonemeEnvelope(parent, sources);
    parent.artifact.reference.phones.native.counts.AH0++;
    sources[0].content += "changed";
    expect(result).toEqual(envelope);
  });

  it.each(["parent-bytes", "dependency-source"])("rejects stale pinned inputs: %s", async mode => {
    const copyRoot = await directory();
    for (const source of inputs.sources) {
      const path = join(copyRoot, source.path); await mkdir(dirname(path), { recursive: true });
      await writeFile(path, source.content + (mode === "dependency-source" && source.path.endsWith("cmu.ts") ? "\n" : ""));
    }
    const parentPath = join(copyRoot, PHONEME_PARENT_PATH); await mkdir(dirname(parentPath), { recursive: true });
    await writeFile(parentPath, mode === "parent-bytes" ? inputs.parentBytes.subarray(1) : inputs.parentBytes);
    await expect(readPhonemeInputs(copyRoot)).rejects.toThrow();
  });
});

describe("explicit command and safe destinations", () => {
  const args = ["--source", "raw source.dict", "--policy", PHONEME_POLICY, "--units", PHONEME_UNITS, "--out", "new artifact.json"];
  it("accepts named policy/units and preserves path arguments containing spaces", () => {
    expect(parsePhonemeArgs(args)).toEqual({ source: resolve("raw source.dict"), policy: PHONEME_POLICY,
      units: PHONEME_UNITS, out: resolve("new artifact.json") });
    expect(parsePhonemeArgs(["--help"])).toBe("help");
  });
  it.each([[], ["--source"], args.slice(0, -2), [...args, "--source", "other"], [...args, "--force"],
    [...args, "--help"], ["positional"], args.map(value => value === PHONEME_UNITS ? "percent" : value),
    args.map(value => value === PHONEME_POLICY ? "all" : value), ["--source=path", ...args.slice(2)],
  ].map(invalid => ({ invalid })))("rejects incomplete, ambiguous or unsupported arguments: $invalid", ({ invalid }) => {
    expect(() => parsePhonemeArgs(invalid)).toThrow();
  });

  it.each(["missing", "truncated", "invalid-utf8", "uppercase"])("fails before output creation for %s source even with a readable demo", async mode => {
    const cwd = await directory(); const source = join(cwd, "raw.dict"), out = join(cwd, "out.json");
    await mkdir(join(cwd, "demo")); await writeFile(join(cwd, "demo/cmuBaselines.js"), "const cmuPhonemes = {\"a\":100};");
    if (mode !== "missing") await writeFile(source, mode === "invalid-utf8" ? Buffer.from([0xff]) : mode === "uppercase" ? "CAT K AE1 T\n" : "cat K AE1 T\n");
    await expect(writePhonemeArtifact(root, { source, out, policy: PHONEME_POLICY, units: PHONEME_UNITS })).rejects.toThrow();
    await expect(readFile(out)).rejects.toThrow(/ENOENT/);
    const protectedOut = join(cwd, "preserve.json"); await writeFile(protectedOut, "preserve exactly");
    await expect(writePhonemeArtifact(root, { source, out: protectedOut, policy: PHONEME_POLICY, units: PHONEME_UNITS })).rejects.toThrow();
    expect(await readFile(protectedOut, "utf8")).toBe("preserve exactly");
  });

  it("validates programmatic policy and units before reading an input", async () => {
    for (const invalid of [{ policy: "other", units: PHONEME_UNITS }, { policy: PHONEME_POLICY, units: "percentages" }]) {
      await expect(writePhonemeArtifact(root, { source: "missing", out: "missing", ...invalid })).rejects.toThrow(/policy|units/);
    }
  });

  it("protects removed legacy and frozen destinations through directory aliases", async () => {
    const cwd = await directory();
    for (const dir of ["data/cmu", "demo", "evaluation/experiments/cmu-matched-reference", "evaluation/corpus"]) await mkdir(join(cwd, dir), { recursive: true });
    await symlink(join(cwd, "data/cmu"), join(cwd, "alias"));
    for (const file of ["data/cmu/cmu-lexicon-phonemes.json", "alias/new.json", "demo/cmuBaselines.js",
      "evaluation/experiments/cmu-matched-reference/reference.json.gz", "evaluation/corpus/phoneme-builder.ts"]) {
      await expect(validatePhonemeOutputPath(cwd, join(cwd, file))).rejects.toThrow(/protected/);
    }
    await expect(validatePhonemeOutputPath(cwd, join(cwd, "missing/out.json"))).rejects.toThrow(/ENOENT/);
    await expect(validatePhonemeOutputPath(cwd, join(cwd, "fresh.json"))).resolves.toBe(join(await realpath(cwd), "fresh.json"));
  });

  it("keeps the direct Node entrypoint usable from another working directory", async () => {
    const cwd = await directory(); const launcher = join(root, "scripts/build-cmu-phoneme-baseline.mjs");
    const help = spawnSync(process.execPath, [launcher, "--help"], { cwd, encoding: "utf8" });
    expect(help.status, help.stderr).toBe(0); expect(help.stdout).toContain(PHONEME_POLICY);
    const missing = spawnSync(process.execPath, [launcher], { cwd, encoding: "utf8" });
    expect(missing.status).toBe(1); expect(missing.stderr).toContain("required");
  });

  it("also protects a historical directory that is itself a symlink", async () => {
    const cwd = await directory(); const external = await directory();
    await mkdir(join(cwd, "data")); await symlink(external, join(cwd, "data/cmu"));
    await expect(validatePhonemeOutputPath(cwd, join(external, "missing-baseline.json"))).rejects.toThrow(/protected/);
  });
});
