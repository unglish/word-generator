/**
 * Phonotactic repair pass — runs on generated syllables AFTER syllable
 * generation, BEFORE write and pronounce. Fixes cross-syllable cluster
 * violations and word-final phoneme violations.
 */
import { Syllable } from "../types.js";
import type { ClusterLimits, SonorityConstraints, CodaConstraints } from "../config/language.js";
/**
 * Repair cross-syllable consonant cluster violations.
 * Scans each syllable boundary and applies the configured repair strategy.
 */
export declare function repairClusters(syllables: Syllable[], bannedSet: Set<string>, repair: "drop-coda" | "drop-onset"): void;
/**
 * Repair word-final coda violations.
 * If the last phoneme in the last syllable's coda is not in the allowed list, drop it.
 */
export declare function repairFinalCoda(syllables: Syllable[], allowedFinalSet: Set<string>): void;
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
export declare function repairClusterShape(syllables: Syllable[], opts: ClusterShapeOptions): void;
export declare function repairNgCodaSibilant(syllables: Syllable[]): void;
//# sourceMappingURL=repair.d.ts.map