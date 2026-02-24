/**
 * Phonotactic repair pass — runs on generated syllables AFTER syllable
 * generation, BEFORE write and pronounce. Fixes cross-syllable cluster
 * violations and word-final phoneme violations.
 */
import { Phoneme, Syllable } from "../types.js";
import type { ClusterLimits, SonorityConstraints, CodaConstraints } from "../config/language.js";
import type { TraceCollector } from "./trace.js";

/**
 * Repair cross-syllable consonant cluster violations.
 * Scans each syllable boundary and applies the configured repair strategy.
 */
export function repairClusters(
  syllables: Syllable[],
  bannedSet: Set<string>,
  repair: "drop-coda" | "drop-onset",
  trace?: TraceCollector,
): void {

  for (let i = 0; i < syllables.length - 1; i++) {
    const coda = syllables[i].coda;
    const onset = syllables[i + 1].onset;

    if (coda.length === 0 || onset.length === 0) continue;

    const codaBefore = trace ? coda.map(p => p.sound).join(",") : "";
    const onsetBefore = trace ? onset.map(p => p.sound).join(",") : "";

    // Drop phonemes until the boundary is legal (or one side is empty)
    while (coda.length > 0 && onset.length > 0 &&
           bannedSet.has(`${coda[coda.length - 1].sound}|${onset[0].sound}`)) {
      if (repair === "drop-coda") coda.pop();
      else onset.shift();
    }

    if (trace) {
      const codaAfter = coda.map(p => p.sound).join(",");
      const onsetAfter = onset.map(p => p.sound).join(",");
      trace.recordRepair("repairClusters", `${codaBefore}|${onsetBefore}`, `${codaAfter}|${onsetAfter}`, `boundary ${i}→${i+1}, strategy: ${repair}`);
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
  trace?: TraceCollector,
): void {
  if (syllables.length === 0) return;

  const lastSyllable = syllables[syllables.length - 1];
  const coda = lastSyllable.coda;

  if (coda.length === 0) return;

  const before = trace ? coda.map(p => p.sound).join(",") : "";

  // Keep dropping disallowed final phonemes
  while (coda.length > 0 && !allowedFinalSet.has(coda[coda.length - 1].sound)) {
    coda.pop();
  }

  if (trace) {
    trace.recordRepair("repairFinalCoda", before, coda.map(p => p.sound).join(","), "dropped disallowed final phonemes");
  }
}

import { isObstruent, isNasal, isStop } from "../utils/phonemes.js";

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
  trace?: TraceCollector,
): void {
  for (let si = 0; si < syllables.length; si++) {
    const syl = syllables[si];

    // --- Truncate over-long onsets ---
    if (opts.clusterLimits && syl.onset.length > opts.clusterLimits.maxOnset) {
      const before = trace ? syl.onset.map(p => p.sound).join(",") : "";
      syl.onset.splice(0, syl.onset.length - opts.clusterLimits.maxOnset);
      if (trace) trace.recordRepair("repairClusterShape:onsetTruncate", before, syl.onset.map(p => p.sound).join(","), `syl ${si}`);
    }

    // --- Truncate over-long codas ---
    if (opts.clusterLimits && syl.coda.length > 0) {
      const cl = opts.clusterLimits;
      const lastSound = syl.coda[syl.coda.length - 1].sound;
      const effectiveMax = opts.codaAppendantSet?.has(lastSound)
        ? cl.maxCoda + 1
        : cl.maxCoda;
      if (syl.coda.length > effectiveMax) {
        const before = trace ? syl.coda.map(p => p.sound).join(",") : "";
        while (syl.coda.length > effectiveMax) {
          syl.coda.shift();
        }
        if (trace) trace.recordRepair("repairClusterShape:codaTruncate", before, syl.coda.map(p => p.sound).join(","), `syl ${si}`);
      }
    }

    // --- Voicing agreement among coda obstruents ---
    if (opts.codaConstraints?.voicingAgreement && syl.coda.length >= 2) {
      const before = trace ? syl.coda.map(p => p.sound).join(",") : "";
      repairVoicingAgreement(syl.coda);
      if (trace) trace.recordRepair("repairClusterShape:voicingAgreement", before, syl.coda.map(p => p.sound).join(","), `syl ${si}`);
    }

    // --- Homorganic nasal+stop ---
    if (opts.codaConstraints?.homorganicNasalStop && syl.coda.length >= 2) {
      const before = trace ? syl.coda.map(p => p.sound).join(",") : "";
      repairHomorganicNasalStop(syl.coda);
      if (trace) trace.recordRepair("repairClusterShape:homorganicNasalStop", before, syl.coda.map(p => p.sound).join(","), `syl ${si}`);
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
// ---------------------------------------------------------------------------
// /h/ after back vowels — phonotactic constraint
// ---------------------------------------------------------------------------

const BACK_VOWEL_NUCLEI = new Set(["ʌ", "ʊ"]);

/**
 * Penalize /h/ onset after /ʌ/ or /ʊ/ nucleus with empty coda.
 * In English this pattern only occurs at morpheme boundaries (un-happy).
 * We drop the /h/ onset, leaving the next syllable onsetless.
 */
export function repairHAfterBackVowel(syllables: Syllable[], trace?: TraceCollector): void {
  for (let i = 0; i < syllables.length - 1; i++) {
    const curr = syllables[i];
    const next = syllables[i + 1];

    if (
      curr.coda.length === 0 &&
      curr.nucleus.length > 0 &&
      BACK_VOWEL_NUCLEI.has(curr.nucleus[curr.nucleus.length - 1].sound) &&
      next.onset.length === 1 &&
      next.onset[0].sound === "h"
    ) {
      next.onset.splice(0, 1);
      trace?.recordRepair("repairHAfterBackVowel", "h", "", `dropped /h/ onset after /${curr.nucleus[curr.nucleus.length - 1].sound}/ at syl ${i}→${i+1}`);
    }
  }
}

// ---------------------------------------------------------------------------
// /h/ after back vowels — phonotactic constraint
// ---------------------------------------------------------------------------
