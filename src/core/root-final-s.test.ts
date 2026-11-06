import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import type { GraphemeTrace } from "./trace.js";

// Issue #389: a word-final /s/ after /r n l ɚ/ spelled with a bare s reads as a
// plural (cars, pens, bells). English writes -nce/-nse, -lse, -rse/-rce (dance,
// sense, false, horse, force). Examples are located by property in public,
// traced output; exact words live in golden-output.json.

const SAMPLE = 20000;
const PLURAL_LOOKING_LEFT_SOUNDS = new Set(["r", "n", "l", "ɚ"]);

interface FinalS {
  s: GraphemeTrace;
  left: GraphemeTrace;
}

/** The root's last grapheme choice when it is /s/ after r, n, l or ɚ written with r, n or l. */
function finalSAfterSonorant(word: Word): FinalS | undefined {
  const selections = word.trace!.graphemeSelections;
  const s = selections.at(-1);
  const left = selections.at(-2);
  if (s?.phoneme !== "s" || s.selection?.segmentPosition !== "final" || !left) return undefined;
  if (!PLURAL_LOOKING_LEFT_SOUNDS.has(left.phoneme) || !/[rnl]$/.test(left.emitted)) return undefined;
  return { s, left };
}

function hasSuffix(word: Word): boolean {
  return Boolean(word.trace!.morphology?.suffix);
}

function bareWeightShare(s: GraphemeTrace): number {
  const total = s.weights.reduce((sum, [, weight]) => sum + weight, 0);
  const bare = s.weights.filter(([form]) => form === "s").reduce((sum, [, weight]) => sum + weight, 0);
  return bare / total;
}

describe("word-final /s/ after r, n, l (#389)", () => {
  it("spells a word-final /s/ after r, n, l or ɚ with a final e, and reproduces it from its seed", () => {
    const seed = Array.from({ length: 5000 }, (_, i) => i).find(candidate => {
      const word = generateWord({ seed: candidate, morphology: false, trace: true });
      const found = finalSAfterSonorant(word);
      return found && found.s.selected !== "s";
    });
    expect(seed).toBeDefined();

    const word = generateWord({ seed, morphology: false, trace: true });
    const { s, left } = finalSAfterSonorant(word)!;
    expect(["ce", "se"]).toContain(s.selected);
    expect(word.written.clean).toMatch(/[rnl][cs]e$/);
    expect(word.written.clean.endsWith(left.emitted + s.emitted)).toBe(true);
    // Bare s is still a candidate, with a small share of the weight.
    expect(s.afterPosition).toContain("s");
    expect(bareWeightShare(s)).toBeLessThan(0.15);

    const again = generateWord({ seed, morphology: false, trace: true });
    expect(again.written.clean).toBe(word.written.clean);
    expect(again.trace!.graphemeSelections).toEqual(word.trace!.graphemeSelections);
  });

  it("makes -nce/-nse, -lse and -rse/-rce the usual spelling, and keeps bare -s after vowels", () => {
    const byLeft = new Map<string, Map<string, number>>();
    let targets = 0;
    let bare = 0;
    let afterVowel = 0;
    let afterVowelBare = 0;
    for (const word of generateWords(SAMPLE, { seed: 389, morphology: false, trace: true })) {
      const found = finalSAfterSonorant(word);
      if (found) {
        targets++;
        if (/[rnl]s$/.test(word.written.clean)) bare++;
        const counts = byLeft.get(found.left.phoneme) ?? new Map<string, number>();
        counts.set(found.s.selected, (counts.get(found.s.selected) ?? 0) + 1);
        byLeft.set(found.left.phoneme, counts);
        continue;
      }
      const selections = word.trace!.graphemeSelections;
      const last = selections.at(-1);
      if (last?.phoneme === "s" && selections.at(-2)?.position === "nucleus" && /[aeiou]$/.test(selections.at(-2)!.emitted)) {
        afterVowel++;
        if (last.selected === "s") afterVowelBare++;
      }
    }
    expect(targets).toBeGreaterThan(300);
    // About 87% bare on main before #389; the residue now comes mostly from
    // unstressed syllables, where multi-letter spellings are down-weighted.
    expect(bare / targets).toBeLessThan(0.12);
    const count = (left: string, form: string) => byLeft.get(left)?.get(form) ?? 0;
    expect(count("n", "ce")).toBeGreaterThan(count("n", "se"));
    expect(count("n", "se")).toBeGreaterThan(0);
    expect(count("l", "ce")).toBe(0);
    expect(count("l", "se")).toBeGreaterThan(0);
    expect(count("r", "se") + count("ɚ", "se")).toBeGreaterThan(count("r", "ce") + count("ɚ", "ce"));
    expect(count("r", "ce") + count("ɚ", "ce")).toBeGreaterThan(0);
    // bus, gas, atlas: after a vowel letter bare s stays the usual spelling.
    expect(afterVowel).toBeGreaterThan(300);
    expect(afterVowelBare / afterVowel).toBeGreaterThan(0.6);
  });

  it("leaves a root-final /s/ before a suffix, and the suffix's own s, to the ordinary weights", () => {
    let suffixed = 0;
    let pluralAfterSonorant = 0;
    for (const word of generateWords(SAMPLE, { seed: 3890, morphology: true, trace: true })) {
      const realization = word.trace!.morphology?.realization;
      const suffix = realization?.emittedParts.find(part => part.role === "suffix")?.text;
      const root = realization?.emittedParts.find(part => part.role === "root")?.text;
      if (suffix === "s" && root && /[rnl]$/.test(root)) {
        // pens, cars, bells: the inflection itself stays a bare s.
        pluralAfterSonorant++;
        expect(word.written.clean.endsWith(root + "s")).toBe(true);
      }
      const found = finalSAfterSonorant(word);
      if (!found || !hasSuffix(word)) continue;
      suffixed++;
      expect(found.s.weights).toContainEqual(["s", 1000]);
    }
    expect(suffixed).toBeGreaterThan(100);
    expect(pluralAfterSonorant).toBeGreaterThan(100);
  });

  it("does not add a magic-e marker after a coda spelling that already ends in e", () => {
    let codaE = 0;
    for (const word of generateWords(SAMPLE, { seed: 38900, morphology: false, trace: true })) {
      const last = word.trace!.graphemeSelections.at(-1);
      if (last?.position !== "coda" || !last.emitted.endsWith("e")) continue;
      codaE++;
      // pace, false, horse; not pacee, falsee, horsee.
      expect(word.written.clean).not.toMatch(/ee$/);
    }
    expect(codaE).toBeGreaterThan(500);
  });
});
