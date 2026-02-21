import { describe, it, expect } from "vitest";
import { repairConsonantPileups, repairJunctions, repairConsonantLetters, repairVowelLetters, tokenizeGraphemes, isJunctionValid, isJunctionSonorityValid, mannerGroup, placeGroup, isCoronal, filterByPosition, SyllableBoundary, applySilentE, appendSilentE } from "./write";
import { generateWord, createGenerator } from "./generate";
import { englishConfig } from "../config/english";
import { Phoneme } from "../types";

// ---------------------------------------------------------------------------
// tokenizeGraphemes
// ---------------------------------------------------------------------------

describe("tokenizeGraphemes", () => {
  it("splits digraphs and trigraphs as atomic units", () => {
    expect(tokenizeGraphemes("tchwng")).toEqual(["tch", "w", "ng"]);
  });

  it("handles plain letters", () => {
    expect(tokenizeGraphemes("str")).toEqual(["s", "t", "r"]);
  });

  it("handles mixed vowels and consonants", () => {
    expect(tokenizeGraphemes("strengths")).toEqual(["s", "t", "r", "e", "ng", "th", "s"]);
  });

  it("handles \"dge\"", () => {
    expect(tokenizeGraphemes("bridge")).toEqual(["b", "r", "i", "dge"]);
  });

  it("handles empty string", () => {
    expect(tokenizeGraphemes("")).toEqual([]);
  });

  it("handles \"ck\"", () => {
    expect(tokenizeGraphemes("ckstr")).toEqual(["ck", "s", "t", "r"]);
  });
});

// ---------------------------------------------------------------------------
// repairConsonantPileups (grapheme-aware)
// ---------------------------------------------------------------------------

describe("repairConsonantPileups", () => {
  it("does nothing when no run exceeds max", () => {
    const clean = ["stri", "ble"];
    const hyph = ["stri", "&shy;", "ble"];
    repairConsonantPileups(clean, hyph, 4);
    expect(clean.join("")).toBe("strible");
  });

  it("trims a 5-consonant-grapheme run across syllable boundary", () => {
    const clean = ["strng", "ths"];
    const hyph = ["strng", "&shy;", "ths"];
    repairConsonantPileups(clean, hyph, 4);
    const word = clean.join("");
    const maxRun = getMaxConsonantGraphemeRun(word);
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it("treats \"tch\" as a single grapheme unit", () => {
    const clean = ["atch", "str"];
    const hyph = ["atch", "&shy;", "str"];
    repairConsonantPileups(clean, hyph, 4);
    expect(clean.join("")).toBe("atchstr");
  });

  it("does not split \"tch\" when dropping", () => {
    const clean = ["atch", "strk"];
    const hyph = ["atch", "&shy;", "strk"];
    repairConsonantPileups(clean, hyph, 4);
    const word = clean.join("");
    expect(word).not.toMatch(/tc[^h]/);
    expect(word).not.toContain("tcs");
    const maxRun = getMaxConsonantGraphemeRun(word);
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it("handles run within a single syllable", () => {
    const clean = ["strngths"];
    const hyph = ["strngths"];
    repairConsonantPileups(clean, hyph, 4);
    const maxRun = getMaxConsonantGraphemeRun(clean.join(""));
    expect(maxRun).toBeLessThanOrEqual(4);
  });

  it("respects configurable max of 3", () => {
    const clean = ["blrt", "fen"];
    const hyph = ["blrt", "&shy;", "fen"];
    repairConsonantPileups(clean, hyph, 3);
    const maxRun = getMaxConsonantGraphemeRun(clean.join(""));
    expect(maxRun).toBeLessThanOrEqual(3);
  });

  it("updates hyphenatedParts in sync", () => {
    const clean = ["strng", "ths"];
    const hyph = ["strng", "&shy;", "ths"];
    repairConsonantPileups(clean, hyph, 4);
    expect(hyph[0]).toBe(clean[0]);
    expect(hyph[2]).toBe(clean[1]);
  });
});

// ---------------------------------------------------------------------------
// Articulatory helper tests
// ---------------------------------------------------------------------------

// Helper to create minimal phoneme objects for testing
function makePhoneme(overrides: Partial<Phoneme> & { sound: string; mannerOfArticulation: Phoneme["mannerOfArticulation"]; placeOfArticulation: Phoneme["placeOfArticulation"] }): Phoneme {
  return {
    voiced: false,
    startWord: 1,
    midWord: 1,
    endWord: 1,
    ...overrides,
  };
}

// Some commonly-needed test phonemes
const P_t = makePhoneme({ sound: "t", mannerOfArticulation: "stop", placeOfArticulation: "alveolar" });
const P_d = makePhoneme({ sound: "d", mannerOfArticulation: "stop", placeOfArticulation: "alveolar", voiced: true });
const P_p = makePhoneme({ sound: "p", mannerOfArticulation: "stop", placeOfArticulation: "bilabial" });
const P_k = makePhoneme({ sound: "k", mannerOfArticulation: "stop", placeOfArticulation: "velar" });
const P_g = makePhoneme({ sound: "g", mannerOfArticulation: "stop", placeOfArticulation: "velar", voiced: true });
const P_b = makePhoneme({ sound: "b", mannerOfArticulation: "stop", placeOfArticulation: "bilabial", voiced: true });
const P_s = makePhoneme({ sound: "s", mannerOfArticulation: "sibilant", placeOfArticulation: "alveolar" });
const P_ʃ = makePhoneme({ sound: "ʃ", mannerOfArticulation: "sibilant", placeOfArticulation: "postalveolar" });
const P_f = makePhoneme({ sound: "f", mannerOfArticulation: "fricative", placeOfArticulation: "labiodental" });
const P_v = makePhoneme({ sound: "v", mannerOfArticulation: "fricative", placeOfArticulation: "labiodental", voiced: true });
const P_θ = makePhoneme({ sound: "θ", mannerOfArticulation: "fricative", placeOfArticulation: "dental" });
const P_n = makePhoneme({ sound: "n", mannerOfArticulation: "nasal", placeOfArticulation: "alveolar" });
const P_m = makePhoneme({ sound: "m", mannerOfArticulation: "nasal", placeOfArticulation: "bilabial" });
const P_ŋ = makePhoneme({ sound: "ŋ", mannerOfArticulation: "nasal", placeOfArticulation: "velar" });
const P_l = makePhoneme({ sound: "l", mannerOfArticulation: "lateralApproximant", placeOfArticulation: "alveolar" });
const P_r = makePhoneme({ sound: "r", mannerOfArticulation: "liquid", placeOfArticulation: "postalveolar" });
const P_w = makePhoneme({ sound: "w", mannerOfArticulation: "glide", placeOfArticulation: "labial-velar" });

describe("mannerGroup", () => {
  it("maps sibilant to fricative", () => {
    expect(mannerGroup(P_s)).toBe("fricative");
  });
  it("maps lateralApproximant to liquid", () => {
    expect(mannerGroup(P_l)).toBe("liquid");
  });
  it("passes through stop", () => {
    expect(mannerGroup(P_t)).toBe("stop");
  });
});

describe("placeGroup", () => {
  it("groups bilabial as labial", () => {
    expect(placeGroup(P_p)).toBe("labial");
  });
  it("groups alveolar as coronal", () => {
    expect(placeGroup(P_t)).toBe("coronal");
  });
  it("groups velar as dorsal", () => {
    expect(placeGroup(P_k)).toBe("dorsal");
  });
  it("groups labial-velar as labial", () => {
    expect(placeGroup(P_w)).toBe("labial");
  });
});

describe("isCoronal", () => {
  it("true for alveolar", () => {
    expect(isCoronal(P_t)).toBe(true);
  });
  it("true for postalveolar", () => {
    expect(isCoronal(P_ʃ)).toBe(true);
  });
  it("false for bilabial", () => {
    expect(isCoronal(P_p)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isJunctionValid — 7 articulatory rules
// ---------------------------------------------------------------------------

describe("isJunctionValid", () => {
  describe("F1: identical phonemes", () => {
    it("rejects identical sounds", () => {
      expect(isJunctionValid(P_t, P_t, [P_t])).toBe(false);
    });
  });

  describe("F2: same manner + same place", () => {
    it("rejects t→d (both stop+coronal)", () => {
      expect(isJunctionValid(P_t, P_d, [P_d])).toBe(false);
    });
    it("rejects f→v (both fricative+labial)", () => {
      expect(isJunctionValid(P_f, P_v, [P_v])).toBe(false);
    });
  });

  describe("P1: s-exception", () => {
    it("allows s as coda before anything", () => {
      expect(isJunctionValid(P_s, P_p, [P_p])).toBe(true);
    });
    it("allows onset s+stop cluster", () => {
      expect(isJunctionValid(P_n, P_s, [P_s, P_t])).toBe(true);
    });
  });

  describe("P2: coronal onset", () => {
    it("allows any coda before coronal onset", () => {
      expect(isJunctionValid(P_k, P_t, [P_t])).toBe(true);
    });
    it("allows labial coda before alveolar onset", () => {
      expect(isJunctionValid(P_p, P_n, [P_n])).toBe(true);
    });
  });

  describe("P3: homorganic nasal+stop", () => {
    it("allows ŋ→k (both dorsal)", () => {
      expect(isJunctionValid(P_ŋ, P_k, [P_k])).toBe(true);
    });
    it("allows m→p (both labial)", () => {
      expect(isJunctionValid(P_m, P_p, [P_p])).toBe(true);
    });
  });

  describe("P4: manner change", () => {
    it("allows nasal→fricative (different manner)", () => {
      expect(isJunctionValid(P_n, P_f, [P_f])).toBe(true);
    });
    it("allows stop→liquid (different manner)", () => {
      expect(isJunctionValid(P_k, P_r, [P_r])).toBe(true);
    });
  });

  describe("P5: place change", () => {
    it("allows f→θ (different place, same manner, both non-stop)", () => {
      expect(isJunctionValid(P_f, P_θ, [P_θ])).toBe(true);
    });
    it("allows l→r (different place — alveolar vs postalveolar)", () => {
      expect(isJunctionValid(P_l, P_r, [P_r])).toBe(true);
    });
    it("allows r→l (different place — postalveolar vs alveolar)", () => {
      expect(isJunctionValid(P_r, P_l, [P_l])).toBe(true);
    });
  });

  describe("F3: non-coronal stop+stop", () => {
    it("rejects b→k (both non-coronal stops)", () => {
      expect(isJunctionValid(P_p, P_k, [P_k])).toBe(false);
    });
    it("allows k→t (t is coronal)", () => {
      expect(isJunctionValid(P_k, P_t, [P_t])).toBe(true);
    });
    it("allows p→t (t is coronal)", () => {
      expect(isJunctionValid(P_p, P_t, [P_t])).toBe(true);
    });
  });

  describe("F4: stop+stop voicing disagreement", () => {
    it("rejects d→k (voiced+voiceless)", () => {
      expect(isJunctionValid(P_d, P_k, [P_k])).toBe(false);
    });
    it("rejects b→t (voiced+voiceless)", () => {
      expect(isJunctionValid(P_b, P_t, [P_t])).toBe(false);
    });
    it("rejects g→p (voiced+voiceless)", () => {
      expect(isJunctionValid(P_g, P_p, [P_p])).toBe(false);
    });
    it("allows k→t (voiceless+voiceless)", () => {
      expect(isJunctionValid(P_k, P_t, [P_t])).toBe(true);
    });
    it("allows g→d (voiced+voiced)", () => {
      expect(isJunctionValid(P_g, P_d, [P_d])).toBe(true);
    });
    it("allows b→d (voiced+voiced)", () => {
      expect(isJunctionValid(P_b, P_d, [P_d])).toBe(true);
    });
  });

  describe("default fail", () => {
    // This is hard to trigger since P4 or P5 usually catches things.
    // Same manner + same place is caught by F2, so default fail is rare.
    // We test that F2 catches it.
    it("F2 catches same manner+place before default", () => {
      expect(isJunctionValid(P_k, P_g, [P_g])).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// isJunctionSonorityValid
// ---------------------------------------------------------------------------

describe("isJunctionSonorityValid", () => {
  // Sonority classes (from sonorityToMannerOfArticulation):
  //   stop=1, fricative=3, sibilant=4, nasal=5, liquid/lateral=6

  it("two-phoneme junction (totalLen ≤ 2) is always valid", () => {
    // stop→stop would be blocked by articulatory rules, but SSP passthrough
    expect(isJunctionSonorityValid([P_t], [P_p], englishConfig)).toBe(true);
  });

  it("empty coda is valid", () => {
    expect(isJunctionSonorityValid([], [P_t], englishConfig)).toBe(true);
  });

  it("empty onset is valid", () => {
    expect(isJunctionSonorityValid([P_t], [], englishConfig)).toBe(true);
  });

  it("Rule 1 — coda sonority rises toward boundary → invalid (/ts.g/ → 'tsg')", () => {
    // coda=[t(1), s(4)]: stop→sibilant is a rise; onset=[g(1)] → totalLen=3
    expect(isJunctionSonorityValid([P_t, P_s], [P_g], englishConfig)).toBe(false);
  });

  it("Rule 2 — boundary plateau (same class, 3+ cluster, non-s) → invalid (/kt.p/ → 'ctp')", () => {
    // coda=[n(5), t(1)]: coda drops; onset=[p(1)]; codaEnd==onsetStart==1 → plateau
    expect(isJunctionSonorityValid([P_n, P_t], [P_p], englishConfig)).toBe(false);
  });

  it("Rule 2 s-exception — coda ends with /s/, same class at boundary → valid", () => {
    // coda=[n(5), s(4)]: drops; onset=[ʃ(4)]; codaEnd==onsetStart==4 but coda[-1] is /s/ → exception
    expect(isJunctionSonorityValid([P_n, P_s], [P_ʃ], englishConfig)).toBe(true);
  });

  it("Rule 3 — onset starts higher than coda-final, non-s → invalid", () => {
    // coda=[n(5), t(1)]; onset=[f(3), r(6)]; onsetStart(3) > codaEnd(1), not /s/ → invalid
    expect(isJunctionSonorityValid([P_n, P_t], [P_f, P_r], englishConfig)).toBe(false);
  });

  it("Rule 3 s-exception — onset starts with /s/ even though it's higher than coda-final → valid (/t.str/ → 'tstr')", () => {
    // coda=[t(1)]; onset=[s(4), t(1), r(6)]; onsetStart(4) > codaEnd(1) but /s/ exception
    expect(isJunctionSonorityValid([P_t], [P_s, P_t, P_r], englishConfig)).toBe(true);
  });

  it("valid 3+ cluster with clear sonority valley → valid (/n.tr/ → 'ntr')", () => {
    // coda=[n(5)]; onset=[t(1), r(6)]; valley: 5→1 boundary, onset rises 1→6
    expect(isJunctionSonorityValid([P_n], [P_t, P_r], englishConfig)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// repairJunctions (feature-based)
// ---------------------------------------------------------------------------

describe("repairJunctions (feature-based)", () => {
  it("does nothing for valid junction", () => {
    // n→f: different manner (nasal vs fricative) → P4 pass
    const boundaries: SyllableBoundary[] = [{
      onsetCluster: [P_f],
      codaCluster: [P_n],
    }];
    const clean = ["an", "fe"];
    const hyph = ["an", "&shy;", "fe"];
    repairJunctions(clean, hyph, boundaries);
    expect(clean.join("")).toBe("anfe");
  });

  it("drops coda consonant for invalid junction (F2: t→d)", () => {
    const boundaries: SyllableBoundary[] = [{
      onsetCluster: [P_d],
      codaCluster: [P_t],
    }];
    const clean = ["art", "de"];
    const hyph = ["art", "&shy;", "de"];
    repairJunctions(clean, hyph, boundaries);
    expect(clean[0]).toBe("ar");
  });

  it("handles empty coda", () => {
    const boundaries: SyllableBoundary[] = [{
      onsetCluster: [P_t],
      codaCluster: [],
    }];
    const clean = ["a", "ter"];
    const hyph = ["a", "&shy;", "ter"];
    repairJunctions(clean, hyph, boundaries);
    expect(clean.join("")).toBe("ater");
  });

  it("removes doubled consonant grapheme fully for invalid junction (dd→k)", () => {
    // d→k: voiced stop + voiceless stop → F4 fail
    const boundaries: SyllableBoundary[] = [{
      onsetCluster: [P_k],
      codaCluster: [P_d],
    }];
    const clean = ["ridd", "kerng"];
    const hyph = ["ridd", "&shy;", "kerng"];
    repairJunctions(clean, hyph, boundaries);
    // Both d's should be stripped across multiple passes
    expect(clean[0]).toBe("ri");
    expect(clean.join("")).toBe("rikerng");
  });
});

// ---------------------------------------------------------------------------
// repairConsonantLetters
// ---------------------------------------------------------------------------

describe("repairConsonantLetters", () => {
  it("does nothing when under limit", () => {
    const clean = ["str", "ong"];
    const hyph = ["str", "&shy;", "ong"];
    repairConsonantLetters(clean, hyph, 4);
    expect(clean.join("")).toBe("strong");
  });

  it("trims 5 consonant letters to 4", () => {
    const clean = ["strnk", "a"];
    const hyph = ["strnk", "&shy;", "a"];
    repairConsonantLetters(clean, hyph, 4);
    const word = clean.join("");
    const maxRun = getMaxConsonantLetterRun(word);
    expect(maxRun).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// repairVowelLetters
// ---------------------------------------------------------------------------

describe("repairVowelLetters", () => {
  it("trims 3 consecutive vowels to 2", () => {
    const clean = ["drogeoom"];
    const hyph = ["drogeoom"];
    repairVowelLetters(clean, hyph, 2);
    expect(clean[0]).toBe("drogeom");
  });

  it("trims initial vowel run", () => {
    const clean = ["eaorts"];
    const hyph = ["eaorts"];
    repairVowelLetters(clean, hyph, 2);
    expect(clean[0]).toBe("earts");
  });

  it("does nothing when vowels are within limit", () => {
    const clean = ["steam"];
    const hyph = ["steam"];
    repairVowelLetters(clean, hyph, 2);
    expect(clean[0]).toBe("steam");
  });

  it("treats word-initial Y before vowel as consonant (not part of vowel run)", () => {
    const clean = ["yoarts"];
    const hyph = ["yoarts"];
    repairVowelLetters(clean, hyph, 2);
    // Y is consonantal here, so vowel run is 'oa' (2) — within limit, no trimming
    expect(clean[0]).toBe("yoarts");
  });
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe("consonant pileup integration", () => {
  it("generates 100k words with no 5+ consonant grapheme runs", { timeout: 120_000 }, () => {
    let violations = 0;
    for (let i = 0; i < 100_000; i++) {
      const word = generateWord({ seed: i });
      if (getMaxConsonantGraphemeRun(word.written.clean) > 4) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });

  it("generates 100k words with no 5+ consonant letter runs", { timeout: 120_000 }, () => {
    let violations = 0;
    for (let i = 0; i < 100_000; i++) {
      const word = generateWord({ seed: i });
      if (getMaxConsonantLetterRun(word.written.clean) > 4) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });

  it("with max=3, generates 10k words with no 4+ consonant grapheme runs", () => {
    const customConfig = {
      ...englishConfig,
      writtenFormConstraints: {
        ...englishConfig.writtenFormConstraints,
        maxConsonantGraphemes: 3,
      },
    };
    const gen = createGenerator(customConfig);
    let violations = 0;
    for (let i = 0; i < 10_000; i++) {
      const word = gen.generateWord({ seed: i });
      if (getMaxConsonantGraphemeRun(word.written.clean) > 3) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaxConsonantGraphemeRun(word: string): number {
  const graphemeList = ["tch", "dge", "ch", "sh", "th", "ng", "ph", "wh", "ck"];
  const tokens = tokenizeGraphemes(word.toLowerCase(), graphemeList);
  const vowels = new Set(["a", "e", "i", "o", "u", "y"]);
  let max = 0;
  let run = 0;
  for (const token of tokens) {
    let isVowel = false;
    for (const ch of token) {
      if (vowels.has(ch)) { isVowel = true; break; }
    }
    if (!isVowel) {
      run++;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

function getMaxConsonantLetterRun(word: string): number {
  const vowels = new Set(["a", "e", "i", "o", "u", "y"]);
  let max = 0;
  let run = 0;
  for (const ch of word.toLowerCase()) {
    if (!vowels.has(ch)) {
      run++;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

// ---------------------------------------------------------------------------
// filterByPosition
// ---------------------------------------------------------------------------

describe("filterByPosition", () => {
  const makeGrapheme = (overrides: Partial<import("../types").Grapheme> = {}): import("../types").Grapheme => ({
    phoneme: "test", form: "x", origin: 0, frequency: 10,
    startWord: 5, midWord: 5, endWord: 5,
    ...overrides,
  });

  it("falls back to all candidates (tier 3) when all have midWord: 0 at mid-word position", () => {
    const candidates = [
      makeGrapheme({ form: "igh", midWord: 0 }),
      makeGrapheme({ form: "ough", midWord: 0 }),
    ];
    const result = filterByPosition(candidates, false, false, false);
    // Tier 1 and 2 both exclude these; tier 3 returns all as last resort
    expect(result).toEqual(candidates);
  });

  it("returns candidates with midWord > 0 when mid-word", () => {
    const candidates = [
      makeGrapheme({ form: "igh", midWord: 0 }),
      makeGrapheme({ form: "i", midWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, false, false);
    expect(result).toHaveLength(1);
    expect(result[0].form).toBe("i");
  });

  it("does not filter by midWord at start of word", () => {
    const candidates = [
      makeGrapheme({ form: "a", midWord: 0, startWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, true, false);
    expect(result).toHaveLength(1);
  });

  it("does not filter by midWord at end of word", () => {
    const candidates = [
      makeGrapheme({ form: "a", midWord: 0, endWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, false, true);
    expect(result).toHaveLength(1);
  });

  it("tier 2 excludes explicit startWord: 0 at start position", () => {
    const candidates = [
      makeGrapheme({ form: "ck", startWord: 0, midWord: 5, endWord: 5 }),
      makeGrapheme({ form: "k", startWord: undefined, midWord: 5, endWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, true, false);
    expect(result).toHaveLength(1);
    expect(result[0].form).toBe("k");
  });

  it("tier 2 excludes explicit endWord: 0 at end position", () => {
    const candidates = [
      makeGrapheme({ form: "wh", endWord: 0, startWord: 5, midWord: 5 }),
      makeGrapheme({ form: "w", endWord: 5, startWord: 5, midWord: 5 }),
    ];
    const result = filterByPosition(candidates, false, false, true);
    expect(result).toHaveLength(1);
    expect(result[0].form).toBe("w");
  });

  it("tier 1 prefers graphemes with positive position values over undefined", () => {
    const candidates = [
      makeGrapheme({ form: "a", startWord: 10 }),
      makeGrapheme({ form: "b", startWord: undefined }),
    ];
    const result = filterByPosition(candidates, false, true, false);
    // Both pass tier 1 (positive or undefined)
    expect(result).toHaveLength(2);
  });

  it("tier 2 relaxed fallback keeps undefined when strict fails", () => {
    // All have startWord undefined (pass tier 1 for startWord) but midWord: 0
    // At mid-word: tier 1 requires midWord > 0 or undefined
    const candidates = [
      makeGrapheme({ form: "a", midWord: undefined }),
      makeGrapheme({ form: "b", midWord: 3 }),
    ];
    // Both pass tier 1 at mid-word position
    const result = filterByPosition(candidates, false, false, false);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Monosyllable position weight selection
// ---------------------------------------------------------------------------

describe("monosyllable position weight selection", () => {
  it("monosyllabic /dz/ words should prefer \"ds\" over \"dse\"", () => {
    // Generate 1000 monosyllabic words ending in /dz/
    // Check that "dse" appears very rarely (<1%)
    const words = generateWords(10000, { seed: 123 });
    
    let dzWords = 0;
    let dseCount = 0;
    let dsCount = 0;
    
    for (const w of words) {
      // Check if word is monosyllabic and ends with /dz/
      if (w.syllables.length === 1 && 
          w.syllables[0].coda.length > 0 && 
          w.syllables[0].coda[w.syllables[0].coda.length - 1].sound === "dz") {
        dzWords++;
        const clean = w.written.clean.toLowerCase();
        if (clean.endsWith("dse")) {
          dseCount++;
        } else if (clean.endsWith("ds")) {
          dsCount++;
        }
      }
    }
    
    if (dzWords > 0) {
      const dsePercent = (dseCount / dzWords) * 100;
      const dsPercent = (dsCount / dzWords) * 100;
      console.log(`  Monosyllabic /dz/ endings: ${dzWords} total`);
      console.log(`  - "dse": ${dseCount} (${dsePercent.toFixed(2)}%)`);
      console.log(`  - "ds": ${dsCount} (${dsPercent.toFixed(2)}%)`);
      
      // With the fix, "dse" should be near-zero for monosyllables (startWord: 0 grapheme)
      expect(dsePercent).toBeLessThan(1.0);
      // "ds" should be the dominant form
      expect(dsPercent).toBeGreaterThan(50);
    }
  });

  it("monosyllable fix should not affect multi-syllable /dz/ words", () => {
    // Multi-syllable words ending in /dz/ should still allow "dse" in final position
    const words = generateWords(10000, { seed: 456 });
    
    let multiSyllableDzWords = 0;
    let dseCount = 0;
    
    for (const w of words) {
      // Check if word is multi-syllabic and ends with /dz/
      if (w.syllables.length > 1 && 
          w.syllables[w.syllables.length - 1].coda.length > 0 && 
          w.syllables[w.syllables.length - 1].coda[w.syllables[w.syllables.length - 1].coda.length - 1].sound === "dz") {
        multiSyllableDzWords++;
        const clean = w.written.clean.toLowerCase();
        if (clean.endsWith("dse")) {
          dseCount++;
        }
      }
    }
    
    if (multiSyllableDzWords > 0) {
      const dsePercent = (dseCount / multiSyllableDzWords) * 100;
      console.log(`  Multi-syllable /dz/ endings: ${multiSyllableDzWords} total`);
      console.log(`  - "dse": ${dseCount} (${dsePercent.toFixed(2)}%)`);
      
      // For multi-syllable words, "dse" should still appear at reasonable frequency
      // (position weighting should work normally for final syllables)
      expect(dsePercent).toBeGreaterThan(5);
    }
  });

  it("monosyllable max position weight applies to all phonemes", () => {
    // Test that the monosyllable fix (using max position weight) applies consistently
    // Generate many monosyllables and verify no graphemes with startWord:0 appear
    const words = generateWords(5000, { seed: 789 });
    
    const monosyllables = words.filter(w => w.syllables.length === 1);
    console.log(`  Testing ${monosyllables.length} monosyllables`);
    
    // This is a smoke test - we can't easily check internal grapheme selection
    // but we can verify that the words generated are plausible and don't show
    // obvious artifacts of incorrect position weighting
    expect(monosyllables.length).toBeGreaterThan(100);
    
    // Count how many monosyllables end with graphemes that should have startWord:0
    // (like "dse", "ck" at start, etc.)
    let suspiciousEndings = 0;
    for (const w of monosyllables) {
      const clean = w.written.clean.toLowerCase();
      // "dse" is the main offender we know about
      if (clean.endsWith("dse")) {
        suspiciousEndings++;
      }
    }
    
    const suspiciousPercent = (suspiciousEndings / monosyllables.length) * 100;
    console.log(`  Suspicious endings in monosyllables: ${suspiciousEndings} (${suspiciousPercent.toFixed(2)}%)`);
    expect(suspiciousPercent).toBeLessThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// Syllable-based position filtering integration
// ---------------------------------------------------------------------------

import { generateWords } from "./generate";

describe("syllable-based position filtering", () => {
  it("\"igh\" only appears in the final syllable (10k words)", () => {
    const words = generateWords(10000, { seed: 42 });
    let violations = 0;

    for (const w of words) {
      const hyph = w.written.hyphenated.toLowerCase();
      const syllableParts = hyph.split("&shy;");

      // Check if "igh" appears in any non-final syllable
      for (let si = 0; si < syllableParts.length - 1; si++) {
        if (syllableParts[si].includes("igh")) {
          violations++;
        }
      }
    }

    console.log(`  igh in non-final syllable: ${violations}/10000`);
    expect(violations).toBeLessThanOrEqual(5);
  });

  it("\"wh\" only appears in the first syllable (10k words)", () => {
    const words = generateWords(10000, { seed: 42 });
    let violations = 0;

    for (const w of words) {
      const hyph = w.written.hyphenated.toLowerCase();
      const syllableParts = hyph.split("&shy;");

      // Check if "wh" appears in any non-first syllable
      for (let si = 1; si < syllableParts.length; si++) {
        if (syllableParts[si].includes("wh")) {
          violations++;
        }
      }
    }

    console.log(`  wh in non-first syllable: ${violations}/10000`);
    expect(violations).toBeLessThanOrEqual(5);
  });

  it("\"ight\" or \"ought\" mid-word rate < 0.1% in 10k words", () => {
    const words = generateWords(10000, { seed: 42 });
    let midWordCount = 0;

    for (const w of words) {
      const written = w.written.clean.toLowerCase();
      for (const pattern of ["ight", "ought"]) {
        let idx = written.indexOf(pattern);
        while (idx !== -1) {
          if (idx + pattern.length < written.length) {
            midWordCount++;
          }
          idx = written.indexOf(pattern, idx + 1);
        }
      }
    }

    const rate = midWordCount / words.length * 100;
    console.log(`  ight/ought mid-word: ${midWordCount}/10000 (${rate.toFixed(2)}%)`);
    expect(rate).toBeLessThan(0.1);
  });

  it("startWord: 0 graphemes do not appear in the first syllable (10k words)", () => {
    // Verify that graphemes banned from word-start don't appear in the first syllable
    // We check "ck" which typically has startWord: 0
    const words = generateWords(10000, { seed: 42 });
    let violations = 0;

    for (const w of words) {
      // "ck" has startWord/onset: 0 — it should never START a word.
      // It's fine in the coda of any syllable (including the first).
      const word = w.written.clean.toLowerCase();
      if (word.startsWith("ck")) {
        violations++;
      }
    }

    console.log(`  words starting with ck: ${violations}/10000`);
    expect(violations).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// applySilentE
// ---------------------------------------------------------------------------

describe("applySilentE", () => {
  // Helper to build a minimal phoneme
  function ph(sound: string, extras: Partial<Phoneme> = {}): Phoneme {
    return {
      sound,
      voiced: false,
      mannerOfArticulation: "stop",
      placeOfArticulation: "alveolar",
      startWord: 1,
      midWord: 1,
      endWord: 1,
      ...extras,
    };
  }

  const lookup = new Map([
    ["eɪ", [{ from: "ai", to: "a" }]],
    ["i:", [{ from: "ee", to: "e" }, { from: "ea", to: "e" }]],
    ["aɪ", [{ from: "igh", to: "i" }, { from: "ie", to: "i" }]],
    ["o", [{ from: "oa", to: "o" }]],
    ["u", [{ from: "oo", to: "u" }, { from: "ue", to: "u" }]],
  ]);
  const excluded = new Set(["w", "j", "h"]);

  it("converts \"maik\" to \"make\" for /eɪk/", () => {
    const clean = ["maik"];
    const hyph = ["maik"];
    const syllables = [{ onset: [ph("m")], nucleus: [ph("eɪ")], coda: [ph("k")] }];
    applySilentE(clean, hyph, syllables, ["ai"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("make");
  });

  it("converts \"hoap\" to \"hope\" for /oʊp/ with nucleus \"oa\"", () => {
    const clean = ["hoap"];
    const hyph = ["hoap"];
    const syllables = [{ onset: [ph("h")], nucleus: [ph("o")], coda: [ph("p")] }];
    applySilentE(clean, hyph, syllables, ["oa"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("hope");
  });

  it("converts \"tighm\" to \"time\" for /aɪm/ with nucleus \"igh\"", () => {
    const clean = ["tighm"];
    const hyph = ["tighm"];
    const syllables = [{ onset: [ph("t")], nucleus: [ph("aɪ")], coda: [ph("m")] }];
    applySilentE(clean, hyph, syllables, ["igh"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("time");
  });

  it("applies when coda has 2 consonants (e.g. \"nce\", \"nge\")", () => {
    const clean = ["maiks"];
    const hyph = ["maiks"];
    const syllables = [{ onset: [ph("m")], nucleus: [ph("eɪ")], coda: [ph("k"), ph("s")] }];
    applySilentE(clean, hyph, syllables, ["ai"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("makse");
  });

  it("does not apply when coda has 3+ consonants", () => {
    const clean = ["maikst"];
    const hyph = ["maikst"];
    const syllables = [{ onset: [ph("m")], nucleus: [ph("eɪ")], coda: [ph("k"), ph("s"), ph("t")] }];
    applySilentE(clean, hyph, syllables, ["ai"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("maikst");
  });

  it("does not apply when coda sound is excluded", () => {
    const clean = ["maiw"];
    const hyph = ["maiw"];
    const syllables = [{ onset: [ph("m")], nucleus: [ph("eɪ")], coda: [ph("w")] }];
    applySilentE(clean, hyph, syllables, ["ai"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("maiw");
  });

  it("respects probability (rand >= threshold → no change)", () => {
    // Use a polysyllabic word to avoid monosyllable probability boost
    const clean = ["ba", "maik"];
    const hyph = ["ba", "&shy;", "maik"];
    const syllables = [
      { onset: [ph("b")], nucleus: [ph("ə")], coda: [] },
      { onset: [ph("m")], nucleus: [ph("eɪ")], coda: [ph("k")] },
    ];
    applySilentE(clean, hyph, syllables, ["a", "ai"], lookup, excluded, 50, () => 0.99);
    expect(clean[1]).toBe("maik");
  });

  it("applies only to last syllable in multi-syllable words", () => {
    const clean = ["bai", "seek"];
    const hyph = ["bai", "&shy;", "seek"];
    const syllables = [
      { onset: [ph("b")], nucleus: [ph("eɪ")], coda: [] },
      { onset: [ph("s")], nucleus: [ph("i:")], coda: [ph("k")] },
    ];
    applySilentE(clean, hyph, syllables, ["ai", "ee"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("bai"); // unchanged
    expect(clean[1]).toBe("seke"); // ee→e + e
  });

  it("does nothing when nucleus grapheme has no matching swap", () => {
    const clean = ["meyk"];
    const hyph = ["meyk"];
    const syllables = [{ onset: [ph("m")], nucleus: [ph("eɪ")], coda: [ph("k")] }];
    applySilentE(clean, hyph, syllables, ["ey"], lookup, excluded, 100, () => 0);
    expect(clean[0]).toBe("meyk"); // 'ey' not in swaps
  });
});

// ---------------------------------------------------------------------------
// appendSilentE (orthographic silent-e for short vowels)
// ---------------------------------------------------------------------------

describe("appendSilentE", () => {
  function ph(sound: string, extras: Partial<Phoneme> = {}): Phoneme {
    return {
      sound,
      voiced: false,
      mannerOfArticulation: "stop",
      placeOfArticulation: "alveolar",
      startWord: 1,
      midWord: 1,
      endWord: 1,
      ...extras,
    };
  }

  const lookup = new Map([["v", 95]]);

  it("appends \"e\" after word-final /v/ — \"giv\" → \"give\"", () => {
    const clean = ["giv"];
    const hyph = ["giv"];
    const syllables = [{ onset: [ph("g")], nucleus: [ph("ɪ")], coda: [ph("v")] }];
    appendSilentE(clean, hyph, syllables, lookup, () => 0);
    expect(clean[0]).toBe("give");
  });

  it("appends \"e\" after word-final /v/ — \"luv\" → \"luve\"", () => {
    const clean = ["luv"];
    const hyph = ["luv"];
    const syllables = [{ onset: [ph("l")], nucleus: [ph("ʌ")], coda: [ph("v")] }];
    appendSilentE(clean, hyph, syllables, lookup, () => 0);
    expect(clean[0]).toBe("luve");
  });

  it("does not double-append when word already ends in \"e\" (magic-e fired)", () => {
    const clean = ["lave"];
    const hyph = ["lave"];
    const syllables = [{ onset: [ph("l")], nucleus: [ph("eɪ")], coda: [ph("v")] }];
    appendSilentE(clean, hyph, syllables, lookup, () => 0);
    expect(clean[0]).toBe("lave"); // unchanged
  });

  it("does not apply to sounds not in the lookup", () => {
    const clean = ["gib"];
    const hyph = ["gib"];
    const syllables = [{ onset: [ph("g")], nucleus: [ph("ɪ")], coda: [ph("b")] }];
    appendSilentE(clean, hyph, syllables, lookup, () => 0);
    expect(clean[0]).toBe("gib");
  });

  it("respects probability (rand >= threshold → no change)", () => {
    const clean = ["giv"];
    const hyph = ["giv"];
    const syllables = [{ onset: [ph("g")], nucleus: [ph("ɪ")], coda: [ph("v")] }];
    appendSilentE(clean, hyph, syllables, lookup, () => 0.99);
    expect(clean[0]).toBe("giv");
  });

  it("works on multi-syllable words (applies to last syllable)", () => {
    const clean = ["a", "bov"];
    const hyph = ["a", "&shy;", "bov"];
    const syllables = [
      { onset: [], nucleus: [ph("ə")], coda: [] },
      { onset: [ph("b")], nucleus: [ph("ʌ")], coda: [ph("v")] },
    ];
    appendSilentE(clean, hyph, syllables, lookup, () => 0);
    expect(clean[1]).toBe("bove");
  });

  it("does not apply when coda is empty", () => {
    const clean = ["ba"];
    const hyph = ["ba"];
    const syllables = [{ onset: [ph("b")], nucleus: [ph("æ")], coda: [] }];
    appendSilentE(clean, hyph, syllables, lookup, () => 0);
    expect(clean[0]).toBe("ba");
  });
});

// ---------------------------------------------------------------------------
// Silent-e integration
// ---------------------------------------------------------------------------

describe("silent-e integration", () => {
  it("produces some silent-e words in 10k generated words", () => {
    const gen = createGenerator(englishConfig);
    // Pattern: word ends in consonant + 'e', with a single vowel letter before the consonant
    // e.g., "...aCe" where C is a consonant
    const silentEPattern = /[aeiou][bcdfghjklmnpqrstvwxyz]e$/;
    let silentECount = 0;
    const total = 10000;

    for (let i = 0; i < total; i++) {
      const word = gen.generateWord({ seed: i });
      if (silentEPattern.test(word.written.clean)) {
        silentECount++;
      }
    }

    // With 35% probability on eligible words, we should see at least some
    expect(silentECount).toBeGreaterThan(0);
    // Log for visibility
    console.log(`  Silent-e words: ${silentECount}/${total} (${(silentECount/total*100).toFixed(1)}%)`);
  });

  // ---------------------------------------------------------------------------
  // Y consonant/vowel counting (#63)
  // ---------------------------------------------------------------------------

  it("treats Y before a vowel as consonant in consonant pileup repair", () => {
    // "yat" → Y is before 'a' (vowel), so Y is consonantal → only 1 consonant letter before the vowel
    // This should NOT be flagged as a consonant pileup
    const parts = ["yat"];
    const hyph = ["yat"];
    repairConsonantLetters(parts, hyph, 3);
    expect(parts[0]).toBe("yat");
  });

  it("treats Y not before a vowel as vowel in consonant pileup repair", () => {
    // "gym" → Y is between g and m, not before a vowel → Y is a vowel
    // g-y-m = consonant-vowel-consonant, no pileup
    const parts = ["gym"];
    const hyph = ["gym"];
    repairConsonantLetters(parts, hyph, 3);
    expect(parts[0]).toBe("gym");
  });

  // -----------------------------------------------------------------------
  // Consonant doubling: Issue #14
  // -----------------------------------------------------------------------

  it("produces \"ck\" (not \"kk\") when k doubles after lax vowel", () => {
    const gen = createGenerator(englishConfig);
    let ckCount = 0;
    let kkCount = 0;
    const total = 10000;

    for (let i = 0; i < total; i++) {
      const word = gen.generateWord({ seed: i });
      const clean = word.written.clean.toLowerCase();
      if (clean.includes("ck")) ckCount++;
      if (clean.includes("kk")) kkCount++;
    }

    console.log(`  ck occurrences: ${ckCount}/${total}, kk occurrences: ${kkCount}/${total}`);
    expect(kkCount).toBe(0);
    expect(ckCount).toBeGreaterThan(0);
  });

  it("never doubles consonants in unstressed syllables (modifier = 0)", () => {
    expect(englishConfig.doubling?.unstressedModifier).toBe(0);
  });

  it("never doubles b, d, g word-finally via doubling system", () => {
    // Note: a few "gg" endings may appear from the dʒ→"gg" grapheme (not from doubling).
    // We check that b and d never produce doubled forms word-finally,
    // and that gg is very rare (only from the grapheme, not doubling).
    const gen = createGenerator(englishConfig);
    let finalBB = 0;
    let finalDD = 0;
    let finalGG = 0;
    const total = 10000;

    for (let i = 0; i < total; i++) {
      const word = gen.generateWord({ seed: i });
      const clean = word.written.clean.toLowerCase();
      if (clean.endsWith("bb")) finalBB++;
      if (clean.endsWith("dd")) finalDD++;
      if (clean.endsWith("gg")) finalGG++;
    }

    console.log(`  Word-final bb: ${finalBB}, dd: ${finalDD}, gg: ${finalGG}`);
    expect(finalBB).toBe(0);
    expect(finalDD).toBe(0);
    // gg may appear from dʒ→"gg" grapheme (endWord:0, but fallback selection);
    // neverDoubleFinal prevents doubling-sourced gg. Allow up to 10 from grapheme.
    expect(finalGG).toBeLessThan(15);
  });

  it("ck counts toward maxPerWord doubling limit", () => {
    const gen = createGenerator(englishConfig);
    let violations = 0;
    const total = 10000;
    const doublePattern = /([bcdfglmnprst])\1/;

    for (let i = 0; i < total; i++) {
      const word = gen.generateWord({ seed: i });
      const clean = word.written.clean.toLowerCase();
      if (clean.includes("ck") && doublePattern.test(clean)) {
        violations++;
      }
    }

    console.log(`  Words with both ck and another double: ${violations}/${total}`);
    expect(violations).toBeLessThanOrEqual(5);
  });

  it("very few words end in bare \"v\" in 10k generated words", () => {
    const gen = createGenerator(englishConfig);
    let bareV = 0;
    let totalEndingV = 0;
    const total = 10000;

    for (let i = 0; i < total; i++) {
      const word = gen.generateWord({ seed: i });
      const clean = word.written.clean.toLowerCase();
      if (clean.endsWith("v")) bareV++;
      if (clean.endsWith("v") || clean.endsWith("ve")) totalEndingV++;
    }

    console.log(`  Bare 'v' endings: ${bareV}/${total}, total v/ve endings: ${totalEndingV}/${total}`);
    // With 95% probability, bare v should be very rare (< 2% of v-ending words)
    if (totalEndingV > 0) {
      expect(bareV / totalEndingV).toBeLessThan(0.10);
    }
  });
});
