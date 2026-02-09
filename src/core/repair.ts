/**
 * Phonotactic repair pass — runs on generated syllables AFTER pronounce,
 * BEFORE write. Fixes cross-syllable cluster violations and word-final
 * phoneme violations.
 */
import { Syllable, WordGenerationContext } from "../types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusterConstraint {
  /** [coda sound, onset sound] pairs that are illegal across syllable boundaries. */
  banned?: [string, string][];
  /** How to repair a banned cluster. */
  repair: "drop-coda" | "drop-onset" | "insert-schwa";
}

export interface CodaConstraints {
  /** Phoneme sounds allowed in word-final position. */
  allowedFinal?: string[];
  /** How to repair a disallowed final phoneme. */
  repair: "drop" | "append-schwa";
}

// ---------------------------------------------------------------------------
// English defaults
// ---------------------------------------------------------------------------

/**
 * Banned cross-syllable [coda, onset] pairs for English.
 *
 * /ŋ/ can only precede /k/, /g/, or nothing (word-finally).
 * /ʒ/ before stops is unattested cross-syllable.
 * /ð/ before most stops is very rare.
 * Homorganic stop+nasal reversals, and other phonotactically odd combos.
 */
const ENGLISH_BANNED_CLUSTERS: [string, string][] = [
  // /ŋ/ before anything except /k/, /g/
  ["ŋ", "p"], ["ŋ", "b"], ["ŋ", "t"], ["ŋ", "d"],
  ["ŋ", "f"], ["ŋ", "v"], ["ŋ", "θ"], ["ŋ", "ð"],
  ["ŋ", "s"], ["ŋ", "z"], ["ŋ", "ʃ"], ["ŋ", "ʒ"],
  ["ŋ", "tʃ"], ["ŋ", "dʒ"], ["ŋ", "m"], ["ŋ", "n"],
  ["ŋ", "l"], ["ŋ", "r"], ["ŋ", "j"], ["ŋ", "w"],
  ["ŋ", "h"],

  // /ʒ/ before stops
  ["ʒ", "p"], ["ʒ", "b"], ["ʒ", "t"], ["ʒ", "d"],
  ["ʒ", "k"], ["ʒ", "g"],

  // /ð/ before stops
  ["ð", "p"], ["ð", "b"], ["ð", "t"], ["ð", "d"],
  ["ð", "k"], ["ð", "g"],

  // /h/ should never be in coda, but just in case
  ["h", "p"], ["h", "b"], ["h", "t"], ["h", "d"],
  ["h", "k"], ["h", "g"],

  // Same-place stop sequences across boundaries (unattested)
  ["p", "b"], ["b", "p"],
  ["t", "d"], ["d", "t"],
  ["k", "g"], ["g", "k"],

  // Nasal+stop place mismatches that don't occur
  // Note: ["m", "t"] and ["m", "d"] omitted — they occur in English (e.g., "empty", "Camden")
  ["m", "k"], ["m", "g"],
  ["n", "p"], ["n", "b"],
];

export const englishClusterConstraint: ClusterConstraint = {
  banned: ENGLISH_BANNED_CLUSTERS,
  repair: "drop-coda",
};

export const englishCodaConstraints: CodaConstraints = {
  allowedFinal: [
    "p", "b", "t", "d", "k", "g",
    "f", "v", "s", "z", "ʃ",
    "tʃ", "dʒ",
    "m", "n", "ŋ",
    "l", "r", "θ",
  ],
  repair: "drop",
};

// ---------------------------------------------------------------------------
// Repair functions
// ---------------------------------------------------------------------------

/**
 * Repair cross-syllable consonant cluster violations.
 * Scans each syllable boundary and applies the configured repair strategy.
 */
export function repairClusters(
  syllables: Syllable[],
  constraint: ClusterConstraint,
): void {
  if (!constraint.banned || constraint.banned.length === 0) return;

  // Build a Set for O(1) lookup
  const bannedSet = new Set(constraint.banned.map(([a, b]) => `${a}|${b}`));

  for (let i = 0; i < syllables.length - 1; i++) {
    const coda = syllables[i].coda;
    const onset = syllables[i + 1].onset;

    if (coda.length === 0 || onset.length === 0) continue;

    const lastCoda = coda[coda.length - 1].sound;
    const firstOnset = onset[0].sound;

    if (bannedSet.has(`${lastCoda}|${firstOnset}`)) {
      switch (constraint.repair) {
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
