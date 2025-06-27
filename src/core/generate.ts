import { ClusterContext, Phoneme, WordGenerationContext, WordGenerationOptions, Word, Syllable } from "../types.js";
import { overrideRand, getRand, RandomFunction } from "../utils/random.js";
import { createSeededRandom } from "../utils/createSeededRandom.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { phonemes, invalidOnsetClusters, invalidBoundaryClusters, invalidCodaClusters, sonorityLevels, phonemeMaps } from "../elements/phonemes.js";
import { generatePronunciation } from "./pronounce.js";
import { generateWrittenForm } from "./write.js";

/**
 * Determines the sonority level of a given phoneme.
 * 
 * @param phoneme - The phoneme to evaluate.
 * @returns The sonority level of the phoneme, or 0 if not found.
 * 
 * This function uses the 'sonority' object to look up the sonority level
 * based on the phoneme's type. If the phoneme type is not found in the
 * sonority object, it returns 0 as a default value.
 * 
 * Sonority is important in determining the structure of syllables and
 * the formation of consonant clusters in many languages, including English.
 */
export const getSonority = (phoneme: Phoneme): number => {
  return sonorityLevels.get(phoneme) || 0;
};

export function buildCluster(context: ClusterContext): Phoneme[] {
  const validCandidates = getValidCandidates(positionPhonemes[context.position], context);
  
  while (context.cluster.length < context.maxLength && validCandidates.length > 0) {
    const newPhoneme = selectPhoneme(validCandidates, context);
    if (!newPhoneme) break;

    context.cluster.push(newPhoneme);
    if (shouldStopClusterGrowth(context)) break;

    // Update validCandidates for the next iteration
    updateValidCandidates(validCandidates, context);
  }

  return context.cluster;
}

function updateValidCandidates(candidates: Phoneme[], context: ClusterContext) {
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (!isValidCandidate(candidates[i], context)) {
      candidates.splice(i, 1);
    }
  }
}

function getValidCandidates(candidatePhonemes: Phoneme[], context: ClusterContext): Phoneme[] {
  return candidatePhonemes.filter(p => isValidCandidate(p, context));
}

const invalidClusterRegexes = {
  onset: new RegExp(invalidOnsetClusters.map(r => r.source).join('|'), 'i'),
  coda: new RegExp(invalidCodaClusters.map(r => r.source).join('|'), 'i'),
  nucleus: new RegExp(invalidBoundaryClusters.map(r => r.source).join('|'), 'i')
};

function isValidCandidate(p: Phoneme, context: ClusterContext): boolean {
  if (context.ignore.includes(p.sound) || 
      context.cluster.some(existingP => existingP.sound === p.sound) || 
      !isValidPosition(p, context) || 
      !checkSonority(p, context)) {
    return false;
  }
  
  const potentialCluster = context.cluster.map(ph => ph.sound).join('') + p.sound;
  return !invalidClusterRegexes[context.position].test(potentialCluster);
}

function isValidPosition(p: Phoneme, { position, isStartOfWord, isEndOfWord }: ClusterContext): boolean {
  // @ts-ignore
  return (p[position] === undefined || p[position] > 0) &&
         (!isStartOfWord || p.startWord === undefined || p.startWord > 0) &&
         (!isEndOfWord || p.endWord === undefined || p.endWord > 0);
}

export const isValidCluster = ({ cluster, position }: ClusterContext): boolean => {
  const potentialCluster = cluster.map(ph => ph.sound).join('');
  const invalidClusters = getInvalidClusters(position);
  return !invalidClusters.some(regex => regex.test(potentialCluster));
}

function getInvalidClusters(position: "onset" | "coda" | "nucleus"): RegExp[] {
  switch(position) {
    case "onset": return invalidOnsetClusters;
    case "coda": return invalidCodaClusters;
    default: return invalidBoundaryClusters;
  }
}

function checkSonority(p: Phoneme, { cluster, position }: ClusterContext): boolean {
  const prevPhoneme = cluster[cluster.length - 1];

  switch (position) {
    case "onset":
      return checkOnsetSonority(p, cluster, prevPhoneme);
    case "coda":
      return checkCodaSonority(p, prevPhoneme);
    case "nucleus":
      return true; // Assuming nucleus always has suitable sonority
    default:
      return false;
  }
}

function checkOnsetSonority(currPhoneme: Phoneme, cluster: Phoneme[], prevPhoneme: Phoneme | undefined): boolean {
  if (cluster.length === 0) return true;

  const isSClusterException = 
    cluster.length === 1 && 
    cluster[0].sound === 's' && 
    ['t', 'p', 'k'].includes(currPhoneme.sound);

  if (isSClusterException) return true;

  if (currPhoneme.placeOfArticulation === prevPhoneme?.placeOfArticulation) return false;

  const lastPhonemeWasAStop = prevPhoneme && ['stop'].includes(prevPhoneme.mannerOfArticulation);
  const canFollowAStop = lastPhonemeWasAStop ? ['glide', 'liquid'].includes(currPhoneme.mannerOfArticulation) : false;

  return lastPhonemeWasAStop ? canFollowAStop : getSonority(currPhoneme) > getSonority(prevPhoneme!);
}

function checkCodaSonority(currPhoneme: Phoneme, prevPhoneme: Phoneme | undefined): boolean {
  if (!prevPhoneme) return true;

  const prevSonority = getSonority(prevPhoneme);
  const currSonority = getSonority(currPhoneme);

  const prevManner = prevPhoneme.mannerOfArticulation;
  const currManner = currPhoneme.mannerOfArticulation;

  const isEqualSonorityException = 
    (prevManner == 'fricative' && currManner == 'fricative') ||
    (prevManner == 'stop' && currManner == 'stop');

  const isReversedSonorityException = 
    (prevManner == 'stop' && currManner == 'fricative') ||
    (prevManner == 'stop' && currManner == 'sibilant') ||
    (prevManner == 'sibilant' && currManner === 'nasal');

  return isEqualSonorityException || isReversedSonorityException || (currSonority < prevSonority);
}

function selectPhoneme(validCandidates: Phoneme[], { position, isStartOfWord, isEndOfWord }: ClusterContext): Phoneme | null {
  const weightedCandidates = validCandidates.map(p => {
    const positionWeight = p[position] ?? 0;
    const wordPositionModifier = 
      (isStartOfWord && p.startWord) ||
      (isEndOfWord && p.endWord) ||
      p.midWord || 1;
    return [p, positionWeight * wordPositionModifier] as [Phoneme, number];
  });
  return getWeightedOption(weightedCandidates);
}

function shouldStopClusterGrowth({ position, cluster }: ClusterContext): boolean {
  return position === "onset" && 
         cluster.length === 2 && 
         ['liquid', 'nasal'].includes(cluster[1].mannerOfArticulation);
}

const positionPhonemes = {
  onset: Array.from(phonemeMaps.onset.values()).flat(),
  coda: Array.from(phonemeMaps.coda.values()).flat(),
  nucleus: Array.from(phonemeMaps.nucleus.values()).flat()
};

/**
 * Selects and returns an onset (initial consonant cluster) for a syllable.
 * 
 * @param prevSyllable - The previous syllable, if any. Used to determine constraints on the onset.
 * @returns An array of Phoneme objects representing the onset.
 * 
 * This function does the following:
 * 1. Determines if the new syllable follows a nucleus without a coda in the previous syllable.
 * 2. Chooses a weighted random length for the onset (0-3 phonemes).
 * 3. Builds the onset cluster using the buildCluster function, avoiding phonemes from the previous syllable's coda.
 * 
 * The onset length probabilities are adjusted based on whether it follows a nucleus:
 * - If following a nucleus (no coda in previous syllable), onset cannot be empty (length 0).
 * - Otherwise, empty onsets are possible but less likely than single-phoneme onsets.
 */
function pickOnset(context: WordGenerationContext, isStartOfWord: boolean, monosyllabic: boolean): Phoneme[] {
  const prevSyllable = context.word.syllables[context.currSyllableIndex-1];
  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length === 0;
  const syllableCount = context.syllableCount;

  const getMaxLength = () => {
    if (monosyllabic) {
      return getWeightedOption([
        [0, 50], 
        [1, 100], 
        [2, 200], 
        [3, 150]
      ]);
    } else {
      return getWeightedOption([
        [0, isFollowingNucleus ? 0 : 150], 
        [1, 675], 
        [2, 125], 
        [3, 80]
      ]);
    }
  };

  const maxLength = getMaxLength();
  if (maxLength === 0) return [];

  const toIgnore = prevSyllable ? prevSyllable.coda.map((coda) => coda.sound) : [];
  let onset: Phoneme[] = buildCluster(
    {
      position: "onset",
      cluster: [],
      ignore: toIgnore,
      isStartOfWord,
      isEndOfWord: false,
      syllableCount,
      maxLength
    },
  );

  return onset;
}

/**
 * Selects and returns a nucleus (vowel) for a syllable.
 * 
 * @param prevSyllable - The previous syllable, if any. Used to determine constraints on the nucleus.
 * @returns A Phoneme object representing the nucleus.
 */
function pickNucleus(context: WordGenerationContext, isStartOfWord: boolean, isEndOfWord: boolean, hasCoda: boolean): Phoneme[] {
  const prevSyllable = context.word.syllables[context.currSyllableIndex-1];
  let nucleus = buildCluster(
    {
      position: "nucleus",
      cluster: [],
      ignore: [],
      isStartOfWord,
      isEndOfWord,
      maxLength: 1,
      syllableCount: context.syllableCount,
    },
  );
  
  return nucleus;
}

/**
 * Selects and returns a coda (final consonant cluster) for a syllable.
 * 
 * @param onset - The onset of the current syllable, used to avoid repetition.
 * @param isEndOfWord - Boolean indicating if this is the last syllable of the word.
 * @returns An array of Phoneme objects representing the coda.
 * 
 * This function does the following:
 * 1. Determines the length of the coda based on weighted probabilities, which differ for the last syllable.
 * 2. Builds the coda cluster using the buildCluster function.
 * 3. Checks for and potentially avoids repetition between the onset and coda.
 * 
 * The coda length probabilities are adjusted based on whether it's the last syllable:
 * - Last syllable: Higher chance of non-empty codas.
 * - Other syllables: Higher chance of empty codas.
 * 
 * To avoid repetition:
 * - There's a 98% chance to avoid repeating the first onset phoneme as the last coda phoneme.
 * - If avoiding repetition, it tries to replace the last coda phoneme with a similar one.
 * - If no suitable replacement is found, it removes the last coda phoneme.
 */
function pickCoda(context: WordGenerationContext, newSyllable: Syllable, isEndOfWord: boolean, monosyllabic: boolean): Phoneme[] {
  const syllableCount = context.syllableCount;
  const onsetLength = newSyllable.onset.length;

  // Adjust weights based on onset length
  const getCodaLengthWeights = (onsetLength: number) => {
    if (monosyllabic) {
      switch (onsetLength) {
        case 0: return [[0, 20], [1, 100], [2, 200], [3, 150]];
        case 1: return [[0, 80], [1, 150], [2, 150], [3, 100]];
        case 2: return [[0, 50], [1, 200], [2, 100], [3, 50]];
        case 3: return [[0, 100], [1, 300], [2, 50], [3, 20]];
        default: return [[0, 150], [1, 200], [2, 30], [3, 10]];
      }
    } else {
      return [
        [0, isEndOfWord ? 1200 : 6000],
        [1, 3000],
        [2, 900],
        [3, 100],
      ];
    }
  };

  const maxLength: number = getWeightedOption(getCodaLengthWeights(onsetLength) as [number, number][]);

  if (maxLength === 0) return [];

  let coda: Phoneme[] = buildCluster({
    position: "coda",
    cluster: [],
    ignore: [],
    isStartOfWord: false,
    isEndOfWord,
    syllableCount,
    maxLength
  });

  // Add 's' to the end of the last syllable occasionally
  if (isEndOfWord && getWeightedOption([[true, 15], [false, 85]])) {
    const sPhoneme = phonemes.find(p => p.sound === 's');
    if (sPhoneme) {
      coda.push(sPhoneme);
    }
  }

  return coda;
}

/**
 * Adjusts two adjacent syllables based on sonority and phonological rules. If the sonorities are equal:
 *    - There's a 90% chance to drop the coda phoneme, 10% chance to keep it.
 * 
 * This process helps ensure more natural syllable boundaries and can create
 * more varied and realistic word structures.
 * 
 * @param prevSyllable - The preceding syllable that may have its coda modified.
 * @param currentSyllable - The current syllable that may have its onset modified.
 * @returns A tuple containing the potentially modified previous and current syllables.
 */
function adjustBoundary(prevSyllable: Syllable, currentSyllable: Syllable): [Syllable, Syllable] {
  const lastCodaPhoneme = prevSyllable.coda.at(-1);
  const firstOnsetPhoneme = currentSyllable.onset[0];

  if (!lastCodaPhoneme || !firstOnsetPhoneme) return [prevSyllable, currentSyllable];

  const lastCodaSonority = getSonority(lastCodaPhoneme);
  const firstOnsetSonority = getSonority(firstOnsetPhoneme);
  if (firstOnsetSonority === lastCodaSonority && getWeightedOption([[true, 90], [false, 10]])) {
    prevSyllable.coda.pop();
  }

  return [prevSyllable, currentSyllable];
}

/**
 * Generates a single syllable for a word.
 * 
 * This function creates a syllable structure by selecting an onset, nucleus, and coda
 * based on phonological rules and the position of the syllable within the word.
 * 
 * @param syllablePosition - The position of the syllable in the word (0-indexed).
 * @param syllableCount - The total number of syllables in the word.
 * @param prevSyllable - The previous syllable in the word, if any.
 * @returns A Syllable object containing onset, nucleus, and coda arrays of phonemes.
 * 
 * The function considers the following factors:
 * 1. Whether it's the last syllable in the word (affects coda selection).
 * 2. The previous syllable (if any) to ensure phonological consistency.
 * 3. Appropriate onset, nucleus, and coda selection based on English phonotactics.
 * 
 * This approach helps create phonologically plausible and varied syllable structures
 * that can be combined to form realistic-sounding words.
 */
function generateSyllable(context: WordGenerationContext): Syllable {
  const isEndOfWord = context.currSyllableIndex === context.syllableCount - 1;
  const isStartOfWord = context.currSyllableIndex === 0;
  const prevSyllable = context.word.syllables[context.currSyllableIndex-1];
  const syllableCount = context.syllableCount;
  const monosyllabic = syllableCount === 1;

  let newSyllable: Syllable = {
    onset: [],
    nucleus: [],
    coda: []
  }

  // Determine syllable structure
  const hasOnset = determineHasOnset(isStartOfWord, prevSyllable);
  const hasCoda = determineHasCoda(isEndOfWord, monosyllabic);

  // Build the syllable structure
  if (hasOnset) {
    newSyllable.onset = pickOnset(context, isStartOfWord, monosyllabic);
  }
  
  newSyllable.nucleus = pickNucleus(context, isStartOfWord, isEndOfWord, hasCoda);
  
  if (hasCoda) {
    newSyllable.coda = pickCoda(context, newSyllable, isEndOfWord, monosyllabic);
  }

  return newSyllable;
}

function determineHasOnset(isStartOfWord: boolean, prevSyllable?: Syllable): boolean {
  if (isStartOfWord) {
    return getWeightedOption([[true, 95], [false, 5]]);
  } else {
    const prevHasCoda = prevSyllable && prevSyllable.coda.length > 0;
    return prevHasCoda ? getWeightedOption([[true, 80], [false, 20]]) : true;
  }
}

function determineHasCoda(isEndOfWord: boolean, monosyllabic: boolean): boolean {
  if (monosyllabic) {
    return getWeightedOption([[true, 80], [false, 20]]);
  } else if (isEndOfWord) {
    return getWeightedOption([[true, 90], [false, 10]]);
  } else {
    return getWeightedOption([[true, 30], [false, 70]]);
  }
}

export const generateSyllables = (context: WordGenerationContext) => {
  if (!context.syllableCount) {
    context.syllableCount = getWeightedOption([
      [1, 5000], [2, 30000], [3, 29700],
      [4, 3000], [5, 200], [6, 50], [7, 5]
    ]);
  }

  const syllables = new Array(context.syllableCount);
  let prevSyllable: Syllable | undefined;

  for (let i = 0; i < context.syllableCount; i++) {
    let newSyllable: Syllable;
    // do {
      newSyllable = generateSyllable(context);
    // } while (prevSyllable && !isValidSyllableBoundary(prevSyllable, newSyllable));

    if (prevSyllable) {
      [prevSyllable, newSyllable] = adjustBoundary(prevSyllable, newSyllable);
    }

    syllables[i] = newSyllable;
    prevSyllable = newSyllable;
    context.currSyllableIndex++;
  }

  context.word.syllables = syllables;
}

function isValidSyllableBoundary(prev: Syllable, curr: Syllable): boolean {
  const closingPhoneme = prev.coda[prev.coda.length - 1];
  const openingPhoneme = curr.onset[0];
  const prevSonority = closingPhoneme ? getSonority(closingPhoneme) : 0;
  const newSonority = openingPhoneme ? getSonority(openingPhoneme) : 0;
  return newSonority > prevSonority;
}

/**
 * Generates a word with a specified number of syllables.
 * 
 * @param options - An object containing options for the word generation.
 * @returns A Word object containing the syllables, pronunciation, and written form.
 */
export const generateWord = (options: WordGenerationOptions = {}): Word => {
  const originalRand: RandomFunction = getRand();
  const context: WordGenerationContext = {
    word: {
      syllables: [],
      pronunciation: '',
      written: { clean: '', hyphenated: '' }
    },
    syllableCount: options.syllableCount || 0,
    currSyllableIndex: 0,
  }

  if (options.seed !== undefined) {
    overrideRand(createSeededRandom(options.seed));
  }

  try {
    generateSyllables(context);
    generateWrittenForm(context);
    generatePronunciation(context);
    
    return context.word;
  } finally {
    overrideRand(originalRand);
  }
};

export default generateWord;