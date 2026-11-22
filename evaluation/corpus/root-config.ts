import { englishConfig } from "../../src/config/english.js";

const { morphology, clusterLimits, phonemeLengthWeights, phonemeToSyllableWeights, phonemes } = englishConfig;
if (!morphology) throw new Error("The root reference requires English morphology.");

export const rootAffixes = [...morphology.prefixes, ...morphology.suffixes];

// Share config data with the verifier, without sharing any stripping decisions.
export const rootConfig = {
  affixes: rootAffixes.map(({ type, written, phonemes, stressEffect, frequency, allomorphs, boundaryTransforms, morphophonemicRules }) => ({
    type, written, phonemes, stressEffect, frequency, allomorphs: allomorphs ?? [],
    edgeRules: (morphophonemicRules ?? []).filter(rule => rule.target !== "nucleus").map(rule => ({
      condition: rule.phonologicalCondition ?? null,
      writtenMatch: rule.writtenMatch?.source ?? null,
      flags: rule.writtenMatch?.flags ?? "",
      replaceSound: rule.replaceSound ?? null,
    })),
    transforms: boundaryTransforms?.map(({ name, affixWritten }) => ({ name, affixWritten: affixWritten ?? null })) ?? [],
  })),
  features: Object.fromEntries(phonemes.map(({ sound, voiced, mannerOfArticulation, placeOfArticulation }) =>
    [sound, { voiced, manner: mannerOfArticulation, place: placeOfArticulation }])),
  templateWeights: morphology.templateWeights.lexicon,
  phoneWeights: phonemeLengthWeights.lexicon,
  syllableWeightsByPhones: phonemeToSyllableWeights.lexicon,
  attestedCodas: clusterLimits?.attestedCodas ?? [],
};
