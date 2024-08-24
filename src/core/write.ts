import { Phoneme, Grapheme, WordGenerationContext } from "../types.js";
import { graphemeMaps, cumulativeFrequencies } from "../elements/graphemes.js";
import { getRand } from '../utils/random';

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
// Define the reduction rules
const reductionRules = [
  { 
    pattern: /([aiouy])e([bcdfghjklmnpqrstvwxyz]+)(?!e)/g,
    replacement: (match: string, p1: string, p2: string) => getRand()() < 0.98 ? `${p1}${p2}e` : match
  },
  { 
    pattern: /(?<!^)ks/g,
    replacement: (match: string) => getRand()() < 0.25 ? 'x' : match
  }
];

// Compile the patterns once
const compiledPatterns = reductionRules.map(rule => ({
  regex: new RegExp(rule.pattern.source, rule.pattern.flags),
  replacement: rule.replacement
}));

function adjustSyllable(str: string): string {
  let result = str;
  for (const { regex, replacement } of compiledPatterns) {
    result = result.replace(regex, replacement);
  }
  return result;
}

/**
 * Chooses a grapheme representation for a given phoneme based on its position and context within a word.
 * 
 * @param phoneme - The phoneme object for which to choose a grapheme.
 * @param position - The position of the phoneme within the syllable ("onset", "nucleus", or "coda").
 * @param isCluster - Boolean indicating if the phoneme is part of a cluster.
 * @param isStartOfWord - Boolean indicating if the phoneme is at the start of the word.
 * @param isEndOfWord - Boolean indicating if the phoneme is at the end of the word.
 * @param prevPhoneme - The previous phoneme in the sequence.
 * @param nextPhoneme - The next phoneme in the sequence.
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
  position: "onset" | "nucleus" | "coda",
  isCluster: boolean = false,
  isStartOfWord: boolean = false,
  isEndOfWord: boolean = false,
  prevPhoneme?: Phoneme,
  nextPhoneme?: Phoneme,
): string { 
  const graphemeList = graphemeMaps[position].get(phoneme.sound);
  if (!graphemeList || graphemeList.length === 0) return '';

  const frequencyList = cumulativeFrequencies[position].get(phoneme.sound)!;
  const totalFrequency = frequencyList[frequencyList.length - 1];
  
  let selectedGrapheme: Grapheme | undefined;
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loop

  while (!selectedGrapheme && attempts < maxAttempts) {
    const randomValue = getRand()() * totalFrequency;
    const index = frequencyList.findIndex(freq => freq > randomValue);
    const candidate = graphemeList[index];

    if (
      (!isCluster || !candidate.cluster || candidate.cluster > 0) &&
      (!isStartOfWord || !candidate.startWord || candidate.startWord > 0) &&
      (!isEndOfWord || !candidate.endWord || candidate.endWord > 0) &&
      ((!isEndOfWord && !isStartOfWord) || candidate.midWord > 0)
    ) {
      selectedGrapheme = candidate;
    }
    attempts++;
  }

  if (!selectedGrapheme) {
    // Fallback to first valid grapheme if no suitable one found after max attempts
    selectedGrapheme = graphemeList.find(g => 
      (!isCluster || !g.cluster || g.cluster > 0) &&
      (!isStartOfWord || !g.startWord || g.startWord > 0) &&
      (!isEndOfWord || !g.endWord || g.endWord > 0) &&
      ((!isEndOfWord && !isStartOfWord) || g.midWord > 0)
    ) || graphemeList[0];
  }

  let result = selectedGrapheme.form;

  // Apply the doubling rule
  const isAfterShortVowel = prevPhoneme?.nucleus && !prevPhoneme.tense;
  const isBeforeShortVowel = !nextPhoneme?.onset && (!nextPhoneme?.tense || ['ɜ', 'ɚ'].includes(nextPhoneme?.sound));
  const isSingleOnsetStop = position === "onset" && !isCluster && phoneme.mannerOfArticulation === 'stop';
  if (isAfterShortVowel && isSingleOnsetStop && isBeforeShortVowel && result.length === 1) {
    result += result;
  }

  return result;
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
export const generateWrittenForm = (context: WordGenerationContext) => {
  const { syllables, written } = context.word;
  const flattenedPhonemes = syllables.flatMap((syllable, syllableIndex) =>
    (["onset", "nucleus", "coda"] as const).flatMap((position) =>
      syllable[position].map((phoneme) => ({ phoneme, syllableIndex, position }))
    )
  );

  const cleanParts: string[] = [];
  const hyphenatedParts: string[] = [];
  let currentSyllable: string[] = [];

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
      prevPhoneme?.phoneme,
      nextPhoneme?.phoneme,
    );

    if (currentSyllable.length > 0 && grapheme.length > 0 &&
        currentSyllable[currentSyllable.length - 1].slice(-1) === grapheme[0]) {
      currentSyllable.push(grapheme.slice(1));
    } else {
      currentSyllable.push(grapheme);
    }

    if (!nextPhoneme || nextPhoneme.syllableIndex !== syllableIndex) {
      let syllableStr = adjustSyllable(currentSyllable.join(''));
      
      if (cleanParts.length > 0 && syllableStr.length > 0 &&
          cleanParts[cleanParts.length - 1].slice(-1) === syllableStr[0]) {
        syllableStr = syllableStr.slice(1);
      }

      cleanParts.push(syllableStr);
      hyphenatedParts.push(syllableStr);

      if (nextPhoneme) {
        hyphenatedParts.push("&shy;");
      }

      currentSyllable = [];
    }
  }

  written.clean = cleanParts.join('');
  written.hyphenated = hyphenatedParts.join('');
};

export default generateWrittenForm;