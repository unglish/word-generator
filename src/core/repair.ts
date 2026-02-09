/**
 * Phonotactic repair pass — runs on generated syllables AFTER syllable
 * generation, BEFORE write and pronounce. Fixes cross-syllable cluster
 * violations and word-final phoneme violations.
 */
import { Syllable } from "../types.js";

/**
 * Repair cross-syllable consonant cluster violations.
 * Scans each syllable boundary and applies the configured repair strategy.
 */
export function repairClusters(
  syllables: Syllable[],
  bannedSet: Set<string>,
  repair: "drop-coda" | "drop-onset",
): void {

  for (let i = 0; i < syllables.length - 1; i++) {
    const coda = syllables[i].coda;
    const onset = syllables[i + 1].onset;

    if (coda.length === 0 || onset.length === 0) continue;

    // Drop phonemes until the boundary is legal (or one side is empty)
    while (coda.length > 0 && onset.length > 0 &&
           bannedSet.has(`${coda[coda.length - 1].sound}|${onset[0].sound}`)) {
      if (repair === "drop-coda") coda.pop();
      else onset.shift();
    }
  }
}

/**
 * Repair word-final coda violations.
 * If the last phoneme in the last syllable's coda is not in the allowed list, drop it.
 */
export function repairFinalCoda(
  syllables: Syllable[],
  allowedFinalSet: Set<string>,
): void {
  if (syllables.length === 0) return;

  const lastSyllable = syllables[syllables.length - 1];
  const coda = lastSyllable.coda;

  if (coda.length === 0) return;

  // Keep dropping disallowed final phonemes
  while (coda.length > 0 && !allowedFinalSet.has(coda[coda.length - 1].sound)) {
    coda.pop();
  }
}
