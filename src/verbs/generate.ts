import { overrideRand, getRand, RandomFunction } from "../utils/random.js";
import { createSeededRandom } from "../utils/createSeededRandom.js";
import pick from "../utils/pick.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { clusters, phonemes, Phoneme, Cluster } from "../elements/phonemes.js";
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

// Helper function to get a random consonant cluster
function getRandomCluster(
  type: "coda" | "onset",
  length: number,
  ignore: string[] = [],
): Phoneme[] {
  const filteredClusters = clusters.filter(
    (cluster: Cluster) =>
      cluster[type] &&
      cluster.sounds.length == length &&
      !cluster.sounds.some((sound) => ignore.includes(sound)),
  );

  const selectedCluster = pick(filteredClusters).sounds;
  const result: (Phoneme | undefined)[] = selectedCluster.map((sound: string) =>
    phonemes.find((p) => p.sound === sound),
  );

  const phonemesFiltered: Phoneme[] = result.filter(
    (phoneme): phoneme is Phoneme => phoneme !== undefined,
  );

  return phonemesFiltered;
}

function pickOnset(prevSyllable?: Syllable): Phoneme[] {
  let complexity = 0;
  const MAX_COMPLEXITY = 3;

  if (prevSyllable) {
    const prevSyllablePhonemes = prevSyllable.coda.concat(
      prevSyllable.nucleus,
      prevSyllable.coda,
    );
    complexity = prevSyllablePhonemes.reduce(
      (totalComplexity, phoneme) => totalComplexity + phoneme.complexity,
      0,
    );
  }

  const lengthOptions: [number, number][] = [];
  const isOverlyComplex = complexity > MAX_COMPLEXITY;
  const isFollowingCoda = prevSyllable && prevSyllable.coda.length > 0;
  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length > 0;

  if (isFollowingCoda && isOverlyComplex) {
    lengthOptions.push([0, 900]);
  } else if (isFollowingNucleus) {
    lengthOptions.push([0, 0]);
  } else {
    lengthOptions.push([0, 150]);
  }

  if (isOverlyComplex) {
    lengthOptions.push([1, 675], [2, 125]);
  } else {
    lengthOptions.push([1, 675], [2, 125], [3, 15]);
  }

  const length: number = getWeightedOption(lengthOptions);
  let onset: Phoneme[] = [];
  if (length > 1) {
    onset = getRandomCluster(
      "onset",
      length,
      prevSyllable ? prevSyllable.coda.map((coda) => coda.sound) : [],
    );
  } else if (length === 1) {
    const simpleOnsets = phonemes.filter((p) => p.onset !== undefined);
    // remove all the phonemes from the prev syllable's coda
    const weightedSimpleOnsets: [Phoneme, number][] = simpleOnsets.map((p) => [
      p,
      p.onset ?? 0,
    ]);
    onset = [getWeightedOption(weightedSimpleOnsets)];
  }

  return onset;
}

function pickNucleus() {
  const nuclei = phonemes.filter((p) => !!p.nucleus);
  const mappedNuclei: [Phoneme, number][] = nuclei.map((p) => [
    p,
    p.nucleus ?? 0,
  ]);
  const nucleus = getWeightedOption(mappedNuclei);
  return [nucleus];
}

function pickCoda(onset: Phoneme[], nucleus: Phoneme[]): Phoneme[] {
  let complexity =
    onset.reduce(
      (totalComplexity, phoneme) => totalComplexity + phoneme.complexity,
      0,
    ) + nucleus[0].complexity;
  const MAX_COMPLEXITY = 3;
  complexity = Math.min(complexity, MAX_COMPLEXITY);

  type LengthOptionsType = { [key: number]: [number, number][] };
  const lengthOptions: LengthOptionsType = {
    1: [
      [0, 6000],
      [1, 3000],
      [2, 900],
      [3, 100],
    ],
    2: [
      [0, 7000],
      [1, 3000],
      [2, 90],
      [3, 10],
    ],
    3: [
      [0, 8000],
      [1, 400],
    ],
  };

  const length = getWeightedOption(lengthOptions[complexity] || [[0, 1]]);

  if (length > 1) {
    return getRandomCluster("coda", length, []);
  } else if (length === 1) {
    const simpleCodas = phonemes.filter((p) => !!p.coda);
    // Assuming getWeightedOption returns a Phoneme
    return [getWeightedOption(simpleCodas.map((p) => [p, p.coda ?? 0]))];
  } else {
    return [];
  }
}

function generateSyllable(prevSyllable?: Syllable) {
  // Build the syllable structure

  const onset = pickOnset(prevSyllable);
  const nucleus = pickNucleus();
  const coda = pickCoda(onset, nucleus);

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
      [1, 40000],  // 30-40%
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

    const syllables = [];

    for (let i = 0, prevSyllable; i < syllableCount; i++) {
      prevSyllable = generateSyllable(prevSyllable);
      syllables.push(prevSyllable);
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
