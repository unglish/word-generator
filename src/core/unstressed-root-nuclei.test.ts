import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../index.js";
import { findExample } from "../test-support/find-example.js";
import type { Word } from "../types.js";

const stageName = "alternateUnstressedRootNuclei";
const alternationStage = (word: Word) => word.trace?.stages.find(stage => stage.name === stageName);

describe("unstressed lexical root edges", () => {
  it("uses the new nucleus for the base spelling and preserves its consonants", () => {
    const { word } = findExample(
      word => word.trace?.repairs.some(repair => repair.rule === "alternateUnstressedRootNucleus") ?? false,
      { property: "an alternate unstressed nucleus", limit: 120, options: { morphology: false } },
    );
    const stage = alternationStage(word)!;
    const index = stage.after.findIndex((syllable, i) => syllable.nucleus[0] !== stage.before[i].nucleus[0]);
    const before = stage.before[index];
    const after = stage.after[index];
    expect(before.stress).toBeUndefined();
    expect(after.onset).toEqual(before.onset);
    expect(after.coda).toEqual(before.coda);
    expect(after.nucleus[0]).toMatch(/^[əɪ]$/);
    const spelling = word.trace!.graphemeSelections.filter(choice =>
      choice.syllableIndex === index && choice.position === "nucleus",
    );
    expect(spelling.map(choice => choice.phoneme)).toEqual(after.nucleus);
    expect(word.lexical!.root[index].nucleus.map(phone => phone.sound)).toEqual(after.nucleus);
  });

  it("leaves an eligible final vowel alone when a suffix attaches", () => {
    const generator = createGenerator({
      ...englishConfig,
      unstressedRootNuclei: {
        mode: "lexicon",
        initial: [],
        final: [{ source: "ɚ", target: "ə", probability: 100 }],
      },
    });
    const { word } = findExample(word => {
      const stage = alternationStage(word);
      const last = stage?.before.at(-1);
      const prior = stage?.before.at(-2);
      return !!word.trace?.morphology?.suffix && !!last && !last.stress && last.nucleus[0] === "ɚ"
        && prior?.nucleus[0] !== "ə" && last.coda.length === 0;
    }, { property: "a suffix joined to an unstressed open rhotic root syllable", limit: 1_000, generator });
    expect(alternationStage(word)?.after.at(-1)?.nucleus).toEqual(["ɚ"]);
  });

  it("preserves the vowel in an unstressed rime ending in coda r", () => {
    const generator = createGenerator({
      ...englishConfig,
      unstressedRootNuclei: {
        mode: "lexicon",
        initial: [],
        final: [{ source: "əʊ", target: "ə", probability: 100 }],
        preserveCodaInitials: ["r"],
      },
    });
    const { word } = findExample(word => {
      const stage = alternationStage(word);
      const last = stage?.before.at(-1);
      return !!last && !last.stress && last.nucleus[0] === "əʊ" && last.coda[0] === "r"
        && stage?.before.at(-2)?.nucleus[0] !== "ə";
    }, { property: "an unstressed GOAT vowel before coda r", options: { morphology: false }, limit: 2_000, generator });
    expect(alternationStage(word)?.after.at(-1)?.nucleus).toEqual(["əʊ"]);
  });
});
