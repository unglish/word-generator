import type { WrittenFormConstraints } from "../../../../src/config/language.js";

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
