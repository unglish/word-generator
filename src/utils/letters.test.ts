import { describe, expect, it } from "vitest";
import { isConsonantLetter, isVowelChar } from "./letters.js";

describe("contextual letter classification", () => {
  it.each(["fly", "quickly", "y", "FLY"])("counts terminal y in %s as a vowel", word => {
    const index = word.length - 1;
    expect(isVowelChar(word[index], index, word)).toBe(true);
    expect(isConsonantLetter(word[index], index, word)).toBe(false);
  });

  it.each(["yet", "yawn", "YET", "beyond"])("keeps y before a vowel consonantal in %s", word => {
    const index = word.toLowerCase().indexOf("y");
    expect(isVowelChar(word[index], index, word)).toBe(false);
    expect(isConsonantLetter(word[index], index, word)).toBe(true);
  });

  it.each(["gym", "myth"])("keeps medial vocalic y in %s", word => {
    const index = word.indexOf("y");
    expect(isVowelChar(word[index], index, word)).toBe(true);
  });

  it.each(["wet", "cow", "WET"])("keeps w consonantal in %s", word => {
    const index = word.toLowerCase().indexOf("w");
    expect(isVowelChar(word[index], index, word)).toBe(false);
    expect(isConsonantLetter(word[index], index, word)).toBe(true);
  });

  it.each([
    ["fly", 2], ["quickly", 3], ["wactsly", 4],
    ["yet", 1], ["yawn", 2], ["cow", 1], ["strengths", 5],
  ] as const)("counts the longest consonant-letter run in %s as %i", (word, expected) => {
    const mask = Array.from(word, (ch, index) => isConsonantLetter(ch, index, word) ? "C" : "V").join("");
    const runs = mask.match(/C+/g) ?? [];
    expect(Math.max(0, ...runs.map(run => run.length))).toBe(expected);
  });
});
