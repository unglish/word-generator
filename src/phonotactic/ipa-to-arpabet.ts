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

const IPA_TO_ARPABET: Record<string, string> = {
  // Diphthongs
  'eɪ':  'EY',       // day
  'aɪ':  'AY',       // fly
  'əʊ':  'OW',       // globe
  'ɔɪ':  'OY',       // boy
  'aʊ':  'AW',       // cow

  // Affricates
  'tʃ': 'CH',        // chat
  'dʒ': 'JH',        // judge

  // Vowels
  'i:': 'IY',        // sheep (long i)
  'ɪ':  'IH',        // sit
  'e':  'EH',        // red
  'ɛ':  'EH',        // let
  'ə':  'AH',        // the (schwa)
  'ɜ':  'ER',        // bird
  'ɚ':  'ER',        // her
  'æ':  'AE',        // apple
  'ɑ':  'AA',        // father
  'ɔ':  'AO',        // ball
  'o':  'OW',        // hope (GenAm)
  'ʊ':  'UH',        // book
  'u':  'UW',        // blue
  'ʌ':  'AH',        // cup

  // Consonants
  'j':  'Y',
  'w':  'W',
  'l':  'L',
  'r':  'R',
  'm':  'M',
  'n':  'N',
  'ŋ':  'NG',
  'f':  'F',
  'θ':  'TH',
  'h':  'HH',
  'v':  'V',
  'ð':  'DH',
  'z':  'Z',
  'ʒ':  'ZH',
  's':  'S',
  'ʃ':  'SH',
  'p':  'P',
  't':  'T',
  'k':  'K',
  'b':  'B',
  'd':  'D',
  'g':  'G',
};

/**
 * Strip diacritics/modifiers from an IPA sound string.
 * Removes aspiration marker (ʰ) since ARPABET doesn't encode it.
 */
function stripDiacritics(sound: string): string {
  return sound.replace(/ʰ/g, '');
}

/**
 * Convert a single IPA phoneme sound string to ARPABET.
 * Returns null if no mapping is found.
 */
export function ipaToArpabet(ipaSound: string): string | null {
  return IPA_TO_ARPABET[stripDiacritics(ipaSound)] ?? null;
}

/**
 * Convert an array of Phoneme objects to a space-separated ARPABET string.
 */
export function phonemesToArpabet(phonemes: Phoneme[]): string {
  return phonemes
    .map(p => ipaToArpabet(p.sound))
    .filter((a): a is string => a !== null)
    .join(' ');
}

/**
 * Convert a Word's syllables to a single space-separated ARPABET string.
 * Stress markers and syllable boundaries are stripped.
 */
export function wordToArpabet(word: Word): string {
  const allPhonemes: Phoneme[] = [];
  for (const syl of word.syllables) {
    allPhonemes.push(...syl.onset, ...syl.nucleus, ...syl.coda);
  }
  return phonemesToArpabet(allPhonemes);
}
