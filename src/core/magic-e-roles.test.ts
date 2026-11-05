import { describe, expect, it } from "vitest";
import { createGenerator, generateWords } from "../index.js";
import { englishConfig } from "../config/english.js";
import type { SpellingRule } from "../config/language.js";
import type { Word } from "../types.js";
import type { BaseSpellingTrace, SpellingCell } from "./base-spelling.js";

// The magic-e spelling rule turns a split vowel digraph into vowel + consonant
// + e (tiem → time, tyep → type). Letters alone cannot tell the vowel y of
// "type" from the consonantal y of "yet", so the rule checks which phonemes
// own the letters it matched (yet ↛ yte, slaed /slæd/ ↛ slade, yer /jɚ/ ↛ yre).

const SAMPLE = 20000;

let cached: Word[] | undefined;
function sample(): Word[] {
  return cached ??= generateWords(SAMPLE, { seed: 1304238451, mode: "lexicon", morphology: false, trace: true });
}

function segmentOf(spelling: BaseSpellingTrace, cell: SpellingCell): string {
  if (cell.origin.kind !== "selection") return "rewrite";
  return spelling.phones[spelling.units[cell.origin.unitId].phoneIds[0]].segment;
}

/** Syllables written onset /j/ as y, nucleus e, then exactly one coda consonant letter. */
function consonantalYeSyllables(word: Word): number[] {
  const choices = word.trace!.graphemeSelections;
  const syllables = new Set(choices.map(choice => choice.syllableIndex));
  return [...syllables].filter(syllable => {
    const own = choices.filter(choice => choice.syllableIndex === syllable);
    const onset = own.filter(choice => choice.position === "onset");
    const nucleus = own.find(choice => choice.position === "nucleus");
    const coda = own.filter(choice => choice.position === "coda").map(choice => choice.emitted).join("");
    return onset.at(-1)?.phoneme === "j" && onset.at(-1)?.emitted === "y"
      && nucleus?.emitted === "e" && /^[bcdfghjklmnpqrstvwxyz]$/.test(coda);
  });
}

describe("magic-e letter roles", () => {
  it("rewrites only nucleus vowel letters before a coda consonant, and still fires", () => {
    const words = sample();
    let fired = 0;
    for (const word of words) {
      const spelling = word.trace!.baseSpelling!;
      for (const edit of spelling.edits.filter(e => e.rule === "spellingRule:magic-e")) {
        fired++;
        expect(edit.input.map(cell => segmentOf(spelling, cell)), `${word.written.clean}: ${edit.before}`)
          .toEqual(["nucleus", "nucleus", "coda"]);
      }
    }
    // Split digraphs remain a regular spelling: about 3% of bare lexicon words.
    expect(fired / words.length).toBeGreaterThan(0.02);
  });

  it("leaves consonantal y + e + consonant unchanged (yet stays yet)", () => {
    let contexts = 0;
    for (const word of sample()) {
      for (const syllable of consonantalYeSyllables(word)) {
        contexts++;
        expect(word.trace!.repairs.some(r => r.rule === "spellingRule:magic-e" && r.detail === `syllable:${syllable}`),
          word.written.clean).toBe(false);
      }
    }
    // Without the role check, magic-e rewrites 95% of these.
    expect(contexts).toBeGreaterThan(10);
  });

  it("rejects letter roles outside syllable scope or on a missing capture group", () => {
    const withRule = (rule: SpellingRule) => () => createGenerator({ ...englishConfig, spellingRules: [rule] });
    const rule: SpellingRule = {
      name: "test", pattern: "(a)(e)", replacement: "$1", scope: "syllable", letterRoles: [{ group: 1, segment: "nucleus" }],
    };
    expect(withRule(rule)).not.toThrow();
    expect(withRule({ ...rule, scope: "word" })).toThrow(/require scope "syllable"/);
    expect(withRule({ ...rule, letterRoles: [{ group: 3, segment: "coda" }] })).toThrow(/missing capture group 3/);
  });

  it("rejects a role-constrained pattern whose groups do not spell the whole match", () => {
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: [{ name: "gapped", pattern: "(e)[a-z]", replacement: "$1", scope: "syllable", letterRoles: [{ group: 1, segment: "nucleus" }] }],
    });
    expect(() => { for (let seed = 0; seed < 50; seed++) generator.generateWord({ seed, morphology: false }); })
      .toThrow(/capture groups must spell the whole match/);
  });
});
