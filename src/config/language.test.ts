import { describe, it, expect } from "vitest";
import { englishConfig } from "./english.js";
import { LanguageConfig, computeSonorityLevels } from "./language.js";
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
    it("should have invalid cluster patterns for onset, coda, and boundary", () => {
      expect(englishConfig.invalidClusters.onset.length).toBeGreaterThan(0);
      expect(englishConfig.invalidClusters.coda.length).toBeGreaterThan(0);
      expect(englishConfig.invalidClusters.boundary.length).toBeGreaterThan(0);
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

  describe("stress", () => {
    it("should use weight-sensitive strategy", () => {
      expect(englishConfig.stress.strategy).toBe("weight-sensitive");
    });
  });
});
