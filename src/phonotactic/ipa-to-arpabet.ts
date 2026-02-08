/**
 * Maps IPA phoneme symbols (as used by the word generator) to ARPABET symbols
 * (as used by the UCI Phonotactic Calculator's English corpus).
 *
 * The generator stores phonemes as `Phoneme.sound` strings which may include
 * diacritics like aspiration (ʰ) and stress markers (ˈ, ˌ). This module
 * strips those before mapping.
 */

import { Phoneme, Syllable, Word } from '../types.js';

/**
 * IPA → ARPABET mapping.
 * Multi-character IPA symbols (diphthongs, affricates) must be listed
 * so they are matched before their component single characters.
 */
const IPA_TO_ARPABET: Record<string, string> = {
  // Diphthongs & triphthongs (longest first for greedy matching)
  'aɪə': 'AY ER',   // fire → approximate as AY + ER
  'aʊə': 'AW ER',   // hour → approximate as AW + ER
  'eɪə': 'EY ER',   // player
  'ɔɪə': 'OY ER',   // employer
  'əʊə': 'OW ER',   // lower
  'eɪ':  'EY',       // day
  'ɪə':  'IH R',     // dear (approximation)
  'eə':  'EH R',     // fair (approximation)
  'aɪ':  'AY',       // fly
  'ʊə':  'UH R',     // sure (approximation)
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
  'ɛ':  'EH',        // let (same ARPABET as /e/)
  'ə':  'AH',        // the (schwa)
  'ɜ':  'ER',        // bird-like
  'ɚ':  'ER',        // her, letter
  'æ':  'AE',        // apple
  'ɑ':  'AA',        // father
  'ɔ':  'AO',        // ball
  'o':  'OW',        // hope (mapped to OW diphthong as in GenAm)
  'ʊ':  'UH',        // book
  'u':  'UW',        // blue
  'ʌ':  'AH',        // cup (same ARPABET as schwa)

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
 * IPA keys sorted by length descending for explicit greedy matching.
 * This ensures triphthongs match before diphthongs, diphthongs before
 * single characters, regardless of JS object key ordering.
 */
const IPA_KEYS_BY_LENGTH = Object.keys(IPA_TO_ARPABET)
  .sort((a, b) => b.length - a.length || a.localeCompare(b));

/**
 * Convert a single IPA phoneme sound string to ARPABET.
 * Uses greedy matching: longest IPA key that matches wins.
 * Returns null if no mapping is found.
 */
export function ipaToArpabet(ipaSound: string): string | null {
  const cleaned = stripDiacritics(ipaSound);
  for (const key of IPA_KEYS_BY_LENGTH) {
    if (cleaned === key) return IPA_TO_ARPABET[key];
  }
  return null;
}

/**
 * Convert an array of Phoneme objects to a space-separated ARPABET string
 * suitable for the UCI Phonotactic Calculator.
 */
export function phonemesToArpabet(phonemes: Phoneme[]): string {
  return phonemes
    .map(p => ipaToArpabet(p.sound))
    .filter((a): a is string => a !== null)
    .join(' ');
}

/**
 * Convert a Word's syllables to a single space-separated ARPABET string.
 * Stress markers and syllable boundaries are stripped (UCI doesn't use them).
 */
export function wordToArpabet(word: Word): string {
  const allPhonemes: Phoneme[] = [];
  for (const syl of word.syllables) {
    allPhonemes.push(...syl.onset, ...syl.nucleus, ...syl.coda);
  }
  return phonemesToArpabet(allPhonemes);
}
