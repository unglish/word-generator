import type { LanguageConfig } from "../config/language.js";
import type { Phoneme } from "../types.js";

/** Reweight an inventory for a test while preserving its position maps. */
export function withPhonemeWeights(
  config: LanguageConfig,
  weight: (phoneme: Phoneme) => Phoneme,
): LanguageConfig {
  const phonemes = new Map(config.phonemes.map((phoneme) => [phoneme, weight(phoneme)]));
  const mapPosition = (position: keyof LanguageConfig["phonemeMaps"]) =>
    new Map(Array.from(config.phonemeMaps[position], ([sound, choices]) =>
      [sound, choices.map((phoneme) => phonemes.get(phoneme)!)] as const,
    ));

  return {
    ...config,
    phonemes: [...phonemes.values()],
    phonemeMaps: {
      onset: mapPosition("onset"),
      nucleus: mapPosition("nucleus"),
      coda: mapPosition("coda"),
    },
  };
}
