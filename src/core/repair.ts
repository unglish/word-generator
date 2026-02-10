/**
 * Phonotactic repair pass — runs on generated syllables AFTER syllable
 * generation, BEFORE write and pronounce. Fixes cross-syllable cluster
 * violations and word-final phoneme violations.
 */
import { Phoneme, Syllable } from "../types.js";
import type { ClusterLimits, SonorityConstraints, CodaConstraints } from "../config/language.js";

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

// ---------------------------------------------------------------------------
// Place-of-articulation grouping for homorganic nasal+stop
// ---------------------------------------------------------------------------

const PLACE_GROUPS: Record<string, string[]> = {
  bilabial: ["m", "p", "b"],
  alveolar: ["n", "t", "d"],
  velar: ["ŋ", "k", "g"],
};

function getPlaceGroup(sound: string): string | undefined {
  for (const [group, members] of Object.entries(PLACE_GROUPS)) {
    if (members.includes(sound)) return group;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Obstruent classification for voicing agreement
// ---------------------------------------------------------------------------

const OBSTRUENT_MANNERS = new Set([
  "stop", "fricative", "affricate", "sibilant",
]);

function isObstruent(p: Phoneme): boolean {
  return OBSTRUENT_MANNERS.has(p.mannerOfArticulation);
}

function isNasal(p: Phoneme): boolean {
  return p.mannerOfArticulation === "nasal";
}

function isStop(p: Phoneme): boolean {
  return p.mannerOfArticulation === "stop";
}

// ---------------------------------------------------------------------------
// Cluster shape repair (safety net)
// ---------------------------------------------------------------------------

export interface ClusterShapeOptions {
  clusterLimits?: ClusterLimits;
  sonorityConstraints?: SonorityConstraints;
  codaConstraints?: CodaConstraints;
  sonorityBySound?: Map<string, number>;
  codaAppendantSet?: Set<string>;
  sonorityExemptSet?: Set<string>;
}

/**
 * Repair cluster shapes: truncate over-long clusters, enforce voicing
 * agreement among coda obstruents, enforce homorganic nasal+stop.
 */
export function repairClusterShape(
  syllables: Syllable[],
  opts: ClusterShapeOptions,
): void {
  for (const syl of syllables) {
    // --- Truncate over-long onsets ---
    if (opts.clusterLimits && syl.onset.length > opts.clusterLimits.maxOnset) {
      syl.onset.splice(0, syl.onset.length - opts.clusterLimits.maxOnset);
    }

    // --- Truncate over-long codas ---
    if (opts.clusterLimits && syl.coda.length > 0) {
      const cl = opts.clusterLimits;
      const lastSound = syl.coda[syl.coda.length - 1].sound;
      const effectiveMax = opts.codaAppendantSet?.has(lastSound)
        ? cl.maxCoda + 1
        : cl.maxCoda;
      while (syl.coda.length > effectiveMax) {
        // Remove from the beginning (least sonorous edge) to preserve the more
        // important final consonants
        syl.coda.shift();
      }
    }

    // --- Voicing agreement among coda obstruents ---
    if (opts.codaConstraints?.voicingAgreement && syl.coda.length >= 2) {
      repairVoicingAgreement(syl.coda);
    }

    // --- Homorganic nasal+stop ---
    if (opts.codaConstraints?.homorganicNasalStop && syl.coda.length >= 2) {
      repairHomorganicNasalStop(syl.coda);
    }
  }
}

/**
 * Enforce voicing agreement: all obstruents in a coda cluster must share
 * the same voicing. The last obstruent wins; drop earlier ones that disagree.
 */
function repairVoicingAgreement(coda: Phoneme[]): void {
  // Find the last obstruent to determine target voicing
  let lastObsIdx = -1;
  for (let i = coda.length - 1; i >= 0; i--) {
    if (isObstruent(coda[i])) { lastObsIdx = i; break; }
  }
  if (lastObsIdx < 0) return;

  const targetVoiced = coda[lastObsIdx].voiced;
  for (let i = coda.length - 2; i >= 0; i--) {
    if (isObstruent(coda[i]) && coda[i].voiced !== targetVoiced) {
      coda.splice(i, 1);
    }
  }
}

/**
 * Enforce homorganic nasal+stop: if a nasal is immediately followed by a stop
 * in the coda and they disagree in place, drop the nasal.
 */
function repairHomorganicNasalStop(coda: Phoneme[]): void {
  for (let i = coda.length - 2; i >= 0; i--) {
    if (isNasal(coda[i]) && isStop(coda[i + 1])) {
      const nasalPlace = getPlaceGroup(coda[i].sound);
      const stopPlace = getPlaceGroup(coda[i + 1].sound);
      if (nasalPlace && stopPlace && nasalPlace !== stopPlace) {
        coda.splice(i, 1);
      }
    }
  }
}

/**
 * Strip sibilants (/s/, /z/) that follow /ŋ/ in a coda — these clusters
 * only arise across morpheme boundaries in English (e.g. "songs" = song+s).
 *
 * Other post-/ŋ/ consonants are left alone:
 * - /k/, /g/ — homorganic stops (think, bank)
 * - /θ/ — monomorphemic (length, strength)
 * - /t/, /d/ — morphologically valid (thanked, longed)
 */
const NG_SIBILANTS = new Set(["s", "z"]);

export function repairNgCodaSibilant(syllables: Syllable[]): void {
  for (const syl of syllables) {
    const coda = syl.coda;
    if (coda.length < 2) continue;

    // Find /ŋ/ position
    let ngIdx = -1;
    for (let i = 0; i < coda.length; i++) {
      if (coda[i].sound === "ŋ") { ngIdx = i; break; }
    }
    if (ngIdx < 0) continue;

    // Splice backwards to avoid index shifting
    for (let i = coda.length - 1; i > ngIdx; i--) {
      if (NG_SIBILANTS.has(coda[i].sound)) {
        coda.splice(i, 1);
      }
    }
  }
}
