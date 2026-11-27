import { gunzipSync } from "node:zlib";
import { git, gitBytes } from "../git.js";
import { ROOT, loadReference, sha256 } from "./reference.js";
import { fitUci, type Score } from "./scorer.js";
import { duplicateRate, fitMembership, fitPhoneTrigram } from "./guide.js";
import { median } from "./statistics.js";
import { historicalRootStrata, type HistoricalScore } from "./archive-traces.js";

const TAG = "archive/pr-553";
const COMMIT = "6f98ac5cd5d17a71e80df83cfe781ca77a7bcff5";
const GENERATOR = "c151c4c9ca4512d89ccc1f2f2324c4627c552de6";
const ARCHIVE_PATH = "review-exports/wordlikeness-research-evidence";
const ORACLES = {
  reference: {
    sha256: "a05a7f0b90b3adca05cc396d47ea9e26ff503846d214d53641cd66966f8f028d",
    columns: "spelling,arpabet,phonemes,syllables,fold,uci_unigram,uci_bigram",
  },
  generated: {
    sha256: "58521d8e0ec77bda8dfeb13cc3956b473f10da1f341ab3c143b4854be1a95917",
    columns: "seed,draw,spelling,arpabet,phonemes,syllables,fold,uci_unigram,uci_bigram,uci_unigram_percentile,uci_bigram_percentile",
  },
};

function readOracle(kind: keyof typeof ORACLES): string[][] {
  const oracle = ORACLES[kind];
  const path = `${ARCHIVE_PATH}/uci-${kind}.csv.gz`;
  const bytes = gitBytes(ROOT, "show", `${COMMIT}:${path}`);
  if (sha256(bytes) !== oracle.sha256) throw new Error(`Archive SHA-256 mismatch for ${path}.`);
  const [header, ...lines] = gunzipSync(bytes).toString("utf8").trimEnd().split(/\r?\n/);
  if (header !== oracle.columns || lines.length !== 45904) throw new Error(`Unexpected archive schema or census for ${path}.`);
  return lines.map(line => {
    const fields = line.split(",");
    if (fields.length !== header.split(",").length || line.includes("\"")) throw new Error(`Malformed row in ${path}.`);
    return fields;
  });
}

function compareNumber(context: string, expected: string | number, actual: number | null): void {
  const parsed = expected === "" ? null : Number(expected);
  if (actual !== parsed) throw new Error(`${context}: archive has ${String(parsed)}, scorer returned ${String(actual)}.`);
}

function compareScore(context: string, score: Score, columns: string[]): void {
  const [length, , fold, unigram, bigram, singlePercentile, pairPercentile] = columns;
  compareNumber(`${context} length`, length, score.length);
  compareNumber(`${context} fold`, fold, score.fold);
  compareNumber(`${context} unigram`, unigram, score.unigram.raw);
  compareNumber(`${context} bigram`, bigram, score.bigram.raw);
  if (singlePercentile !== undefined) compareNumber(`${context} unigram percentile`, singlePercentile, score.unigram.percentile);
  if (pairPercentile !== undefined) compareNumber(`${context} bigram percentile`, pairPercentile, score.bigram.percentile);
}

/** Fit from the durable dictionary-derived reference, then compare each archive row to an independent calculation. */
export async function verifyArchive(withRootStrata = false) {
  if (git(ROOT, "rev-parse", `${TAG}^{}`) !== COMMIT) throw new Error(`Expected ${TAG} at ${COMMIT}.`);
  const { descriptor, descriptorSha256, rows, spellings } = await loadReference();
  const scorer = fitUci(descriptor, rows);
  const trigram = fitPhoneTrigram(descriptor, rows);
  const membership = fitMembership(rows, spellings);
  const reference = readOracle("reference");
  for (const [index, [spelling, phones, ...columns]] of reference.entries()) {
    if (spelling !== spellings[index] || phones !== rows[index].join(" ")) {
      throw new Error(`Dictionary-derived reference and archive disagree at row ${index}: ${spelling} / ${spellings[index]}.`);
    }
    compareScore(spelling, scorer.score(rows[index]), columns);
  }

  const generated = readOracle("generated");
  const single: number[] = [];
  const pair: number[] = [];
  const scores = withRootStrata ? new Map<string, HistoricalScore>() : undefined;
  const noPeers: Array<{ seed: number; draw: number; fold: number; length: number }> = [];
  const guide = { trigram: [] as number[], rarePair: 0, realPronunciation: 0, realSpelling: 0 };
  for (const [index, [seed, draw, spelling, phones, ...columns]] of generated.entries()) {
    compareNumber("Generated seed", seed, 201 + Math.floor(index / 1000));
    compareNumber("Generated draw", draw, index % 1000);
    const symbols = phones.split(" ");
    const score = scorer.score(symbols);
    const trigramPercentile = trigram.score(symbols).percentile;
    if (trigramPercentile !== null) guide.trigram.push(trigramPercentile);
    if (membership.rarePairs(symbols).length) guide.rarePair++;
    if (membership.isReferencePronunciation(symbols)) guide.realPronunciation++;
    if (membership.isReferenceSpelling(spelling)) guide.realSpelling++;
    compareScore(`${seed}/${draw} ${spelling}`, score, columns);
    scores?.set(`${seed}/${draw}`, { spelling, phones, score });
    if (score.unigram.percentile === null || score.bigram.percentile === null) {
      noPeers.push({ seed: Number(seed), draw: Number(draw), fold: score.fold, length: score.length });
    } else {
      single.push(score.unigram.percentile);
      pair.push(score.bigram.percentile);
    }
  }
  const unigramMedian = median(single);
  const bigramMedian = median(pair);
  const below10 = pair.filter(value => value < 10).length;
  compareNumber("Median unigram percentile", 45.954692556634306, unigramMedian);
  compareNumber("Median bigram percentile", 27.762237762237763, bigramMedian);
  compareNumber("Pair tail numerator", 11198, below10);
  compareNumber("Pair tail denominator", 45902, pair.length);
  const expectedNoPeers = [
    { seed: 204, draw: 829, fold: 0, length: 17 },
    { seed: 221, draw: 645, fold: 0, length: 17 },
  ];
  if (JSON.stringify(noPeers) !== JSON.stringify(expectedNoPeers)) throw new Error("Unexpected draws without peers.");
  const guideMetrics = archivedGuide(guide, generated, membership.referenceRarePairRate.numerator);
  return {
    archive: { tag: TAG, commit: COMMIT, generator: GENERATOR, oracles: ORACLES },
    reference: { descriptor, descriptorSha256, rows: reference.length },
    generated: { rows: generated.length, unigramMedian, bigramMedian, bigramBelow10: { numerator: below10, denominator: pair.length }, noPeers },
    guide: guideMetrics,
    ...(scores && { traceJoin: historicalRootStrata(scores) }),
  };
}

/**
 * The #555 analysis reported these figures for the archived draws (`a4.py`, `b1.py` in
 * archive/issue-555-selection-strategy). Rare pairs and pooled phone duplicates match it
 * exactly. `b1.py` scored the trigram and dictionary pronunciations against folds 0–3
 * only; the packet holds out each word's own fold and matches against the whole reference.
 */
function archivedGuide(guide: { trigram: number[]; rarePair: number; realPronunciation: number; realSpelling: number },
  generated: string[][], referenceRare: number) {
  const trigramMedian = median(guide.trigram);
  const trigramBelow10 = guide.trigram.filter(value => value < 10).length;
  const pooledPhoneDuplicates = duplicateRate(generated.map(columns => columns[3]));
  const bySeed = new Map<string, string[]>();
  for (const [seed, , , phones] of generated) bySeed.set(seed, [...bySeed.get(seed) ?? [], phones]);
  const perSeed = [...bySeed.values()].map(duplicateRate);
  compareNumber("Trigram median percentile", 5.741279069767442, trigramMedian);
  compareNumber("Trigram tail numerator", 27234, trigramBelow10);
  compareNumber("Trigram tail denominator", 45902, guide.trigram.length);
  compareNumber("Rare-pair draws", 3233, guide.rarePair);
  compareNumber("Reference rows with a rare pair", 488, referenceRare);
  compareNumber("Dictionary-pronunciation draws", 2269, guide.realPronunciation);
  compareNumber("Dictionary-spelling draws", 1578, guide.realSpelling);
  compareNumber("Distinct pooled phone sequences", 44132, pooledPhoneDuplicates.distinct);
  return {
    trigram: { median: trigramMedian, below10: { numerator: trigramBelow10, denominator: guide.trigram.length } },
    rarePair: { numerator: guide.rarePair, denominator: generated.length },
    referenceRarePair: { numerator: referenceRare, denominator: 45904 },
    realPronunciation: { numerator: guide.realPronunciation, denominator: generated.length },
    realSpelling: { numerator: guide.realSpelling, denominator: generated.length },
    pooledPhoneDuplicates,
    perSeedPhoneDuplicates: { seeds: perSeed.length, duplicates: perSeed.reduce((sum, seed) => sum + seed.draws - seed.distinct, 0) },
  };
}
