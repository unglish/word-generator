import { describe, expect, it, vi } from "vitest";
import { createGenerator, generateWord, generateWords, createSeededRng } from "../index.js";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import type { Grapheme, Word } from "../types.js";
import { filterByPosition } from "./write.js";
import type { GraphemeTrace } from "./trace.js";
import {
  advanceGraphemePrefix, doublingNucleusForm, INITIAL_GRAPHEME_PREFIX, rollGraphemePrefixSyllable,
} from "./grapheme-selection.js";
import { findExample } from "../test-support/find-example.js";
import { withStageDraws } from "../test-support/stage-stream-probe.js";

vi.mock("./stage-streams.js", async (original) =>
  (await import("../test-support/stage-stream-probe.js")).probeStageStreams(await original()));
import { withPhonemeWeights } from "../test-support/phoneme-weights.js";

function withGraphemes(graphemes: Grapheme[]) {
  return createGenerator({ ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes) });
}

function codaAffricateGenerator(nextOnset?: string) {
  // Make the spelling contexts frequent enough to find in a short seed range.
  return createGenerator(withPhonemeWeights(englishConfig, (phoneme) => {
    if (phoneme.sound === "dʒ") return { ...phoneme, coda: phoneme.coda! * 12 };
    if (phoneme.sound === nextOnset) return { ...phoneme, onset: phoneme.onset! * 20 };
    return phoneme;
  }));
}

function codaAffricateBefore(word: Word, sound: string, position: string, tense?: boolean): GraphemeTrace | undefined {
  return word.trace?.graphemeSelections.find((choice, index, choices) => {
    const right = choices[index + 1];
    const syllable = word.lexical?.root[choice.syllableIndex];
    return choice.phoneme === "dʒ" && choice.position === "coda"
      && right?.phoneme === sound && right.position === position
      && (tense === undefined || syllable?.nucleus[0]?.tense === tense);
  });
}

describe("legal grapheme selection", () => {
  it("rejects impossible hard conditions instead of restoring banned candidates", () => {
    const gen = withGraphemes(englishConfig.graphemes.map(g => ({
      ...g, condition: { leftContext: [] },
    })));
    expect(() => gen.generateWord({ seed: 38, morphology: false, trace: true }))
      .toThrow(/No legal grapheme.*no-conditioned-candidates/);
  });

  it("rejects zero singleton weights without privileging the final array item", () => {
    const graphemes = englishConfig.graphemes.map(g => ({ ...g, frequency: 0 }));
    for (const inventory of [graphemes, [...graphemes].reverse()]) {
      expect(() => withGraphemes(inventory).generateWord({ seed: 661, morphology: false }))
        .toThrow(/No legal grapheme.*no-positive-weights/);
    }
  });

  it("rejects invalid numerical weights at construction, even for singleton pools", () => {
    for (const frequency of [-1, NaN, Infinity]) {
      expect(() => withGraphemes(englishConfig.graphemes.map(g => ({ ...g, frequency }))))
        .toThrow(/Invalid grapheme weight/);
    }
  });

  it("does not use a fallback whose own hard condition fails", () => {
    const graphemes = englishConfig.graphemes.map(g => ({ ...g, frequency: 0 }));
    const fallbacks = englishConfig.graphemes.map(g => ({
      ...g, fallbackOnly: true, condition: { leftContext: [] },
    }));
    expect(() => withGraphemes([...graphemes, ...fallbacks]).generateWord({ seed: 661, morphology: false }))
      .toThrow(/No legal grapheme/);
  });

  it("uses a separately declared fallback and records the ordinary empty set", () => {
    const isFallback = (g: GraphemeTrace) => g.selection?.fallback !== undefined;
    const { word } = findExample(w => w.trace!.graphemeSelections.some(isFallback), {
      property: "a declared fallback spelling", limit: 20000,
    });
    const choice = word.trace!.graphemeSelections.find(isFallback)!;
    const declared = englishConfig.graphemes.find(g => g.fallbackOnly && g.phoneme === choice.phoneme && g.form === choice.selected);
    expect(declared).toBeDefined();
    expect(choice.weights).toEqual([[choice.selected, expect.any(Number)]]);
    // An ordinary pool emptied by conditions (/aɪ/ before a cluster, #470) or by position.
    const reason = choice.selection!.afterCondition === 0 ? "no-conditioned-candidates" : "no-positional-candidates";
    expect(choice.selection).toMatchObject({ afterPosition: 0, positiveCandidates: 0, fallback: reason });
  });

  it("keeps isolated-syllable licensing explicit rather than overriding edge bans", () => {
    const grapheme: Grapheme = {
      phoneme: "test", form: "x", frequency: 1,
      startWord: 0, midWord: 10, endWord: 10, positionScope: "syllable",
    };
    expect(filterByPosition([grapheme], false, true, true)).toEqual([]);
    expect(filterByPosition([{ ...grapheme, isolatedSyllableWeight: 10 }], false, true, true)).toHaveLength(1);
    expect(filterByPosition([{ ...grapheme, isolatedSyllableWeight: 0 }], false, true, true)).toEqual([]);
  });

  it.each([
    { nextSound: "b", nextPosition: "onset", left: "ɑ", form: "dg" },
    // A schwa before the /dʒ.l/ junction is rare: about one word in 1,400.
    { nextSound: "l", nextPosition: "onset", left: "ə", form: "dg", limit: 6_000 },
    { nextSound: "g", nextPosition: "onset", tense: false, form: "ge" },
    { nextSound: "g", nextPosition: "onset", tense: true, form: "ge" },
    { nextSound: "j", nextPosition: "onset", form: "j" },
    { nextSound: "ə", nextPosition: "nucleus", form: "di" },
    { nextSound: "ɚ", nextPosition: "nucleus", form: "di" },
  ])("licenses the medial $form slot for coda /dʒ/ before /$nextSound/", ({
    nextSound, nextPosition, left, tense, form, limit = 1_000,
  }) => {
    const generator = codaAffricateGenerator(nextPosition === "onset" ? nextSound : undefined);
    const locate = (word: Word) => codaAffricateBefore(word, nextSound, nextPosition, tense);
    const { word } = findExample(candidate => {
      const choice = locate(candidate);
      return !!choice && (!left || candidate.trace?.graphemeSelections[choice.index - 1]?.phoneme === left);
    }, {
      property: `a coda affricate before /${nextSound}/`,
      generator, options: { syllableCount: 2, morphology: false }, limit,
    });
    const choice = locate(word)!;
    const orthography = word.trace?.orthography;

    expect(choice.weights.length).toBeGreaterThan(1);
    expect(choice.weights.at(-1)?.[0]).toBe(form);
    expect(choice.afterCondition.includes("di")).toBe(nextPosition === "nucleus");
    expect(orthography?.chars.filter(char => char.graphemeSelectionIndex === choice.index)
      .map(char => char.char).join("")).toBe(choice.selected);
    if (nextSound === "g") {
      expect(orthography?.chars.find(char => char.graphemeSelectionIndex === choice.index + 1)?.char)
        .toBe("g");
    }
  });

  it("keeps the multiletter weight when the unstressed /dʒ/ slot offers j", () => {
    const { word } = findExample(candidate => {
      const choice = codaAffricateBefore(candidate, "j", "onset");
      return !!choice && candidate.trace?.graphemeSelections[choice.index - 1]?.phoneme === "ɪ"
        && !candidate.lexical?.root[choice.syllableIndex]?.stress;
    }, {
      property: "an unstressed KIT + coda affricate before /j/",
      generator: codaAffricateGenerator("j"),
      options: { syllableCount: 4, morphology: false }, limit: 3_000,
    });
    const choice = codaAffricateBefore(word, "j", "onset");

    expect(choice?.weights).toEqual([["ge", 6 * 0.15], ["dge", 10 * 0.15], ["j", 0.15]]);
    expect(choice?.roll).toBeGreaterThanOrEqual(0);
    expect(choice?.roll).toBeLessThan(6 * 0.15 + 10 * 0.15 + 0.15);
  });

  it("spells isolated /ɛ/ with ordinary e or ea, including before /t/, without a fallback", () => {
    const rand = createSeededRng(217);
    let beforeT = 0;
    let elsewhere = 0;
    let asE = 0;
    let asEa = 0;
    for (let draw = 0; draw < 2000; draw++) {
      const word = generateWord({ rand, syllableCount: 1, morphology: false, trace: true });
      const choices = word.trace!.graphemeSelections;
      for (let index = 0; index < choices.length; index++) {
        const choice = choices[index];
        if (choice.phoneme !== "ɛ") continue;
        if (choices[index + 1]?.phoneme === "t") beforeT++;
        else elsewhere++;
        // Real-word mono comparator licenses ~14% "ea"; both remain ordinary (non-fallback).
        expect(["e", "ea"]).toContain(choice.selected);
        expect(choice.selection?.fallback).toBeUndefined();
        if (choice.selected === "e") asE++;
        else asEa++;
      }
    }
    expect(beforeT).toBeGreaterThan(0);
    expect(elsewhere).toBeGreaterThan(0);
    expect(asE).toBeGreaterThan(asEa);
    expect(asEa).toBeGreaterThan(0);
  });

  it("writes medial coda /z/ after /g/ as z, so gz before a vowel can become x", () => {
    const words = generateWords(20000, { seed: 310, trace: true });
    const afterG: string[] = [];
    const elsewhere: string[] = [];
    let writtenX = 0;
    for (const word of words) {
      const selections = word.trace!.graphemeSelections;
      selections.forEach((selection, i) => {
        if (selection.phoneme !== "z" || selection.position !== "coda") return;
        if (selection.selection?.segmentPosition !== "medial") return;
        (selections[i - 1]?.phoneme === "g" ? afterG : elsewhere).push(selection.selected);
        const next = selections[i + 1];
        if (selections[i - 1]?.phoneme === "g" && next?.position === "nucleus" && /x/.test(word.written.clean)) writtenX++;
      });
    }
    expect(afterG.length).toBeGreaterThan(0);
    expect(new Set(afterG)).toEqual(new Set(["z"]));
    expect(elsewhere.length).toBeGreaterThan(0);
    expect(elsewhere).not.toContain("z");
    // gz-to-x applies 85% of the time, so most of these words are written with x.
    expect(writtenX).toBeGreaterThan(afterG.length / 2);
  });

  it("is deterministic and trace collection leaves output and stage draws unchanged", () => {
    for (let seed = 0; seed < 40; seed++) {
      const { value: plain, draws: plainDraws } = withStageDraws(() => generateWord({ seed, morphology: false }));
      const { value: traced, draws: tracedDraws } = withStageDraws(() => generateWord({ seed, morphology: false, trace: true }));
      expect(traced.written).toEqual(plain.written);
      expect(traced.pronunciation).toBe(plain.pronunciation);
      expect(tracedDraws, `seed ${seed}`).toEqual(plainDraws);
      expect(generateWord({ seed, morphology: false, trace: true })).toEqual(traced);
    }
  });

  it("keeps positive real weights and correct edge scopes across 10k public outputs", () => {
    const rand = createSeededRng(20260926);
    let firstSyllableCodas = 0;
    let finalSyllableOnsets = 0;
    let singletonWeightsOtherThanOne = 0;
    for (let draw = 0; draw < 10000; draw++) {
      const word = generateWord({ rand, morphology: false, trace: true });
      const choices = word.trace!.graphemeSelections;
      for (const choice of choices) {
        expect(choice.weights.length).toBeGreaterThan(0);
        expect(choice.weights.every(([, weight]) => weight > 0 && Number.isFinite(weight))).toBe(true);
        const selection = choice.selection!;
        if (choice.weights.length === 1 && choice.weights[0][1] !== 1) singletonWeightsOtherThanOne++;
        if (choice.syllableIndex === 0 && choice.position === "coda" && word.syllables.length > 1) {
          firstSyllableCodas++;
          expect(selection.segmentPosition).toBe("medial");
          expect(selection.positionScope).toBe(choice.selected === "ck" ? "syllable" : "segment");
        }
        if (choice.syllableIndex === word.syllables.length - 1 && choice.position === "onset" && word.syllables.length > 1) {
          finalSyllableOnsets++;
          expect(selection.segmentPosition).toBe("medial");
          expect(selection.positionScope).toBe("segment");
        }
      }
    }
    expect(firstSyllableCodas).toBeGreaterThan(1000);
    expect(finalSyllableOnsets).toBeGreaterThan(1000);
    expect(singletonWeightsOtherThanOne).toBeGreaterThan(1000);

    // Declared fallbacks still fire in shipping config: /ʊ/ "oo" after g, about
    // 4 in 10k bare words, and bare /aɪ/ i and /u/ u where no long spelling
    // is legal (#470). /i:/ "ee" fallbackOnly is unused (#457). Check every
    // fallback in the first 10k draws, and keep drawing past that until one
    // appears, so an output change elsewhere that shifts the RNG stream cannot
    // push the first hit out of a fixed window.
    const fallbackRand = createSeededRng(20260930);
    let fallbackChoices = 0;
    for (let draw = 0; draw < 10_000 || (fallbackChoices === 0 && draw < 100_000); draw++) {
      const word = generateWord({ rand: fallbackRand, morphology: false, trace: true });
      for (const choice of word.trace!.graphemeSelections) {
        if (!choice.selection?.fallback) continue;
        fallbackChoices++;
        expect(choice.selection.positiveCandidates).toBe(0);
        expect([["ʊ", "oo"], ["i:", "ee"], ["aɪ", "i"], ["u", "u"], ["u", "oo"]]).toContainEqual([choice.phoneme, choice.selected]);
      }
    }
    expect(fallbackChoices).toBeGreaterThan(0);
  });
});

describe("grapheme prefix state", () => {
  it("advances previous form, doubling count and nucleus, then rolls the nucleus over at a syllable boundary", () => {
    // "bat-ter": b | a | t→tt (doubled) || t | er
    let state = advanceGraphemePrefix(INITIAL_GRAPHEME_PREFIX, "onset", "b", "b", 0);
    state = advanceGraphemePrefix(state, "nucleus", "a", "a", 0);
    expect(doublingNucleusForm(state, "coda", "t")).toBe("a");
    state = advanceGraphemePrefix(state, "coda", "t", "tt", 1);
    expect(state).toEqual({ previousForm: "tt", doublingCount: 1, nucleusForm: "a", previousNucleusForm: "" });

    state = rollGraphemePrefixSyllable(state);
    expect(state).toEqual({ previousForm: "tt", doublingCount: 1, nucleusForm: "", previousNucleusForm: "a" });
    expect(doublingNucleusForm(state, "onset", "t")).toBe("a");
    expect(doublingNucleusForm(state, "nucleus", "er")).toBe("er");
  });

  it("does not mutate the state it advances", () => {
    const start = { ...INITIAL_GRAPHEME_PREFIX };
    advanceGraphemePrefix(start, "nucleus", "ee", "ee", 0);
    rollGraphemePrefixSyllable(start);
    expect(start).toEqual(INITIAL_GRAPHEME_PREFIX);
  });
});
