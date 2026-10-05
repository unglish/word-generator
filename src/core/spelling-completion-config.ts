import type { LanguageConfig } from "../config/language.js";

/** Completion retains inventory identity, readings and contextual restrictions. */
export function completionConfiguration(configuration: LanguageConfig): LanguageConfig {
  const config = structuredClone(configuration);
  const overrides = config.splitVowels?.completionWeights;
  if (!overrides?.length) return config;
  const seen = new Set<number>();
  for (const override of overrides) {
    const matches = config.graphemes.flatMap((grapheme, index) =>
      grapheme.phoneme === override.phoneme && grapheme.form === override.form ? [index] : []);
    if (matches.length !== 1 || seen.has(matches[0])) throw new Error("Ambiguous completion weight identity");
    const index = matches[0];
    seen.add(index);
    const grapheme = config.graphemes[index];
    for (const key of ["startWord", "midWord", "endWord", "isolatedSyllableWeight"] as const) {
      const weight = override[key];
      if (weight === undefined) continue;
      if (!Number.isFinite(weight) || weight < 0) throw new Error("Invalid completion positional weight");
      grapheme[key] = weight;
    }
  }
  return config;
}
