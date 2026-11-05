import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, generateWords } from "../index.js";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import type { Word } from "../types.js";
import type { GraphemeTrace } from "./trace.js";

// Issue #381: English does not write "ea" before a doubled consonant (no
// "headd") or before another vowel letter (no "pleaed"). Examples are located
// by property in public, traced output; exact words live in golden-output.json.

const SAMPLE = 20000;

function isDoubledSpelling(form: string): boolean {
  return form === "ck" || (form.length >= 2 && form[0] === form[1] && !/[aeiouy]/.test(form[0]));
}

/** Consonant choices written directly after an `ea` nucleus. */
function consonantsAfterEa(word: Word): GraphemeTrace[] {
  const selections = word.trace!.graphemeSelections;
  return selections.filter((selection, i) =>
    selection.position !== "nucleus" && selections[i - 1]?.position === "nucleus" && selections[i - 1].selected === "ea");
}

/** The root's last grapheme choice, when the root ends in a vowel and a vowel-initial suffix follows. */
function rootFinalVowelBeforeVowelSuffix(word: Word): GraphemeTrace | undefined {
  const suffix = word.trace!.morphology?.realization?.emittedParts.find(part => part.role === "suffix")?.text;
  const last = word.trace!.graphemeSelections.at(-1);
  return suffix && /^[aeiou]/.test(suffix) && last?.position === "nucleus" ? last : undefined;
}

function sample(seed: number): Word[] {
  return generateWords(SAMPLE, { seed, morphology: true, trace: true });
}

describe("ea spelling context (#381)", () => {
  it("never doubles a consonant, or chooses a doubled spelling, directly after ea", () => {
    let contexts = 0;
    let blockedDoublings = 0;
    for (const word of sample(381)) {
      for (const consonant of consonantsAfterEa(word)) {
        contexts++;
        expect(consonant.doubled).toBe(false);
        expect(isDoubledSpelling(consonant.selected)).toBe(false);
        expect(consonant.selection?.preferenceRelaxed).toBeUndefined();
        if (consonant.doubling?.reason === "never-double-after") blockedDoublings++;
      }
    }
    expect(contexts).toBeGreaterThan(1000);
    // The rule is exercised, not merely vacuous: these would have been doubling rolls.
    expect(blockedDoublings).toBeGreaterThan(100);
  });

  it("does not end a root in ea before a vowel-initial suffix", () => {
    const finals = new Map<string, number>();
    for (const word of sample(3810)) {
      const last = rootFinalVowelBeforeVowelSuffix(word);
      if (!last || (last.phoneme !== "i:" && last.phoneme !== "ɛ")) continue;
      expect(last.selected).not.toBe("ea");
      finals.set(last.phoneme, (finals.get(last.phoneme) ?? 0) + 1);
    }
    expect(finals.get("i:")).toBeGreaterThan(50);
    expect(finals.get("ɛ")).toBeGreaterThan(50);
  });

  it("spells a one-syllable root ending in /i:/ before a vowel suffix with the declared ee fallback", () => {
    let fallbacks = 0;
    for (const word of sample(38100)) {
      const last = rootFinalVowelBeforeVowelSuffix(word);
      if (!last || last.phoneme !== "i:" || last.syllableIndex !== 0) continue;
      // "ea" is the only ordinary isolated /i:/ spelling; without the fallback this throws.
      fallbacks++;
      expect(last.afterCondition).not.toContain("ea");
      expect(last).toMatchObject({
        selected: "ee",
        afterPosition: [],
        selection: { positiveCandidates: 0, fallback: "no-positional-candidates" },
      });
    }
    expect(fallbacks).toBeGreaterThan(5);
  });

  it("would leave that root unspellable without the fallback, and generation throws", () => {
    const graphemes = englishConfig.graphemes.filter(g => !(g.fallbackOnly && g.phoneme === "i:"));
    const generator = createGenerator({ ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes) });
    const rand = createSeededRng(38100);
    expect(() => { for (let draw = 0; draw < SAMPLE; draw++) generator.generateWord({ rand, morphology: true }); })
      .toThrow(/No legal grapheme for \/i:\/.*no-positional-candidates/);
  });

  it("keeps ea in use for /ɛ/ and /i:/ where it is allowed", () => {
    const counts = { "ɛ": { ea: 0, all: 0 }, "i:": { ea: 0, all: 0 } };
    for (const word of sample(7)) {
      for (const selection of word.trace!.graphemeSelections) {
        if (selection.position !== "nucleus" || !(selection.phoneme in counts)) continue;
        const count = counts[selection.phoneme as keyof typeof counts];
        count.all++;
        if (selection.selected === "ea") count.ea++;
      }
    }
    // On this sample ea is 18.85% of /ɛ/ and 24.18% of /i:/ nucleus choices
    // before the ban, 18.46% and 23.19% after: only the banned contexts move.
    expect(counts["ɛ"].ea / counts["ɛ"].all).toBeGreaterThan(0.17);
    expect(counts["i:"].ea / counts["i:"].all).toBeGreaterThan(0.2);
  });

  it("is configured, not hard-coded: an empty neverDoubleAfter restores doubling after ea", () => {
    const generator = createGenerator({
      ...englishConfig,
      doubling: { ...englishConfig.doubling!, neverDoubleAfter: [] },
    });
    const rand = createSeededRng(381);
    let doubled = 0;
    for (let draw = 0; draw < 5000; draw++) {
      const word = generator.generateWord({ rand, morphology: false, trace: true });
      doubled += consonantsAfterEa(word).filter(consonant => consonant.doubled).length;
    }
    expect(doubled).toBeGreaterThan(0);
  });

  it("is deterministic for a fixed seed", () => {
    const first = generateWords(500, { seed: 381, morphology: true }).map(word => word.written.clean);
    const second = generateWords(500, { seed: 381, morphology: true }).map(word => word.written.clean);
    expect(second).toEqual(first);
  });
});
