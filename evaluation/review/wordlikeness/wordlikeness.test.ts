import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { fixtureExport, fixtureSnapshot } from "../fixtures.js";
import type { Snapshot } from "../model.js";
import { digest } from "../snapshot.js";
import { LEGACY_RUBRIC } from "../protocol.js";
import { buildReference, contextKey, contexts, syllabify, type SoundSyllable } from "./model.js";
import { scoreSound, scoreSpelling, scoreWord } from "./score.js";
import { scoreSnapshots, validateMachineArtifact } from "./artifact.js";
import { evaluate, evaluationMarkdown, ranks, spearman, splitSpelling } from "./evaluate.js";

const corpus = "cat K AE1 T\nbat B AE1 T\na AH0\nabout AH0 B AW1 T\n";
const model = buildReference(corpus, "synthetic");
const cat: SoundSyllable[] = [{ onset: ["K"], nucleus: ["AE"], coda: ["T"], stressed: true }];

describe("reference construction and prosody", () => {
  it("counts spellings once and explicitly excludes alternate and unsupported entries", () => {
    const result = buildReference(`${corpus}cat(2) K AH1 T\ncat K AE1 T\ncan't K AE1 N T\nwrong XX AH1\nnovowel K T\n`, "test");
    expect(result.corpus.accepted).toBe(4);
    expect(result.corpus.excluded).toEqual({ alternate_pronunciation: 1, duplicate_spelling: 1, non_ascii_spelling: 1, unsupported_pronunciation: 1, no_vowel: 1 });
    expect(result.characters).toEqual(model.characters);
    expect(() => buildReference("invalid X", "test")).toThrow("no supported entries");
  });
  it("has exactly the paper's eight onset/rime stress and position categories", () => {
    const keys = new Set([false, true].flatMap(stressed => [0, 1, 2].flatMap(index => contexts(index, 3, stressed).map(contextKey))));
    expect(keys.size).toBe(8);
    expect(contexts(0, 1, true).map(contextKey)).toEqual(["onset:initial:stressed", "rime:final:stressed"]);
    expect(contexts(1, 3, false).map(contextKey)).toEqual(["onset:medial:unstressed", "rime:medial:unstressed"]);
  });
  it("maximizes attested initial onsets, retaining coda leftovers, hiatus, and secondary stress", () => {
    const onsets = new Set(["", "K", "S T R"]);
    expect(syllabify("AE1 K S T R AH0".split(" "), onsets)).toEqual([
      { onset: [], nucleus: ["AE"], coda: ["K"], stressed: true },
      { onset: ["S", "T", "R"], nucleus: ["AH"], coda: [], stressed: false },
    ]);
    expect(syllabify(["IY2", "AH0"], onsets).map(syllable => syllable.stressed)).toEqual([true, false]);
    expect(() => syllabify(["AH"], onsets)).toThrow("Unsupported");
    expect(() => syllabify(["K"], onsets)).toThrow("no vowel");
  });
  it("is deterministic without mutating the input or depending on corpus line order", () => {
    expect(buildReference(corpus, "synthetic")).toEqual(model);
    const reversed = buildReference(corpus.trim().split("\n").reverse().join("\n"), "synthetic");
    expect(reversed.constituents).toEqual(model.constituents);
    expect(reversed.characters).toEqual(model.characters);
  });
});

describe("pure scores", () => {
  it("matches hand-calculated MLE log-product and 2n normalization", () => {
    const score = scoreSound(cat, model);
    // Two stressed initial onsets: K and B. Three stressed final rimes: AE T twice, AW T once.
    expect(score.total).toBeCloseTo(Math.log(1 / 2) + Math.log(2 / 3), 12);
    expect(score.typicality).toBeCloseTo(score.total! / 2, 12);
    expect(score.components.map(component => component.probability)).toEqual([1 / 2, 2 / 3]);
    const two = scoreSound(syllabify(["AH0", "B", "AW1", "T"], new Set(model.initial_onsets)), model);
    expect(two.typicality).toBeCloseTo(two.total! / 4, 12);
  });
  it("retains empty onsets/codas and differentiates zero probability from unsupported input", () => {
    const empty = scoreSound([{ onset: [], nucleus: ["AH"], coda: [], stressed: false }], model);
    expect(empty.total).not.toBeNull();
    expect(empty.components[0].token).toBe("");
    const unseen = scoreSound([{ ...cat[0], onset: ["Z"] }], model);
    expect(unseen.total).toBeNull();
    expect(unseen.typicality).toBeNull();
    expect(unseen.components[0]).toMatchObject({ probability: 0, log_probability: null, diagnostic: "unseen-constituent-zero-probability" });
    expect(scoreSound([], model).diagnostics).toContain("No saved syllables.");
    expect(scoreSound([{ ...cat[0], nucleus: [] }], model).total).toBeNull();
    expect(scoreSound([{ ...cat[0], onset: ["X"] }], model).components).toEqual([]);
    const missingContext = structuredClone(model);
    delete missingContext.constituents["onset:initial:stressed"];
    expect(scoreSound(cat, missingContext).components[0].diagnostic).toBe("unobserved-context");
    expect(JSON.stringify(unseen)).not.toContain("Infinity");
  });
  it("scores two starts and one end with fixed add-half smoothing, including single-letter words", () => {
    const tiny = buildReference("a AH0", "test");
    const score = scoreSpelling("A", tiny);
    const expected = 2 * Math.log(1.5 / (1 + 0.5 * 27));
    expect(score.total).toBeCloseTo(expected, 12);
    expect(score.normalized).toBeCloseTo(expected / 2, 12);
    expect(score.components.map(component => [component.context, component.token])).toEqual([["^^", "a"], ["^a", "$"]]);
    const unknown = scoreSpelling("zzz", tiny);
    expect(unknown.components[1].probability).toBeCloseTo(1 / 27, 12);
    expect(unknown.components[1].diagnostic).toBe("unseen-context-uniform");
    expect(unknown.normalized).toBeCloseTo(unknown.total! / 4, 12);
    for (const input of ["", "café", "a-b", " a", "a1", "a$"]) expect(scoreSpelling(input, tiny).total).toBeNull();
  });
  it("never silently drops unmapped phonemes from either sound comparator", () => {
    const word = fixtureSnapshot().samples[0].word;
    word.syllables[0].onset = [{ ...word.syllables[0].nucleus[0], sound: "unknown" }];
    const score = scoreWord(word, "cat", model);
    expect(score.metrics.bigram).toBeNull();
    expect(score.metrics.per_bigram).toBeNull();
    expect(score.metrics.paper).toBeNull();
    expect(score.bigram.diagnostics.join(" ")).toContain("unsupported IPA unknown");
    expect(score.metrics.spelling).not.toBeNull();
  });
});

describe("frozen artifacts and private evaluation", () => {
  it("pools both rubrics, retains their sensitivity views, and leaves comments qualitative", () => {
    const first = fixtureExport();
    const second = structuredClone(first);
    second.study.id = "legacy-study";
    second.study.manifest.study_id = second.study.id;
    second.study.manifest.rubric = LEGACY_RUBRIC;
    second.study.digest = digest({ manifest: second.study.manifest, words: second.samples.map(sample => sample.word) });
    const ids = new Map(second.samples.map((sample, index) => [sample.id, digest([second.study.digest, index])]));
    second.samples.forEach(sample => { sample.id = ids.get(sample.id)!; sample.study_id = second.study.id; });
    second.sessions.forEach(session => { session.study_id = second.study.id; session.assignments = session.assignments.map(id => ids.get(id)!); });
    second.responses.forEach(response => { response.sample_id = ids.get(response.sample_id)!; response.comment = "Qualitative only"; });
    const artifact = scoreSnapshots([first, second].map(data => ({ manifest: data.study.manifest, digest: data.study.digest, samples: data.samples })), model, "test", "test");
    const report = evaluate([first, second], artifact);
    expect(report.views).toHaveLength(9);
    expect(report.views[0].items.find(item => item.spelling === "blim")!.denominator).toBe(4);
    expect(report.views[3].items.find(item => item.spelling === "blim")!.denominator).toBe(2);
    expect(report.views[6].items.find(item => item.spelling === "blim")!.denominator).toBe(2);
    const item = report.items.find(item => item.spelling === "blim")!;
    expect(item.ratings.filter(rating => rating.comment === "Qualitative only")).toHaveLength(2);
    expect(new Set(item.ratings.map(rating => splitSpelling(rating.spelling))).size).toBe(1);
    expect(item.metrics).toEqual(artifact.studies[0].rows[0].scores.metrics);
    const spelling = report.views[0].comparisons.find(result => result.metric === "spelling")!;
    expect(spelling.n).toBe(2);
    expect(spelling.length_baselines_on_same_words.written_length.n).toBe(spelling.n);
  });
  it("scores all frozen draws without regeneration and preserves both rubric snapshots", async () => {
    const snapshots = await Promise.all(["v1", "v2"].map(async version => JSON.parse(await readFile(new URL(`../studies/written-${version}-baseline.json`, import.meta.url), "utf8")) as Snapshot));
    const before = digest(snapshots);
    const artifact = scoreSnapshots(snapshots, model, "test", "test");
    expect(artifact.studies.map(study => study.rows.length)).toEqual([200, 200]);
    expect(artifact.studies[0].rows.map(row => row.scores)).toEqual(artifact.studies[1].rows.map(row => row.scores));
    expect(artifact.studies[0].rows[0].sample_id).not.toBe(artifact.studies[1].rows[0].sample_id);
    for (const study of artifact.studies) for (const row of study.rows) {
      expect(row.scores.metrics.spelling).not.toBeNull();
      expect(row.scores.metrics.bigram).not.toBeNull();
      if (row.scores.metrics.paper === null) expect(row.scores.sound.diagnostics.length).toBeGreaterThan(0);
    }
    expect(digest(snapshots)).toBe(before);
    expect(scoreSnapshots(snapshots, model, "test", "test")).toEqual(artifact);
  });
  it("validates artifact integrity and provenance before joining ratings", () => {
    const data = fixtureExport();
    const artifact = scoreSnapshots([{ manifest: data.study.manifest, digest: data.study.digest, samples: data.samples }], model, "test", "test");
    expect(() => validateMachineArtifact(artifact)).not.toThrow();
    const report = evaluate([data], artifact);
    expect(report.views[0].rubric).toBe("combined");
    const blim = report.views[0].items.find(item => item.spelling === "blim")!;
    expect(blim).toMatchObject({ mean: 3, denominator: 2, distribution: [1, 0, 0, 0, 1], familiar: 1 });
    expect(report.views[1].items.find(item => item.spelling === "blim")).toMatchObject({ mean: 5, denominator: 1 });
    expect(report.views[2].items.find(item => item.spelling === "blim")).toMatchObject({ mean: 1, denominator: 1 });
    expect(report.views[0].items.find(item => item.spelling === "thindle")).toMatchObject({ mean: null, denominator: 0, skips: 1 });
    expect(report.items.find(item => item.spelling === "blim")!.machine_rows).toHaveLength(2);
    expect(evaluationMarkdown(report)).toContain("not verified independent people");
    expect(evaluationMarkdown(report)).toContain("Trace evidence:");
    expect(() => evaluate([data, data], artifact)).toThrow("one export per study");
    artifact.studies[0].rows[0].spelling = "tampered";
    expect(() => evaluate([data], artifact)).toThrow("Invalid machine-score artifact");
    const { digest: _hash, ...content } = artifact;
    expect(_hash).toBeTruthy();
    artifact.digest = digest(content);
    expect(() => evaluate([data], artifact)).toThrow("sample/spelling mismatch");
  });
  it("calculates tie-aware Spearman, including constant/empty coverage", () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
    expect(spearman([1, 2, 3], [3, 2, 1])).toBe(-1);
    expect(spearman([1, 2, 2, 3], [1, 2, 3, 4])).toBeCloseTo(3 / Math.sqrt(10), 12);
    expect(spearman([1, 1], [2, 3])).toBeNull();
    expect(spearman([], [])).toBeNull();
    expect(() => spearman([1], [])).toThrow("Unpaired");
    expect(() => ranks([NaN])).toThrow("finite");
  });
  it("keeps every rating and rubric copy of each spelling in one deterministic split", () => {
    const spellings = Array.from({ length: 1000 }, (_, index) => `word${index}`);
    const groups = spellings.map(spelling => ({ spelling, split: splitSpelling(spelling) }));
    const train = new Set(groups.filter(group => group.split === "train").map(group => group.spelling));
    const heldout = new Set(groups.filter(group => group.split === "heldout").map(group => group.spelling));
    expect([...train].some(spelling => heldout.has(spelling))).toBe(false);
    expect(heldout.size).toBeGreaterThan(150);
    expect(heldout.size).toBeLessThan(250);
    for (const spelling of [...spellings].reverse()) for (let rating = 0; rating < 3; rating++) {
      expect(splitSpelling(spelling.toUpperCase())).toBe(splitSpelling(spelling));
    }
  });
});
