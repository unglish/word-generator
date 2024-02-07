import { pick, getWeightedOption } from "../utils/index.js";
import { clusters, phonemes } from "../elements/phonemes.js";
import pronounce from "./pronounce.js";
import write from "./write.js";

// Helper function to get a random consonant cluster
function getRandomCluster(
  type: string,
  length: number,
  ignore: string | string[],
) {
  if (!ignore) ignore = [];
  const filteredClusters = clusters.filter(
    (cluster) =>
      // @ts-ignore
      cluster[type] &&
      cluster.sounds.length == length &&
      !cluster.sounds.some((sound) => ignore.includes(sound)),
  );
  // adjust the weight of the phoneme to diminish
  const selectedCluster = pick(filteredClusters).sounds;
  return selectedCluster.map((sound: string) =>
    phonemes.find((p) => p.sound == sound),
  );
}

function pickOnset(prevSyllable: { coda: string | any[]; nucleus: any }) {
  let complexity = 0;

  if (prevSyllable) {
    const prevSyllablePhonemes = prevSyllable.coda.concat(
      prevSyllable.nucleus,
      // @ts-ignore
      prevSyllable.coda,
    );
    // @ts-ignore
    complexity = prevSyllablePhonemes.reduce(
      (totalComplexity: any, phoneme: { complexity: any }) =>
        totalComplexity + phoneme.complexity,
      0,
    );
  }

  const lengthOptions = [];
  if (prevSyllable && prevSyllable.coda.length > 0 && complexity > 4) {
    lengthOptions.push([0, 1000]);
  } else if (prevSyllable && prevSyllable.coda.length === 0) {
    lengthOptions.push([0, 0]);
  } else {
    lengthOptions.push([0, 2]);
  }

  if (complexity > 4) {
    lengthOptions.push([1, 50], [2, 10]);
  } else {
    lengthOptions.push([1, 600], [2, 250], [3, 50]);
  }

  const length = getWeightedOption(lengthOptions);
  let onset = [];
  if (length > 1) {
    onset = getRandomCluster(
      "onset",
      length,
      prevSyllable ? prevSyllable.coda : [],
    );
  } else if (length === 1) {
    const simpleOnsets = phonemes.filter((p) => !!p.onset);
    // remove all the phonemes from the prev syllable's coda
    const weightedSimpleOnsets = simpleOnsets.map((p) => [p, p.onset]);
    onset = [getWeightedOption(weightedSimpleOnsets)];
  }

  return onset;
}

function pickNucleus() {
  const nuclei = phonemes.filter((p) => !!p.nucleus);
  const mappedNuclei = nuclei.map((p) => [p, p.nucleus]);
  const nucleus = getWeightedOption(mappedNuclei);
  return [nucleus];
}

function pickCoda(onset: any[], nucleus: any[]) {
  let complexity = 0;
  const MAX_COMPLEXITY = 3;
  complexity = onset.reduce(
    (totalComplexity: any, phoneme: { complexity: any }) =>
      totalComplexity + phoneme.complexity,
    0,
  );
  complexity += nucleus[0].complexity;
  complexity = Math.min(complexity, MAX_COMPLEXITY);

  const lengthOptions = {
    1: [
      [0, 5],
      [1, 900],
      [2, 550],
      [3, 100],
    ],
    2: [
      [0, 50],
      [1, 850],
      [2, 150],
      [3, 50],
    ],
    3: [
      [0, 800],
      [1, 200],
      [2, 50],
    ],
  };
  // @ts-ignore
  const length = getWeightedOption(lengthOptions[complexity]);

  let coda = [];
  if (length > 1) {
    coda = getRandomCluster("coda", length, []);
  } else if (length === 1) {
    const simpleCodas = phonemes.filter((p) => !!p.coda);
    const weightedSimpleCodas = simpleCodas.map((p) => [p, p.coda]);
    coda = [getWeightedOption(weightedSimpleCodas)];
  }
  return coda;
}

function generateSyllable(
  prevSyllable: { onset: any; nucleus: any[]; coda: any } | undefined,
) {
  // Build the syllable structure
  // @ts-ignore
  const onset = pickOnset(prevSyllable);
  const nucleus = pickNucleus();
  const coda = pickCoda(onset, nucleus);

  return {
    onset,
    nucleus,
    coda,
  };
}

export default () => {
  const syllableCount = getWeightedOption([
    [1, 9000],
    [2, 1500],
    [3, 100],
    [4, 1],
  ]);

  const word = {
    syllables: [],
    pronunciation: "",
    written: {},
  };

  for (let i = 0, prevSyllable; i < syllableCount; i++) {
    // @ts-ignore
    prevSyllable = generateSyllable(prevSyllable, syllableCount);
    // @ts-ignore
    word.syllables.push(prevSyllable);
  }

  word.written = write(word);
  word.pronunciation = pronounce(word);

  return word;
};
