/**
 * Maps IPA phoneme symbols (as used by the word generator) to ARPABET symbols
 * (as used by the CMU Pronouncing Dictionary bigram table).
 *
 * The generator stores phonemes as `Phoneme.sound` strings which may include
 * diacritics like aspiration (ʰ) and stress markers (ˈ, ˌ). This module
 * strips those before mapping.
 *
 * Each phoneme arrives pre-segmented from the generator, so matching is a
 * direct lookup — no substring/greedy parsing required.
 */
import { Phoneme, Word } from '../types.js';
/**
 * Convert a single IPA phoneme sound string to ARPABET.
 * Returns null if no mapping is found.
 */
export declare function ipaToArpabet(ipaSound: string): string | null;
/**
 * Convert an array of Phoneme objects to a space-separated ARPABET string.
 */
export declare function phonemesToArpabet(phonemes: Phoneme[]): string;
/**
 * Convert a Word's syllables to a single space-separated ARPABET string.
 * Stress markers and syllable boundaries are stripped.
 */
export declare function wordToArpabet(word: Word): string;
//# sourceMappingURL=ipa-to-arpabet.d.ts.map