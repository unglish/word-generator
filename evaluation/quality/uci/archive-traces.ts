import { gunzipSync } from "node:zlib";
import { git, gitBytes } from "../git.js";
import { ROOT, sha256 } from "./reference.js";
import type { Score } from "./scorer.js";
import { median } from "./statistics.js";

const tag = "archive/issue-555-selection-strategy";
const commit = "140a4a8ed31e396ee055b8bd69f32819f0fb6b67";
const generator = "c48d16c1316be3c0839346bf350a96f04c6f183b";
const file = "evaluation/experiments/issue-555-selection-strategy/data/regen.jsonl.gz";
const fileSha256 = "78bfa9248c6a2a0b21ad23be633a2682ac899650891f8b2b7d27a5103012f3a3";

export interface HistoricalScore { spelling: string; phones: string; score: Score }
interface HistoricalTrace {
  seed: number; draw: number; spelling: string; rootLen: number;
  syl: [onset: string, nucleus: string, coda: string, stress: string][];
}

/** Spelling changed between the archived generator and trace regeneration. Match emitted phones at each draw. */
export function historicalRootStrata(scores: ReadonlyMap<string, HistoricalScore>) {
  if (git(ROOT, "rev-parse", `${tag}^{}`) !== commit) throw new Error(`Expected ${tag} at ${commit}.`);
  const bytes = gitBytes(ROOT, "show", `${commit}:${file}`);
  if (sha256(bytes) !== fileSha256) throw new Error("Historical root trace SHA-256 mismatch.");
  const remaining = new Map(scores);
  const groups = new Map<number, { draws: number; singles: number[]; pairs: number[] }>();
  let changedSpellings = 0;
  for (const line of gunzipSync(bytes).toString("utf8").trimEnd().split("\n")) {
    const trace: HistoricalTrace = JSON.parse(line);
    const key = `${trace.seed}/${trace.draw}`;
    const observed = remaining.get(key);
    if (!observed) throw new Error(`Missing score or duplicate historical trace: ${key}`);
    remaining.delete(key);
    const phones = trace.syl.flatMap(([onset, nucleus, coda]) => [onset, nucleus, coda]).filter(Boolean).join(" ");
    if (phones !== observed.phones) throw new Error(`Historical traces and scored phones differ at ${key}.`);
    if (trace.spelling !== observed.spelling) changedSpellings++;
    const group = groups.get(trace.rootLen) ?? { draws: 0, singles: [], pairs: [] };
    group.draws++;
    if (observed.score.unigram.percentile !== null) group.singles.push(observed.score.unigram.percentile);
    if (observed.score.bigram.percentile !== null) group.pairs.push(observed.score.bigram.percentile);
    groups.set(trace.rootLen, group);
  }
  if (remaining.size) throw new Error(`Missing historical traces for ${remaining.size} scored draws.`);
  const strata = [...groups.entries()].sort(([a], [b]) => a - b).map(([rootSyllables, { draws, singles, pairs }]) => ({
    rootSyllables, draws, eligible: pairs.length, unigramMedian: median(singles), bigramMedian: median(pairs),
    bigramBelow10: { numerator: pairs.filter(p => p < 10).length, denominator: pairs.length },
  }));
  return { tag, commit, generator, fileSha256, joinedDraws: scores.size, changedSpellings, strata };
}
