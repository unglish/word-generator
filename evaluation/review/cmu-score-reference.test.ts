import { spawnSync } from "node:child_process";
import { link, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { parseScoreArgs } from "../../scripts/generate-baseline.js";
import { ARPABET_BIGRAM_COUNTS, ARPABET_TOTAL_COUNTS, ALL_ARPABET_PHONEMES } from "../../src/phonotactic/arpabet-bigrams.js";
import { scoreArpabetWords } from "../../src/phonotactic/score.js";
import { parseCmuRecords, selectCompatibleCmu } from "../corpus/cmu.js";
import { jsonDigest } from "../corpus/identity.js";
import { LEGACY_SCORER, assembleScoreReference, scoreInputs, scoreSelectedEntries, type ScoreReference } from "../corpus/score-reference.js";
import { createScoreEnvelope, readScoreInputs, reconstructScores, SCORE_POLICY, SCORE_PROJECTION, SCORE_SOURCE_PATHS,
  validateScoreEnvelope, writeScoreArtifact, type ScoreReferenceEnvelope, type TrustedScoreInputs } from "../corpus/score-reference-builder.js";
import { TRANSITION_PARENT_PATH, validateTransitionOutputPath } from "../corpus/transition-builder.js";

const root = resolve("."), temporary: string[] = [];
const select = (text: string) => selectCompatibleCmu(parseCmuRecords(text));
async function directory() { const path = await mkdtemp(join(tmpdir(), "cmu-scores-")); temporary.push(path); return path; }
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

/** Artificial parent-sized rows for envelope-forgery tests. No raw corpus is read or scored. */
function syntheticScores(parent: TrustedScoreInputs["parent"]): ScoreReference {
  const reference = parent.artifact.reference, n = reference.population.accepted;
  const baseLength = Math.floor(reference.phones.native.total / n), longer = reference.phones.native.total % n;
  const rows = Array.from({ length: n }, (_, ordinal) => {
    const phoneCount = baseLength + Number(ordinal < longer), total = -phoneCount - (ordinal % 2) / 10;
    return { ordinal, line: ordinal + 1, spelling: "synthetic", arpabet: Array<string>(phoneCount).fill("AH").join(" "),
      phoneCount, transitionCount: phoneCount + 1, total, perTransition: total / (phoneCount + 1) };
  });
  const stats = (values: number[]) => { values.sort((a, b) => a - b); return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length, min: values[0], median: values[Math.floor(values.length / 2)], max: values.at(-1)!,
  }; };
  return { entryDigest: reference.population.entryDigest, accounting: { selected: n, scored: n, invalid: 0, dropped: 0 },
    phoneEvents: reference.phones.native.total, transitionEvents: reference.phones.native.total + n, rows,
    summary: { total: stats(rows.map(row => row.total)), perTransition: stats(rows.map(row => row.perTransition)) } };
}
let expected: TrustedScoreInputs, envelope: ScoreReferenceEnvelope;
beforeAll(async () => {
  const { parent, sources } = await readScoreInputs(root);
  expected = { parent, sources, scores: syntheticScores(parent) };
  envelope = createScoreEnvelope(expected);
});
const redigest = (value: ScoreReferenceEnvelope) => { value.digest = jsonDigest(value.artifact); return value; };

describe("complete selected-population score rows", () => {
  it("uses the actual BatchScoreResult object and retains exact legacy aggregates plus separate max", () => {
    const entries = select("a AH0\ncat K AE1 T\nbear B EH1 R\nyes Y EH1 S\n").entries;
    const inputs = scoreInputs(entries), batch = scoreArpabetWords(inputs), result = scoreSelectedEntries(entries);
    expect(Array.isArray(batch)).toBe(false); expect(Object.keys(batch)).toEqual(["words", "total", "perBigram"]);
    expect(batch.total).not.toHaveProperty("max");
    expect(result.rows.map(row => ({ arpabet: row.arpabet, score: row.total, perBigram: row.perTransition }))).toEqual(batch.words);
    expect(result.summary.total).toEqual({ ...batch.total, max: Math.max(...batch.words.map(row => row.score)) });
    expect(result.summary.perTransition).toEqual({ ...batch.perBigram, max: Math.max(...batch.words.map(row => row.perBigram)) });
    const sorted = batch.words.map(row => row.score).sort((a, b) => a - b);
    expect(result.summary.total.median).toBe(sorted[2]); expect(sorted[1]).not.toBe(sorted[2]);
    expect(result.accounting).toEqual({ selected: 4, scored: 4, invalid: 0, dropped: 0 });
  });
  it("keeps equal-word weighting rather than pooling differently sized words' transitions", () => {
    const entries = select("a AH0\nlong S T R EH1 NG TH S\n").entries, result = scoreSelectedEntries(entries);
    const pooled = result.rows.reduce((sum, row) => sum + row.total, 0) / result.transitionEvents;
    expect(result.summary.perTransition.mean).toBe(scoreArpabetWords(scoreInputs(entries)).perBigram.mean);
    expect(result.summary.perTransition.mean).not.toBe(pooled);
    expect(result.rows.map(row => row.transitionCount)).toEqual([2, 8]);
  });
  it("retains sorted-sum floating semantics, which can differ from source-order summation", () => {
    const entries = select("a AH0\nb IY1\nc UW2\n").entries, batch = scoreArpabetWords(scoreInputs(entries));
    // A valid-shaped synthetic batch isolates aggregation handoff, without changing the real scorer.
    batch.words.forEach((row, i) => { row.score = [-1e16, -1, -1][i]; row.perBigram = row.score / 2; });
    batch.total = { mean: -1e16 / 3, min: -1e16, median: -1 };
    batch.perBigram = { mean: -5e15 / 3, min: -5e15, median: -0.5 };
    const result = assembleScoreReference(entries, batch);
    expect(result.summary.total.mean).toBe(batch.total.mean);
    expect(result.summary.total.mean).not.toBe(batch.words.slice().reverse().reduce((sum, row) => sum + row.score, 0) / 3);
  });
  it("projects native stress 0/1/2 directly, counts repeated phones and keeps source identities", () => {
    const entries = select("a AH0 ER0\nb AH1 ER1\nc AH2 ER2\nd T T AH0\n").entries, result = scoreSelectedEntries(entries);
    expect(result.rows.slice(0, 3).map(row => row.arpabet)).toEqual(["AH ER", "AH ER", "AH ER"]);
    expect(new Set(result.rows.slice(0, 3).map(row => row.total)).size).toBe(1);
    expect(result.rows[3].arpabet).toBe("T T AH"); expect(result.phoneEvents).toBe(9); expect(result.transitionEvents).toBe(13);
    const changed = structuredClone(entries); changed[0].tokens[0] = "AH1"; changed[0].phones[0] = { kind: "vowel", raw: "AH1", base: "AH", stress: 1 };
    expect(scoreSelectedEntries(changed).entryDigest).not.toBe(result.entryDigest);
  });
  it("uses shared whole-entry exclusions and source order without deleting bad tokens", () => {
    const selected = select("same BAD\nSAME S EY1 M # comment\nsame S AH0 M\nsame(2) S EY2 M\ncan't K AE1 N T\nhm HH M\nyes Y EH1 S\n");
    expect(selected.excluded).toEqual({ unsupported_pronunciation: 1, duplicate_spelling: 1, alternate_pronunciation: 1, non_ascii_spelling: 1, no_vowel: 1 });
    const result = scoreSelectedEntries(selected.entries);
    expect(result.rows.map(row => [row.ordinal, row.line, row.spelling])).toEqual([[0, 2, "same"], [1, 7, "yes"]]);
    expect(result.rows[0].arpabet).toBe("S EY M");
  });
  it("rejects empty, duplicate, reordered, unsupported or mismatched selected inputs", () => {
    expect(() => scoreSelectedEntries([])).toThrow(/nonempty/);
    const entries = select("a AH0\nb B IY1\n").entries;
    for (const bad of [[...entries].reverse(), [entries[0], entries[0]]]) expect(() => scoreSelectedEntries(bad)).toThrow(/order or identity/);
    const bad = structuredClone(entries); bad[0].phones[0].base = "ER";
    expect(() => scoreSelectedEntries(bad)).toThrow(/matching/);
    bad[0].tokens = ["BAD"]; expect(() => scoreSelectedEntries(bad)).toThrow(/matching/);
  });
  it("rejects missing, extra, nonfinite, mismatched or misnormalized scorer rows without filtering", () => {
    const entries = select("a AH0\nb B IY1\n").entries, original = scoreArpabetWords(scoreInputs(entries));
    for (const mutate of [
      (batch: typeof original) => { batch.words.pop(); }, (batch: typeof original) => { batch.words.push(batch.words[0]); },
      (batch: typeof original) => { batch.words[0].score = -Infinity; }, (batch: typeof original) => { batch.words[0].perBigram = NaN; },
      (batch: typeof original) => { batch.words[0].arpabet = "ER"; }, (batch: typeof original) => { batch.words[0].perBigram++; },
      (batch: typeof original) => { batch.total.mean = NaN; },
    ]) { const batch = structuredClone(original); mutate(batch); expect(() => assembleScoreReference(entries, batch)).toThrow(); }
  });
  it("returns detached rows and aggregates without mutating entries or the legacy table", () => {
    const entries = select("a AH0\nb B IY1\n").entries, original = structuredClone(entries), batch = scoreArpabetWords(scoreInputs(entries));
    const saved = structuredClone(batch), result = assembleScoreReference(entries, batch);
    result.rows[0].arpabet = "ER"; result.summary.total.mean = 99; entries[0].phones[0].base = "ER";
    expect(batch).toEqual(saved); expect(scoreSelectedEntries(original)).toEqual(assembleScoreReference(original, saved));
    expect(ARPABET_TOTAL_COUNTS["#"]).toBe(132603);
  });
});

describe("complete externally expected score artifact", () => {
  it("validates an explicitly synthetic parent-sized envelope and detaches its source metadata", () => {
    validateScoreEnvelope(envelope, expected);
    expect(envelope.artifact.implementation.sources.map(file => file.path)).toEqual([...SCORE_SOURCE_PATHS]);
    expect(envelope.artifact).not.toHaveProperty("generatedBaseline");
    const copy = createScoreEnvelope(expected); copy.artifact.scores.rows[0].total = 99;
    copy.artifact.implementation.sources[0].content = "mutated"; Object.assign(copy.artifact.population.definition.population.exclusionOrder, { 0: "no_vowel" });
    expect(expected.parent.artifact.reference.population.definition.population.exclusionOrder[0]).toBe("alternate_pronunciation");
    expect(expected.scores.rows[0].total).not.toBe(99); expect(expected.sources[0].content).not.toBe("mutated");
  });
  it("rejects a redigested row-score swap even though every summary and denominator is preserved", () => {
    const copy = structuredClone(envelope), rows = copy.artifact.scores.rows;
    const other = rows.findIndex(row => row.phoneCount === rows[0].phoneCount && row.total !== rows[0].total);
    [rows[0].total, rows[other].total] = [rows[other].total, rows[0].total];
    [rows[0].perTransition, rows[other].perTransition] = [rows[other].perTransition, rows[0].perTransition];
    expect(copy.artifact.scores.summary).toEqual(envelope.artifact.scores.summary);
    expect(rows[0].perTransition).toBe(rows[0].total / rows[0].transitionCount);
    expect(rows[other].perTransition).toBe(rows[other].total / rows[other].transitionCount);
    expect(rows.map(row => row.transitionCount)).toEqual(envelope.artifact.scores.rows.map(row => row.transitionCount));
    expect(() => validateScoreEnvelope(redigest(copy), expected)).toThrow(/full ordered rows/);
  });
  it.each([
    ["missing", (e: ScoreReferenceEnvelope) => { e.artifact.scores.rows.pop(); }],
    ["extra", (e: ScoreReferenceEnvelope) => { e.artifact.scores.rows.push(e.artifact.scores.rows[0]); }],
    ["duplicate", (e: ScoreReferenceEnvelope) => { e.artifact.scores.rows[1] = e.artifact.scores.rows[0]; }],
    ["reordered", (e: ScoreReferenceEnvelope) => { [e.artifact.scores.rows[0], e.artifact.scores.rows[1]] = [e.artifact.scores.rows[1], e.artifact.scores.rows[0]]; }],
    ["input", (e: ScoreReferenceEnvelope) => { e.artifact.scores.rows[0].arpabet = "ER"; }],
    ["summary", (e: ScoreReferenceEnvelope) => { e.artifact.scores.summary.perTransition.mean++; }],
    ["population", (e: ScoreReferenceEnvelope) => { e.artifact.population.accepted++; }],
    ["model", (e: ScoreReferenceEnvelope) => { Object.assign(e.artifact.scorer, { alpha: 2 }); }],
    ["projection", (e: ScoreReferenceEnvelope) => { Object.assign(e.artifact.projection, { loss: "none" }); }],
    ["forged closure", (e: ScoreReferenceEnvelope) => { e.artifact.implementation.sources[0].content += "\n// forged"; e.artifact.implementation.digest = jsonDigest(e.artifact.implementation.sources); }],
    ["extra field", (e: ScoreReferenceEnvelope) => { Object.assign(e.artifact, { generatedBaseline: { gap: 0 } }); }],
  ])("rejects redigested %s corruption", (_name, mutate) => {
    const copy = structuredClone(envelope); mutate(copy);
    expect(() => validateScoreEnvelope(redigest(copy), expected)).toThrow(/full ordered rows/);
  });
  it("rejects nonfinite JSON, wrong trusted row accounting, parent or historical model source", () => {
    const copy = structuredClone(envelope); copy.artifact.scores.rows[0].total = NaN;
    expect(() => redigest(copy)).toThrow(/finite/);
    expect(() => createScoreEnvelope({ ...expected, scores: { ...expected.scores, accounting: { ...expected.scores.accounting, scored: 1 } } })).toThrow(/accounting/);
    expect(() => createScoreEnvelope({ ...expected, parent: { ...expected.parent, digest: "changed" } })).toThrow(/parent/);
    const sources = structuredClone(expected.sources); sources.find(file => file.path === "src/phonotactic/score.ts")!.content += "\n";
    expect(() => createScoreEnvelope({ ...expected, sources })).toThrow(/historical scorer/);
  });
});

describe("explicit score-reference CLI and unchanged input protection", () => {
  const args = ["--source", "source.dict", "--policy", SCORE_POLICY, "--projection", SCORE_PROJECTION, "--scorer", LEGACY_SCORER.id, "--out", "fresh.json"];
  it("accepts only the explicit source/projection/legacy-profile contract", () => {
    expect(parseScoreArgs(args)).toEqual({ source: resolve("source.dict"), out: resolve("fresh.json"), policy: SCORE_POLICY, projection: SCORE_PROJECTION, scorer: LEGACY_SCORER.id });
    expect(parseScoreArgs(["--help"])).toBe("help");
  });
  it.each([[], ["--source"], [...args, "--out", "second"], [...args, "--table", "new.json"], ["--help", "--out", "x"],
    args.map(value => value === SCORE_POLICY ? "all" : value), args.map(value => value === SCORE_PROJECTION ? "native" : value),
    args.map(value => value === LEGACY_SCORER.id ? "new-table" : value), ["--source=raw", ...args.slice(2)]]
    .map(value => ({ args: value })))("rejects %j", ({ args: value }) => { expect(() => parseScoreArgs(value)).toThrow(); });
  it("rejects corrupt source bytes before any full-corpus score or output", async () => {
    const cwd = await directory(), source = join(cwd, "source.dict"), out = join(cwd, "fresh.json");
    for (const bytes of [Buffer.from("a AH0\n"), Buffer.alloc(0), Buffer.from([0xff])]) {
      await writeFile(source, bytes); expect(() => reconstructScores(bytes, expected.parent)).toThrow(/Raw source/);
      await expect(writeScoreArtifact(root, { source, out, policy: SCORE_POLICY, projection: SCORE_PROJECTION, scorer: LEGACY_SCORER.id })).rejects.toThrow(/Raw source/);
      expect(await readdir(cwd)).toEqual(["source.dict"]);
    }
  });
  it("reuses path protection for all active/prior evidence, aliases, existing files and missing parents", async () => {
    const cwd = await directory();
    for (const name of ["src", "data/cmu", "demo", "scripts", "evaluation/corpus", "evaluation/review", "evaluation/experiments/cmu-transition-builder"]) {
      await mkdir(join(cwd, name), { recursive: true }); await expect(validateTransitionOutputPath(cwd, join(cwd, name, "new.json"))).rejects.toThrow(/protected/);
    }
    await symlink(join(cwd, "evaluation/experiments"), join(cwd, "evidence alias"));
    await expect(validateTransitionOutputPath(cwd, join(cwd, "evidence alias/new.json"))).rejects.toThrow(/protected/);
    const source = join(cwd, "raw"); await writeFile(source, "old"); await symlink(source, join(cwd, "raw alias"));
    await expect(validateTransitionOutputPath(cwd, source, join(cwd, "raw alias"))).rejects.toThrow(/protected/);
    await link(source, join(cwd, "hardlink")); await symlink(join(cwd, "absent"), join(cwd, "dangling"));
    for (const name of ["raw", "hardlink", "dangling"]) await expect(validateTransitionOutputPath(cwd, join(cwd, name))).rejects.toThrow(/already exists/);
    await expect(validateTransitionOutputPath(cwd, join(cwd, "missing/out"))).rejects.toThrow(/ENOENT/);
    await expect(validateTransitionOutputPath(cwd, join(cwd, "fresh.json"))).resolves.toBe(join(await realpath(cwd), "fresh.json"));
  });
  it("rejects a changed pinned table or parent before scoring", async () => {
    const cwd = await directory();
    for (const source of expected.sources) { await mkdir(dirname(join(cwd, source.path)), { recursive: true }); await writeFile(join(cwd, source.path), source.content); }
    await mkdir(dirname(join(cwd, TRANSITION_PARENT_PATH)), { recursive: true });
    await writeFile(join(cwd, TRANSITION_PARENT_PATH), await readFile(join(root, TRANSITION_PARENT_PATH)));
    const table = join(cwd, "src/phonotactic/arpabet-bigrams.ts"); await writeFile(table, "changed");
    await expect(readScoreInputs(cwd)).rejects.toThrow(/historical table/);
    await writeFile(table, expected.sources.find(source => source.path.endsWith("/arpabet-bigrams.ts"))!.content);
    await writeFile(join(cwd, TRANSITION_PARENT_PATH), "changed"); await expect(readScoreInputs(cwd)).rejects.toThrow(/compressed parent/);
  });
  it("executes aliases and reports help/failure statuses through both TS runners from unrelated cwd", async () => {
    const cwd = await directory(), alias = join(cwd, "score builder.ts"); await symlink(join(root, "scripts/generate-baseline.ts"), alias);
    for (const [command, prefix] of [[join(root, "node_modules/.bin/tsx"), []], [process.execPath, ["--import", join(root, "node_modules/tsx/dist/loader.mjs")]]] as const) {
      const help = spawnSync(command, [...prefix, alias, "--help"], { cwd, encoding: "utf8" });
      expect(help.status, help.stderr).toBe(0); expect(help.stdout).toContain(LEGACY_SCORER.id);
      const missing = spawnSync(command, [...prefix, alias], { cwd, encoding: "utf8" });
      expect(missing.status).toBe(1); expect(missing.stderr).toContain("required");
    }
  });
  it("independently parses every historical table bin/total/vocabulary without executing it", () => {
    const proof = spawnSync("python3", [join(root, "evaluation/corpus/verify-score-reference.py"), "--root", root, "--audit-model"], { encoding: "utf8" });
    expect(proof.status, proof.stderr).toBe(0);
    expect(JSON.parse(proof.stdout)).toEqual({ counts: ARPABET_BIGRAM_COUNTS, totals: ARPABET_TOTAL_COUNTS, vocabulary: [...ALL_ARPABET_PHONEMES] });
  });
});
