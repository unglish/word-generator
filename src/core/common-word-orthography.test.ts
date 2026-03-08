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

function hasRepair(trace: TraceCollector, rule: string) {
  return trace.repairs.some((entry) => entry.rule === rule);
}

describe("common-word orthography coverage", () => {
  it("supports lexical exceptions for bare-final-e function words", () => {
    const cases = [
      { word: "be", onset: "b", rule: "orthographyException:be" },
      { word: "he", onset: "h", rule: "orthographyException:he" },
      { word: "me", onset: "m", rule: "orthographyException:me" },
      { word: "we", onset: "w", rule: "orthographyException:we" },
    ] as const;

    for (const { word, onset, rule } of cases) {
      const result = writeWord(
        [
          cloneGrapheme(onset, onset),
          cloneGrapheme("i:", "ee"),
        ],
        [makeSyllable([onset], ["i:"], [])],
      );

      expect(result.word.written.clean).toBe(word);
      expect(hasRepair(result.trace, rule)).toBe(true);
    }
  });

  it("supports lexical exceptions for would/could spellings", () => {
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
    expect(hasRepair(would.trace, "orthographyException:would")).toBe(true);
    expect(hasRepair(could.trace, "orthographyException:could")).toBe(true);
  });

  it("supports lexical exceptions for wh common words without broad /w/ -> wh weighting", () => {
    const which = writeWord(
      [
        cloneGrapheme("w", "w"),
        cloneGrapheme("ɪ", "i"),
        cloneGrapheme("tʃ", "ch"),
      ],
      [makeSyllable(["w"], ["ɪ"], ["tʃ"])],
    );
    const when = writeWord(
      [
        cloneGrapheme("w", "w"),
        cloneGrapheme("ɛ", "e"),
        cloneGrapheme("n", "n"),
      ],
      [makeSyllable(["w"], ["ɛ"], ["n"])],
    );
    const what = writeWord(
      [
        cloneGrapheme("w", "w"),
        cloneGrapheme("ɑ", "a"),
        cloneGrapheme("t", "t"),
      ],
      [makeSyllable(["w"], ["ɑ"], ["t"])],
    );

    expect(which.word.written.clean).toBe("which");
    expect(when.word.written.clean).toBe("when");
    expect(what.word.written.clean).toBe("what");
    expect(hasRepair(which.trace, "orthographyException:which")).toBe(true);
    expect(hasRepair(when.trace, "orthographyException:when")).toBe(true);
    expect(hasRepair(what.trace, "orthographyException:what")).toBe(true);
  });

  it("supports who via a lexical exception", () => {
    const result = writeWord(
      [
        cloneGrapheme("h", "h"),
        cloneGrapheme("u", "u"),
        cloneGrapheme("u", "oo"),
      ],
      [makeSyllable(["h"], ["u"], [])],
    );

    expect(result.word.written.clean).toBe("who");
    expect(result.trace.graphemeSelections.some((entry) => entry.phoneme === "h" && entry.selected === "h")).toBe(true);
    expect(hasRepair(result.trace, "orthographyException:who")).toBe(true);
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

  it("keeps eir limited to open final syllables", () => {
    const third = writeWord(
      [
        cloneGrapheme("ð", "th"),
        cloneGrapheme("ɚ", "eir"),
        cloneGrapheme("ɚ", "er"),
        cloneGrapheme("d", "d"),
      ],
      [makeSyllable(["ð"], ["ɚ"], ["d"])],
    );
    const thirst = writeWord(
      [
        cloneGrapheme("ð", "th"),
        cloneGrapheme("ɚ", "eir"),
        cloneGrapheme("ɚ", "er"),
        cloneGrapheme("s", "s"),
        cloneGrapheme("t", "t"),
      ],
      [makeSyllable(["ð"], ["ɚ"], ["s", "t"])],
    );

    expect(third.word.written.clean).not.toBe("theird");
    expect(thirst.word.written.clean).not.toBe("theirst");
    expect(third.trace.graphemeSelections.some((entry) => entry.phoneme === "ɚ" && entry.selected === "eir")).toBe(false);
    expect(thirst.trace.graphemeSelections.some((entry) => entry.phoneme === "ɚ" && entry.selected === "eir")).toBe(false);
  });

  it("supports lexical exceptions for short common-word spellings", () => {
    const to = writeWord(
      [
        cloneGrapheme("t", "t"),
        cloneGrapheme("u", "u"),
      ],
      [makeSyllable(["t"], ["u"], [])],
    );
    const doWord = writeWord(
      [
        cloneGrapheme("d", "d"),
        cloneGrapheme("u", "u"),
      ],
      [makeSyllable(["d"], ["u"], [])],
    );
    const you = writeWord(
      [
        cloneGrapheme("j", "y"),
        cloneGrapheme("u", "u"),
      ],
      [makeSyllable(["j"], ["u"], [])],
    );
    const any = writeWord(
      [
        cloneGrapheme("ɛ", "e"),
        cloneGrapheme("n", "n"),
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
    expect(doWord.word.written.clean).toBe("do");
    expect(you.word.written.clean).toBe("you");
    expect(any.word.written.clean).toBe("any");
    expect(people.word.written.clean).toBe("people");
    expect(any.word.written.hyphenated).toBe("a&shy;ny");
    expect(people.word.written.hyphenated).toBe("peo&shy;ple");
    expect(hasRepair(to.trace, "orthographyException:to")).toBe(true);
    expect(hasRepair(doWord.trace, "orthographyException:do")).toBe(true);
    expect(hasRepair(you.trace, "orthographyException:you")).toBe(true);
    expect(hasRepair(any.trace, "orthographyException:any")).toBe(true);
    expect(hasRepair(people.trace, "orthographyException:people")).toBe(true);
  });

  it("does not leak lexical exceptions into broader phoneme classes", () => {
    const send = writeWord(
      [
        cloneGrapheme("s", "s"),
        cloneGrapheme("ɛ", "e"),
        cloneGrapheme("n", "n"),
        cloneGrapheme("d", "d"),
      ],
      [makeSyllable(["s"], ["ɛ"], ["n", "d"])],
    );
    const stu = writeWord(
      [
        cloneGrapheme("s", "s"),
        cloneGrapheme("t", "t"),
        cloneGrapheme("u", "u"),
      ],
      [makeSyllable(["s", "t"], ["u"], [])],
    );
    const nyu = writeWord(
      [
        cloneGrapheme("n", "n"),
        cloneGrapheme("j", "y"),
        cloneGrapheme("u", "u"),
      ],
      [makeSyllable(["n", "j"], ["u"], [])],
    );

    expect(send.word.written.clean).toBe("send");
    expect(stu.word.written.clean).toBe("stu");
    expect(nyu.word.written.clean).toBe("nyu");
  });
});
