// Frozen 9734067 spelling-budget.ts; only import paths are relocated.
import type { WrittenFormConstraints } from "../../../../src/config/language.js";
import type { SpellingBudgetKey, SpellingBudgetMeasurement, SpellingBudgetValues } from "../../../../src/core/spelling-coverage-types.js";
import { isVowelChar, isConsonantLetter } from "../../../../src/utils/letters.js";

/** Default English consonant graphemes (longest first for greedy matching). */
export const DEFAULT_CONSONANT_GRAPHEMES = ["tch", "dge", "ch", "sh", "th", "ng", "ph", "wh", "ck"];

/**
 * Tokenize a string into grapheme units using longest-match-first.
 * Multi-letter consonant graphemes (e.g. "tch", "ch", "sh") are treated as
 * atomic units. Remaining characters become single-letter tokens.
 *
 * @example tokenizeGraphemes("tchwng") → ["tch", "w", "ng"]
 * @example tokenizeGraphemes("strengths") → ["s", "t", "r", "e", "ng", "th", "s"]
 */
export function tokenizeGraphemes(str: string, graphemeList: string[] = DEFAULT_CONSONANT_GRAPHEMES): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < str.length) {
    let matched = false;
    // Try longest graphemes first (list is pre-sorted longest first)
    for (const g of graphemeList) {
      if (str.startsWith(g, i)) {
        tokens.push(g);
        i += g.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(str[i]);
      i++;
    }
  }
  return tokens;
}

/** Check if a grapheme token is a consonant (contains no vowel letters). */
export function isConsonantToken(token: string, tokenIdx?: number, allTokens?: string[]): boolean {
  const fullStr = allTokens ? allTokens.join("") : token;
  // Compute char offset of this token within the full string
  let charOffset = 0;
  if (allTokens && tokenIdx !== undefined) {
    for (let t = 0; t < tokenIdx; t++) charOffset += allTokens[t].length;
  }
  for (let i = 0; i < token.length; i++) {
    if (isVowelChar(token[i], charOffset + i, fullStr)) return false;
  }
  return true;
}

/** Measure every configured preference on the complete proposed surface. */
export function measureSpellingBudgets(surface: string, constraints: WrittenFormConstraints | undefined): SpellingBudgetMeasurement {
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
