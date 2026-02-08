import { describe, it, expect } from "vitest";
import { englishConfig } from "./english.js";
import { LanguageConfig } from "./language.js";

describe("LanguageConfig", () => {
  it("should construct a valid English config", () => {
    const config: LanguageConfig = englishConfig;
    expect(config.id).toBe("en");
    expect(config.name).toBe("English");
  });

  it("should have a non-empty phoneme inventory", () => {
    expect(englishConfig.phonemes.length).toBeGreaterThan(0);
  });

  it("should have phoneme maps for all syllable positions", () => {
    expect(englishConfig.phonemeMaps.onset.size).toBeGreaterThan(0);
    expect(englishConfig.phonemeMaps.nucleus.size).toBeGreaterThan(0);
    expect(englishConfig.phonemeMaps.coda.size).toBeGreaterThan(0);
  });

  it("should have a non-empty grapheme inventory", () => {
    expect(englishConfig.graphemes.length).toBeGreaterThan(0);
  });

  it("should have grapheme maps for all syllable positions", () => {
    expect(englishConfig.graphemeMaps.onset.size).toBeGreaterThan(0);
    expect(englishConfig.graphemeMaps.nucleus.size).toBeGreaterThan(0);
    expect(englishConfig.graphemeMaps.coda.size).toBeGreaterThan(0);
  });

  it("should have invalid cluster constraints", () => {
    expect(englishConfig.invalidClusters.onset.length).toBeGreaterThan(0);
    expect(englishConfig.invalidClusters.coda.length).toBeGreaterThan(0);
    expect(englishConfig.invalidClusters.boundary.length).toBeGreaterThan(0);
  });

  it("should have a sonority hierarchy", () => {
    expect(englishConfig.sonorityHierarchy.mannerOfArticulation).toBeDefined();
    expect(englishConfig.sonorityHierarchy.voicedBonus).toBe(0.5);
    expect(englishConfig.sonorityHierarchy.tenseBonus).toBe(0.25);
  });

  it("should have pre-computed sonority levels", () => {
    expect(englishConfig.sonorityLevels.size).toBe(englishConfig.phonemes.length);
  });

  it("should have syllable structure rules", () => {
    expect(englishConfig.syllableStructure.maxOnsetLength).toBe(3);
    expect(englishConfig.syllableStructure.maxCodaLength).toBe(4);
    expect(englishConfig.syllableStructure.syllableCountWeights.length).toBeGreaterThan(0);
  });

  it("should have stress rules", () => {
    expect(englishConfig.stress.strategy).toBe("weight-sensitive");
  });
});
