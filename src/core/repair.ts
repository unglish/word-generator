/**
 * Phonotactic repair pass — runs on generated syllables AFTER pronounce,
 * BEFORE write. Fixes cross-syllable cluster violations and word-final
 * phoneme violations.
 */
import { Syllable } from "../types.js";
import type { CodaConstraints } from "../config/language.js";

/**
 * Repair cross-syllable consonant cluster violations.
 * Scans each syllable boundary and applies the configured repair strategy.
 */
export function repairClusters(
  syllables: Syllable[],
  bannedSet: Set<string>,
  repair: "drop-coda" | "drop-onset" | "insert-schwa",
): void {

  for (let i = 0; i < syllables.length - 1; i++) {
    const coda = syllables[i].coda;
    const onset = syllables[i + 1].onset;

    if (coda.length === 0 || onset.length === 0) continue;

    const lastCoda = coda[coda.length - 1].sound;
    const firstOnset = onset[0].sound;

    if (bannedSet.has(`${lastCoda}|${firstOnset}`)) {
      switch (repair) {
        case "drop-coda":
          coda.pop();
          break;
        case "drop-onset":
          onset.shift();
          break;
        case "insert-schwa":
          // Not implemented for now
          break;
      }
    }
  }
}

/**
 * Repair word-final coda violations.
 * If the last phoneme in the last syllable's coda is not in the allowed list, drop it.
 */
export function repairFinalCoda(
  syllables: Syllable[],
  constraint: CodaConstraints,
): void {
  if (!constraint.allowedFinal || syllables.length === 0) return;

  const lastSyllable = syllables[syllables.length - 1];
  const coda = lastSyllable.coda;

  if (coda.length === 0) return;

  const allowedSet = new Set(constraint.allowedFinal);

  // Keep dropping disallowed final phonemes
  while (coda.length > 0 && !allowedSet.has(coda[coda.length - 1].sound)) {
    if (constraint.repair === "drop") {
      coda.pop();
    } else {
      break; // append-schwa not implemented
    }
  }
}
