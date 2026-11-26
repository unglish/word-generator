/**
 * The one place exact generated output is pinned.
 *
 * `src/core/golden-output.test.ts` compares a fresh capture with the committed
 * fixture; `npm run golden:update` rewrites the fixture. Any change to how a
 * stage draws, to the stream derivation or to weighting is expected to change
 * it: review the diff and regenerate deliberately.
 *
 * Each case also records each stage's draws on every word's first root attempt,
 * which always runs. Within that attempt the stages run in order on their own
 * streams, so a change leaves the counts of every stage that runs before it
 * unchanged. A count that moves in an earlier stage means a draw moved to the
 * wrong stream. Totals over all attempts cannot show this: any change that
 * alters output changes which attempts run, and so every stage's total.
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import { generateWords } from "../index.js";
import { ATTEMPT_STAGES, WORD_STAGES } from "../core/stage-streams.js";
import type { GenerationMode } from "../types.js";
import { withStageDraws, type Stage } from "./stage-stream-probe.js";

export const GOLDEN_FIXTURE_URL = new URL("../core/golden-output.json", import.meta.url);
export const GOLDEN_UPDATE_COMMAND = "npm run golden:update";
export const GOLDEN_WORDS_PER_CASE = 40;

export interface GoldenCase {
  name: string;
  seed: number;
  mode: GenerationMode;
  morphology: boolean;
}

export const GOLDEN_CASES: readonly GoldenCase[] = [
  { name: "text, morphology", seed: 1, mode: "text", morphology: true },
  { name: "text, bare", seed: 2, mode: "text", morphology: false },
  { name: "lexicon, morphology", seed: 3, mode: "lexicon", morphology: true },
  { name: "lexicon, bare", seed: 4, mode: "lexicon", morphology: false },
];

export interface GoldenWord {
  clean: string;
  hyphenated: string;
  pronunciation: string;
}

export interface GoldenCaseOutput extends GoldenCase {
  /** Draws of each stage over the case's words: word stages, and attempt stages on the first attempt. */
  stageDraws: Partial<Record<Stage, number>>;
  words: GoldenWord[];
}

export interface GoldenOutput {
  regenerate: string;
  wordsPerCase: number;
  cases: GoldenCaseOutput[];
}

function captureCase(golden: GoldenCase): GoldenCaseOutput {
  const { value, draws } = withStageDraws(() =>
    generateWords(GOLDEN_WORDS_PER_CASE, { seed: golden.seed, mode: golden.mode, morphology: golden.morphology }));
  const stageDraws: Partial<Record<Stage, number>> = {};
  for (const stage of WORD_STAGES) if (draws[stage]) stageDraws[stage] = draws[stage];
  for (const stage of ATTEMPT_STAGES) if (draws[`${stage}#0`]) stageDraws[stage] = draws[`${stage}#0`];
  const words = value.map(({ written, pronunciation }) => ({ clean: written.clean, hyphenated: written.hyphenated, pronunciation }));
  return { ...golden, stageDraws, words };
}

export function captureGoldenOutput(): GoldenOutput {
  return { regenerate: GOLDEN_UPDATE_COMMAND, wordsPerCase: GOLDEN_WORDS_PER_CASE, cases: GOLDEN_CASES.map(captureCase) };
}

/** JSON with one word per line, so fixture diffs read word by word. */
export function serializeGoldenOutput(output: GoldenOutput): string {
  const cases = output.cases.map(({ words, ...golden }) => {
    const header = JSON.stringify(golden).slice(1, -1);
    const lines = words.map(word => `        ${JSON.stringify(word)}`).join(",\n");
    return `    {${header},\n      "words": [\n${lines}\n      ]\n    }`;
  });
  return `{\n  "regenerate": ${JSON.stringify(output.regenerate)},\n  "wordsPerCase": ${output.wordsPerCase},\n  "cases": [\n${cases.join(",\n")}\n  ]\n}\n`;
}
