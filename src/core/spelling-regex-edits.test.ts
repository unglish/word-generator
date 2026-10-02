import { describe, expect, it } from "vitest";
import { replaceWithSpellingEdits, replaySpellingEdits } from "./spelling-regex-edits.js";

describe("executed regex spelling edits", () => {
  const patterns = [/a/g, /(a)(b)?/g, /(?<v>a)(?<tail>b)?/g, /(?<=a)b/g,
    /(?:)/g, /(?:)/gu, /a/y, /a/gy, /a/, /(?=(a))/g, /z/g];
  const inputs = ["", "a", "abaca", "baab", "😀a😀", "a\na"];
  const replacements = ["", "x", "$$", "$&", "$`", "$'", "$1", "$2", "$01", "$00",
    "$10", "$20", "$99", "$100", "$<v>", "$<missing>", "$<tail>", "$<", "$$$1-$&-$`-$'"];
  it("matches native replacement, regex state, and independent span replay", () => {
    for (const pattern of patterns) for (const input of inputs) for (const replacement of replacements) {
      for (const lastIndex of [0, 1, 3]) {
        const native = new RegExp(pattern.source, pattern.flags);
        const observed = new RegExp(pattern.source, pattern.flags);
        native.lastIndex = observed.lastIndex = lastIndex;
        const expected = input.replace(native, replacement);
        const actual = replaceWithSpellingEdits(input, observed, replacement);
        expect(actual.surface).toBe(expected);
        expect(observed.lastIndex).toBe(native.lastIndex);
        expect(replaySpellingEdits(input, actual.edits)).toBe(expected);
      }
    }
  });
  it("records physical matches when equal letters make alignment ambiguous", () => {
    const result = replaceWithSpellingEdits("aaaa", /a$/, "");
    expect(result.edits).toEqual([{ start: 3, end: 4, before: "a", after: "", captures: [] }]);
  });
  it("rejects altered spans and overlapping edit order", () => {
    const { edits } = replaceWithSpellingEdits("aba", /a/g, "x");
    expect(() => replaySpellingEdits("aba", [...edits].reverse())).toThrow();
    expect(() => replaySpellingEdits("aba", [{ ...edits[0], before: "b" }])).toThrow();
    expect(() => replaySpellingEdits("aba", [{ ...edits[0], end: 10 }])).toThrow();
  });
});
