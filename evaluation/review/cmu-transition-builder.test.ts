import { spawnSync } from "node:child_process";
import { link, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { parseTransitionArgs } from "../../scripts/generate-bigram-table.js";
import { parseCmuRecords, selectCompatibleCmu } from "../corpus/cmu.js";
import { jsonDigest } from "../corpus/identity.js";
import { countPhoneTransitions, type PhoneTransitions, type TransitionTable } from "../corpus/phone-transitions.js";
import { createTransitionEnvelope, readTransitionInputs, reconstructTransitions, TRANSITION_PARENT_PATH, TRANSITION_POLICY,
  TRANSITION_SOURCE_PATHS, TRANSITION_UNITS, validateTransitionEnvelope, validateTransitionOutputPath, writeTransitionArtifact,
  type TransitionReferenceEnvelope, type TrustedTransitionInputs } from "../corpus/transition-builder.js";

const root = resolve("."), temporary: string[] = [];
const select = (text: string) => selectCompatibleCmu(parseCmuRecords(text));
async function directory() { const path = await mkdtemp(join(tmpdir(), "cmu-transitions-")); temporary.push(path); return path; }
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((total, count) => total + count, 0);
const makeTable = (counts: TransitionTable["counts"]): TransitionTable => {
  const rowTotals = Object.fromEntries(Object.entries(counts).map(([key, row]) => [key, sum(row)]));
  return { counts, rowTotals, total: sum(rowTotals), vocabulary: [...new Set([...Object.keys(counts), ...Object.values(counts).flatMap(Object.keys)])].sort() };
};

/** Synthetic marginal-compatible test data, deliberately NOT a CMU adjacency reference. No raw-source construction here. */
function syntheticPairs(parent: TrustedTransitionInputs["parent"]): PhoneTransitions {
  const reference = parent.artifact.reference, native: TransitionTable["counts"] = { "#": {} }, base: TransitionTable["counts"] = {};
  let boundaries = reference.population.accepted;
  for (const [token, count] of Object.entries(reference.phones.native.counts)) {
    const n = Math.min(boundaries, count); boundaries -= n;
    native[token] = {};
    if (n) { native["#"][token] = n; native[token]["#"] = n; }
    if (count > n) native[token][token] = count - n;
  }
  for (const [first, row] of Object.entries(native)) for (const [second, count] of Object.entries(row)) {
    const out = base[first.replace(/[012]$/, "")] ??= {}, key = second.replace(/[012]$/, "");
    out[key] = (out[key] ?? 0) + count;
  }
  return { entries: reference.population.accepted, entryDigest: reference.population.entryDigest,
    phoneEvents: reference.phones.native.total, native: makeTable(native), base: makeTable(base) };
}
let expected: TrustedTransitionInputs, envelope: TransitionReferenceEnvelope;
beforeAll(async () => {
  const { parent, sources } = await readTransitionInputs(root);
  expected = { parent, sources, transitions: syntheticPairs(parent) };
  envelope = createTransitionEnvelope(expected);
});
const redigest = (copy: TransitionReferenceEnvelope) => { copy.digest = jsonDigest(copy.artifact); return copy; };

describe("native and base adjacent source phones", () => {
  it("counts single phones with both boundaries and no cross-word pair", () => {
    const result = countPhoneTransitions(select("a AH0\niy IY1\n").entries);
    expect(result.entries).toBe(2); expect(result.phoneEvents).toBe(2);
    expect(result.native.counts).toEqual({ "#": { AH0: 1, IY1: 1 }, AH0: { "#": 1 }, IY1: { "#": 1 } });
    expect(result.base.counts).toEqual({ "#": { AH: 1, IY: 1 }, AH: { "#": 1 }, IY: { "#": 1 } });
    expect(result.native.total).toBe(4); expect(result.native.vocabulary).toEqual(["#", "AH0", "IY1"]);
  });
  it("preserves all stress values before projecting each endpoint and counts repeated phones", () => {
    const result = countPhoneTransitions(select("a AH0 ER0\nb AH1 ER1\nc AH2 ER2\nd T T AH0\n").entries);
    expect(result.native.counts.AH0.ER0).toBe(1); expect(result.native.counts.AH1.ER1).toBe(1);
    expect(result.native.counts.AH2.ER2).toBe(1); expect(result.native.counts.T.T).toBe(1);
    expect(result.base.counts.AH.ER).toBe(3); expect(result.base.counts.ER["#"]).toBe(3);
    expect(result.native.total).toBe(13); expect(result.base.total).toBe(13);
  });
  it("uses shared exclusions, comment handling and first-valid selection without deleting bad tokens", () => {
    const source = "same NOTAPHONE\nSAME S EY1 M # comment\nsame S AH0 M\nsame(2) S EY2 M\ncafé K AE1 F EY0\ncan't K AE1 N T\nhm HH M\nokay OW1 K EY0\n";
    const selected = select(source), result = countPhoneTransitions(selected.entries);
    expect(selected.entries.map(entry => entry.spelling)).toEqual(["same", "okay"]);
    expect(selected.excluded).toEqual({ unsupported_pronunciation: 1, duplicate_spelling: 1,
      alternate_pronunciation: 1, non_ascii_spelling: 2, no_vowel: 1 });
    expect(result.entries).toBe(2); expect(result.phoneEvents).toBe(6);
    expect(result.native.counts).not.toHaveProperty("NOTAPHONE");
    expect(result.native.counts).not.toHaveProperty("comment");
  });
  it("aggregates independently of entry order while preserving the order-sensitive identity", () => {
    const entries = select("a AH0\nb B IY1\n").entries;
    const forward = countPhoneTransitions(entries), reverse = countPhoneTransitions([...entries].reverse());
    expect(forward.native).toEqual(reverse.native); expect(forward.base).toEqual(reverse.base);
    expect(forward.entryDigest).not.toBe(reverse.entryDigest);
  });
  it("returns detached views and does not mutate selected source entries", () => {
    const entries = select("a AH0\n").entries, saved = structuredClone(entries), result = countPhoneTransitions(entries);
    result.native.counts["#"].AH0 = 999; result.base.counts["#"].AH = 888;
    expect(entries).toEqual(saved); expect(countPhoneTransitions(entries).native.counts["#"].AH0).toBe(1);
  });
  it("rejects a mismatched typed entry instead of trusting an invalid phone projection", () => {
    const entries = select("a AH0\n").entries; entries[0].phones[0].base = "ER";
    expect(() => countPhoneTransitions(entries)).toThrow(/matching/);
    entries[0].tokens = []; expect(() => countPhoneTransitions(entries)).toThrow(/nonempty/);
  });
});

describe("externally expected full transition table", () => {
  it("retains source identities and detached maps in an envelope", () => {
    validateTransitionEnvelope(envelope, expected);
    expect(envelope.artifact.units).toBe(TRANSITION_UNITS);
    expect(envelope.artifact.transitions.base.total).toBe(859818);
    expect(envelope.artifact.implementation.sources.map(source => source.path)).toEqual([...TRANSITION_SOURCE_PATHS]);
    const copy = createTransitionEnvelope(expected); copy.artifact.transitions.base.counts["#"].AH = 999;
    Object.assign(copy.artifact.population.definition.population.exclusionOrder, { 0: "no_vowel" });
    expect(expected.transitions.base.counts["#"].AH).not.toBe(999);
    expect(expected.parent.artifact.reference.population.definition.population.exclusionOrder[0]).toBe("alternate_pronunciation");
  });
  it.each([
    ["fraction", (e: TransitionReferenceEnvelope) => { e.artifact.transitions.base.counts["#"].AA = 0.5; }],
    ["negative", (e: TransitionReferenceEnvelope) => { e.artifact.transitions.native.counts["#"].AA1 = -1; }],
    ["missing row", (e: TransitionReferenceEnvelope) => { delete e.artifact.transitions.base.counts.T; }],
    ["extra row", (e: TransitionReferenceEnvelope) => { e.artifact.transitions.base.counts.UNKNOWN = { AH: 1 }; }],
    ["row total", (e: TransitionReferenceEnvelope) => { e.artifact.transitions.base.rowTotals.T++; }],
    ["vocabulary", (e: TransitionReferenceEnvelope) => { e.artifact.transitions.base.vocabulary.push("UNKNOWN"); }],
    ["boundary", (e: TransitionReferenceEnvelope) => { e.artifact.transitions.base.counts["#"]["#"] = 1; }],
    ["population", (e: TransitionReferenceEnvelope) => { e.artifact.population.accepted++; }],
    ["extra field", (e: TransitionReferenceEnvelope) => { Object.assign(e.artifact, { hidden: 1 }); }],
    ["projection", (e: TransitionReferenceEnvelope) => { Object.assign(e.artifact.projections.base, { loss: "none" }); }],
    ["policy", (e: TransitionReferenceEnvelope) => { Object.assign(e.artifact, { policy: "all-variants" }); }],
    ["units", (e: TransitionReferenceEnvelope) => { Object.assign(e.artifact, { units: "percentages" }); }],
    ["parent", (e: TransitionReferenceEnvelope) => { e.artifact.parentReference.artifactDigest = "forged"; }],
    ["raw identity", (e: TransitionReferenceEnvelope) => { e.artifact.source.sha256 = "forged"; }],
    ["redigested source tree", (e: TransitionReferenceEnvelope) => {
      e.artifact.implementation.sources.at(-2)!.content += "\n// forged";
      e.artifact.implementation.digest = jsonDigest(e.artifact.implementation.sources);
    }],
  ])("rejects %s even with a fresh enclosing digest", (_label, mutate) => {
    const copy = structuredClone(envelope); mutate(copy);
    expect(() => validateTransitionEnvelope(redigest(copy), expected)).toThrow(/mismatch/);
  });
  it("rejects a 2x2 adjacency swap preserving every row, column, event total and vocabulary", () => {
    const copy = structuredClone(envelope), table = copy.artifact.transitions.base;
    const [a, b] = Object.keys(table.counts).filter(key => key !== "#" && (table.counts[key][key] ?? 0) > 1);
    table.counts[a][a]--; table.counts[b][b]--;
    table.counts[a][b] = (table.counts[a][b] ?? 0) + 1; table.counts[b][a] = (table.counts[b][a] ?? 0) + 1;
    expect(makeTable(table.counts)).toEqual(table);
    const columns = (rows: TransitionTable["counts"]) => Object.values(rows).reduce<Record<string, number>>((out, row) => {
      for (const [key, n] of Object.entries(row)) out[key] = (out[key] ?? 0) + n; return out;
    }, {});
    expect(columns(table.counts)).toEqual(columns(envelope.artifact.transitions.base.counts));
    expect(() => validateTransitionEnvelope(redigest(copy), expected)).toThrow(/full table/);
  });
  it("requires the trusted parent and exact implementation list", () => {
    const bad = structuredClone(expected); bad.parent.digest = "wrong";
    expect(() => createTransitionEnvelope(bad)).toThrow(/parent identity/);
    expect(() => createTransitionEnvelope({ ...expected, sources: expected.sources.slice(1) })).toThrow(/paths/);
    const wrong = structuredClone(expected); wrong.transitions.base.counts["#"]["#"] = 1;
    expect(() => createTransitionEnvelope(wrong)).toThrow(/Boundary/);
  });
});

describe("explicit source, units and fresh publication path", () => {
  const args = ["--source", "raw source.dict", "--policy", TRANSITION_POLICY, "--units", TRANSITION_UNITS, "--out", "fresh.json"];
  it("parses the one supported contract", () => {
    expect(parseTransitionArgs(args)).toEqual({ source: resolve("raw source.dict"), policy: TRANSITION_POLICY,
      units: TRANSITION_UNITS, out: resolve("fresh.json") });
    expect(parseTransitionArgs(["--help"])).toBe("help");
  });
  it.each([[], ["--source"], [...args, "--out", "again"], [...args, "--overwrite", "yes"], ["--help", "--out", "x"],
    args.map(value => value === TRANSITION_POLICY ? "all" : value), args.map(value => value === TRANSITION_UNITS ? "percent" : value)]
    .map(value => ({ args: value })))("rejects ambiguous arguments %j", ({ args: value }) => {
    expect(() => parseTransitionArgs(value)).toThrow();
  });
  it("rejects corrupt, truncated and invalid UTF-8 source without creating output", async () => {
    const cwd = await directory();
    for (const bytes of [Buffer.from("a AH0\n"), Buffer.alloc(0), Buffer.from([0xff])]) {
      const source = join(cwd, "source.dict"), out = join(cwd, "new.json"); await writeFile(source, bytes);
      expect(() => reconstructTransitions(bytes, expected.parent)).toThrow(/Raw source/);
      await expect(writeTransitionArtifact(root, { source, out, policy: TRANSITION_POLICY, units: TRANSITION_UNITS })).rejects.toThrow(/Raw source/);
      expect(await readdir(cwd)).toEqual(["source.dict"]);
    }
    await expect(writeTransitionArtifact(root, { source: join(cwd, "missing"), out: join(cwd, "out"), policy: TRANSITION_POLICY, units: TRANSITION_UNITS })).rejects.toThrow(/ENOENT/);
  });
  it("protects runtime, all earlier experiment packages, source aliases, and missing targets", async () => {
    const cwd = await directory();
    const names = ["src", "data/cmu", "demo", "scripts", "evaluation/corpus", "evaluation/review", "evaluation/experiments/cmu-length-builder"];
    for (const name of names) await mkdir(join(cwd, name), { recursive: true });
    await symlink(join(cwd, "src"), join(cwd, "runtime-alias"));
    await symlink(join(cwd, "evaluation/experiments"), join(cwd, "evidence-alias"));
    for (const name of [...names, "runtime-alias", "evidence-alias"]) {
      await expect(validateTransitionOutputPath(cwd, join(cwd, name, "new.json"))).rejects.toThrow(/protected/);
    }
    for (const name of ["cmu-shared-parser", "cmu-matched-reference", "cmu-phoneme-builder", "cmu-length-builder"]) {
      await mkdir(join(cwd, "evaluation/experiments", name), { recursive: true });
      await expect(validateTransitionOutputPath(cwd, join(cwd, "evaluation/experiments", name, "new.json"))).rejects.toThrow(/protected/);
    }
    const source = join(cwd, "source.dict"); await writeFile(source, "old");
    await symlink(source, join(cwd, "source-alias"));
    await expect(validateTransitionOutputPath(cwd, source, join(cwd, "source-alias"))).rejects.toThrow(/protected/);
    await expect(validateTransitionOutputPath(cwd, join(cwd, "new.json"))).resolves.toBe(join(await realpath(cwd), "new.json"));
    await expect(validateTransitionOutputPath(cwd, join(cwd, "missing/new.json"))).rejects.toThrow(/ENOENT/);
  });
  it("protects a historical directory which itself points outside the checkout", async () => {
    const cwd = await directory(), outside = await directory(); await mkdir(join(cwd, "evaluation"));
    await symlink(outside, join(cwd, "evaluation/experiments"));
    await expect(validateTransitionOutputPath(cwd, join(outside, "new.json"))).rejects.toThrow(/protected/);
  });
  it("refuses existing files, source hardlinks and dangling symlinks", async () => {
    const cwd = await directory(), file = join(cwd, "old.json"); await writeFile(file, "unchanged");
    await symlink(join(cwd, "absent"), join(cwd, "dangling"));
    await link(file, join(cwd, "hardlink"));
    await expect(validateTransitionOutputPath(root, file)).rejects.toThrow(/already exists/);
    await expect(validateTransitionOutputPath(root, join(cwd, "hardlink"), file)).rejects.toThrow(/already exists/);
    await expect(validateTransitionOutputPath(root, join(cwd, "dangling"))).rejects.toThrow(/already exists/);
    expect(await readFile(file, "utf8")).toBe("unchanged");
  });
  it("rejects a changed published parent without constructing a reference", async () => {
    const cwd = await directory();
    for (const source of expected.sources) { await mkdir(dirname(join(cwd, source.path)), { recursive: true }); await writeFile(join(cwd, source.path), source.content); }
    await mkdir(dirname(join(cwd, TRANSITION_PARENT_PATH)), { recursive: true }); await writeFile(join(cwd, TRANSITION_PARENT_PATH), "wrong");
    await expect(readTransitionInputs(cwd)).rejects.toThrow(/compressed parent/);
  });
  it("executes a symlinked TS entrypoint instead of silently succeeding", async () => {
    const cwd = await directory(), alias = join(cwd, "builder alias.ts");
    await symlink(join(root, "scripts/generate-bigram-table.ts"), alias);
    const runner = join(root, "node_modules/.bin/tsx");
    const help = spawnSync(runner, [alias, "--help"], { cwd, encoding: "utf8" });
    expect(help.status, help.stderr).toBe(0); expect(help.stdout).toContain(TRANSITION_UNITS);
    const missing = spawnSync(runner, [alias], { cwd, encoding: "utf8" });
    expect(missing.status).toBe(1); expect(missing.stderr).toContain("required");
  });
  it("runs help and rejects missing arguments from unrelated cwd through both TS entrypoints", async () => {
    const cwd = await directory(), script = join(root, "scripts/generate-bigram-table.ts");
    const loader = join(root, "node_modules/tsx/dist/loader.mjs");
    for (const [command, prefix] of [[join(root, "node_modules/.bin/tsx"), []], [process.execPath, ["--import", loader]]] as const) {
      const help = spawnSync(command, [...prefix, script, "--help"], { cwd, encoding: "utf8" });
      expect(help.status, help.stderr).toBe(0); expect(help.stdout).toContain(TRANSITION_UNITS);
      const missing = spawnSync(command, [...prefix, script], { cwd, encoding: "utf8" });
      expect(missing.status).toBe(1); expect(missing.stderr).toContain("required");
    }
  });
});
