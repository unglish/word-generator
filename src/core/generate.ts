import { Phoneme, GenerateWordOptions, Word, Syllable } from "../types.js";
import { overrideRand, getRand, RandomFunction } from "../utils/random.js";
import { createSeededRandom } from "../utils/createSeededRandom.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { phonemes, invalidOnsetClusters, invalidBoundaryClusters, invalidCodaClusters, sonority } from "../elements/phonemes.js";
import { pronounce } from "./pronounce.js";
import { write } from "./write.js";

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
function getSonority(phoneme: Phoneme): number {
  return sonority[phoneme.type] || 0;
}

/**
 * Builds a phoneme cluster for either the onset or coda of a syllable.
 * 
 * @param type - The type of cluster to build: "onset" or "coda".
 * @param maxLength - The maximum number of phonemes allowed in the cluster. Default is 3.
 * @param ignore - An array of phoneme sounds to ignore when building the cluster. Default is an empty array.
 * @returns An array of Phoneme objects representing the built cluster.
 * 
 * This function constructs a phoneme cluster following English phonotactic rules:
 * 1. It respects sonority sequencing (increasing for onset, decreasing for coda).
 * 2. It avoids invalid clusters as defined in invalidOnsetClusters and invalidCodaClusters.
 * 3. It handles special cases, such as 's' clusters in onsets and limitations on liquids and nasals.
 * 4. It considers phoneme-specific constraints like start/end of word positions.
 * 
 * The function stops building the cluster when it reaches maxLength, runs out of valid candidates,
 * or encounters specific conditions (e.g., two-phoneme onset ending in a liquid or nasal).
 */
function buildCluster(position: "onset" | "coda", maxLength: number = 3, ignore: string[] = [], isStartOfWord: Boolean, isEndOfWord: Boolean): Phoneme[] {
  const cluster: Phoneme[] = [];

  while (cluster.length < maxLength) {
    let candidatePhonemes = phonemes.filter(p => {
      const isAllowedToStartWord = position === "onset" ? isStartOfWord && p.startWord > 0 : true;
      const isAllowedToEndWord = position === "coda" ? isEndOfWord && p.endWord > 0 : true;
      const isValidPosition = position === "onset" ? p.onset : p.coda && isAllowedToStartWord && isAllowedToEndWord;
      const isNotIgnored = !ignore.includes(p.sound);
      const isNotDuplicate = !cluster.some(existingP => existingP.sound === p.sound);
      
      // there are special cases for s in english where it can be followed by something
      // that increases in sonority
      const isSpecialS = 
        position === "onset" && 
        cluster.length === 1 && 
        cluster[0].sound === 's' && 
        ['t', 'p', 'k'].includes(p.sound);

      const hasSuitableSonority = cluster.length === 0 || isSpecialS ||
        (position === "onset" 
          ? getSonority(p) > getSonority(cluster[cluster.length - 1])
          : getSonority(p) < getSonority(cluster[cluster.length - 1]));

      // Check against invalid clusters
      const potentialCluster = cluster.map(ph => ph.sound).join('') + p.sound;
      const invalidClusters = position === "onset" ? invalidOnsetClusters : invalidCodaClusters;
      const isValidCluster = !invalidClusters.some(regex => regex.test(potentialCluster));

      return isValidPosition && isNotIgnored && isNotDuplicate && hasSuitableSonority && isValidCluster;
    });

    if (!candidatePhonemes.length) break;
    const mappedCandidates: [Phoneme, number][] = candidatePhonemes.map((p) => {
      const phonemePosition = p[position] ?? 0;
      const wordPositionModifier = 
        isStartOfWord && p.startWord ||
        isEndOfWord && p.endWord ||
        p.midWord || 1;
      return [
        p,
        phonemePosition * wordPositionModifier,
      ]});
    const newPhoneme = getWeightedOption(mappedCandidates);

    cluster.push(newPhoneme);

    // Special cases for English
    if ( position === "onset" 
      && cluster.length === 2
      && ['liquid','nasal'].includes(cluster[1].type)) {
      break;
    }
  }

  return cluster;
}

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
function pickOnset(prevSyllable?: Syllable): Phoneme[] {
  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length === 0;
  const length: number = getWeightedOption([
    [0, isFollowingNucleus ? 0 : 150], 
    [1, 675], 
    [2, 125], 
    [3, 80]
  ]);
  let onset: Phoneme[] = buildCluster(
    "onset",
    length,
    prevSyllable ? prevSyllable.coda.map((coda) => coda.sound) : [],
    !!prevSyllable,
    false
  );

  return onset;
}

/**
 * Selects and returns a nucleus (vowel) for a syllable.
 * 
 * @param prevSyllable - The previous syllable, if any. Used to determine constraints on the nucleus.
 * @returns A Phoneme object representing the nucleus.
 */
function pickNucleus(prevSyllable: Syllable | undefined, isEndOfWord: Boolean) {
  const isStartOfWord = !prevSyllable;
  let nuclei = phonemes.filter((p) => !!p.nucleus);
  
  if (isStartOfWord) {
    nuclei = nuclei.filter((p) => p.startWord > 0);
  }
  
  if (isEndOfWord) {
    nuclei = nuclei.filter((p) => p.endWord > 0);
  }
  
  const mappedNuclei: [Phoneme, number][] = nuclei.map((p) => [
    p,
    p.nucleus ?? 0,
  ]);
  const nucleus = getWeightedOption(mappedNuclei);
  return [nucleus];
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
function pickCoda(currentSyllable: Syllable, isEndOfWord: boolean = false): Phoneme[] {
  const length = getWeightedOption(isEndOfWord ? [
    [0, 500],
    [1, 3000],
    [2, 900],
    [3, 400],
  ] : [
    [0, 6000],
    [1, 3000],
    [2, 900],
    [3, 100],
  ]);

  if (length === 0) return [];

  const onset = currentSyllable.onset;
  let coda: Phoneme[] = buildCluster("coda", length, [], false, isEndOfWord);

  // Check for onset-coda repetition
  if (onset.length > 0 && coda.length > 0 && onset[0].sound === coda[coda.length - 1].sound) {
    const shouldAvoidRepetition = getWeightedOption([
      [true, 98],  // 90% chance to avoid repetition
      [false, 2]  // 10% chance to allow repetition
    ]);

    if (shouldAvoidRepetition) {
      // Try to replace the last coda phoneme
      const alternativeCodas = phonemes.filter(p => 
        p.coda && p.sound !== onset[0].sound && p.type === coda[coda.length - 1].type
      );
      
      if (alternativeCodas.length > 0) {
        coda[coda.length - 1] = getWeightedOption(alternativeCodas.map(p => [p, p.coda ?? 0]));
      } else {
        // If no suitable alternative, remove the last coda phoneme
        coda.pop();
      }
    }
  }

  return coda;
}

/**
 * Checks if a cross-syllable boundary is valid based on sonority.
 * 
 * @param prevSyllable - The previous syllable in the word.
 * @param currentSyllable - The current syllable being checked.
 * @returns {boolean} - True if the cross-syllable boundary is valid, false otherwise.
 * 
 * This function ensures that the sonority profile across syllable boundaries is
 * phonologically valid. It checks the sonority of the last phoneme in the coda
 * of the previous syllable against the first phoneme in the onset of the current syllable.
 * 
 * The function returns true in the following cases:
 * 1. If there's no previous syllable (i.e., it's the first syllable of the word).
 * 2. If the previous syllable has no coda.
 * 3. If the current syllable has no onset.
 * 4. If the sonority of the first onset phoneme is greater than or equal to
 *    the sonority of the last coda phoneme.
 * 
 * This implementation allows for equal sonority across syllable boundaries,
 * which is a simplification and might need refinement based on specific
 * phonological rules of the target language.
 */
function checkCrossSyllableSonority(prevSyllable: Syllable, currentSyllable: Syllable): boolean {
  if (!prevSyllable || !prevSyllable.coda.length || !currentSyllable.onset.length) {
    return true; // No cross-syllable cluster, so it's valid
  }

  const lastCodaPhoneme = prevSyllable.coda[prevSyllable.coda.length - 1];
  const firstOnsetPhoneme = currentSyllable.onset[0];

  // Allow equal sonority across syllable boundary
  // This is a simplification; you might want to refine this based on specific phoneme types
  return getSonority(firstOnsetPhoneme) >= getSonority(lastCodaPhoneme);
}

/**
 * Attempts to resyllabify two adjacent syllables based on sonority and phonological rules.
 * 
 * This function examines the boundary between two syllables and potentially moves
 * phonemes from the coda of the first syllable to the onset of the second syllable,
 * or drops the coda entirely, based on sonority principles and probabilistic rules.
 * 
 * @param prevSyllable - The preceding syllable that may have its coda modified.
 * @param currentSyllable - The current syllable that may have its onset modified.
 * @returns A tuple containing the potentially modified previous and current syllables.
 * 
 * The function performs the following checks and modifications:
 * 1. If both syllables have phonemes at their boundary (coda and onset):
 *    a. It compares the sonority of the last coda phoneme and the first onset phoneme.
 *    b. It checks if moving the coda to the onset would create a valid onset cluster.
 * 2. If the onset sonority is higher and the resulting cluster is valid:
 *    - The last coda phoneme is moved to the beginning of the onset.
 * 3. If the sonorities are equal:
 *    - There's a 90% chance to drop the coda phoneme, 10% chance to keep it.
 * 
 * This process helps ensure more natural syllable boundaries and can create
 * more varied and realistic word structures.
 */
function tryResyllabify(prevSyllable: Syllable, currentSyllable: Syllable): [Syllable, Syllable] {
  if (prevSyllable.coda.length && currentSyllable.onset.length) {
    const lastCodaPhoneme = prevSyllable.coda[prevSyllable.coda.length - 1];
    const firstOnsetPhoneme = currentSyllable.onset[0];

    const lastCodaSonority = getSonority(lastCodaPhoneme);
    const firstOnsetSonority = getSonority(firstOnsetPhoneme);

    // Check if moving the coda to the onset would create a valid onset cluster
    const potentialOnset = [lastCodaPhoneme, ...currentSyllable.onset];
    const potentialOnsetSounds = potentialOnset.map(p => p.sound).join('');
    const isValidBoundaryCluster = !invalidBoundaryClusters.some(regex => 
      regex.test(potentialOnsetSounds)
    );

    if (firstOnsetSonority > lastCodaSonority && isValidBoundaryCluster) {
      // Move the last coda phoneme to the onset of the next syllable
      prevSyllable.coda.pop();
      currentSyllable.onset.unshift(lastCodaPhoneme);
    } else if (firstOnsetSonority === lastCodaSonority) {
      // When sonority is equal, use getWeightedOption to decide
      const shouldDropCoda = getWeightedOption([
        [true, 90],   // 90% chance to drop the coda
        [false, 10]   // 10% chance to keep it
      ]);

      if (shouldDropCoda) {
        prevSyllable.coda.pop();
      }
    }
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
function generateSyllable(syllablePosition: number = 0, syllableCount: number = 1, prevSyllable?: Syllable): Syllable {
  let currSyllable: Syllable = {
    onset: [],
    nucleus: [],
    coda: []
  }
  // Build the syllable structure
  const isEndOfWord = syllablePosition === syllableCount - 1;
  currSyllable.onset = pickOnset(prevSyllable);
  currSyllable.nucleus = pickNucleus(prevSyllable, isEndOfWord);
  currSyllable.coda = pickCoda(currSyllable, isEndOfWord);

  return currSyllable;
}

/**
 * Generates a word with a specified number of syllables.
 * 
 * @param options - An object containing options for the word generation.
 * @returns A Word object containing the syllables, pronunciation, and written form.
 */
export const generateWord = (options: GenerateWordOptions = {}): Word => {
  const { seed, syllableCount: specifiedSyllableCount } = options;
  const originalRand: RandomFunction = getRand();

  try {
    if (seed !== undefined) {
      const seededRand: RandomFunction = createSeededRandom(seed);
      overrideRand(seededRand);
    }

    const syllableCount = specifiedSyllableCount || getWeightedOption([
      [1, 35000],  // 30-40%
      [2, 35000],  // 30-35%
      [3, 15000],  // 15-20%
      [4, 5000],   // 5-10%
      [5, 1000],   // Less than 5%
      [6, 500],    // Less than 5%
      [7, 100],    // Very rare
      [8, 50],     // Very rare
      [9, 30],     // Very rare
      [10, 5],    // Very rare
      [11, 1],    // Extremely rare
      [12, 1],    // Extremely rare
      [13, 1],    // Extremely rare
      [14, 1],    // Extremely rare
      [15, 1],    // Extremely rare
    ]);

    const syllables: Syllable[] = [];

    for (let i = 0; i < syllableCount; i++) {
      let newSyllable: Syllable;
      let isValid = false;

      while (!isValid) {
        newSyllable = generateSyllable(i, syllableCount, i > 0 ? syllables[i - 1] : undefined);

        if (i === 0) {
          isValid = true; // First syllable is always valid
        } else {
          isValid = checkCrossSyllableSonority(syllables[i - 1], newSyllable);
        }

        // If not valid, we could try to resyllabify here
        if (!isValid) {
          [syllables[i - 1], newSyllable] = tryResyllabify(syllables[i - 1], newSyllable);
          isValid = checkCrossSyllableSonority(syllables[i - 1], newSyllable);
        }
      }
      // @ts-expect-error
      syllables.push(newSyllable);
    }

    const written = write(syllables);
    const pronunciation = pronounce(syllables);

    return {
      syllables,
      pronunciation,
      written,
    };
  } finally {
    // Ensure the original randomness function is restored
    overrideRand(originalRand);
  }
};

export default generateWord;