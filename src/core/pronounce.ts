import { Phoneme, Syllable, WordGenerationContext } from "../types";
import getWeightedOption from "../utils/getWeightedOption";

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

  const onset = syllable.onset.map((phoneme: Phoneme) => phoneme.sound).join('');
  const nucleus = syllable.nucleus.map((phoneme: Phoneme) => phoneme.sound).join('');
  const coda = syllable.coda.map((phoneme: Phoneme) => phoneme.sound).join('');

  return `${onset}${nucleus}${coda}`;
};

/**
 * Determines if a syllable should be stressed based on its position and word context.
 * 
 * @param position - The position of the syllable within the word (0-based index).
 * @param context - The context of the word being generated, including syllable count and word structure.
 * @returns A boolean value indicating whether the syllable should be stressed.
 */
const shouldStressSyllable = (position: number, context: WordGenerationContext): boolean => {
  const { word, syllableCount } = context;

  // Monosyllabic words are always stressed - but we do not demarkate it
  if (syllableCount === 1) return true;

  // Two-syllable words
  if (syllableCount === 2) {
    const stressFirst = getWeightedOption([[true, 70], [false, 30]]);
    return stressFirst ? position === 0 : position === 1;
  }

  // Three-syllable words
  if (syllableCount === 3) {
    const stressPosition = getWeightedOption([[0, 60], [1, 30], [2, 10]]);
    return position === stressPosition;
  }

  // Words with four or more syllables
  if (syllableCount >= 4) {
    const lastSyllable = word.syllables[syllableCount - 1];
    
    if (lastSyllable.nucleus.some(phoneme => ['ɪ', 'ə'].includes(phoneme.sound))) {
      // Suffixes like -ic, -ity, -ion often cause stress on the penultimate syllable
      return position === syllableCount - 2;
    }

    // For longer words, distribute stress more evenly
    const stressPosition = getWeightedOption([
      [0, 40],
      [1, 30],
      [syllableCount - 2, 20],
      [syllableCount - 3, 10]
    ]);
    return position === stressPosition;
  }

  // Default to stressing the first syllable if no other rules apply
  return position === 0;
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
  for (let i = 0; i < syllables.length; i++) {
    const isStressed = shouldStressSyllable(i, context);
    const syllablePronunciation = pronounceSyllable(i, context);
    pronunciationParts.push(i > 0 ? isStressed ? `'` : `.` : '', syllablePronunciation);
  }
  context.word.pronunciation = pronunciationParts.join('');
};