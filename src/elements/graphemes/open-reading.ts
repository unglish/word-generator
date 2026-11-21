import type { OpenReadingRequirement } from "../../types.js";

/**
 * One-consonant codas a reader keeps in the syllable before a vowel: their
 * digraph spelling reads as closing it (si-nger, bi-shop, ri-ches, o-ther).
 */
export const HELD_CODAS = ["ŋ", "ʃ", "tʃ", "θ", "ð"];

/** Consonants English always spells with two letters, which magic-e cannot cross (ieshoor). */
export const DIGRAPH_CONSONANTS = ["ʃ", "ʒ", "tʃ", "dʒ", "θ", "ð", "ŋ"];

/**
 * Open-reading requirement for a single long-vowel letter (#470), with the
 * coda clusters English writes after that letter (`["n", "d"]` for *kind*).
 */
export function openReading(...codas: string[][]): OpenReadingRequirement {
  return { codas, heldCodas: HELD_CODAS };
}
