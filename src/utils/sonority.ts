import type { Phoneme } from "../types.js";

/**
 * Sonority hierarchy mapping: manner/place of articulation to sonority value.
 * Higher values = more sonorous (vowels highest, stops lowest).
 *
 * Keys are type-checked against the Phoneme articulation unions, so typos
 * like `"fircative"` are caught at compile time. `Partial` because not
 * every language uses every articulation category.
 */
export interface SonorityHierarchy {
  mannerOfArticulation: Partial<
    Record<Phoneme["mannerOfArticulation"], number>
  >;
  /**
   * Sonority adjustment by place of articulation.
   *
   * Note: this combines vowel position (front / central / back) and
   * consonant place of articulation (bilabial, alveolar, …) into a
   * single map. Linguistically these are different dimensions, but for
   * sonority scoring a unified numeric adjustment works well enough.
   */
  placeOfArticulation: Partial<Record<Phoneme["placeOfArticulation"], number>>;
  voicedBonus: number;
  tenseBonus: number;
}

export function inventorySonorityLevels(
  phonemes: readonly Phoneme[],
  hierarchy: SonorityHierarchy,
): Map<Phoneme, number> {
  const { mannerOfArticulation, placeOfArticulation, voicedBonus, tenseBonus } =
    hierarchy;

  return new Map(
    phonemes.map((p) => [
      p,
      (mannerOfArticulation[p.mannerOfArticulation] ?? 0) +
        (placeOfArticulation[p.placeOfArticulation] ?? 0) +
        (p.voiced ? voicedBonus : 0) +
        (p.tense ? tenseBonus : 0),
    ]),
  );
}
