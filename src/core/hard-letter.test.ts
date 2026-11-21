import { describe, expect, it } from "vitest";
import type { HardLetterRespelling } from "../config/language.js";
import type { SpellingPhone } from "./base-spelling.js";
import { countDoubledLetters, createHardLetterPlanner } from "./hard-letter.js";

const HARD_C: HardLetterRespelling = {
  name: "hard-c",
  phoneme: "k",
  letter: "c",
  softBefore: ["e", "i", "y"],
  afterShortVowel: "ck",
  otherwise: "k",
  shortVowels: ["ɪ", "æ", "ʌ", "ʊ"],
};

const isCk = (phoneme: string, form: string) => phoneme === "k" && form === "ck";
const plan = createHardLetterPlanner([HARD_C], isCk);
const planFinal = createHardLetterPlanner([{
  ...HARD_C,
  rootFinal: { tails: ["s", "se"], keepAfter: ["i", "a"], keepBefore: ["t", "a", "o", "u"] },
  onlyAfterShortVowel: true,
}], isCk);

const VOWELS = ["ɪ", "æ", "ʌ", "ʊ", "ɚ", "aɪ", "i:", "eɪ", "əʊ"];

/**
 * A written root whose letters are owned as `owners` says (sound per letter,
 * "" for none). Adjacent letters with the same sound share one phone (ee, ck).
 */
function root(written: string, owners: string[], following = "", maxDoublings = 1, planner = plan, kept?: number) {
  let id = -1;
  const phones = owners.map((sound, i): SpellingPhone | undefined => sound
    ? {
      id: i > 0 && owners[i - 1] === sound ? id : (id = i),
      part: "root",
      syllableIndex: 0,
      segment: VOWELS.includes(sound) ? "nucleus" : "coda",
      segmentIndex: 0,
      soundAtSpelling: sound,
    }
    : undefined);
  return planner({ written, kept, following, sourceAt: (i) => phones[i], maxDoublings });
}

describe("hard-letter planner", () => {
  it("respells a /k/ c before e, i or y, and only that", () => {
    expect(root("tace", ["t", "æ", "k", "ə"]).map((r) => [r.index, r.after])).toEqual([[2, "ck"]]);
    expect(root("taca", ["t", "æ", "k", "ə"])).toEqual([]);
    // A c for /s/ (acid) is soft by design.
    expect(root("aci", ["æ", "s", "ɪ"])).toEqual([]);
  });

  it("checks a root-final c against the following suffix", () => {
    expect(root("tac", ["t", "æ", "k"], "ing")[0]).toMatchObject({ after: "ck", next: "i" });
    expect(root("tac", ["t", "æ", "k"], "ly")).toEqual([]);
  });

  it("writes k after a consonant, a vowel digraph or a long vowel", () => {
    expect(root("sce", ["s", "k", "i:"])[0].after).toBe("k");
    expect(root("eace", ["i:", "i:", "k", "i:"])[0].after).toBe("k");
    expect(root("ice", ["aɪ", "k", "ə"])[0].after).toBe("k");
  });

  it("writes k instead of ck when the root has no doubling left", () => {
    expect(root("tace", ["t", "æ", "k", "ə"], "", 0)[0].after).toBe("k");
    expect(countDoubledLetters("mallocker", ["ck"])).toBe(2);
    expect(countDoubledLetters("ckk", ["ck"])).toBe(1);
    // A doubled vowel letter is not a doubled consonant.
    expect(countDoubledLetters("seeck", ["ck"])).toBe(1);
    expect(root("seetace", ["s", "i:", "i:", "t", "æ", "k", "ə"])[0].after).toBe("ck");
    // A root that already has a doubled consonant takes k, not a second ck.
    expect(root("tallace", ["t", "æ", "l", "l", "æ", "k", "ə"])[0].after).toBe("k");
    // The first ck uses the root's one doubling; the second c takes k.
    expect(root("tacetace", ["t", "æ", "k", "ə", "t", "æ", "k", "ə"]).map((r) => r.after)).toEqual(["ck", "k"]);
  });

  describe("rootFinal and onlyAfterShortVowel", () => {
    const final = (written: string, owners: string[], following = "", kept?: number) =>
      root(written, owners, following, 1, planFinal, kept).map((r) => [r.after, r.reason]);

    it("respells a final c after a consonant, a digraph or another short vowel", () => {
      expect(final("desc", ["d", "ɪ", "s", "k"])).toEqual([["k", "root-final"]]);
      expect(final("seec", ["s", "i:", "i:", "k"])).toEqual([["k", "root-final"]]);
      // A digraph of a short vowel is still a digraph (book, not boock).
      expect(final("booc", ["b", "ʊ", "ʊ", "k"])).toEqual([["k", "root-final"]]);
      expect(final("tucs", ["t", "ʌ", "k", "s"])).toEqual([["ck", "root-final"]]);
    });

    it("leaves a c that is not root-final (bacon, taca)", () => {
      expect(final("bacon", ["b", "eɪ", "k", "ə", "n"])).toEqual([]);
      expect(final("taca", ["t", "æ", "k", "ə"])).toEqual([]);
    });

    it("keeps -ic/-ac, and c before -tion or an a/o/u suffix", () => {
      expect(final("panic", ["p", "æ", "n", "ɪ", "k"])).toEqual([]);
      expect(final("panics", ["p", "æ", "n", "ɪ", "k", "s"])).toEqual([]);
      expect(final("desc", ["d", "ɪ", "s", "k"], "tion")).toEqual([]);
      expect(final("desc", ["d", "ɪ", "s", "k"], "al")).toEqual([]);
      expect(final("desc", ["d", "ɪ", "s", "k"], "ly")).toEqual([["k", "root-final"]]);
    });

    it("keeps -ac/-ic after a vowel of another syllable (maniac, heroic)", () => {
      expect(final("maniac", ["m", "eɪ", "n", "i:", "æ", "k"])).toEqual([]);
      expect(final("heroic", ["h", "ɪ", "r", "əʊ", "ɪ", "k"])).toEqual([]);
    });

    it("checks the suffix, not a silent e it drops (ice + al)", () => {
      // magic-e's e, owned by the vowel; drop-silent-e removes it before -al.
      expect(final("ice", ["aɪ", "k", "aɪ"], "al", 2)).toEqual([]);
      expect(final("ice", ["aɪ", "k", "aɪ"], "al")).toEqual([["k", "soft-letter"]]);
      expect(final("ice", ["aɪ", "k", "aɪ"], "ing", 2)).toEqual([["k", "soft-letter"]]);
    });

    it("respells ck that does not follow a short single vowel letter", () => {
      expect(final("yarck", ["j", "ɚ", "ɚ", "k", "k"])).toEqual([["k", "not-after-short-vowel"]]);
      expect(final("tuck", ["t", "ʌ", "k", "k"])).toEqual([]);
    });
  });
});
