import { describe, it, expect } from "vitest";
import { englishConfig } from "./english.js";
import { LanguageConfig, computeSonorityLevels, expandClusterConstraintBans, isWholeWordAnchoredSpellingRule, resolveAspirationRules, validateConfig } from "./language.js";
import { VOICED_BONUS, TENSE_BONUS } from "./weights.js";
import { sonorityLevels } from "../elements/phonemes.js";
import { Phoneme } from "../types.js";

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

    it("should expand English boundary cluster rules to the expected banned pairs", () => {
      const expected = new Set([
        // /ŋ/ before anything except /k/, /g/
        "ŋ|p", "ŋ|b", "ŋ|t", "ŋ|d",
        "ŋ|f", "ŋ|v", "ŋ|θ", "ŋ|ð",
        "ŋ|s", "ŋ|z", "ŋ|ʃ", "ŋ|ʒ",
        "ŋ|tʃ", "ŋ|dʒ", "ŋ|m", "ŋ|n",
        "ŋ|l", "ŋ|r", "ŋ|j", "ŋ|w",
        "ŋ|h",
        // /ʒ/ before stops
        "ʒ|p", "ʒ|b", "ʒ|t", "ʒ|d", "ʒ|k", "ʒ|g",
        // /ð/ before stops
        "ð|p", "ð|b", "ð|t", "ð|d", "ð|k", "ð|g",
        // Same-place stop sequences with opposite voicing
        "p|b", "b|p", "t|d", "d|t", "k|g", "g|k",
        // Bilabial nasal + velar stop
        "m|k", "m|g",
      ]);
      const actual = new Set(
        expandClusterConstraintBans(englishConfig).map(([coda, onset]) => `${coda}|${onset}`),
      );
      expect(actual).toEqual(expected);
    });

    it("should auto-ban new non-velar onsets after /ŋ/ while allowing new velar onsets", () => {
      const newPalatalStop: Phoneme = {
        sound: "c",
        mannerOfArticulation: "stop",
        placeOfArticulation: "palatal",
        voiced: false,
        onset: 10,
        coda: 0,
        startWord: 1,
        midWord: 1,
        endWord: 1,
      };
      const newVelarStop: Phoneme = {
        sound: "q",
        mannerOfArticulation: "stop",
        placeOfArticulation: "velar",
        voiced: false,
        onset: 10,
        coda: 0,
        startWord: 1,
        midWord: 1,
        endWord: 1,
      };
      const onsetMap = new Map(englishConfig.phonemeMaps.onset);
      onsetMap.set(newPalatalStop.sound, [newPalatalStop]);
      onsetMap.set(newVelarStop.sound, [newVelarStop]);

      const configWithExtraOnsets: LanguageConfig = {
        ...englishConfig,
        phonemes: [...englishConfig.phonemes, newPalatalStop, newVelarStop],
        phonemeMaps: {
          ...englishConfig.phonemeMaps,
          onset: onsetMap,
        },
      };

      const expanded = new Set(
        expandClusterConstraintBans(configWithExtraOnsets).map(([coda, onset]) => `${coda}|${onset}`),
      );
      expect(expanded.has("ŋ|c")).toBe(true);
      expect(expanded.has("ŋ|q")).toBe(false);
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

    it("should have boundary policy values between 0 and 100", () => {
      const { boundaryPolicy } = englishConfig.generationWeights;
      for (const [key, value] of Object.entries(boundaryPolicy)) {
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
    it("should use ot strategy", () => {
      expect(englishConfig.pronunciation.stress.primary.type).toBe("ot");
      expect(englishConfig.pronunciation.stress.primary.otConfig).toBeDefined();
      expect(englishConfig.pronunciation.stress.primary.otConfig!.constraints.length).toBeGreaterThan(0);
    });
  });

  describe("aspiration", () => {
    it("should define English aspiration rules", () => {
      expect(englishConfig.pronunciation.aspiration).toBeDefined();
      expect(englishConfig.pronunciation.aspiration!.targets.length).toBeGreaterThan(0);
      expect(englishConfig.pronunciation.aspiration!.rules.length).toBeGreaterThan(0);
    });

    it("should resolve default aspiration selectors and rules", () => {
      expect(resolveAspirationRules()).toMatchObject({
        enabled: true,
        targets: [
          {
            segment: "onset",
            index: 0,
            manner: ["stop"],
            voiced: false,
          },
        ],
        fallbackProbability: 30,
      });
      expect(resolveAspirationRules().rules.length).toBeGreaterThan(0);
    });
  });
});

describe("morphology config", () => {
  it("should exist and be enabled", () => {
    expect(englishConfig.morphology).toBeDefined();
    expect(englishConfig.morphology!.enabled).toBe(true);
  });

  it("should have 25 suffixes and 8 prefixes", () => {
    expect(englishConfig.morphology!.suffixes).toHaveLength(25);
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

  it("should reject whole-word anchored spelling rules", () => {
    const bad = {
      ...englishConfig,
      spellingRules: [
        ...(englishConfig.spellingRules ?? []),
        {
          name: "lexical-patch",
          pattern: "^foo$",
          replacement: "bar",
          scope: "word" as const,
        },
      ],
    };
    expect(isWholeWordAnchoredSpellingRule(bad.spellingRules[bad.spellingRules.length - 1])).toBe(true);
    expect(() => validateConfig(bad)).toThrow("must not use whole-word anchored patterns");
  });

  it("should reject whole-word anchored spelling rules that delete the word", () => {
    const bad = {
      ...englishConfig,
      spellingRules: [
        ...(englishConfig.spellingRules ?? []),
        {
          name: "drop-word",
          pattern: "^foo$",
          replacement: "",
          scope: "word" as const,
        },
      ],
    };
    expect(isWholeWordAnchoredSpellingRule(bad.spellingRules[bad.spellingRules.length - 1])).toBe(true);
    expect(() => validateConfig(bad)).toThrow("must not use whole-word anchored patterns");
  });

  it("should allow productive anchored spelling rules with captures", () => {
    const ok = {
      ...englishConfig,
      spellingRules: [
        ...(englishConfig.spellingRules ?? []),
        {
          name: "plural-y-to-ies",
          pattern: "^(.+)y$",
          replacement: "$1ies",
          scope: "word" as const,
        },
      ],
    };
    expect(isWholeWordAnchoredSpellingRule(ok.spellingRules[ok.spellingRules.length - 1])).toBe(false);
    expect(() => validateConfig(ok)).not.toThrow();
  });

  it("should allow anchored spelling rules that use regex syntax", () => {
    const ok = {
      ...englishConfig,
      spellingRules: [
        ...(englishConfig.spellingRules ?? []),
        {
          name: "optional-u",
          pattern: "^colou?r$",
          replacement: "color",
          scope: "word" as const,
        },
      ],
    };
    expect(isWholeWordAnchoredSpellingRule(ok.spellingRules[ok.spellingRules.length - 1])).toBe(false);
    expect(() => validateConfig(ok)).not.toThrow();
  });

  it("should allow weighted gap-spelling variants on the same phoneme sequence", () => {
    const ok = {
      ...englishConfig,
      gapSpellings: [
        ...(englishConfig.gapSpellings ?? []),
        { name: "toe", phonemes: ["t", "u"], replacement: "toe", weight: 5, targetLayer: "grapheme" as const },
      ],
    };
    expect(() => validateConfig(ok)).not.toThrow();
  });

  it("should reject duplicate gap-spelling variants", () => {
    const bad = {
      ...englishConfig,
      gapSpellings: [
        ...(englishConfig.gapSpellings ?? []),
        { name: "duplicate-to", phonemes: ["t", "u"], replacement: "to", targetLayer: "grapheme" as const },
      ],
    };
    expect(() => validateConfig(bad)).toThrow('gapSpellings has duplicate variant for "duplicate-to"');
  });

  it("should reject duplicate gap-spelling variants even when target layers differ", () => {
    const bad = {
      ...englishConfig,
      gapSpellings: [
        ...(englishConfig.gapSpellings ?? []),
        { name: "duplicate-to-layer", phonemes: ["t", "u"], replacement: "to", targetLayer: "spellingRule" as const },
      ],
    };
    expect(() => validateConfig(bad)).toThrow('gapSpellings has duplicate variant for "duplicate-to-layer"');
  });

  it("should reject duplicate gap-spelling variants even when hyphenation differs", () => {
    const bad = {
      ...englishConfig,
      gapSpellings: [
        ...(englishConfig.gapSpellings ?? []),
        {
          name: "duplicate-any-hyphenation",
          phonemes: ["ɛ", "n", "i:"],
          replacement: "any",
          hyphenated: "an&shy;y",
          targetLayer: "grapheme" as const,
        },
      ],
    };
    expect(() => validateConfig(bad)).toThrow(
      'gapSpellings has duplicate variant for "duplicate-any-hyphenation"',
    );
  });

  it("should reject invalid gap-spelling weights", () => {
    const bad = {
      ...englishConfig,
      gapSpellings: [
        ...(englishConfig.gapSpellings ?? []),
        { name: "bad-weight", phonemes: ["t", "u"], replacement: "tow", weight: 0, targetLayer: "grapheme" as const },
      ],
    };
    expect(() => validateConfig(bad)).toThrow("gapSpellings[16].weight must be a finite number > 0");
  });

  it("should reject gap spellings without a target layer", () => {
    const bad = {
      ...englishConfig,
      gapSpellings: [
        ...(englishConfig.gapSpellings ?? []),
        { name: "layerless", phonemes: ["t", "u"], replacement: "teau" } as unknown as NonNullable<typeof englishConfig.gapSpellings>[number],
      ],
    };
    expect(() => validateConfig(bad)).toThrow(
      "gapSpellings[16].targetLayer must be one of grapheme|spellingRule|phonotactics|morphology|unknown",
    );
  });

  it("should reject gap spellings with unknown phonemes", () => {
    const bad = {
      ...englishConfig,
      gapSpellings: [
        ...(englishConfig.gapSpellings ?? []),
        { name: "bad-phoneme", phonemes: ["not-a-phoneme"], replacement: "x", targetLayer: "unknown" as const },
      ],
    };
    expect(() => validateConfig(bad)).toThrow(
      'gapSpellings[16].phonemes[0] contains unknown phoneme "not-a-phoneme"',
    );
  });

  it("should keep the English gap-spelling count on a ratchet", () => {
    expect(englishConfig.gapSpellings).toHaveLength(16);
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

  it("should throw when aspiration rule probability is out of range", () => {
    const bad = {
      ...englishConfig,
      pronunciation: {
        ...englishConfig.pronunciation,
        aspiration: {
          ...englishConfig.pronunciation.aspiration!,
          rules: [{ ...englishConfig.pronunciation.aspiration!.rules[0], probability: 101 }],
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow("pronunciation.aspiration.rules[0].probability is 101, must be in [0, 100]");
  });

  it("should throw when aspiration target selector sounds is empty", () => {
    const bad = {
      ...englishConfig,
      pronunciation: {
        ...englishConfig.pronunciation,
        aspiration: {
          ...englishConfig.pronunciation.aspiration!,
          targets: [{ segment: "onset", sounds: [] }],
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow("pronunciation.aspiration.targets[0].sounds must not be empty");
  });

  it("should throw when aspiration target selector uses an unknown onset", () => {
    const bad = {
      ...englishConfig,
      pronunciation: {
        ...englishConfig.pronunciation,
        aspiration: {
          ...englishConfig.pronunciation.aspiration!,
          targets: [{ segment: "onset", sounds: ["not-a-phoneme"] }],
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow('pronunciation.aspiration.targets[0].sounds contains unknown onset phoneme "not-a-phoneme"');
  });

  it("should throw when aspiration target selector uses an unknown nucleus", () => {
    const bad = {
      ...englishConfig,
      pronunciation: {
        ...englishConfig.pronunciation,
        aspiration: {
          ...englishConfig.pronunciation.aspiration!,
          targets: [{ segment: "nucleus", sounds: ["not-a-phoneme"] }],
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow('pronunciation.aspiration.targets[0].sounds contains unknown nucleus phoneme "not-a-phoneme"');
  });

  it("should throw when aspiration previousCodaSounds uses an unknown coda", () => {
    const bad = {
      ...englishConfig,
      pronunciation: {
        ...englishConfig.pronunciation,
        aspiration: {
          ...englishConfig.pronunciation.aspiration!,
          rules: [
            {
              ...englishConfig.pronunciation.aspiration!.rules[0],
              when: { previousCodaSounds: ["not-a-phoneme"] },
            },
          ],
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow('pronunciation.aspiration.rules[0].when.previousCodaSounds contains unknown coda phoneme "not-a-phoneme"');
  });

  it("should throw when pronunciation config is missing", () => {
    const bad = {
      ...englishConfig,
      pronunciation: undefined as unknown as typeof englishConfig.pronunciation,
    };
    expect(() => validateConfig(bad)).toThrow("pronunciation config is required");
  });

  it("should throw when a boundary policy value is out of range", () => {
    const bad = {
      ...englishConfig,
      generationWeights: {
        ...englishConfig.generationWeights,
        boundaryPolicy: {
          ...englishConfig.generationWeights.boundaryPolicy,
          risingCodaDrop: 101,
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow("generationWeights.boundaryPolicy.risingCodaDrop is 101, must be in [0, 100]");
  });

  it("should throw when hiatusPolicy bridge uses unknown phoneme", () => {
    const bad = {
      ...englishConfig,
      hiatusPolicy: {
        ...englishConfig.hiatusPolicy!,
        fallbackBridgeOnsets: [["not-a-phoneme", 100] as [string, number]],
      },
    };
    expect(() => validateConfig(bad)).toThrow("hiatusPolicy.fallbackBridgeOnsets contains unknown phoneme \"not-a-phoneme\"");
  });

  it("should throw when morphology boundary bridge weight is invalid", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        boundaryPolicy: {
          ...englishConfig.morphology!.boundaryPolicy!,
          fallbackBridgeOnsets: [["h", 0] as [string, number]],
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow("morphology.boundaryPolicy.fallbackBridgeOnsets has invalid weight 0 for \"h\" (must be > 0)");
  });

  it("should throw when a morphophonemic rule uses an unknown replacement phoneme", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        suffixes: englishConfig.morphology!.suffixes.map((suffix) =>
          suffix.written === "ity"
            ? {
              ...suffix,
              morphophonemicRules: [
                {
                  name: "bad-replacement",
                  phonologicalCondition: { position: "preceding", place: ["velar"] },
                  replaceSound: "not-a-phoneme",
                },
              ],
            }
            : suffix,
        ),
      },
    };
    expect(() => validateConfig(bad)).toThrow(/morphology\.suffixes\[\d+\]\.morphophonemicRules\[0\]\.replaceSound contains unknown phoneme "not-a-phoneme"/);
  });

  it("should throw when a suffix morphophonemic rule uses following-position conditions", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        suffixes: englishConfig.morphology!.suffixes.map((suffix) =>
          suffix.written === "ity"
            ? {
              ...suffix,
              morphophonemicRules: [
                {
                  name: "bad-position",
                  phonologicalCondition: { position: "following", place: ["velar"] },
                  replaceSound: "s",
                },
              ],
            }
            : suffix,
        ),
      },
    };
    expect(() => validateConfig(bad)).toThrow(/morphology\.suffixes\[\d+\]\.morphophonemicRules\[0\]\.phonologicalCondition\.position must be "preceding" for suffix rules/);
  });

  it("should throw when suffixed template weight is enabled without suffixes", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        suffixes: [],
        templateWeights: {
          text: { bare: 100, suffixed: 0, prefixed: 0, both: 0 },
          lexicon: { bare: 0, suffixed: 100, prefixed: 0, both: 0 },
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow(
      "morphology.templateWeights.lexicon.suffixed requires at least one morphology.suffixes entry",
    );
  });

  it("should throw when both template weight is enabled without prefixes", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        prefixes: [],
        templateWeights: {
          text: { bare: 100, suffixed: 0, prefixed: 0, both: 0 },
          lexicon: { bare: 0, suffixed: 0, prefixed: 100, both: 0 },
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow(
      "morphology.templateWeights.lexicon.prefixed requires at least one morphology.prefixes entry",
    );
  });

  it("should throw when enabled morphology has zero total template weight for a mode", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        templateWeights: {
          text: { bare: 0, suffixed: 0, prefixed: 0, both: 0 },
          lexicon: { ...englishConfig.morphology!.templateWeights.lexicon },
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow(
      "morphology.templateWeights.text must have positive total weight",
    );
  });

  it("should throw when a morphology template weight is negative", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        templateWeights: {
          text: { bare: 100, suffixed: 0, prefixed: -1, both: 0 },
          lexicon: { ...englishConfig.morphology!.templateWeights.lexicon },
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow(
      "morphology.templateWeights.text.prefixed must be a finite number >= 0",
    );
  });

  it("should throw when a morphology template weight is not finite", () => {
    const bad = {
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        templateWeights: {
          text: { bare: 100, suffixed: 0, prefixed: Number.POSITIVE_INFINITY, both: 0 },
          lexicon: { ...englishConfig.morphology!.templateWeights.lexicon },
        },
      },
    };
    expect(() => validateConfig(bad)).toThrow(
      "morphology.templateWeights.text.prefixed must be a finite number >= 0",
    );
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
        lexicon: { ...englishConfig.phonemeToSyllableWeights.lexicon, 6: undefined as number[] | undefined },
      },
    };
    expect(() => validateConfig(bad)).toThrow("phonemeToSyllableWeights.lexicon.6 must be a non-empty array");
  });
});
