import { describe, it, expect, beforeAll } from "vitest";
import { ipaToArpabet, wordToArpabet } from "./ipa-to-arpabet.js";
import { scoreArpabetWords, BatchScoreResult } from "./score.js";
import { generateWord } from "../core/generate.js";
import englishBaseline from "./english-baseline.json";

// ---------------------------------------------------------------------------
// Test-only helper: generate N words, convert to ARPABET, score the batch.
// Lives here (not in score.ts) to keep the scorer free of generator deps.
// ---------------------------------------------------------------------------

function generateAndScore(count: number, seed: number): BatchScoreResult {
  const arpabetWords: string[] = [];
  for (let i = 0; i < count; i++) {
    const word = generateWord({ seed: seed + i });
    const arpabet = wordToArpabet(word);
    if (arpabet.trim()) arpabetWords.push(arpabet);
  }
  return scoreArpabetWords(arpabetWords);
}

// ---------------------------------------------------------------------------
// Thresholds
//
// Based on full CMU dictionary baseline (123,892 words).
// English per-bigram: mean -3.89, median -3.84, min -7.92, max -2.37
// ---------------------------------------------------------------------------

/** Generated per-bigram mean must be within this of English mean. */
const PER_BIGRAM_GATE = 2.0;

/** No generated word may score below this per-bigram floor. */
const PER_BIGRAM_MIN_FLOOR = -12.0;

/** Per-bigram gap must not regress more than this vs. the recorded baseline. */
const REGRESSION_TOLERANCE = 0.5;

// ---------------------------------------------------------------------------
// IPA → ARPABET conversion
// ---------------------------------------------------------------------------

describe("IPA to ARPABET conversion", () => {
  it("converts simple consonants", () => {
    expect(ipaToArpabet("k")).toBe("K");
    expect(ipaToArpabet("t")).toBe("T");
    expect(ipaToArpabet("s")).toBe("S");
    expect(ipaToArpabet("n")).toBe("N");
  });

  it("converts vowels", () => {
    expect(ipaToArpabet("æ")).toBe("AE");
    expect(ipaToArpabet("i:")).toBe("IY");
    expect(ipaToArpabet("ə")).toBe("AH");
    expect(ipaToArpabet("ɑ")).toBe("AA");
  });

  it("converts diphthongs", () => {
    expect(ipaToArpabet("eɪ")).toBe("EY");
    expect(ipaToArpabet("aɪ")).toBe("AY");
    expect(ipaToArpabet("aʊ")).toBe("AW");
    expect(ipaToArpabet("ɔɪ")).toBe("OY");
  });

  it("converts affricates", () => {
    expect(ipaToArpabet("tʃ")).toBe("CH");
    expect(ipaToArpabet("dʒ")).toBe("JH");
  });

  it("strips aspiration diacritics", () => {
    expect(ipaToArpabet("pʰ")).toBe("P");
    expect(ipaToArpabet("tʰ")).toBe("T");
    expect(ipaToArpabet("kʰ")).toBe("K");
  });

  // Triphthongs removed from inventory — they decompose into diphthong + /ə/.
  // The mapper returns null for unknown phonemes.
  it("returns null for removed triphthongs", () => {
    expect(ipaToArpabet("aɪə")).toBeNull();
    expect(ipaToArpabet("aʊə")).toBeNull();
    expect(ipaToArpabet("eɪə")).toBeNull();
  });

  it("converts a full generated word to valid ARPABET tokens", () => {
    const word = generateWord({ seed: 12345 });
    const arpabet = wordToArpabet(word);
    expect(arpabet).toBeTruthy();
    const validTokens = new Set([
      "AA", "AE", "AH", "AO", "AW", "AY", "B", "CH", "D", "DH",
      "EH", "ER", "EY", "F", "G", "HH", "IH", "IY", "JH", "K",
      "L", "M", "N", "NG", "OW", "OY", "P", "R", "S", "SH", "T",
      "TH", "UH", "UW", "V", "W", "Y", "Z", "ZH",
    ]);
    for (const token of arpabet.split(" ")) {
      expect(validTokens.has(token), `Invalid ARPABET token: ${token}`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Scorer unit tests (deterministic, no generation)
// ---------------------------------------------------------------------------

describe("ARPABET scorer", () => {
  it("scores common English words higher than implausible sequences", () => {
    const common = scoreArpabetWords(["K AE T", "D AO G", "S T R IY T"]);   // cat, dog, street
    const weird  = scoreArpabetWords(["NG TH ZH", "ZH P TH", "P F K T"]);   // nonsense clusters

    const commonMean = common.perBigram.mean;
    const weirdMean  = weird.perBigram.mean;

    expect(commonMean).toBeGreaterThan(weirdMean);
  });

  it("returns finite scores for valid ARPABET input", () => {
    const result = scoreArpabetWords(["HH AH L OW", "W ER L D"]);
    expect(result.words).toHaveLength(2);
    for (const w of result.words) {
      expect(isFinite(w.score)).toBe(true);
      expect(isFinite(w.perBigram)).toBe(true);
    }
  });

  it("handles empty input gracefully", () => {
    const result = scoreArpabetWords([]);
    expect(result.words).toHaveLength(0);
    expect(result.total.mean).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Phonotactic quality gates (135k generated words)
// ---------------------------------------------------------------------------

describe("phonotactic quality gates", () => {
  let generated: BatchScoreResult;

  beforeAll(() => {
    generated = generateAndScore(135000, 42);
  }, 60000);

  it("per-bigram mean is within gate of English", () => {
    const gap = englishBaseline.scores.perBigram.mean - generated.perBigram.mean;

    console.log(`\n📊 Generated: per-bigram mean=${generated.perBigram.mean.toFixed(2)} median=${generated.perBigram.median.toFixed(2)} min=${generated.perBigram.min.toFixed(2)} n=${generated.words.length}`);
    console.log(`   English:   per-bigram mean=${englishBaseline.scores.perBigram.mean}`);
    console.log(`   Gap: ${gap.toFixed(2)} (gate: < ${PER_BIGRAM_GATE})`);

    expect(generated.perBigram.mean).toBeGreaterThan(
      englishBaseline.scores.perBigram.mean - PER_BIGRAM_GATE,
    );
  });

  it("per-bigram gap has not regressed from recorded baseline", () => {
    const gap = englishBaseline.scores.perBigram.mean - generated.perBigram.mean;
    const baselineGap = englishBaseline.generatedBaseline.gap;

    console.log(`\n🔒 Regression check: current gap=${gap.toFixed(2)}, baseline gap=${baselineGap}, tolerance=${REGRESSION_TOLERANCE}`);

    expect(gap).toBeLessThan(baselineGap + REGRESSION_TOLERANCE);
  });

  it("no generated word has catastrophically low per-bigram score", () => {
    console.log(`\n📊 Min per-bigram: ${generated.perBigram.min.toFixed(2)} (English min: ${englishBaseline.scores.perBigram.min}, floor: ${PER_BIGRAM_MIN_FLOOR})`);
    expect(generated.perBigram.min).toBeGreaterThan(PER_BIGRAM_MIN_FLOOR);
  });
});
