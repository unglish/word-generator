/**
 * Grapheme definitions and pre-computed maps.
 * 
 * This module exports the complete grapheme inventory for English orthography,
 * organized by phoneme category, along with pre-computed lookup maps for
 * efficient grapheme selection during word generation.
 * 
 * @example
 * ```ts
 * import { graphemes, graphemeMaps } from './elements/graphemes';
 * 
 * // Access all graphemes
 * console.log(graphemes.length); // 190 grapheme mappings
 * 
 * // Access graphemes by position
 * const onsetGraphemes = graphemeMaps.onset.get('s'); // spellings for /s/ in onset
 * ```
 */

import { Grapheme, getPositionWeight } from "../../types.js";

// Import grapheme categories
import { vowelGraphemes } from "./vowels.js";
import { diphthongGraphemes } from "./diphthongs.js";
import { triphthongGraphemes } from "./triphthongs.js";
import { glideGraphemes } from "./glides.js";
import { liquidGraphemes } from "./liquids.js";
import { nasalGraphemes } from "./nasals.js";
import { fricativeGraphemes } from "./fricatives.js";
import { affricateGraphemes } from "./affricates.js";
import { stopGraphemes } from "./stops.js";

// Re-export types
export { ORIGINS } from "./types.js";

// Re-export category arrays for direct access
export { vowelGraphemes } from "./vowels.js";
export { diphthongGraphemes } from "./diphthongs.js";
export { triphthongGraphemes } from "./triphthongs.js";
export { glideGraphemes } from "./glides.js";
export { liquidGraphemes } from "./liquids.js";
export { nasalGraphemes } from "./nasals.js";
export { fricativeGraphemes } from "./fricatives.js";
export { affricateGraphemes } from "./affricates.js";
export { stopGraphemes } from "./stops.js";

/**
 * Complete grapheme inventory combining all categories.
 * 
 * Order follows linguistic convention:
 * 1. Vowels (monophthongs)
 * 2. Diphthongs
 * 3. Triphthongs
 * 4. Glides (semivowels)
 * 5. Liquids
 * 6. Nasals
 * 7. Fricatives
 * 8. Affricates
 * 9. Stops (plosives)
 */
export const graphemes: Grapheme[] = [
  ...vowelGraphemes,
  ...diphthongGraphemes,
  ...triphthongGraphemes,
  ...glideGraphemes,
  ...liquidGraphemes,
  ...nasalGraphemes,
  ...fricativeGraphemes,
  ...affricateGraphemes,
  ...stopGraphemes,
];

/**
 * Pre-computed grapheme maps organized by syllable position.
 * 
 * Maps phoneme sounds to arrays of valid graphemes for each position:
 * - onset: Graphemes valid at syllable start (before vowel)
 * - nucleus: Graphemes valid as syllable core (vowels)
 * - coda: Graphemes valid at syllable end (after vowel)
 */
export const graphemeMaps = {
  onset: new Map<string, Grapheme[]>(),
  nucleus: new Map<string, Grapheme[]>(),
  coda: new Map<string, Grapheme[]>(),
};

/**
 * Pre-computed cumulative frequency arrays for weighted random selection.
 * 
 * For each phoneme in each position, stores cumulative frequencies
 * to enable O(1) weighted random selection.
 */
export const cumulativeFrequencies = {
  onset: new Map<string, number[]>(),
  nucleus: new Map<string, number[]>(),
  coda: new Map<string, number[]>(),
};

// Build the maps at module initialization
for (const position of ["onset", "nucleus", "coda"] as const) {
  for (const grapheme of graphemes) {
    const weight = getPositionWeight(grapheme, position);
    if (weight === undefined || weight > 0) {
      if (!graphemeMaps[position].has(grapheme.phoneme)) {
        graphemeMaps[position].set(grapheme.phoneme, []);
        cumulativeFrequencies[position].set(grapheme.phoneme, []);
      }
      const graphemeList = graphemeMaps[position].get(grapheme.phoneme);
      const frequencyList = cumulativeFrequencies[position].get(grapheme.phoneme);

      if (graphemeList && frequencyList) {
        graphemeList.push(grapheme);
        const lastFreq = frequencyList.length > 0 ? frequencyList[frequencyList.length - 1] : 0;
        frequencyList.push(lastFreq + grapheme.frequency);
      }
    }
  }
}
