import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { Word } from "../types.js";
import { englishConfig } from "../config/english.js";
import { applyBoundaryTransforms } from "./morphology/attach.js";
import { findExample } from "../test-support/find-example.js";

// Issue #474: three rare letter-sequence slips.
// (a) A root-final double consonant plus a suffix starting with it wrote three
//     letters (melillly = ll + ly, yaffful, ownosssion). English: full + ly → fully.
// (b) cw-to-qu wrote "quu" before a u-letter vowel (squuce, dilquung).
// (c) /n/ → gn mid-word (amgny, vadgnidal); English writes gn at a word edge.

const CONSONANT_TRIPLE = /([^aeiou])\1\1/;
// Searches stop at the first hit, so a generous limit costs nothing.
const ISSUE_SEARCH = { limit: 60_000, firstSeed: 2_000_000 };

function suffixTransforms(written: string) {
  const suffix = englishConfig.morphology!.suffixes.find((s) => s.written === written);
  return suffix!.boundaryTransforms!;
}

/** Root spelled before morphology, and the planned suffix's spelling. */
function rootAndSuffix(word: Word): { base: string; suffix: string } | undefined {
  const base = word.trace!.baseSpelling?.surface;
  const suffix = word.trace!.morphology?.realization?.suffix?.resolved.written;
  return base && suffix ? { base, suffix } : undefined;
}

describe("letter-sequence slips (#474)", () => {
  it("(a) collapses a root double consonant into a same-letter suffix", () => {
    expect(applyBoundaryTransforms("full", suffixTransforms("ly"))).toBe("ful");
    expect(applyBoundaryTransforms("staff", suffixTransforms("ful"))).toBe("staf");
    expect(applyBoundaryTransforms("press", suffixTransforms("sion"))).toBe("pres");
    // A single final letter and a different suffix letter are untouched.
    expect(applyBoundaryTransforms("cool", suffixTransforms("ly"))).toBe("cool");
    expect(applyBoundaryTransforms("full", suffixTransforms("ness"))).toBe("full");

    const { word, options } = findExample((w) => {
      const parts = rootAndSuffix(w);
      return !!parts && !/[aeiou]/.test(parts.suffix[0]) && parts.base.endsWith(parts.suffix[0].repeat(2));
    }, { property: "a root double consonant before a same-letter suffix", ...ISSUE_SEARCH });
    const { base, suffix } = rootAndSuffix(word)!;
    expect(word.written.clean, base).not.toMatch(CONSONANT_TRIPLE);
    expect(word.written.clean, base).toContain(`${base.slice(0, -1)}${suffix}`);
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("(b) licenses qu for /kw/ before /u/ without doubling the u", () => {
    const { word, options } = findExample(
      (w) => w.trace!.graphemeSelections.some((g, i, choices) =>
        g.phoneme === "k" && choices[i + 1]?.phoneme === "w" && choices[i + 2]?.phoneme === "u"),
      { property: "a /kwu/ sequence", ...ISSUE_SEARCH },
    );
    expect(word.written.clean).toMatch(/qu/);
    expect(word.written.clean).not.toMatch(/kw|quu/);
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("(c) keeps /n/ gn at a word edge", () => {
    const medialGnCandidate = (w: Word) => w.trace!.graphemeSelections.find((g) =>
      g.phoneme === "n" && g.candidates.includes("gn") && g.selection?.segmentPosition === "medial");
    const { word } = findExample((w) => medialGnCandidate(w) !== undefined, {
      property: "a medial /n/ with gn in its candidate pool",
      ...ISSUE_SEARCH,
    });
    expect(medialGnCandidate(word)!.afterPosition, word.written.clean).not.toContain("gn");

    // A word-final /n/ alone in its coda keeps gn (sign); a cluster coda bans
    // it through its cluster weight (rn).
    const finalGn = (w: Word) => w.trace!.graphemeSelections.find((g, i, all) =>
      g.phoneme === "n" && g.selection?.segmentPosition === "final" && g.afterCondition.includes("gn")
      && !(all[i - 1]?.position === "coda" && all[i - 1]?.syllableIndex === g.syllableIndex));
    const { word: edge } = findExample((w) => finalGn(w) !== undefined, {
      property: "a final single-consonant /n/ coda",
      ...ISSUE_SEARCH,
    });
    expect(finalGn(edge)!.afterPosition, edge.written.clean).toContain("gn");
  });

  // A guard on a seeded stream, not the revert check for (a) or (b): at main's
  // rates this 5k stream has no triple or quu. The targeted tests above catch those.
  it("leaves no consonant triple, quu, or medial gn over a seeded sample", () => {
    let qu = 0;
    for (const word of generateWords(5_000, { seed: 474, trace: true })) {
      const written = word.written.clean;
      expect(written).not.toMatch(CONSONANT_TRIPLE);
      expect(written).not.toMatch(/quu/);
      if (written.includes("qu")) qu++;
      for (const g of word.trace!.graphemeSelections) {
        if (g.phoneme === "n" && g.selected === "gn") expect(g.selection?.segmentPosition, written).not.toBe("medial");
      }
    }
    expect(qu).toBeGreaterThan(5);
  });
});

describe("English grapheme licensing (#486)", () => {
  it("avoids stray q, pb and initial readings of /ʃ/ or /u/ over a seeded sample", () => {
    let codaKBeforeI = 0;
    let rhoticAfterW = 0;
    for (const word of generateWords(20_000, { seed: 20261121, trace: true })) {
      const written = word.written.clean;
      const choices = word.trace!.graphemeSelections;
      expect(written).not.toMatch(/q(?!u)|pb|quu/);
      expect(choices[0], written).not.toMatchObject({ phoneme: "u", selected: "ew" });
      for (const [i, choice] of choices.entries()) {
        if (choice.phoneme === "k" && choice.position === "coda" && choices[i + 1]?.phoneme === "ɪ") {
          codaKBeforeI++;
          expect(choice.candidates, written).not.toContain("q");
        }
        if (choice.phoneme === "ɚ" && choices[i - 1]?.phoneme === "w") {
          rhoticAfterW++;
          expect(choice.afterCondition, written).not.toContain("ur");
          expect(choice.afterCondition, written).not.toContain("ure");
        }
        if (choice.phoneme !== "ʃ") continue;
        if (choice.selected === "s") {
          expect(i, written).toBe(0);
          expect(choices[i + 1]?.phoneme, written).toBe("ʊ");
        }
        if (i === 0) expect(["ci", "si", "ti"], written).not.toContain(choice.selected);
      }
    }
    expect(codaKBeforeI).toBeGreaterThan(0);
    expect(rhoticAfterW).toBeGreaterThan(0);
  });
});
