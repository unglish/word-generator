/**
 * The one place exact generated output is pinned.
 *
 * `src/core/golden-output.test.ts` compares a fresh capture with the committed
 * fixture; `npm run golden:update` rewrites the fixture. Any change to RNG
 * consumption or weighting is expected to change it: review the diff and
 * regenerate deliberately.
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import { createSeededRng, generateWords } from "../index.js";
import type { GenerationMode } from "../types.js";

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
  /** RNG draws consumed by the whole batch. */
  rngDraws: number;
  words: GoldenWord[];
}

export interface GoldenOutput {
  regenerate: string;
  wordsPerCase: number;
  cases: GoldenCaseOutput[];
}

function captureCase(golden: GoldenCase): GoldenCaseOutput {
  const stream = createSeededRng(golden.seed);
  let rngDraws = 0;
  const rand = () => { rngDraws++; return stream(); };
  const words = generateWords(GOLDEN_WORDS_PER_CASE, { rand, mode: golden.mode, morphology: golden.morphology })
    .map(({ written, pronunciation }) => ({ clean: written.clean, hyphenated: written.hyphenated, pronunciation }));
  return { ...golden, rngDraws, words };
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
