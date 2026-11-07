import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../../index.js";
import type { Grapheme } from "../../types.js";
import { buildGraphemeMaps, graphemes } from "./index.js";
import { withEnglishReadings } from "./reading.js";

function entry(phoneme: string, form: string): Grapheme {
  return { phoneme, form, origin: 0, frequency: 1, startWord: 1, midWord: 1, endWord: 1 };
}

function reading(phoneme: string, form: string) {
  return withEnglishReadings([entry(phoneme, form)])[0].reading;
}

function withoutReading(grapheme: Grapheme): Omit<Grapheme, "reading"> {
  const selection = { ...grapheme };
  delete selection.reading;
  return selection;
}

describe("English grapheme reading obligations", () => {
  it("explicitly classifies every inventory entry, including fallback and zero-weight entries", () => {
    expect(graphemes.length).toBeGreaterThan(150);
    for (const grapheme of graphemes) {
      expect(grapheme.reading, `${grapheme.phoneme} -> ${grapheme.form}`).toBeDefined();
      if (grapheme.reading?.kind === "unsupported-construction") {
        expect(grapheme.reading.reason.length).toBeGreaterThan(0);
      }
    }
    expect(graphemes.filter(g => g.fallbackOnly).map(g => g.reading)).toEqual([
      { kind: "single-phone" }, { kind: "single-phone" },
    ]);
    expect(graphemes.find(g => g.phoneme === "əʊ" && g.form === "ough")!.reading?.kind)
      .toBe("unsupported-construction");
  });

  it("adds only reading data and leaves source objects, ordering and selection fields intact", () => {
    const original = graphemes.map(withoutReading);
    const snapshot = structuredClone(original);
    const annotated = withEnglishReadings(original);
    expect(annotated.map(withoutReading)).toEqual(snapshot);
    expect(original).toEqual(snapshot);
    for (let index = 0; index < original.length; index++) {
      expect(annotated[index]).not.toBe(original[index]);
      expect(original[index]).not.toHaveProperty("reading");
    }
  });

  it.each([
    ["i:", "e"], ["i:", "y"], ["u", "u"], ["aɪ", "i"], ["aɪ", "y"], ["eɪ", "a"], ["əʊ", "o"],
  ])("requires open-vowel or explicit marker evidence for /%s/ -> %s", (phoneme, form) => {
    expect(reading(phoneme, form)).toEqual({ kind: "open-vowel-or-split-marker" });
  });

  it.each([
    ["j", "y"], ["ɪ", "y"], ["i:", "ea"], ["ɛ", "ea"], ["ə", "e"],
    ["θ", "th"], ["ð", "th"], ["aɪ", "ie"], ["dʒ", "dge"],
  ])("retains the whole configured unit /%s/ -> %s without a letter blacklist", (phoneme, form) => {
    expect(reading(phoneme, form)).toEqual({ kind: "single-phone" });
  });

  it("requires letters rather than phonological frontness for soft c/g", () => {
    for (const [phoneme, form] of [["s", "c"], ["s", "sc"], ["dʒ", "g"]]) {
      expect(reading(phoneme, form)).toEqual({ kind: "following-letter", require: ["e", "i", "y"] });
    }
    for (const phoneme of ["k", "g"]) {
      expect(reading(phoneme, phoneme === "k" ? "c" : "g"))
        .toEqual({ kind: "following-letter", forbid: ["e", "i", "y"] });
    }
    expect(reading("g", "gu")).toEqual({ kind: "following-letter", require: ["e", "i"] });
    expect(reading("ŋ", "n")).toEqual({ kind: "following-letter", require: ["k", "g"] });
  });

  it("keeps the exceptional Mc entry distinct from general hard c", () => {
    const candidates = graphemes.filter(g => g.phoneme === "k" && g.form === "c");
    expect(candidates).toHaveLength(2);
    expect(candidates.find(g => g.condition?.leftGraphemeContext?.includes("m"))!.reading)
      .toMatchObject({ kind: "unsupported-construction", reason: expect.stringContaining("Mc") });
    expect(candidates.find(g => !g.condition?.leftGraphemeContext)!.reading)
      .toEqual({ kind: "following-letter", forbid: ["e", "i", "y"] });
  });

  it.each([
    ["s", "ce"], ["s", "se"], ["dʒ", "ge"], ["z", "ze"], ["v", "ve"],
    ["ʒ", "g"], ["ʒ", "ge"], ["ʃ", "ci"], ["ʃ", "sc"], ["k", "ch"],
    ["ɜ", "e"], ["ɜ", "ai"], ["ɪ", "ui"], ["i:", "eo"], ["aɪ", "is"],
    ["t", "ed"], ["d", "ed"], ["k", "q"], ["v", "ph"], ["t", "th"],
  ])("does not certify an unrepresented construction /%s/ -> %s", (phoneme, form) => {
    expect(reading(phoneme, form)?.kind).toBe("unsupported-construction");
  });

  it("does not share mutable metadata between entries or repeated annotation calls", () => {
    const [first, second] = withEnglishReadings([entry("s", "c"), entry("s", "sc")]);
    if (first.reading?.kind !== "following-letter") throw new Error("Expected a letter obligation");
    first.reading.require!.push("a");
    expect(second.reading).toEqual({ kind: "following-letter", require: ["e", "i", "y"] });
    expect(reading("s", "c")).toEqual(second.reading);
    const vowel = reading("ɛ", "e")!;
    vowel.kind = "open-vowel-or-split-marker";
    expect(reading("ɛ", "e")).toEqual({ kind: "single-phone" });
  });

  it("leaves unannotated custom inventories unknown, even for familiar phone/form pairs", () => {
    const custom = entry("k", "c");
    const maps = buildGraphemeMaps([custom]);
    expect(maps.graphemeMaps.onset.get("k")![0]).toBe(custom);
    expect(custom.reading).toBeUndefined();
    expect(reading("custom", "sh")).toBeUndefined();
    expect(reading("ɛ", "custom")).toBeUndefined();
    expect(reading("constructor", "prototype")).toBeUndefined();
    expect(reading("ɛ", "constructor")).toBeUndefined();
  });

  it("keeps public generation and RNG unchanged when no reading policy consumes the metadata", () => {
    const bare = graphemes.map(withoutReading);
    const config = {
      ...englishConfig,
      writtenFormConstraints: { ...englishConfig.writtenFormConstraints, policy: undefined },
    };
    const plain = createGenerator({ ...config, graphemes: bare, ...buildGraphemeMaps(bare) });
    const annotated = createGenerator(config);
    const plainRand = createSeededRng(20261001);
    const annotatedRand = createSeededRng(20261001);
    for (let draw = 0; draw < 200; draw++) {
      const options = { morphology: draw % 2 === 0 };
      const expected = plain.generateWord({ ...options, rand: plainRand });
      const actual = annotated.generateWord({ ...options, rand: annotatedRand });
      expect(actual).toEqual(expected);
    }
    expect(annotatedRand()).toBe(plainRand());
  });
});
