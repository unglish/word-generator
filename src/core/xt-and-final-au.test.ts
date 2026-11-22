import { describe, expect, it } from "vitest";
import { generateWords } from "../index.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";

// /k s t/ with /k/ spelled c used to stay `cst` (twecst, hucst-), a trigram
// English almost never writes; English writes `xt` (next, text). And /ɑ/ could
// only be spelled `au` in a final syllable through the vowel cap deleting the
// e of `aue` (snaunt). Examples are located by property in public, traced
// output; exact words live in golden-output.json.

const SAMPLE = 20000;

function isFinalSyllableAu(word: Word): boolean {
  const last = word.syllables.length - 1;
  return word.trace!.graphemeSelections.some(selection =>
    selection.phoneme === "ɑ" && selection.selected === "au" && selection.syllableIndex === last);
}

describe("/k s t/ written xt", () => {
  it("rewrites c+s before t as x and records the rewrite", () => {
    const { word } = findExample(
      word => word.trace!.repairs.some(repair => repair.rule === "spellingRule:cst-to-xt"),
      { property: "a cst rewritten to xt", limit: 5000, options: { morphology: false } },
    );
    const repair = word.trace!.repairs.find(entry => entry.rule === "spellingRule:cst-to-xt")!;
    expect(repair.before).toMatch(/[aeiouy]cst/);
    expect(repair.after).toMatch(/[aeiouy]xt/);
    expect(word.written.clean).toContain("xt");
    const trace = word.trace!;
    const edit = trace.baseSpelling!.edits.find(entry => entry.rule === repair.rule)!;
    const absentK = trace.orthography!.graphemeUnits.find(unit => unit.phoneme === "k" && !unit.present);
    expect(absentK?.links).toContainEqual({
      kind: "repair", index: trace.repairs.indexOf(repair), label: repair.rule,
    });
    expect(repair.spellingEditIds).toContain(edit.id);
  });

  it("fuses gz to x only between vowel letters", () => {
    const { word } = findExample(
      word => word.trace!.repairs.some(repair => repair.rule === "spellingRule:gz-to-x"),
      { property: "a vowel-bounded gz rewritten to x", limit: 20_000, options: { morphology: false } },
    );
    const repair = word.trace!.repairs.find(entry => entry.rule === "spellingRule:gz-to-x")!;
    expect(repair.before).toMatch(/[aeiouy]gz[aeiouy]/);
    expect(repair.after).toMatch(/[aeiouy]x[aeiouy]/);
  });

  it("avoids unlicensed medial x and cst on generated roots", () => {
    for (const word of generateWords(SAMPLE, { seed: 20261121, trace: true })) {
      expect(word.written.clean).not.toMatch(/[^aeiouyn]x/);
      expect(word.trace!.baseSpelling!.surface).not.toMatch(/cst/);
    }
  });

  // Word rules run on the root before a suffix is attached, so a root ending in
  // cs before a t-initial suffix (snocs + tion) is not rewritten; that is rare
  // (1 in 20k text words) and outside this rule.
  it("leaves no cst in bare words", () => {
    for (const options of [{ mode: "lexicon", syllableCount: 1 }, { mode: "text" }] as const) {
      const words = generateWords(SAMPLE, { seed: 4021, morphology: false, ...options });
      expect(words.filter(word => word.written.clean.includes("cst"))).toEqual([]);
    }
  });
});

describe("/ɑ/ au in final syllables", () => {
  it("selects au for /ɑ/ in a word's final syllable", () => {
    const { word } = findExample(isFinalSyllableAu, {
      property: "/ɑ/ spelled au in the final syllable", limit: 5000, options: { morphology: false },
    });
    expect(word.written.clean).toContain("au");
  });

  it("never ends a word with the au spelling of /ɑ/", () => {
    let finalSyllableAu = 0;
    for (const word of generateWords(SAMPLE, { seed: 4022, morphology: false, trace: true })) {
      if (isFinalSyllableAu(word)) finalSyllableAu++;
      const last = word.trace!.graphemeSelections.at(-1)!;
      expect(last.phoneme === "ɑ" && last.selected === "au").toBe(false);
    }
    expect(finalSyllableAu).toBeGreaterThan(0);
  });
});
