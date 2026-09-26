import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { parseLengthArgs } from "../../scripts/build-cmu-baseline.js";
import { jsonDigest } from "../corpus/identity.js";
import { createLengthEnvelope, LENGTH_AXES, LENGTH_PARENT_PATH, LENGTH_POLICY, LENGTH_SOURCE_PATHS,
  LENGTH_UNITS, readLengthInputs, validateLengthEnvelope, validateLengthOutputPath,
  writeLengthArtifact, type LengthReferenceEnvelope } from "../corpus/length-builder.js";

const root = resolve(".");
let inputs: Awaited<ReturnType<typeof readLengthInputs>>;
let envelope: LengthReferenceEnvelope;
const temporary: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), "cmu-length-builder-")); temporary.push(path); return path; }
beforeAll(async () => { inputs = await readLengthInputs(root); envelope = createLengthEnvelope(inputs.parent, inputs.sources); });
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
const redigest = (copy: LengthReferenceEnvelope) => { copy.digest = jsonDigest(copy.artifact); return copy; };
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((total, amount) => total + amount, 0);

describe("explicit length reference", () => {
  it("retains every matched entry-count table and all rare tail categories", () => {
    validateLengthEnvelope(envelope, inputs.parent, inputs.sources);
    const { artifact } = envelope;
    expect(artifact.lengths).toEqual(inputs.parent.artifact.reference.lengths);
    expect(artifact.axes).toEqual(LENGTH_AXES);
    expect(artifact.units).toBe("integer-selected-entry-counts");
    expect(artifact.population.accepted).toBe(117485);
    for (const [name, bins, max, weighted] of [["written", 22, 28, 869802], ["phones", 21, 28, 742333], ["syllables", 10, 12, 289275]] as const) {
      const table = artifact.lengths[name];
      expect(table.total).toBe(117485);
      expect(Object.keys(table.counts)).toHaveLength(bins);
      expect(Math.max(...Object.keys(table.counts).map(Number))).toBe(max);
      expect(Object.entries(table.counts).reduce((n, [key, count]) => n + Number(key) * count, 0)).toBe(weighted);
    }
    expect(artifact.lengths.bySyllables["12"].written.total).toBe(1);
    expect(artifact.implementation.sources.map(source => source.path)).toEqual([...LENGTH_SOURCE_PATHS]);
    expect(artifact).not.toHaveProperty("overallStats");
  });

  it.each([
    ["fractional entry count", (e: LengthReferenceEnvelope) => { e.artifact.lengths.written.counts["4"] = 1.5; }],
    ["negative entry count", (e: LengthReferenceEnvelope) => { e.artifact.lengths.phones.counts["4"] = -1; }],
    ["same-total marginal bins", (e: LengthReferenceEnvelope) => { e.artifact.lengths.written.counts["4"]++; e.artifact.lengths.written.counts["5"]--; }],
    ["same-total and same-mean marginal", (e: LengthReferenceEnvelope) => {
      e.artifact.lengths.written.counts["2"]++; e.artifact.lengths.written.counts["4"]++; e.artifact.lengths.written.counts["3"] -= 2;
    }],
    ["missing long tail", (e: LengthReferenceEnvelope) => { delete e.artifact.lengths.written.counts["28"]; }],
    ["missing rare conditional row", (e: LengthReferenceEnvelope) => { delete e.artifact.lengths.bySyllables["12"]; }],
    ["wrong row denominator", (e: LengthReferenceEnvelope) => { e.artifact.lengths.bySyllables["1"].phones.total++; }],
    ["wrong source", (e: LengthReferenceEnvelope) => { e.artifact.source.sha256 = "0".repeat(64); }],
    ["wrong entry set", (e: LengthReferenceEnvelope) => { e.artifact.population.entryDigest = "0".repeat(64); }],
    ["wrong population weighting", (e: LengthReferenceEnvelope) => { Object.assign(e.artifact.population.definition.population, { weighting: "all-pronunciations" }); }],
    ["wrong policy", (e: LengthReferenceEnvelope) => { Object.assign(e.artifact, { policy: "all-lines" }); }],
    ["phone-event units", (e: LengthReferenceEnvelope) => { Object.assign(e.artifact, { units: "integer-phone-occurrences" }); }],
    ["IPA-character phone length", (e: LengthReferenceEnvelope) => { Object.assign(e.artifact.axes, { phones: "IPA-string-length" }); }],
    ["wrong conditional axis", (e: LengthReferenceEnvelope) => { Object.assign(e.artifact.axes, { conditional: "phone-length" }); }],
    ["missing axis", (e: LengthReferenceEnvelope) => { Reflect.deleteProperty(e.artifact.axes, "written"); }],
    ["missing license", (e: LengthReferenceEnvelope) => { Reflect.deleteProperty(e.artifact, "license"); }],
    ["forged license", (e: LengthReferenceEnvelope) => { e.artifact.license.content = "fake"; }],
    ["wrong parent", (e: LengthReferenceEnvelope) => { e.artifact.parentReference.artifactDigest = "0".repeat(64); }],
    ["wrong lockfile", (e: LengthReferenceEnvelope) => { e.artifact.implementation.packageLockSha256 = "0".repeat(64); }],
    ["unversioned summary", (e: LengthReferenceEnvelope) => { Object.assign(e.artifact.lengths, { mean: 7.53 }); }],
    ["extra envelope field", (e: LengthReferenceEnvelope) => { Object.assign(e, { verified: true }); }],
  ] as const)("rejects re-digested corruption: %s", (_label, mutate) => {
    const copy = structuredClone(envelope); mutate(copy);
    expect(() => validateLengthEnvelope(redigest(copy), inputs.parent, inputs.sources)).toThrow();
  });

  it.each(["written", "phones"] as const)("rejects a conditional %s 2×2 swap preserving row totals and the marginal", name => {
    const copy = structuredClone(envelope);
    const rows = copy.artifact.lengths.bySyllables;
    const beforeRows = ["1", "2"].map(row => sum(rows[row][name].counts));
    rows["1"][name].counts["4"]++; rows["1"][name].counts["5"]--;
    rows["2"][name].counts["4"]--; rows["2"][name].counts["5"]++;
    expect(["1", "2"].map(row => sum(rows[row][name].counts))).toEqual(beforeRows);
    const marginal: Record<string, number> = {};
    for (const row of Object.values(rows)) for (const [key, count] of Object.entries(row[name].counts)) {
      expect(count).toBeGreaterThan(0); marginal[key] = (marginal[key] ?? 0) + count;
    }
    expect(marginal).toEqual(envelope.artifact.lengths[name].counts);
    expect(() => validateLengthEnvelope(redigest(copy), inputs.parent, inputs.sources)).toThrow();
  });

  it("anchors new implementation identity in externally expected bytes", () => {
    const sources = structuredClone(inputs.sources);
    sources.find(source => source.path.endsWith("build-cmu-baseline.ts"))!.content += "\n// changed\n";
    const altered = createLengthEnvelope(inputs.parent, sources);
    expect(() => validateLengthEnvelope(altered, inputs.parent, inputs.sources)).toThrow(/expected implementation/);
    expect(() => validateLengthEnvelope(altered, inputs.parent, sources)).not.toThrow();
    expect(() => validateLengthEnvelope({ byLen: { "1": 1 } }, inputs.parent, inputs.sources)).toThrow();
  });

  it("detaches nested tables and implementation from caller-owned inputs", () => {
    const parent = structuredClone(inputs.parent), sources = structuredClone(inputs.sources);
    const result = createLengthEnvelope(parent, sources);
    parent.artifact.reference.lengths.bySyllables["1"].written.counts["4"]++;
    sources[0].content += "changed";
    expect(result).toEqual(envelope);
  });

  it.each(["parent-bytes", "dependency-source"])("rejects stale pinned input: %s", async mode => {
    const copyRoot = await directory();
    for (const source of inputs.sources) {
      const path = join(copyRoot, source.path); await mkdir(dirname(path), { recursive: true });
      await writeFile(path, source.content + (mode === "dependency-source" && source.path.endsWith("cmu.ts") ? "\n" : ""));
    }
    const parentPath = join(copyRoot, LENGTH_PARENT_PATH); await mkdir(dirname(parentPath), { recursive: true });
    await writeFile(parentPath, mode === "parent-bytes" ? inputs.parentBytes.subarray(1) : inputs.parentBytes);
    await expect(readLengthInputs(copyRoot)).rejects.toThrow();
  });
});

describe("retained TS command and publication boundaries", () => {
  const args = ["--source", "raw source.dict", "--policy", LENGTH_POLICY, "--units", LENGTH_UNITS, "--out", "new artifact.json"];
  it("accepts explicit entry units and preserves spaced path arguments", () => {
    expect(parseLengthArgs(args)).toEqual({ source: resolve("raw source.dict"), policy: LENGTH_POLICY,
      units: LENGTH_UNITS, out: resolve("new artifact.json") });
    expect(parseLengthArgs(["--help"])).toBe("help");
  });
  it.each([[], ["--source"], args.slice(0, -2), [...args, "--source", "other"], [...args, "--force"],
    [...args, "--help"], ["positional"], args.map(value => value === LENGTH_UNITS ? "percent" : value),
    args.map(value => value === LENGTH_POLICY ? "all" : value), ["--source=path", ...args.slice(2)],
  ].map(invalid => ({ invalid })))("rejects incomplete, repeated or unsupported arguments: $invalid", ({ invalid }) => {
    expect(() => parseLengthArgs(invalid)).toThrow();
  });

  it.each(["missing", "empty", "truncated", "invalid-utf8", "uppercase", "malformed-with-comment-digits"])("rejects %s source before creating or overwriting output", async mode => {
    const cwd = await directory(), source = join(cwd, "raw.dict"), out = join(cwd, "out.json");
    const fixtures: Record<string, string | Buffer> = { empty: "", truncated: "cat K AE1 T\n",
      "invalid-utf8": Buffer.from([0xff]), uppercase: "CAT K AE1 T\n",
      "malformed-with-comment-digits": "cat K ZZ9 T # 123\n" };
    if (mode !== "missing") await writeFile(source, fixtures[mode]);
    await expect(writeLengthArtifact(root, { source, out, policy: LENGTH_POLICY, units: LENGTH_UNITS })).rejects.toThrow();
    await expect(readFile(out)).rejects.toThrow(/ENOENT/);
    await writeFile(out, "preserve exactly");
    await expect(writeLengthArtifact(root, { source, out, policy: LENGTH_POLICY, units: LENGTH_UNITS })).rejects.toThrow();
    expect(await readFile(out, "utf8")).toBe("preserve exactly");
  });

  it("validates programmatic policy and units before reading an input", async () => {
    for (const invalid of [{ policy: "other", units: LENGTH_UNITS }, { policy: LENGTH_POLICY, units: "phone-events" }]) {
      await expect(writeLengthArtifact(root, { source: "missing", out: "missing", ...invalid })).rejects.toThrow(/policy|units/);
    }
  });

  it("protects missing legacy, runtime and earlier evidence/source files through aliases", async () => {
    const cwd = await directory();
    const dirs = ["data/cmu", "src", "scripts", "evaluation/corpus", "evaluation/review/wordlikeness/artifacts",
      "evaluation/experiments/cmu-shared-parser", "evaluation/experiments/cmu-matched-reference",
      "evaluation/experiments/cmu-phoneme-builder"];
    for (const dir of dirs) await mkdir(join(cwd, dir), { recursive: true });
    await symlink(join(cwd, "data/cmu"), join(cwd, "alias"));
    await symlink(join(cwd, "evaluation/experiments/cmu-shared-parser"), join(cwd, "parser-alias"));
    for (const file of ["data/cmu/cmu-length-baseline.json", "alias/new.json", "src/absent.ts", "scripts/build-cmu-baseline.ts",
      "scripts/build-cmu-phoneme-baseline.mjs", "evaluation/corpus/phoneme-builder.ts",
      "evaluation/review/wordlikeness/artifacts/reference-v1.json", "parser-alias/absent-artifact.json",
      "evaluation/experiments/cmu-shared-parser/absent-artifact.json",
      "evaluation/experiments/cmu-matched-reference/reference.json.gz", "evaluation/experiments/cmu-phoneme-builder/verification.json.gz"]) {
      await expect(validateLengthOutputPath(cwd, join(cwd, file))).rejects.toThrow(/protected/);
    }
    await expect(validateLengthOutputPath(cwd, join(cwd, "missing/out.json"))).rejects.toThrow(/ENOENT/);
    await expect(validateLengthOutputPath(cwd, join(cwd, "fresh.json"))).resolves.toBe(join(await realpath(cwd), "fresh.json"));
  });

  it("protects a historical directory that is itself a symlink", async () => {
    const cwd = await directory(), external = await directory();
    await mkdir(join(cwd, "data")); await symlink(external, join(cwd, "data/cmu"));
    await expect(validateLengthOutputPath(cwd, join(external, "missing-baseline.json"))).rejects.toThrow(/protected/);
  });

  it("keeps the local TS entrypoint usable without source from another working directory", async () => {
    const cwd = await directory(), script = join(root, "scripts/build-cmu-baseline.ts"), runner = join(root, "node_modules/.bin/tsx");
    const help = spawnSync(runner, [script, "--help"], { cwd, encoding: "utf8" });
    expect(help.status, help.stderr).toBe(0); expect(help.stdout).toContain(LENGTH_UNITS);
    const missing = spawnSync(runner, [script], { cwd, encoding: "utf8" });
    expect(missing.status).toBe(1); expect(missing.stderr).toContain("required");
  });
});
