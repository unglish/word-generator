import { gunzipSync } from "node:zlib";
import { git, gitBytes } from "../git.js";
import { ROOT, loadReference, sha256 } from "./reference.js";
import { fitUci, type Score } from "./scorer.js";
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
  for (const [index, [seed, draw, spelling, phones, ...columns]] of generated.entries()) {
    compareNumber("Generated seed", seed, 201 + Math.floor(index / 1000));
    compareNumber("Generated draw", draw, index % 1000);
    const score = scorer.score(phones.split(" "));
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
  return {
    archive: { tag: TAG, commit: COMMIT, generator: GENERATOR, oracles: ORACLES },
    reference: { descriptor, descriptorSha256, rows: reference.length },
    generated: { rows: generated.length, unigramMedian, bigramMedian, bigramBelow10: { numerator: below10, denominator: pair.length }, noPeers },
    ...(scores && { traceJoin: historicalRootStrata(scores) }),
  };
}
