import { Phoneme, WordGenerationContext } from "../types.js";
import { LanguageConfig } from "../config/language.js";
/**
 * Tokenize a string into grapheme units using longest-match-first.
 * Multi-letter consonant graphemes (e.g. "tch", "ch", "sh") are treated as
 * atomic units. Remaining characters become single-letter tokens.
 *
 * @example tokenizeGraphemes("tchwng") → ["tch", "w", "ng"]
 * @example tokenizeGraphemes("strengths") → ["s", "t", "r", "e", "ng", "th", "s"]
 */
export declare function tokenizeGraphemes(str: string, graphemeList?: string[]): string[];
/**
 * Repair consonant pileups by capping consecutive consonant grapheme units at `max`.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 *
 * Strategy: when a consonant run exceeds `max` grapheme units, find the
 * syllable boundary within the run, determine which side (coda vs onset)
 * contributes more, and drop entire grapheme tokens from the heavier side
 * (interior-first) until the run fits.
 */
export declare function repairConsonantPileups(cleanParts: string[], hyphenatedParts: string[], maxConsonantGraphemes: number, consonantGraphemes?: string[]): void;
export declare function mannerGroup(p: Phoneme): string;
export declare function isCoronal(p: Phoneme): boolean;
export declare function placeGroup(p: Phoneme): string;
export interface SyllableBoundary {
    codaFinal: Phoneme | undefined;
    onsetInitial: Phoneme | undefined;
    onsetCluster: Phoneme[];
}
export declare function isJunctionValid(C1: Phoneme, C2: Phoneme, onsetCluster: Phoneme[]): boolean;
/**
 * Repair coda→onset junctions using feature-based articulatory rules.
 * Drops grapheme tokens from the coda side when the junction is invalid.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 */
export declare function repairJunctions(cleanParts: string[], hyphenatedParts: string[], boundaries: SyllableBoundary[], consonantGraphemes?: string[]): void;
/**
 * Repair consonant pileups by counting raw consonant *letters* (not grapheme units).
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 */
export declare function repairConsonantLetters(cleanParts: string[], hyphenatedParts: string[], maxLetters: number): void;
/**
 * Repair vowel pileups by counting raw vowel *letters* (a, e, i, o, u, y).
 * Trims excess vowels from the end of any run exceeding `maxLetters`.
 * Mutates `cleanParts` and `hyphenatedParts` in place.
 */
export declare function repairVowelLetters(cleanParts: string[], hyphenatedParts: string[], maxLetters: number): void;
/**
 * Creates a `generateWrittenForm` function bound to the given language config's
 * grapheme maps. The cumulative frequency table is pre-computed once at creation.
 */
export declare function createWrittenFormGenerator(config: LanguageConfig): (context: WordGenerationContext) => void;
//# sourceMappingURL=write.d.ts.map