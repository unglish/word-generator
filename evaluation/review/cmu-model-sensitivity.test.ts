import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { validateOriginalManifest } from "../corpus/archive.js";
import { jsonDigest } from "../corpus/identity.js";
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, symlink, writeFile, link, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Word } from "../../src/types.js";
import { model, score, pairedScores, validateTable, contribution, project, StudyGroups, gaps, stats, signed, close, decomposition, expansionSum, DECOMPOSITION_ARITHMETIC, type IdentityModule } from "../corpus/model-sensitivity.js";
import { englishRow, generatedRow, oldTable, Witnesses, publishReport } from "../corpus/model-sensitivity-runner.js";
import { parseArgs } from "../corpus/model-sensitivity-cli.js";
import { freshPath, pinnedBytes, regular, IDENTITY_SHA, loadIdentity, hashFile, validateArchiveLayout } from "../corpus/model-sensitivity-integrity.js";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url))), A = model(oldTable());
const dirs: string[] = [];
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
async function temporary(): Promise<string> { const dir = await mkdtemp(join(await import("node:fs/promises").then(m => m.realpath(tmpdir())), "q15-model-test-")); dirs.push(dir); return dir; }
const changed = (): ReturnType<typeof oldTable> => {
  const result = structuredClone(oldTable()); result.counts["#"].AA++; result.rowTotals["#"]++; result.total++; return result;
};
function word(nucleus: string[], onset: string[] = [], coda: string[] = [], stress?: string): Word {
  return { syllables: [{ onset: onset.map(sound => ({ sound })), nucleus: nucleus.map(sound => ({ sound })), coda: coda.map(sound => ({ sound })), ...(stress ? { stress } : {}) }], written: { clean: "fixture" } } as Word;
}
let identity: IdentityModule | undefined;
async function observer(): Promise<IdentityModule> {
  const path = process.env.Q15_IDENTITY_MODULE ?? "/private/tmp/q16-files/identity.ts";
  await pinnedBytes(path, IDENTITY_SHA);
  identity ??= await loadIdentity(path); return identity;
}
describe("offline fixed-table law", () => {
  it("includes both boundaries, repeated phones, and unseen events with the unchanged scorer", () => {
    for (const tokens of [["AA"], ["AA", "AA"], ["ZH", "ZH"], ["P", "AE", "T"]]) {
      const result = pairedScores(tokens, A, model(changed()));
      expect(result.A.perTransition).toBe(result.A.total / (tokens.length + 1));
      const seq = ["#", ...tokens, "#"];
      expect(result.A.total).toBe(seq.slice(1).reduce((n, second, i) => n + A.log(seq[i], second), 0));
    }
    expect(score(["AA"], A).total).toBe(A.log("#", "AA") + A.log("AA", "#"));
  });
  it("separates event numerator and row denominator changes", () => {
    const B = model(changed()), affected = contribution("#", "AA", A, B), onlyDenominator = contribution("#", "P", A, B);
    expect(affected.numeratorDelta).not.toBe(0); expect(affected.denominatorDelta).not.toBe(0);
    expect(onlyDenominator.numeratorDelta).toBe(0); expect(onlyDenominator.delta).not.toBe(0);
    expect(affected.numeratorDelta + affected.denominatorDelta).toBeCloseTo(affected.delta, 12);
  });
  it.each([[], ["#"], ["AA0"], ["unknown"]].map(tokens => ({ tokens })))("rejects incomplete or wrong-vocabulary vector $tokens", ({ tokens }) => expect(() => score(tokens, A)).toThrow());
  it("does not retain mutable caller table arrays or rows", () => {
    const input = changed(), detached = model(input), before = score(["AA"], detached);
    input.counts["#"].AA += 10; input.vocabulary.length = 0; input.rowTotals["#"] = 0;
    expect(score(["AA"], detached)).toEqual(before);
    expect(() => { detached.table.counts["#"].AA++; }).toThrow();
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid count %s", value => {
    const table = changed(); table.counts["#"].AA = value; expect(() => validateTable(table)).toThrow();
  });
  it("rejects wrong totals/native labels and a marginal-preserving full-table forgery", () => {
    const table = changed(); table.rowTotals["#"]++; expect(() => validateTable(table)).toThrow();
    const native = changed(); native.vocabulary[1] = "AA0"; expect(() => validateTable(native)).toThrow();
    const original = oldTable(), swap = structuredClone(original);
    // A real all-positive 2x2 allows both row and column totals to remain unchanged.
    let found = false;
    for (const first of original.vocabulary) for (const second of original.vocabulary) {
      if (first === second || found) continue;
      const cols = original.vocabulary.filter(c => (original.counts[first][c] ?? 0) > 1 && (original.counts[second][c] ?? 0) > 1);
      if (cols.length < 2) continue;
      const [a, b] = cols; swap.counts[first][a]++; swap.counts[first][b]--; swap.counts[second][a]--; swap.counts[second][b]++; found = true;
    }
    expect(found).toBe(true); expect(() => validateTable(swap)).not.toThrow(); expect(() => validateTable(swap, original)).toThrow(/expected complete table/);
  });
  it("uses upper-middle median, null empties, and distinct exact/near-zero signs", () => {
    expect(stats([])).toBeNull(); expect(stats([-3, -1])).toEqual({ mean: -2, median: -1, min: -3, max: -1 });
    expect(signed([-1e-12, 0, 1e-12, 1])).toEqual({ negative: 1, zero: 1, positive: 2, nearZero: 3 });
  });
});
describe("compensated decomposition arithmetic", () => {
  it("retains cancellation corrections while preserving historical sorted means", () => {
    const terms = [1e16, 1, -1e16];
    expect(terms.reduce((sum, value) => sum + value, 0)).toBe(0);
    expect(expansionSum(terms)).toBe(1);
    expect(decomposition(terms, [1])).toEqual({ arithmetic: DECOMPOSITION_ARITHMETIC.version, weightedDelta: 1, rowDelta: 1, residual: 0 });
    expect(stats(terms)!.mean).toBe(0);
    expect(stats(terms)!.median).toBe(1);
  });
  it("computes residual before rounding away corrections in large aggregate totals", () => {
    const result = decomposition([1e16, 1], [1e16]);
    expect(result.weightedDelta - result.rowDelta).toBe(0);
    expect(result.residual).toBe(1);
    const halfUlp = 2 ** -34, tie = decomposition([1e6, halfUlp], [1e6]);
    expect(tie.weightedDelta - tie.rowDelta).toBe(0);
    expect(tie.residual).toBe(halfUlp);
  });
  it("retains the fixed residual tolerance even when individual operands pass", () => {
    const oneUlp = 2 ** -33, next = 1e6 + oneUlp;
    expect(() => close(next, 1e6, "synthetic total")).not.toThrow();
    expect(() => close(next - 1e6, 0, "synthetic residual")).toThrow(/numerical mismatch/);
    expect(decomposition([next], [1e6]).residual).toBe(oneUlp);
  });
  it("rounds retained halfway terms with both signs and preserves tiny finite residuals", () => {
    expect(expansionSum([1, 2 ** -53, 2 ** -1074])).toBe(1 + 2 ** -52);
    expect(expansionSum([-1, -(2 ** -53), -(2 ** -1074)])).toBe(-1 - 2 ** -52);
    expect(expansionSum([1, 2 ** -53])).toBe(1);
    expect(expansionSum([1e16, Number.MIN_VALUE, -1e16])).toBe(Number.MIN_VALUE);
    expect(expansionSum([])).toBe(0);
    expect(decomposition([], [])).toEqual({ arithmetic: DECOMPOSITION_ARITHMETIC.version, weightedDelta: 0, rowDelta: 0, residual: 0 });
  });
  it("rejects nonfinite terms and intermediate overflow", () => {
    for (const value of [NaN, Infinity, -Infinity]) expect(() => decomposition([1], [value])).toThrow(/Nonfinite/);
    expect(() => expansionSum([Number.MAX_VALUE, Number.MAX_VALUE])).toThrow(/overflow/);
  });
});
describe("source identity is separate from coarse score availability", () => {
  it("retains ambiguous ɜ, resolved ɚ and AH preimages without using stress completeness", async () => {
    const module = await observer();
    const er = project(word(["ɜ"]), module), rhotic = project(word(["ɚ"]), module);
    expect(er.tokens).toEqual(["ER"]); expect(er.identityComplete).toBe(false); expect(er.reason).toBeNull();
    expect(rhotic.identityComplete).toBe(true); expect(rhotic.observation.segments[0].stress.mark).toBe("unmarked");
    expect(project(word(["ə", "ʌ"], [], [], "invalid"), module).tokens).toEqual(["AH", "AH"]);
  });
  it("keeps aligned nulls, empty vectors, notation aliases and extra coarse-only entries", async () => {
    const module = await observer();
    expect(project(word(["ə"], ["unknown"], ["t"]), module)).toMatchObject({ tokens: [null, "AH", "T"], reason: "missing" });
    expect(project(word([]), module).reason).toBe("empty");
    const alias = project(word(["iː"], ["ɡ"]), module);
    expect(alias.identityComplete).toBe(true); expect(alias.tokens).toEqual([null, null]); expect(alias.reason).toBe("missing");
    expect(project(word(["e", "o"]), module)).toMatchObject({ tokens: ["EH", "OW"], identityComplete: false, reason: null });
  });
  it("distinguishes symbolic/recorded aspiration and recorded reduction from recovered identity", async () => {
    const w = word(["ə"], ["pʰ"]); w.syllables[0].nucleus[0].reduced = true; w.syllables[0].onset[0].aspirated = true;
    const result = project(w, await observer()); expect(result.tokens).toEqual(["P", "AH"]);
    expect(result.projection.items[0].losses.aspiration).toBe(true); expect(result.observation.segments[1].underlyingIdentity.status).toBe("unknown");
  });
  it("counts potential mergers separately from observed multi-preimages, with nested exact groups", async () => {
    const module = await observer(), B = model(changed()), groups = new StudyGroups();
    groups.add(englishRow({ line: 1, spelling: "a", tokens: ["AA0"], phones: [{ base: "AA" }] }, 0, A, B));
    for (const [drawIndex, n] of [[0, "ə"], [1, "ʌ"], [2, "ɜ"]] as const) groups.add(generatedRow({ profile: "synthetic", seed: 5, drawIndex, word: word([n]) }, "fixture", module, A, B));
    const result = groups.finish(A, B), all = result["generated/all"];
    expect(all.rows).toBe(3); expect(all.loss!.potentialMergerSegments).toBe(3); expect(all.observedMultiPreimageTokens).toEqual({ AH: { "ə": 1, "ʌ": 1 } });
    expect(result["generated/identity-complete"].rows).toBe(2); expect(result["english/all"].identityUnavailable).toBe(1);
    expect(result["generated/all/phoneCount/1"].rows).toBe(3); expect(gaps(result)["generated/all"].total).not.toBeNull();
  });
  it("retains detached first-tied witnesses and unavailable nested summaries", async () => {
    const module = await observer(), groups = new StudyGroups(), witnesses = new Witnesses();
    const w = word(["ɜ"]), row = generatedRow({ profile: "synthetic", seed: 1, drawIndex: 0, word: w }, "fixture", module, A, A);
    groups.add(row); witnesses.add(row, A, A, w); row.identity = { kind: "generated", profile: "mutated", seed: 2, drawIndex: 3 }; w.syllables.length = 0;
    const saved = witnesses.finish(); expect(saved["generated/ambiguous"].originalWord!.syllables).toHaveLength(1);
    saved["generated/ambiguous"].row.tokens[0] = "wrong"; expect(witnesses.finish()["generated/ambiguous"].row.tokens).toEqual(["ER"]);
    const empty = groups.finish(A, A)["generated/identity-complete"]; expect(empty.rows).toBe(0); expect(empty.scores.A.total).toBeNull();
  });
});
describe("explicit CLI and filesystem authority", () => {
  it.each([[], ["score"], ["--help", "score"], ["score", "--unknown", "x"], ["freeze", "--source", "a", "--source", "b"]].map(args => ({ args })))("rejects incomplete/unknown/repeated command $args", ({ args }) => expect(() => parseArgs(args)).toThrow());
  it("allows only an explicit external freeze SHA and absolute paths", () => {
    expect(parseArgs(["--help"])).toBe("help");
    expect(parseArgs(["score", "--freeze", "a", "--freeze-sha256", "a".repeat(64), "--out", "b"])).toEqual({ mode: "score", options: { freeze: resolve("a"), freezeSha256: "a".repeat(64), out: resolve("b") } });
    expect(() => parseArgs(["score", "--freeze", "a", "--freeze-sha256", "bad", "--out", "b"])).toThrow();
  });
  it("rejects symlink leaves and directory ancestors", async () => {
    const temp = await temporary(); await mkdir(join(temp, "actual")); await writeFile(join(temp, "actual/file"), "x");
    await symlink(join(temp, "actual"), join(temp, "alias")); await symlink(join(temp, "actual/file"), join(temp, "leaf"));
    await expect(regular(join(temp, "actual/file"))).resolves.toBeUndefined();
    await expect(regular(join(temp, "alias/file"))).rejects.toThrow(); await expect(regular(join(temp, "leaf"))).rejects.toThrow();
  });
  it("protects sources/archive aliases, hardlinks, existing and dangling output targets", async () => {
    const temp = await temporary(), source = join(temp, "input"); await writeFile(source, "x"); await mkdir(join(temp, "archive"));
    await symlink(join(temp, "archive"), join(temp, "alias")); await link(source, join(temp, "hard")); await symlink(join(temp, "absent"), join(temp, "dangling"));
    for (const path of [source, join(temp, "hard"), join(temp, "dangling"), join(temp, "alias/new"), join(root, "evaluation/experiments/cmu-shared-parser/never-write.json")]) {
      await expect(freshPath(root, path, [source, join(temp, "archive")])).rejects.toThrow();
    }
    await expect(freshPath(root, join(temp, "fresh"), [source])).resolves.toBe(join(temp, "fresh"));
    expect(await readFile(source, "utf8")).toBe("x");
  });
});

describe("archive and publication failures", () => {
  it("requires the complete metadata/shard set and rejects aliases", async () => {
    const temp = await temporary(); await mkdir(join(temp, "words"));
    for (const path of ["manifest.json", "summary.json", "words/a.jsonl.gz"]) await writeFile(join(temp, path), "fixture");
    const manifest = { artifacts: ["summary.json", "words/a.jsonl.gz"].map(file => ({ file, bytes: 7, sha256: "fixture" })) };
    await expect(validateArchiveLayout(temp, manifest)).resolves.toBeUndefined();
    await writeFile(join(temp, "extra"), "unlisted"); await expect(validateArchiveLayout(temp, manifest)).rejects.toThrow(); await rm(join(temp, "extra"));
    await rm(join(temp, "summary.json")); await expect(validateArchiveLayout(temp, manifest)).rejects.toThrow();
    await symlink(join(temp, "manifest.json"), join(temp, "summary.json")); await expect(validateArchiveLayout(temp, manifest)).rejects.toThrow();
  });
  it("rejects coherent shortened/reordered schedules against the external manifest digest", async () => {
    const archive = process.env.Q15_ORIGINAL_ARCHIVE ?? "/Users/ryanbetts/.codex/worktrees/d9c28566-8f5b-432e-a246-5e4070782624/word-generator/evaluation/quality/baselines/2026-09-26-development-standalone";
    const original = JSON.parse(await readFile(join(archive, "manifest.json"), "utf8"));
    expect(() => validateOriginalManifest(original)).not.toThrow();
    for (const reorder of [false, true]) {
      const bad = structuredClone(original);
      if (reorder) bad.manifest.protocol.profiles.reverse();
      else bad.manifest.protocol.profiles.pop();
      bad.manifest.protocolDigest = jsonDigest(bad.manifest.protocol); bad.digest = jsonDigest(bad.manifest);
      expect(() => validateOriginalManifest(bad)).toThrow();
    }
  });
  it("detects changed source bytes and withholds completion after the final gate fails", async () => {
    const temp = await temporary(), source = join(temp, "source"); await writeFile(source, "before");
    const before = await hashFile(source); await writeFile(source, "after"); expect(await hashFile(source)).not.toEqual(before);
    await writeFile(join(temp, "partial.jsonl.gz"), "retained evidence");
    await expect(publishReport(temp, { fixture: true }, async () => { throw new Error("source changed"); })).rejects.toThrow(/source changed/);
    await expect(readFile(join(temp, "report.json"))).rejects.toThrow();
    expect(await readFile(join(temp, "partial.jsonl.gz"), "utf8")).toBe("retained evidence");
    await publishReport(temp, { fixture: true }, async () => undefined);
    await expect(publishReport(temp, { overwrite: true }, async () => undefined)).rejects.toThrow();
  });
  it("runs no-argument/help/wrong-freeze CLI cases without publishing", async () => {
    const temp = await temporary(), cli = join(root, "evaluation/corpus/model-sensitivity-cli.ts");
    const run = (args: string[]) => spawnSync(process.execPath, ["--import", "tsx", cli, ...args], { cwd: root, encoding: "utf8" });
    expect(run([]).status).toBe(1); expect(run(["--help"]).status).toBe(0);
    const loader = createRequire(import.meta.url).resolve("tsx");
    expect(spawnSync(process.execPath, ["--import", loader, cli, "--help"], { cwd: temp }).status).toBe(0);
    expect(run(["score", "--freeze", join(temp, "missing"), "--freeze-sha256", "a".repeat(64), "--out", join(temp, "not-published")]).status).toBe(1);
    await expect(readFile(join(temp, "not-published/report.json"))).rejects.toThrow();
  });
});
