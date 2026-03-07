import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { createWrittenFormGenerator } from "./write.js";
import { TraceCollector } from "./trace.js";
import type { Grapheme, Phoneme, Syllable, WordGenerationContext } from "../types.js";

function clonePhoneme(sound: string): Phoneme {
  const phoneme = englishConfig.phonemes.find((entry) => entry.sound === sound);
  if (!phoneme) {
    throw new Error(`Missing phoneme "${sound}" in englishConfig`);
  }
  return { ...phoneme };
}

function cloneGrapheme(
  phoneme: string,
  form: string,
  predicate?: (entry: Grapheme) => boolean,
): Grapheme {
  const grapheme = englishConfig.graphemes.find((entry) =>
    entry.phoneme === phoneme
    && entry.form === form
    && (predicate ? predicate(entry) : true)
  );
  if (!grapheme) {
    throw new Error(`Missing grapheme ${phoneme}>${form} in englishConfig`);
  }
  return {
    ...grapheme,
    condition: grapheme.condition ? JSON.parse(JSON.stringify(grapheme.condition)) : undefined,
  };
}

function makeSyllable(onset: string[], nucleus: string[], coda: string[]): Syllable {
  return {
    onset: onset.map(clonePhoneme),
    nucleus: nucleus.map(clonePhoneme),
    coda: coda.map(clonePhoneme),
  };
}

function makeScopedConfig(graphemes: Grapheme[]) {
  return {
    ...englishConfig,
    graphemes,
    graphemeMaps: buildGraphemeMaps(graphemes).graphemeMaps,
  };
}

function writeWord(graphemes: Grapheme[], syllables: Syllable[], rand = () => 0) {
  const config = makeScopedConfig(graphemes);
  const trace = new TraceCollector();
  const context: WordGenerationContext = {
    rand,
    trace,
    syllableCount: syllables.length,
    currSyllableIndex: 0,
    word: {
      syllables,
      pronunciation: "",
      written: { clean: "", hyphenated: "" },
    },
  };
  createWrittenFormGenerator(config)(context);
  return {
    word: context.word,
    trace,
  };
}

describe("common-word orthography coverage", () => {
  it("supports targeted bare-final-e /i:/ outputs", () => {
    const result = writeWord(
      [
        cloneGrapheme("b", "b"),
        cloneGrapheme("i:", "e", (entry) => entry.condition?.leftContext?.includes("b")),
        cloneGrapheme("i:", "ee"),
      ],
      [makeSyllable(["b"], ["i:"], [])],
    );

    expect(result.word.written.clean).toBe("be");
    expect(result.trace.graphemeSelections.some((entry) => entry.phoneme === "i:" && entry.selected === "e")).toBe(true);
  });

  it("applies the ould repair to would/could class outputs", () => {
    const would = writeWord(
      [
        cloneGrapheme("w", "w"),
        cloneGrapheme("ʊ", "ou"),
        cloneGrapheme("d", "d"),
      ],
      [makeSyllable(["w"], ["ʊ"], ["d"])],
    );
    const could = writeWord(
      [
        cloneGrapheme("k", "c"),
        cloneGrapheme("ʊ", "ou"),
        cloneGrapheme("d", "d"),
      ],
      [makeSyllable(["k"], ["ʊ"], ["d"])],
    );

    expect(would.word.written.clean).toBe("would");
    expect(could.word.written.clean).toBe("could");
    expect(would.trace.repairs.some((entry) => entry.rule === "spellingRule:oud-to-ould")).toBe(true);
    expect(could.trace.repairs.some((entry) => entry.rule === "spellingRule:oud-to-ould")).toBe(true);
  });

  it("keeps /w/ -> wh available for which-style words", () => {
    const result = writeWord(
      [
        cloneGrapheme("w", "wh", (entry) => entry.condition?.rightContext?.includes("ɪ")),
        cloneGrapheme("w", "w"),
        cloneGrapheme("ɪ", "i"),
        cloneGrapheme("tʃ", "ch"),
      ],
      [makeSyllable(["w"], ["ɪ"], ["tʃ"])],
    );

    expect(result.word.written.clean).toBe("which");
    expect(result.trace.graphemeSelections.some((entry) => entry.phoneme === "w" && entry.selected === "wh")).toBe(true);
  });

  it("supports who via the split wh-for-/h/ path plus spelling repair", () => {
    const result = writeWord(
      [
        cloneGrapheme("h", "wh"),
        cloneGrapheme("h", "h"),
        cloneGrapheme("u", "u"),
        cloneGrapheme("u", "oo"),
      ],
      [makeSyllable(["h"], ["u"], [])],
    );

    expect(result.word.written.clean).toBe("who");
    expect(result.trace.graphemeSelections.some((entry) => entry.phoneme === "h" && entry.selected === "wh")).toBe(true);
    expect(result.trace.repairs.some((entry) => entry.rule === "spellingRule:whu-to-who")).toBe(true);
  });

  it("supports the new rhotic spellings for their/first classes", () => {
    const their = writeWord(
      [
        cloneGrapheme("ð", "th"),
        cloneGrapheme("ɚ", "eir"),
        cloneGrapheme("ɚ", "er"),
      ],
      [makeSyllable(["ð"], ["ɚ"], [])],
    );
    const first = writeWord(
      [
        cloneGrapheme("f", "f"),
        cloneGrapheme("ɚ", "ir"),
        cloneGrapheme("ɚ", "er"),
        cloneGrapheme("s", "s"),
        cloneGrapheme("t", "t"),
      ],
      [makeSyllable(["f"], ["ɚ"], ["s", "t"])],
    );

    expect(their.word.written.clean).toBe("their");
    expect(first.word.written.clean).toBe("first");
    expect(their.trace.graphemeSelections.some((entry) => entry.phoneme === "ɚ" && entry.selected === "eir")).toBe(true);
    expect(first.trace.graphemeSelections.some((entry) => entry.phoneme === "ɚ" && entry.selected === "ir")).toBe(true);
  });

  it("supports the targeted high-vowel, any, and people orthography classes", () => {
    const to = writeWord(
      [
        cloneGrapheme("t", "t"),
        cloneGrapheme("u", "o", (entry) => entry.condition?.leftContext?.includes("t")),
        cloneGrapheme("u", "u"),
      ],
      [makeSyllable(["t"], ["u"], [])],
    );
    const you = writeWord(
      [
        cloneGrapheme("j", "y"),
        cloneGrapheme("u", "ou", (entry) => entry.condition?.leftContext?.includes("j")),
        cloneGrapheme("u", "u"),
      ],
      [makeSyllable(["j"], ["u"], [])],
    );
    const any = writeWord(
      [
        cloneGrapheme("ɛ", "a", (entry) => entry.condition?.rightContext?.includes("n")),
        cloneGrapheme("ɛ", "e"),
        cloneGrapheme("n", "n"),
        cloneGrapheme("i:", "y"),
        cloneGrapheme("i:", "ee"),
      ],
      [
        makeSyllable([], ["ɛ"], []),
        makeSyllable(["n"], ["i:"], []),
      ],
    );
    const people = writeWord(
      [
        cloneGrapheme("p", "p"),
        cloneGrapheme("i:", "eo"),
        cloneGrapheme("i:", "ee"),
        cloneGrapheme("ə", "u"),
        cloneGrapheme("l", "l"),
      ],
      [
        makeSyllable(["p"], ["i:"], []),
        makeSyllable(["p"], ["ə"], ["l"]),
      ],
    );

    expect(to.word.written.clean).toBe("to");
    expect(you.word.written.clean).toBe("you");
    expect(any.word.written.clean).toBe("any");
    expect(people.word.written.clean).toBe("people");
    expect(to.trace.graphemeSelections.some((entry) => entry.phoneme === "u" && entry.selected === "o")).toBe(true);
    expect(you.trace.graphemeSelections.some((entry) => entry.phoneme === "u" && entry.selected === "ou")).toBe(true);
    expect(any.trace.graphemeSelections.some((entry) => entry.phoneme === "ɛ" && entry.selected === "a")).toBe(true);
    expect(people.trace.repairs.some((entry) => entry.rule === "spellingRule:eopVowel-l-to-eople")).toBe(true);
  });
});
