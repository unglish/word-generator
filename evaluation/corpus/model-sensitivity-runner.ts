import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createGzip } from "node:zlib";
import { finished } from "node:stream/promises";
import { once } from "node:events";
import { ARPABET_BIGRAM_COUNTS, ARPABET_TOTAL_COUNTS, ALL_ARPABET_PHONEMES } from "../../src/phonotactic/arpabet-bigrams.js";
import { scoreArpabetWords } from "../../src/phonotactic/score.js";
import type { Word } from "../../src/types.js";
import { parseCmuRecords, selectCompatibleCmu } from "./cmu.js";
import { openOriginalArchive, originalDraws } from "./archive.js";
import { countPhoneTransitions } from "./phone-transitions.js";
import type { TransitionReferenceEnvelope } from "./transition-builder.js";
import type { ScoreReferenceEnvelope } from "./score-reference-builder.js";
import { scoreInputs } from "./score-reference.js";
import { jsonDigest } from "./identity.js";
import { contribution, DECOMPOSITION_ARITHMETIC, gaps, model, pairedScores, project, same, StudyGroups, validateTable,
  type FinishedGroups, type IdentityModule, type Model, type StudyRow } from "./model-sensitivity.js";
import { freshPath, hashFile, loadIdentity, pinnedBytes, RAW_SHA, readReference, REFERENCES, verifyFreeze, type FilePin } from "./model-sensitivity-integrity.js";

export interface StudyOptions { freeze: string; freezeSha256: string; out: string }
export function oldTable() {
  return { counts: ARPABET_BIGRAM_COUNTS, rowTotals: ARPABET_TOTAL_COUNTS,
    total: Object.values(ARPABET_TOTAL_COUNTS).reduce((a, b) => a + b, 0), vocabulary: [...ALL_ARPABET_PHONEMES].sort() };
}
export function englishRow(entry: { line: number; spelling: string; tokens: string[]; phones: { base: string }[] }, ordinal: number, A: Model, B: Model): StudyRow {
  const tokens = entry.phones.map(phone => phone.base);
  return { identity: { kind: "english", ordinal, line: entry.line, spelling: entry.spelling }, tokens, phoneCount: tokens.length,
    transitionCount: tokens.length + 1, identityComplete: null, unavailable: null, source: { native: [...entry.tokens] }, scores: pairedScores(tokens, A, B) };
}
export function generatedRow(draw: { profile: string; seed: number; drawIndex: number; word: Word }, archiveSha256: string, identity: IdentityModule, A: Model, B: Model): StudyRow {
  const observed = project(draw.word, identity);
  return { identity: { kind: "generated", profile: draw.profile, seed: draw.seed, drawIndex: draw.drawIndex },
    tokens: observed.tokens, phoneCount: observed.tokens.length, transitionCount: observed.reason === null ? observed.tokens.length + 1 : null,
    identityComplete: observed.identityComplete, unavailable: observed.reason,
    source: { archiveSha256, written: draw.word.written.clean, observation: observed.observation, projection: observed.projection },
    scores: observed.reason === null ? pairedScores(observed.tokens as string[], A, B) : null };
}
interface Witness { row: StudyRow; originalWord: Word | null; contributions: ReturnType<typeof contribution>[] }
export class Witnesses {
  private values: Record<string, Witness> = {};
  add(row: StudyRow, A: Model, B: Model, originalWord: Word | null = null): void {
    const sequence = ["#", ...row.tokens, "#"];
    const contributions = row.scores ? sequence.slice(1).map((second, index) => contribution(sequence[index]!, second!, A, B)) : [];
    const categories = new Set(contributions.filter(item => item.support === "seen-unseen" || item.support === "unseen-seen").map(item => item.support));
    if (row.unavailable) categories.add(row.unavailable);
    if ("observation" in row.source) for (const segment of row.source.observation.segments) if (segment.identity.status !== "resolved") categories.add(segment.identity.status);
    const save = (key: string): void => { this.values[key] = structuredClone({ row, originalWord, contributions }); };
    for (const category of categories) { const key = `${row.identity.kind}/${category}`; if (!this.values[key]) save(key); }
    const maximum = `${row.identity.kind}/maximum-absolute-total-delta`;
    if (row.scores && (!this.values[maximum] || Math.abs(row.scores.delta.total) > Math.abs(this.values[maximum].row.scores!.delta.total))) save(maximum);
  }
  finish(): Record<string, Witness> { return structuredClone(this.values); }
}
interface IdentityPriorCounts {
  words: number; segments: number; identities: unknown; coarse: { mapped: number; missing: number; completeWords: number; mergeCapable: number; aspirationLoss: number };
  strict: { identityCompleteWords: number }; sourceCounts: unknown; coarsePreimages: unknown; stressByNucleus: unknown;
  reductionFlags: unknown; underlyingIdentityUnknown: number; notationAliases: Record<string, number>;
}
interface IdentityPrior { observer: { digest: string }; profiles: { id: string; totals: IdentityPriorCounts; replicates: { seed: number; counts: IdentityPriorCounts }[] }[] }
const quoted = (counts: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(counts).map(([key, value]) => [JSON.stringify(key), value]));
export function reconcileIdentity(groups: FinishedGroups, prior: IdentityPrior): void {
  same(prior.observer.digest, "476aeca7b45c1b7c9fc8bdd6481354c1c05543fd3b1f72c6726123cbbe3408f6", "published identity observer closure");
  const check = (key: string, expected: IdentityPriorCounts): void => {
    const g = groups[key], l = g.loss;
    if (!l) throw new Error("Generated identity observations are unavailable.");
    same([g.rows, l.segments, l.identities, l.mapped, l.missing, g.scoreable, l.potentialMergerSegments, l.aspirationLoss, g.identityComplete],
      [expected.words, expected.segments, expected.identities, expected.coarse.mapped, expected.coarse.missing, expected.coarse.completeWords,
        expected.coarse.mergeCapable, expected.coarse.aspirationLoss, expected.strict.identityCompleteWords], "published identity accounting");
    same(quoted(l.sourceCounts), expected.sourceCounts, "published raw sounds");
    same(Object.fromEntries(Object.entries(l.coarsePreimages).map(([token, counts]) => [token, quoted(counts)])), expected.coarsePreimages, "published preimages");
    same(quoted(Object.fromEntries(Object.entries(l.stressByNucleus).map(([sound, counts]) => [sound, quoted(counts)]))), expected.stressByNucleus, "published nuclear stress");
    same(l.reductionByNucleus, expected.reductionFlags, "published recorded nuclear reduction");
    same(l.segments, expected.underlyingIdentityUnknown, "published unavailable underlying identity");
    same(l.notationAliases, Object.values(expected.notationAliases).reduce((a, b) => a + b, 0), "published aliases");
  };
  for (const profile of prior.profiles) {
    check(`profile/${profile.id}/all`, profile.totals);
    for (const replicate of profile.replicates) check(`stream/${profile.id}/${replicate.seed}/all`, replicate.counts);
  }
}
async function writeRows(path: string, rows: AsyncIterable<StudyRow> | Iterable<StudyRow>): Promise<FilePin & { rows: number; rawSha256: string }> {
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256"), gzip = createGzip({ level: 9 }), output = createWriteStream(path, { flags: "wx" });
  const done = finished(output); gzip.on("error", error => output.destroy(error)); output.on("error", error => gzip.destroy(error)); gzip.pipe(output);
  let count = 0;
  try {
    for await (const row of rows) {
      const line = JSON.stringify(row) + "\n"; hash.update(line); count++;
      if (!gzip.write(line)) await once(gzip, "drain");
    }
    gzip.end(); await done;
    return { ...await hashFile(path), rows: count, rawSha256: hash.digest("hex") };
  } catch (error) { gzip.destroy(); output.destroy(); await done.catch(() => undefined); throw error; }
}
export async function publishReport(out: string, report: unknown, check: () => Promise<void>): Promise<void> {
  await check();
  await writeFile(join(out, "report.json"), JSON.stringify({ digest: jsonDigest(report), report }) + "\n", { flag: "wx" });
}
/** Published report is the completion marker. Any failure preserves incomplete files and an explicit failure record. */
export async function runSensitivity(options: StudyOptions): Promise<void> {
  const frozen = await verifyFreeze(options.freeze, options.freezeSha256);
  const { root, inputs } = frozen;
  const out = await freshPath(root, options.out, [options.freeze, ...Object.values(inputs)]);
  const raw = await pinnedBytes(inputs.source, RAW_SHA), text = raw.toString("utf8");
  same(Buffer.from(text), raw, "raw UTF-8 bytes");
  const selection = selectCompatibleCmu(parseCmuRecords(text));
  same(selection.entries.length, 117485, "English selected entries");
  same(selection.excluded, { alternate_pronunciation: 9114, non_ascii_spelling: 8559, no_vowel: 8 }, "English exclusion population");
  const transition = await readReference<TransitionReferenceEnvelope>(root, "transitions"), prior = await readReference<ScoreReferenceEnvelope>(root, "scores");
  await readReference(root, "joint");
  same(countPhoneTransitions(selection.entries), transition.artifact.transitions, "raw English native/base pairs and identities");
  const A = model(oldTable()), B = model(transition.artifact.transitions.base);
  for (const [m, bins, events] of [[A, 1338, 976831], [B, 1339, 859818]] as const) {
    same(Object.values(m.table.counts).reduce((n, row) => n + Object.keys(row).length, 0), bins, "observed model bins"); same(m.table.total, events, "model events");
  }
  validateTable(B.table, transition.artifact.transitions.base);
  const identity = await loadIdentity(inputs.identity);
  const archive = await openOriginalArchive(inputs.archive), groups = new StudyGroups(), witnesses = new Witnesses();
  const artifacts: Record<string, FilePin & { rows: number; rawSha256: string }> = {};
  await mkdir(out);
  try {
    const englishRows = selection.entries.map((entry, ordinal) => englishRow(entry, ordinal, A, B));
    same(englishRows.map(row => ({ ordinal: row.identity.kind === "english" ? row.identity.ordinal : -1,
      line: row.identity.kind === "english" ? row.identity.line : -1, spelling: row.identity.kind === "english" ? row.identity.spelling : "",
      arpabet: row.tokens.join(" "), phoneCount: row.phoneCount, transitionCount: row.transitionCount, ...row.scores!.A })), prior.artifact.scores.rows, "every published English row");
    for (const row of englishRows) { groups.add(row); witnesses.add(row, A, B); }
    artifacts["english.jsonl.gz"] = await writeRows(join(out, "english.jsonl.gz"), englishRows);
    for (const profile of archive.manifest.protocol.profiles) for (const seed of profile.seeds.development) {
      const file = `${profile.id}-${seed}.jsonl.gz`, archivedFile = `words/${file}`;
      const pin = archive.manifest.artifacts.find(item => item.file === archivedFile)!;
      async function* rows(): AsyncGenerator<StudyRow> {
        for await (const draw of originalDraws(inputs.archive, archive.manifest, profile.id, seed)) {
          const row = generatedRow(draw, pin.sha256, identity, A, B); groups.add(row); witnesses.add(row, A, B, draw.word); yield row;
        }
      }
      artifacts[file] = await writeRows(join(out, file), rows());
      console.log(`${profile.id}/${seed}: ${artifacts[file].rows} fixed archived vectors compared`);
    }
    const summary = groups.finish(A, B), english = summary["english/all"];
    same(english.scores.A, prior.artifact.scores.summary, "published English aggregate");
    const oldBatch = scoreArpabetWords(scoreInputs(selection.entries));
    same({ mean: english.scores.A.total!.mean, median: english.scores.A.total!.median, min: english.scores.A.total!.min }, oldBatch.total, "actual legacy English aggregate");
    same({ mean: english.scores.A.perTransition!.mean, median: english.scores.A.perTransition!.median, min: english.scores.A.perTransition!.min }, oldBatch.perBigram, "actual legacy English normalized aggregate");
    reconcileIdentity(summary, JSON.parse(await readFile(inputs.identityReport, "utf8")) as IdentityPrior);
    same([english.rows, summary["generated/all"].rows], [117485, 200000], "complete populations");
    same(summary["generated/identity-complete"].rows, 196552, "published source-identity subset");
    const report = { version: "cmu-model-sensitivity-v1", interpretation: "paired count-table sensitivity only; no changed generated words or held-out quality claim",
      authority: { freezeSha256: options.freezeSha256, frozen }, models: { A: A.table, B: B.table }, references: REFERENCES,
      population: { English: 117485, generated: 200000, identityCompleteGenerated: 196552 },
      units: { total: "log2 conditional probability sum", perTransition: "total/(phoneCount+1)", aggregate: "equal word weights; sorted sequential binary64; upper-middle median", decomposition: DECOMPOSITION_ARITHMETIC },
      projection: { sourceProfile: "english-legacy-v1", layer: "surface", completeVectorsOnly: true, identityEligibility: "all segment identities resolved, independent of recorded stress" },
      artifacts, groups: summary, gaps: gaps(summary), witnesses: witnesses.finish(),
      sourceBundle: await Promise.all(Object.keys(frozen.sources).filter(path => path.startsWith("evaluation/corpus/") && /\.(ts|py)$/.test(path)
        || path.startsWith("src/phonotactic/") && !path.endsWith(".test.ts")).map(async path => ({ path, content: await readFile(resolve(root, path), "utf8") }))),
      externalIdentitySource: (await readFile(inputs.identity)).toString("utf8"),
      limitations: ["B English is in-sample; historical A population overlap unresolved", "Count magnitude and smoothing strength change with table; alpha remains one", "Source identity is not phonological acceptability; ɜ remains ambiguous", "Saved bare roots and forced monosyllables are not a matched dictionary-stem population", "No token frequency, POS, familiarity or human preference inference", "Exact sign counts describe JS binary64; near-zero count is separate"] };
    await publishReport(out, report, async () => {
      await verifyFreeze(options.freeze, options.freezeSha256);
      for (const [file, pin] of Object.entries(artifacts)) same(await hashFile(join(out, file)), { bytes: pin.bytes, sha256: pin.sha256 }, "stable output stream");
    });
  } catch (error) {
    await writeFile(join(out, "failure.json"), JSON.stringify({ status: "incomplete-ineligible", error: error instanceof Error ? error.message : String(error) }) + "\n", { flag: "wx" });
    throw error;
  }
}
