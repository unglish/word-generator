import { WrittenForm, Phoneme, Syllable, Grapheme } from "../types.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import randomBool from "../utils/randomBool.js";
import { graphemes } from "../elements/graphemes.js";

/**
 * Applies various regex-based rules to improve naturalness of the written syllable.
 * 
 * @param str - The input string representing a syllable or part of a word.
 * @returns A string with syllable reduction rules applied.
 * 
 * This function applies a set of predefined syllable reduction rules to the input string.
 * Each rule consists of:
 * - source: A regex pattern to match.
 * - target: The replacement string.
 * - likelihood: The probability of applying the rule (between 0 and 1).
 * 
 * Currently, it includes one rule:
 * - Replace "ks" with "x" (25% chance), but not at the start of the word.
 *   Example: "nekst" -> "next"
 * 
 * The function iterates over each rule and randomly decides whether to apply it
 * based on the specified likelihood. This introduces variability in the output,
 * simulating the inconsistencies found in natural language spellings.
 * 
 * Note: The randomBool function (not shown here) is assumed to return a boolean
 * value based on the given probability.
 */
function adjustSyllable(str: string): string {
  const reductionPairs = [
    // castling: switches the position of an e after a vowel, with the consonants that follow eg. roed -> rode
    { source: "([aiouy])e([bcdfghjklmnpqrstvwxyz]+)(?!e)", target: "$1$2e", likelihood: 0.9}, 
    // e., "nekst" -> "next"
    { source: "(?<!^)ks", target: "x", likelihood: 0.25 }, 
  ];

  // Iterate over each pair and randomly decide whether to replace it
  reductionPairs.forEach((pair) => {
    if (randomBool(pair.likelihood)) {
      const regex = new RegExp(pair.source, "g");
      str = str.replace(regex, pair.target);
    }
  });

  return str;
}

/**
 * Chooses a grapheme representation for a given phoneme based on its position and context within a word.
 * 
 * @param phoneme - The phoneme object for which to choose a grapheme.
 * @param position - The position of the phoneme within the syllable ("onset", "nucleus", or "coda").
 * @param isStartOfWord - Boolean indicating if the phoneme is at the start of the word.
 * @param isEndOfWord - Boolean indicating if the phoneme is at the end of the word.
 * @returns A string representing the chosen grapheme.
 * 
 * This function performs the following steps:
 * 1. Filters the list of graphemes to find viable options based on:
 *    - Matching phoneme sound
 *    - Allowed in a cluster, if this phoneme is part of a cluster
 *    - Valid position within the syllable (onset, nucleus, coda)
 *    - Appropriateness for start/end of word position
 * 2. Maps the viable graphemes to weighted options (form and frequency)
 * 3. Uses getWeightedOption to randomly select a grapheme based on frequencies
 * 
 * The function considers various factors to ensure phonologically plausible
 * and orthographically correct grapheme choices for English-like words.
 */
function chooseGrapheme(
  phoneme: Phoneme,  
  position: string,
  isCluster: boolean = false,
  isStartOfWord: boolean = false,
  isEndOfWord: boolean = false,
): string { 
  const viableGraphemes = graphemes.filter(
    (grapheme) =>
      grapheme.phoneme === phoneme.sound &&
      // @ts-ignore
      (!grapheme[position] || grapheme[position] > 0) &&
      (isCluster ? !grapheme.cluster || grapheme.cluster > 0 : true) &&
      (isStartOfWord ? grapheme.startWord > 0 : true) &&
      (isEndOfWord ? grapheme.endWord > 0 : true) && 
      (!isEndOfWord && !isStartOfWord ? grapheme.midWord > 0 : true)
  );
  
  const weightedGraphemes: [string, number][] = viableGraphemes.map(
    (grapheme) => {
      const wordPositionModifier = 
        isStartOfWord && grapheme.startWord ||
        isEndOfWord && grapheme.endWord ||
        grapheme.midWord;
      const clusterModifier = (isCluster && grapheme.cluster) || 1;
      return [
        grapheme.form,
        grapheme.frequency * wordPositionModifier * clusterModifier, 
      ]},
  );

  return getWeightedOption(weightedGraphemes);
}

/**
 * Converts an array of syllables into written forms of a word.
 * 
 * @param syllables - An array of Syllable objects representing the phonetic structure of a word.
 * @returns A WrittenForm object containing 'clean' and 'hyphenated' versions of the word.
 * 
 * Key features:
 * - Handles phoneme-to-grapheme conversion considering position in word and syllable.
 * - Applies syllable adjustments (e.g., reduction rules, castling) for more natural spellings.
 * - Manages character duplication at segment and syllable boundaries.
 * - Inserts soft hyphens (&shy;) between syllables in the hyphenated version.
 * 
 * The resulting WrittenForm object provides both a standard spelling (clean) 
 * and a version with syllable breaks marked for potential hyphenation (hyphenated).
 */
export const write = (syllables: Syllable[]): WrittenForm => {
  let hyphenated = "";
  let clean = "";

  // Flatten syllables into an array of extended phonemes
  const flattenedPhonemes = syllables.flatMap((syllable, syllableIndex) =>
    ["onset", "nucleus", "coda"].flatMap((position) =>
      syllable[position as keyof Syllable].map((phoneme) => ({
        phoneme,
        syllableIndex,
        position,
      }))
    )
  );

  let currentSyllable = "";
  let currentSyllableIndex = 0;

  for (let phonemeIndex = 0; phonemeIndex < flattenedPhonemes.length; phonemeIndex++) {
    const { phoneme, syllableIndex, position } = flattenedPhonemes[phonemeIndex];
    const prevPhoneme = flattenedPhonemes[phonemeIndex - 1];
    const nextPhoneme = flattenedPhonemes[phonemeIndex + 1];

    const isCluster = 
      (prevPhoneme?.syllableIndex === syllableIndex && prevPhoneme?.position === position) || 
      (nextPhoneme?.syllableIndex === syllableIndex && nextPhoneme?.position === position);

    const grapheme = chooseGrapheme(
      phoneme,
      position,
      isCluster,
      phonemeIndex === 0,
      phonemeIndex === flattenedPhonemes.length - 1,
    );

    // Remove duplicate character at segment boundary
    if (currentSyllable.length > 0 && grapheme.length > 0 &&
        currentSyllable[currentSyllable.length - 1] === grapheme[0]) {
      currentSyllable += grapheme.slice(1);
    } else {
      currentSyllable += grapheme;
    }

    // If we're at the end of a syllable or the word
    if (!nextPhoneme || nextPhoneme.syllableIndex !== syllableIndex) {
      currentSyllable = adjustSyllable(currentSyllable);

      // Remove duplicate character at syllable boundary
      if (clean.length > 0 && currentSyllable.length > 0 &&
          clean[clean.length - 1] === currentSyllable[0]) {
        currentSyllable = currentSyllable.slice(1);
      }

      clean += currentSyllable;
      hyphenated += currentSyllable;

      if (nextPhoneme) {
        hyphenated += "&shy;";
      }

      currentSyllable = "";
      currentSyllableIndex++;
    }
  }

  return {
    clean,
    hyphenated,
  };
};

export default write;
