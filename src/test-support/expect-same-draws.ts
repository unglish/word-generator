/**
 * The check that a change draws nothing (#556): the same words, and the same
 * draws in every stage stream. See CONTRIBUTING.md, "Compare stage draws, not
 * caller draws".
 *
 * Not part of the published build (excluded in tsconfig.json).
 */
import { expect } from "vitest";
import type { Word } from "../types.js";
import { withStageDraws } from "./stage-stream-probe.js";

function withoutTrace(word: Word): Word {
  const copy = { ...word };
  delete copy.trace;
  return copy;
}

/**
 * Generate a word with and without a change, and require identical words and
 * identical draw counts in every stage stream. The traces are compared only
 * when both words have one, so a traced word can be checked against an
 * untraced one. Returns both words.
 */
export function expectSameWordsAndDraws(changed: () => Word, unchanged: () => Word, label: string): [Word, Word] {
  const a = withStageDraws(changed);
  const b = withStageDraws(unchanged);
  const compareTraces = a.value.trace !== undefined && b.value.trace !== undefined;
  expect(compareTraces ? a.value : withoutTrace(a.value), label).toEqual(compareTraces ? b.value : withoutTrace(b.value));
  expect(a.draws, label).toEqual(b.draws);
  return [a.value, b.value];
}
