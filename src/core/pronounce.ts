import { Phoneme, Syllable } from "../types";

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
const pronounceSyllable = (syllable: Syllable): string => {
  const reducePhonemes = (acc: string, phoneme: Phoneme): string => {
    return acc + phoneme.sound;
  };
  const onset = syllable.onset.reduce(reducePhonemes, "");
  const nucleus = syllable.nucleus.reduce(reducePhonemes, "");
  const coda = syllable.coda.reduce(reducePhonemes, "");

  return onset + nucleus + coda;
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
export const pronounce = (syllables: Syllable[]): string => {
  let pronunciationGuide = "";

  for (let i = 0; i < syllables.length; i++) {
    pronunciationGuide += pronounceSyllable(syllables[i]);
  }

  return pronunciationGuide;
};
