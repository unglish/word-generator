import { overrideRand, getRand, RandomFunction } from "../utils/random.js";
import { createSeededRandom } from "../utils/createSeededRandom.js";
import pick from "../utils/pick.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { phonemes, invalidOnsetClusters, invalidBoundaryClusters, invalidCodaClusters, sonority, Phoneme } from "../elements/phonemes.js";
import pronounce from "./pronounce.js";
import { write, WrittenForm } from "./write.js";

export interface GenerateWordOptions {
  seed?: number;
  syllableCount?: number; // Optional specific syllable length
}

export interface Word {
  syllables: Syllable[];
  pronunciation: string;
  written: WrittenForm;
}

export interface Syllable {
  onset: Phoneme[];
  nucleus: Phoneme[];
  coda: Phoneme[];
}

function getSonority(phoneme: Phoneme): number {
  return sonority[phoneme.type] || 0;
}

function buildCluster(type: "onset" | "coda", maxLength: number = 3, ignore: string[] = [],): Phoneme[] {
  const cluster: Phoneme[] = [];

  while (cluster.length < maxLength) {
    let candidatePhonemes = phonemes.filter(p => {
      const isAllowedToStartWord = type === "onset" ? cluster.length === 0 && (!p.start || p.start > 0) : true;
      const isAllowedToEndWord = type === "coda" ? cluster.length === maxLength-1 && (!p.end || p.end > 0) : true;
      const isValidPosition = type === "onset" ? p.onset : p.coda && isAllowedToStartWord && isAllowedToEndWord;
      const isNotIgnored = !ignore.includes(p.sound);
      const isNotDuplicate = !cluster.some(existingP => existingP.sound === p.sound);
      
      // there are special cases for s in english where it can be followed by something
      // that increases in sonority
      const isSpecialS = 
        type === "onset" && 
        cluster.length === 1 && 
        cluster[0].sound === 's' && 
        ['t', 'p', 'k'].includes(p.sound);

      const hasSuitableSonority = cluster.length === 0 || isSpecialS ||
        (type === "onset" 
          ? getSonority(p) > getSonority(cluster[cluster.length - 1])
          : getSonority(p) < getSonority(cluster[cluster.length - 1]));

      // Check against invalid clusters
      const potentialCluster = cluster.map(ph => ph.sound).join('') + p.sound;
      const invalidClusters = type === "onset" ? invalidOnsetClusters : invalidCodaClusters;
      const isValidCluster = !invalidClusters.some(regex => regex.test(potentialCluster));

      return isValidPosition && isNotIgnored && isNotDuplicate && hasSuitableSonority && isValidCluster;
    });

    if (!candidatePhonemes.length) break;
    const newPhoneme = pick(candidatePhonemes);
    cluster.push(newPhoneme);

    // Special cases for English
    if ( type === "onset" 
      && cluster.length === 2
      && ['liquid','nasal'].includes(cluster[1].type)) {
      break;
    }
  }

  return cluster;
}

function pickOnset(prevSyllable?: Syllable): Phoneme[] {

  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length === 0;
  const length: number = getWeightedOption([
    [0, isFollowingNucleus ? 0 : 150], 
    [1, 675], 
    [2, 125], 
    [3, 15]
  ]);
  let onset: Phoneme[] = buildCluster(
    "onset",
    length,
    prevSyllable ? prevSyllable.coda.map((coda) => coda.sound) : [],
  );

  return onset;
}

function pickNucleus(prevSyllable?: Syllable) {
  const nuclei = phonemes.filter((p) => !!p.nucleus);
  const mappedNuclei: [Phoneme, number][] = nuclei.map((p) => [
    p,
    p.nucleus ?? 0,
  ]);
  const nucleus = getWeightedOption(mappedNuclei);
  return [nucleus];
}

function pickCoda(onset: Phoneme[], nucleus: Phoneme[], isLastSyllable: boolean = false): Phoneme[] {
  const length = getWeightedOption(isLastSyllable ? [
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

  let coda: Phoneme[] = buildCluster("coda", length, []);

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

function checkCrossSyllableSonority(prevSyllable: Syllable, currentSyllable: Syllable): boolean {
  if (!prevSyllable.coda.length || !currentSyllable.onset.length) {
    return true; // No cross-syllable cluster, so it's valid
  }

  const lastCodaPhoneme = prevSyllable.coda[prevSyllable.coda.length - 1];
  const firstOnsetPhoneme = currentSyllable.onset[0];

  // Allow equal sonority across syllable boundary
  // This is a simplification; you might want to refine this based on specific phoneme types
  return getSonority(firstOnsetPhoneme) >= getSonority(lastCodaPhoneme);
}

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

function generateSyllable(syllablePosition: number = 0, syllableCount: number = 1, prevSyllable?: Syllable) {
  // Build the syllable structure
  const isLastSyllable = syllablePosition === syllableCount - 1;
  const onset = pickOnset(prevSyllable);
  const nucleus = pickNucleus(prevSyllable);
  const coda = pickCoda(onset, nucleus, isLastSyllable);

  return {
    onset,
    nucleus,
    coda,
  };
}

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
      [7, 10],    // Very rare
      [8, 5],     // Very rare
      [9, 3],     // Very rare
      [10, 2],    // Very rare
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