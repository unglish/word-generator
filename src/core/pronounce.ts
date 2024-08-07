import { Phoneme, Syllable, WordGenerationContext } from "../types";

/**
 * Converts a syllable object into a string representation of its pronunciation.
 * 
 * @param syllable - The Syllable object to be pronounced.
 * @returns A string representing the pronunciation of the syllable.
 * 
 * This function takes a Syllable object and converts it into a string
 * representation of its pronunciation. It does this by concatenating
 * the phonetic sounds of each phoneme in the onset, nucleus, and coda
 * of the syllable.
 * 
 * The function uses a helper function `reducePhonemes` to concatenate
 * the sounds of phonemes in each part of the syllable.
 */
const pronounceSyllable = (position: number, context: WordGenerationContext): string => {
  const syllable: Syllable = context.word.syllables[position];

  const onset = syllable.onset.map(phoneme => phoneme.sound).join('');
  const nucleus = syllable.nucleus.map(phoneme => phoneme.sound).join('');
  const coda = syllable.coda.map(phoneme => phoneme.sound).join('');

  return `${onset}${nucleus}${coda}`;
};

/**
 * Converts an array of syllables into a string representation of the word's pronunciation.
 * 
 * @param syllables - An array of Syllable objects representing the word.
 * @returns A string representing the pronunciation of the entire word.
 * 
 * This function iterates through each syllable in the given array,
 * pronounces each syllable using the `pronounceSyllable` function,
 * and concatenates the results to form a complete pronunciation guide
 * for the entire word.
 * 
 * The resulting string contains the phonetic representation of the word,
 * with each syllable's sounds joined together without any separators.
 */
export const generatePronunciation = (context: WordGenerationContext) => {
  const syllables = context.word.syllables;
  const pronunciationParts = new Array(syllables.length);
  for (let i = 0; i < context.word.syllables.length; i++) {
    pronunciationParts[i] = pronounceSyllable(i, context);
  }
  context.word.pronunciation = pronunciationParts.join('.');
};
