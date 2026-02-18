import { describe, it, expect } from "vitest";
import { englishConfig } from "./english.js";
import { LanguageConfig, computeSonorityLevels, validateConfig } from "./language.js";
import { VOICED_BONUS, TENSE_BONUS, SYLLABLE_COUNT_WEIGHTS } from "./weights.js";
import { sonorityLevels } from "../elements/phonemes.js";

describe("LanguageConfig", () => {
  it("should construct a valid English config", () => {
    const config: LanguageConfig = englishConfig;
    expect(config.id).toBe("en");
    expect(config.name).toBe("English");
  });

  describe("phoneme inventory", () => {
    it("should have a non-empty phoneme list", () => {
      expect(englishConfig.phonemes.length).toBeGreaterThan(0);
    });

    it("should have phoneme maps for all syllable positions", () => {
      expect(englishConfig.phonemeMaps.onset.size).toBeGreaterThan(0);
      expect(englishConfig.phonemeMaps.nucleus.size).toBeGreaterThan(0);
      expect(englishConfig.phonemeMaps.coda.size).toBeGreaterThan(0);
    });
  });

  describe("grapheme inventory", () => {
    it("should have a non-empty grapheme list", () => {
      expect(englishConfig.graphemes.length).toBeGreaterThan(0);
    });

    it("should have grapheme maps for all syllable positions", () => {
      expect(englishConfig.graphemeMaps.onset.size).toBeGreaterThan(0);
      expect(englishConfig.graphemeMaps.nucleus.size).toBeGreaterThan(0);
      expect(englishConfig.graphemeMaps.coda.size).toBeGreaterThan(0);
    });
  });

  describe("phonotactic constraints", () => {
    it("should have invalidClusters arrays (may be empty when using feature-based constraints)", () => {
      expect(Array.isArray(englishConfig.invalidClusters.onset)).toBe(true);
      expect(Array.isArray(englishConfig.invalidClusters.coda)).toBe(true);
      expect(Array.isArray(englishConfig.invalidClusters.boundary)).toBe(true);
    });

    it("should store patterns as strings (JSON-serializable)", () => {
      for (const pattern of englishConfig.invalidClusters.onset) {
        expect(typeof pattern).toBe("string");
      }
    });
  });

  describe("sonority", () => {
    it("should reference shared weight constants for bonuses", () => {
      expect(englishConfig.sonorityHierarchy.voicedBonus).toBe(VOICED_BONUS);
      expect(englishConfig.sonorityHierarchy.tenseBonus).toBe(TENSE_BONUS);
    });

    it("should compute a level for every phoneme", () => {
      const levels = computeSonorityLevels(englishConfig);
      expect(levels.size).toBe(englishConfig.phonemes.length);
    });

    it("should match the pre-computed sonority levels from phonemes.ts", () => {
      const computed = computeSonorityLevels(englishConfig);
      for (const [phoneme, level] of sonorityLevels) {
        expect(computed.get(phoneme)).toBeCloseTo(level, 10);
      }
    });
  });

  describe("syllable structure", () => {
    it("should reference shared syllable count weights", () => {
      expect(englishConfig.syllableStructure.syllableCountWeights).toBe(SYLLABLE_COUNT_WEIGHTS);
    });

    it("should have English-appropriate structural limits", () => {
      expect(englishConfig.syllableStructure.maxOnsetLength).toBe(3);
      expect(englishConfig.syllableStructure.maxCodaLength).toBe(4);
      expect(englishConfig.syllableStructure.maxNucleusLength).toBe(1);
    });
  });

  describe("generation weights", () => {
    it("should have onset length distributions", () => {
      const { onsetLength } = englishConfig.generationWeights;
      expect(onsetLength.monosyllabic.length).toBeGreaterThan(0);
      expect(onsetLength.followingNucleus.length).toBeGreaterThan(0);
      expect(onsetLength.default.length).toBeGreaterThan(0);
    });

    it("should have coda length distributions", () => {
      const { codaLength } = englishConfig.generationWeights;
      expect(Object.keys(codaLength.monosyllabic).length).toBeGreaterThan(0);
      expect(codaLength.monosyllabicDefault.length).toBeGreaterThan(0);
      expect(codaLength.polysyllabicNonzero.length).toBeGreaterThan(0);
      expect(codaLength.zeroWeightEndOfWord).toBeGreaterThan(0);
      expect(codaLength.zeroWeightMidWord).toBeGreaterThan(0);
    });

    it("should have probability values between 0 and 100", () => {
      const { probability } = englishConfig.generationWeights;
      for (const [key, value] of Object.entries(probability)) {
        expect(value, key).toBeGreaterThanOrEqual(0);
        expect(value, key).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("top-down phoneme targeting", () => {
    it("should define phoneme length weights for text and lexicon modes", () => {
      expect(englishConfig.phonemeLengthWeights.text.length).toBeGreaterThan(0);
      expect(englishConfig.phonemeLengthWeights.lexicon.length).toBeGreaterThan(0);
    });

    it("should define phoneme-to-syllable maps for text and lexicon modes", () => {
      expect(Object.keys(englishConfig.phonemeToSyllableWeights.text).length).toBeGreaterThan(0);
      expect(Object.keys(englishConfig.phonemeToSyllableWeights.lexicon).length).toBeGreaterThan(0);
    });
  });

  describe("stress", () => {
    it("should use weight-sensitive strategy", () => {
      expect(englishConfig.stress.strategy).toBe("weight-sensitive");
    });
  });
});

describe("morphology config", () => {
  it("should exist and be enabled", () => {
    expect(englishConfig.morphology).toBeDefined();
    expect(englishConfig.morphology!.enabled).toBe(true);
  });

  it("should have 16 suffixes and 8 prefixes", () => {
    expect(englishConfig.morphology!.suffixes).toHaveLength(16);
    expect(englishConfig.morphology!.prefixes).toHaveLength(8);
  });

  it("should have template weights summing to 100 for both modes", () => {
    const { text, lexicon } = englishConfig.morphology!.templateWeights;
    expect(text.bare + text.suffixed + text.prefixed + text.both).toBe(100);
    expect(lexicon.bare + lexicon.suffixed + lexicon.prefixed + lexicon.both).toBe(100);
  });

  it("all affixes should have syllables defined", () => {
    for (const affix of [...englishConfig.morphology!.prefixes, ...englishConfig.morphology!.suffixes]) {
      expect(affix.syllables, `${affix.written} missing syllables`).toBeDefined();
    }
  });

  it("should have allomorphs on -ed and -s", () => {
    const ed = englishConfig.morphology!.suffixes.find(s => s.written === "ed");
    const s = englishConfig.morphology!.suffixes.find(s => s.written === "s");
    expect(ed?.allomorphs).toBeDefined();
    expect(ed!.allomorphs!.length).toBeGreaterThan(0);
    expect(s?.allomorphs).toBeDefined();
    expect(s!.allomorphs!.length).toBeGreaterThan(0);
  });
});

describe("validateConfig", () => {
  it("should pass for the English config", () => {
    expect(() => validateConfig(englishConfig)).not.toThrow();
  });

  it("should throw when a phonemeMap references a phoneme not in phonemes[]", () => {
    const bad = {
      ...englishConfig,
      phonemes: [], // empty — nothing will match
    };
    expect(() => validateConfig(bad)).toThrow("not found in phonemes[]");
  });

  it("should throw when a graphemeMap references a grapheme not in graphemes[]", () => {
    const bad = {
      ...englishConfig,
      graphemes: [], // empty — nothing will match
    };
    expect(() => validateConfig(bad)).toThrow("not found in graphemes[]");
  });

  it("should throw when a probability value is out of range", () => {
    const bad = {
      ...englishConfig,
      generationWeights: {
        ...englishConfig.generationWeights,
        probability: {
          ...englishConfig.generationWeights.probability,
          finalS: 150,
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow("must be in [0, 100]");
  });

  it("should throw when phonemeLengthWeights.text is missing", () => {
    const bad = {
      ...englishConfig,
      phonemeLengthWeights: {
        ...englishConfig.phonemeLengthWeights,
        text: [],
      },
    };
    expect(() => validateConfig(bad)).toThrow("phonemeLengthWeights.text is required");
  });

  it("should throw when phonemeToSyllableWeights entry is missing for a configured phoneme length", () => {
    const bad = {
      ...englishConfig,
      phonemeToSyllableWeights: {
        ...englishConfig.phonemeToSyllableWeights,
        lexicon: { ...englishConfig.phonemeToSyllableWeights.lexicon, 6: undefined as any },
      },
    };
    expect(() => validateConfig(bad)).toThrow("phonemeToSyllableWeights.lexicon.6 must be a non-empty array");
  });
});
