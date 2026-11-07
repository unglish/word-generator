// Test oracle for src/core/spelling-budget.test.ts: the pre-#331 quadratic
// budget scan and the enumerated measurement cases it is compared on.
import type { WrittenFormConstraints } from "../config/language.js";
import type { SpellingBudgetKey, SpellingBudgetMeasurement, SpellingBudgetValues } from "../core/spelling-coverage-types.js";
import { isConsonantToken, tokenizeGraphemes } from "../core/spelling-budget.js";
import { isVowelChar, isConsonantLetter } from "../utils/letters.js";

/** The original scan: re-joins the token list for every token's right context. */
export function referenceSpellingBudgets(surface: string, constraints: WrittenFormConstraints | undefined): SpellingBudgetMeasurement {
  const values: SpellingBudgetValues = { consonantGraphemes: 0, consonantLetters: 0, finalConsonantLetters: 0, vowelLetters: 0 };
  let consonants = 0;
  let vowels = 0;
  for (let i = 0; i < surface.length; i++) {
    consonants = isConsonantLetter(surface[i], i, surface) ? consonants + 1 : 0;
    vowels = isVowelChar(surface[i], i, surface) ? vowels + 1 : 0;
    values.consonantLetters = Math.max(values.consonantLetters, consonants);
    values.vowelLetters = Math.max(values.vowelLetters, vowels);
  }
  values.finalConsonantLetters = consonants;
  const tokens = tokenizeGraphemes(surface, constraints?.consonantGraphemes);
  let tokenRun = 0;
  for (let i = 0; i < tokens.length; i++) {
    tokenRun = isConsonantToken(tokens[i], i, tokens) ? tokenRun + 1 : 0;
    values.consonantGraphemes = Math.max(values.consonantGraphemes, tokenRun);
  }
  const limits: Partial<SpellingBudgetValues> = {};
  const configured: Array<[SpellingBudgetKey, number | undefined]> = [
    ["consonantGraphemes", constraints?.maxConsonantGraphemes],
    ["consonantLetters", constraints?.maxConsonantLetters],
    ["finalConsonantLetters", constraints?.maxFinalConsonantLetters],
    ["vowelLetters", constraints?.maxVowelLetters],
  ];
  for (const [key, value] of configured) if (value) limits[key] = value;
  return { values, limits, exceeded: configured.filter(([key, limit]) => !!limit && values[key] > limit).map(([key]) => key) };
}


export interface MeasurementCase {
  label: string;
  surface: string;
  constraints: WrittenFormConstraints | undefined;
}

export const alphabet = ["a", "A", "y", "Y", "t", "h", "b", "!", "\uD83D", "\uDE00"];
export const tokenLists: Array<string[] | undefined> = [
  undefined, [], ["th", "t"], ["t", "th"], ["ya", "y"], ["y", "ya"],
  ["Th", "TH", "th"], ["a", "yh", "!"], ["\uD83D\uDE00", "\uD83D"], ["\uD83D", "\uD83D\uDE00"],
];
export const limitKeys = ["maxConsonantGraphemes", "maxConsonantLetters", "maxFinalConsonantLetters", "maxVowelLetters"] as const;
export const limitValues = [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1];
export const witnesses = ["", "strengths", "twelfths", "tchyath", "ThYATH", "yay", "\uD83D\uDE00ya", "Y", "aya", "bth", "y!", "\uD83D\uDE00y"];

function allLimits(value: number | undefined): WrittenFormConstraints {
  return { maxConsonantGraphemes: value, maxConsonantLetters: value, maxFinalConsonantLetters: value, maxVowelLetters: value };
}

/** Enumerate by code-unit length, preserving the preregistered alphabet order. */
export function* measurementCases(): Generator<MeasurementCase> {
  const gridConstraints: Array<WrittenFormConstraints | undefined> = [undefined, {}];
  for (const consonantGraphemes of tokenLists) {
    gridConstraints.push({ ...allLimits(1), consonantGraphemes });
    gridConstraints.push({ maxConsonantGraphemes: 3, maxConsonantLetters: 4, maxFinalConsonantLetters: 3, maxVowelLetters: 2, consonantGraphemes });
  }
  let level = [""];
  for (let length = 0; length <= 4; length++) {
    for (const surface of level) for (const [index, constraints] of gridConstraints.entries()) {
      yield { label: `grid/${length}/${index}`, surface, constraints };
    }
    if (length < 4) level = level.flatMap(prefix => alphabet.map(unit => prefix + unit));
  }
  for (const [listIndex, consonantGraphemes] of tokenLists.entries()) {
    for (const [valueIndex, value] of limitValues.entries()) {
      const limits = [...limitKeys.map(key => ({ [key]: value })), allLimits(value)];
      for (const [limitIndex, configured] of limits.entries()) for (const surface of witnesses) {
        yield { label: `limits/${listIndex}/${valueIndex}/${limitIndex}`, surface, constraints: { ...configured, consonantGraphemes } };
      }
    }
  }
}
