import { ClusterContext, Phoneme, WordGenerationContext, WordGenerationOptions, Word, Syllable } from "../types.js";
import { overrideRand, getRand, RandomFunction } from "../utils/random.js";
import { createSeededRandom } from "../utils/createSeededRandom.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { LanguageConfig, computeSonorityLevels } from "../config/language.js";
import { englishConfig } from "../config/english.js";
import { generatePronunciation } from "./pronounce.js";
import { createWrittenFormGenerator } from "./write.js";
import {
  SYLLABLE_COUNT_WEIGHTS,
  ONSET_LENGTH_MONOSYLLABIC,
  ONSET_LENGTH_FOLLOWING_NUCLEUS,
  ONSET_LENGTH_DEFAULT,
  CODA_LENGTH_MONOSYLLABIC,
  CODA_LENGTH_MONOSYLLABIC_DEFAULT,
  CODA_ZERO_WEIGHT_END_OF_WORD,
  CODA_ZERO_WEIGHT_MID_WORD,
  CODA_LENGTH_POLYSYLLABIC_NONZERO,
  FINAL_S_CHANCE,
  BOUNDARY_DROP_CHANCE,
  HAS_ONSET_START_OF_WORD,
  HAS_ONSET_AFTER_CODA,
  HAS_CODA_MONOSYLLABIC,
  HAS_CODA_END_OF_WORD,
  HAS_CODA_MID_WORD,
} from "../config/weights.js";

// ---------------------------------------------------------------------------
// Runtime: pre-computed data derived from a LanguageConfig
// ---------------------------------------------------------------------------

interface GeneratorRuntime {
  config: LanguageConfig;
  sonorityLevels: Map<Phoneme, number>;
  positionPhonemes: { onset: Phoneme[]; coda: Phoneme[]; nucleus: Phoneme[] };
  invalidClusterRegexes: { onset: RegExp; coda: RegExp; nucleus: RegExp };
  generateWrittenForm: (context: WordGenerationContext) => void;
}

function buildRuntime(config: LanguageConfig): GeneratorRuntime {
  const sonorityLevels = computeSonorityLevels(config);

  const positionPhonemes = {
    onset: Array.from(config.phonemeMaps.onset.values()).flat(),
    coda: Array.from(config.phonemeMaps.coda.values()).flat(),
    nucleus: Array.from(config.phonemeMaps.nucleus.values()).flat(),
  };

  const invalidClusterRegexes = {
    onset: new RegExp(config.invalidClusters.onset.map(r => r.source).join('|'), 'i'),
    coda: new RegExp(config.invalidClusters.coda.map(r => r.source).join('|'), 'i'),
    nucleus: new RegExp(config.invalidClusters.boundary.map(r => r.source).join('|'), 'i'),
  };

  const generateWrittenForm = createWrittenFormGenerator(config);

  return { config, sonorityLevels, positionPhonemes, invalidClusterRegexes, generateWrittenForm };
}

// ---------------------------------------------------------------------------
// Default runtime (English) — used by module-level exports for backward compat
// ---------------------------------------------------------------------------

const defaultRuntime = buildRuntime(englishConfig);

// ---------------------------------------------------------------------------
// Sonority
// ---------------------------------------------------------------------------

/**
 * Determines the sonority level of a given phoneme.
 *
 * @param phoneme - The phoneme to evaluate.
 * @returns The sonority level of the phoneme, or 0 if not found.
 */
export const getSonority = (phoneme: Phoneme): number => {
  return defaultRuntime.sonorityLevels.get(phoneme) ?? 0;
};

function getSonorityFor(rt: GeneratorRuntime, phoneme: Phoneme): number {
  return rt.sonorityLevels.get(phoneme) ?? 0;
}

// ---------------------------------------------------------------------------
// Cluster building
// ---------------------------------------------------------------------------

export function buildCluster(context: ClusterContext): Phoneme[] {
  return buildClusterWith(defaultRuntime, context);
}

function buildClusterWith(rt: GeneratorRuntime, context: ClusterContext): Phoneme[] {
  const validCandidates = getValidCandidates(rt.positionPhonemes[context.position], rt, context);

  while (context.cluster.length < context.maxLength && validCandidates.length > 0) {
    const newPhoneme = selectPhoneme(validCandidates, context);
    if (!newPhoneme) break;

    context.cluster.push(newPhoneme);
    if (shouldStopClusterGrowth(context)) break;

    updateValidCandidates(validCandidates, rt, context);
  }

  return context.cluster;
}

function updateValidCandidates(candidates: Phoneme[], rt: GeneratorRuntime, context: ClusterContext) {
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (!isValidCandidateWith(candidates[i], rt, context)) {
      candidates.splice(i, 1);
    }
  }
}

function getValidCandidates(candidatePhonemes: Phoneme[], rt: GeneratorRuntime, context: ClusterContext): Phoneme[] {
  return candidatePhonemes.filter(p => isValidCandidateWith(p, rt, context));
}

function isValidCandidateWith(p: Phoneme, rt: GeneratorRuntime, context: ClusterContext): boolean {
  if (context.ignore.includes(p.sound) ||
      context.cluster.some(existingP => existingP.sound === p.sound) ||
      !isValidPosition(p, context) ||
      !checkSonority(p, rt, context)) {
    return false;
  }

  const potentialCluster = context.cluster.map(ph => ph.sound).join('') + p.sound;
  return !rt.invalidClusterRegexes[context.position].test(potentialCluster);
}

function isValidPosition(p: Phoneme, { position, isStartOfWord, isEndOfWord }: ClusterContext): boolean {
  // Phoneme has dynamic position keys (onset, coda, nucleus) as optional numbers
  const positionWeight = (p as unknown as Record<string, number | undefined>)[position];
  return (positionWeight === undefined || positionWeight > 0) &&
         (!isStartOfWord || p.startWord === undefined || p.startWord > 0) &&
         (!isEndOfWord || p.endWord === undefined || p.endWord > 0);
}

export const isValidCluster = ({ cluster, position }: ClusterContext): boolean => {
  return isValidClusterWith(defaultRuntime, { cluster, position } as ClusterContext);
};

function isValidClusterWith(rt: GeneratorRuntime, { cluster, position }: ClusterContext): boolean {
  const potentialCluster = cluster.map(ph => ph.sound).join('');
  const invalidClusters = getInvalidClustersFor(rt.config, position);
  return !invalidClusters.some(regex => regex.test(potentialCluster));
}

function getInvalidClustersFor(config: LanguageConfig, position: "onset" | "coda" | "nucleus"): RegExp[] {
  switch (position) {
    case "onset": return config.invalidClusters.onset;
    case "coda": return config.invalidClusters.coda;
    default: return config.invalidClusters.boundary;
  }
}

// ---------------------------------------------------------------------------
// Sonority checks
// ---------------------------------------------------------------------------

function checkSonority(p: Phoneme, rt: GeneratorRuntime, { cluster, position }: ClusterContext): boolean {
  const prevPhoneme = cluster[cluster.length - 1];

  switch (position) {
    case "onset":
      return checkOnsetSonority(p, rt, cluster, prevPhoneme);
    case "coda":
      return checkCodaSonority(p, rt, prevPhoneme);
    case "nucleus":
      return true;
    default:
      return false;
  }
}

function checkOnsetSonority(currPhoneme: Phoneme, rt: GeneratorRuntime, cluster: Phoneme[], prevPhoneme: Phoneme | undefined): boolean {
  if (cluster.length === 0) return true;

  const isSClusterException =
    cluster.length === 1 &&
    cluster[0].sound === 's' &&
    ['t', 'p', 'k'].includes(currPhoneme.sound);

  if (isSClusterException) return true;

  if (currPhoneme.placeOfArticulation === prevPhoneme?.placeOfArticulation) return false;

  const lastPhonemeWasAStop = prevPhoneme && ['stop'].includes(prevPhoneme.mannerOfArticulation);
  const canFollowAStop = lastPhonemeWasAStop ? ['glide', 'liquid'].includes(currPhoneme.mannerOfArticulation) : false;

  return lastPhonemeWasAStop ? canFollowAStop : getSonorityFor(rt, currPhoneme) > getSonorityFor(rt, prevPhoneme!);
}

function checkCodaSonority(currPhoneme: Phoneme, rt: GeneratorRuntime, prevPhoneme: Phoneme | undefined): boolean {
  if (!prevPhoneme) return true;

  const prevSonority = getSonorityFor(rt, prevPhoneme);
  const currSonority = getSonorityFor(rt, currPhoneme);

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

// ---------------------------------------------------------------------------
// Phoneme selection
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Syllable picking
// ---------------------------------------------------------------------------

function pickOnset(rt: GeneratorRuntime, context: WordGenerationContext, isStartOfWord: boolean, monosyllabic: boolean): Phoneme[] {
  const prevSyllable = context.word.syllables[context.currSyllableIndex - 1];
  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length === 0;
  const syllableCount = context.syllableCount;

  const getMaxLength = () => {
    if (monosyllabic) {
      return getWeightedOption(ONSET_LENGTH_MONOSYLLABIC);
    } else {
      return getWeightedOption(
        isFollowingNucleus ? ONSET_LENGTH_FOLLOWING_NUCLEUS : ONSET_LENGTH_DEFAULT
      );
    }
  };

  const maxLength = getMaxLength();
  if (maxLength === 0) return [];

  const toIgnore = prevSyllable ? prevSyllable.coda.map((coda) => coda.sound) : [];
  return buildClusterWith(rt, {
    position: "onset",
    cluster: [],
    ignore: toIgnore,
    isStartOfWord,
    isEndOfWord: false,
    syllableCount,
    maxLength,
  });
}

function pickNucleus(rt: GeneratorRuntime, context: WordGenerationContext, isStartOfWord: boolean, isEndOfWord: boolean, hasCoda: boolean): Phoneme[] {
  return buildClusterWith(rt, {
    position: "nucleus",
    cluster: [],
    ignore: [],
    isStartOfWord,
    isEndOfWord,
    maxLength: 1,
    syllableCount: context.syllableCount,
  });
}

function pickCoda(rt: GeneratorRuntime, context: WordGenerationContext, newSyllable: Syllable, isEndOfWord: boolean, monosyllabic: boolean): Phoneme[] {
  const syllableCount = context.syllableCount;
  const onsetLength = newSyllable.onset.length;

  const getCodaLengthWeights = (onsetLength: number): [number, number][] => {
    if (monosyllabic) {
      return CODA_LENGTH_MONOSYLLABIC[onsetLength] ?? CODA_LENGTH_MONOSYLLABIC_DEFAULT;
    } else {
      return [
        [0, isEndOfWord ? CODA_ZERO_WEIGHT_END_OF_WORD : CODA_ZERO_WEIGHT_MID_WORD],
        ...CODA_LENGTH_POLYSYLLABIC_NONZERO,
      ];
    }
  };

  const maxLength: number = getWeightedOption(getCodaLengthWeights(onsetLength) as [number, number][]);
  if (maxLength === 0) return [];

  let coda: Phoneme[] = buildClusterWith(rt, {
    position: "coda",
    cluster: [],
    ignore: [],
    isStartOfWord: false,
    isEndOfWord,
    syllableCount,
    maxLength,
  });

  // Add 's' to the end of the last syllable occasionally
  if (isEndOfWord && getWeightedOption([[true, FINAL_S_CHANCE], [false, 100 - FINAL_S_CHANCE]])) {
    const sPhoneme = rt.config.phonemes.find(p => p.sound === 's');
    if (sPhoneme) {
      coda.push(sPhoneme);
    }
  }

  return coda;
}

// ---------------------------------------------------------------------------
// Boundary adjustment
// ---------------------------------------------------------------------------

/**
 * Adjusts two adjacent syllables based on sonority and phonological rules.
 * If the sonorities are equal there's a 90% chance to drop the coda phoneme.
 */
function adjustBoundary(rt: GeneratorRuntime, prevSyllable: Syllable, currentSyllable: Syllable): [Syllable, Syllable] {
  const lastCodaPhoneme = prevSyllable.coda.at(-1);
  const firstOnsetPhoneme = currentSyllable.onset[0];

  if (!lastCodaPhoneme || !firstOnsetPhoneme) return [prevSyllable, currentSyllable];

  const lastCodaSonority = getSonorityFor(rt, lastCodaPhoneme);
  const firstOnsetSonority = getSonorityFor(rt, firstOnsetPhoneme);
  if (firstOnsetSonority === lastCodaSonority && getWeightedOption([[true, BOUNDARY_DROP_CHANCE], [false, 100 - BOUNDARY_DROP_CHANCE]])) {
    prevSyllable.coda.pop();
  }

  return [prevSyllable, currentSyllable];
}

// ---------------------------------------------------------------------------
// Syllable generation
// ---------------------------------------------------------------------------

function generateSyllable(rt: GeneratorRuntime, context: WordGenerationContext): Syllable {
  const isEndOfWord = context.currSyllableIndex === context.syllableCount - 1;
  const isStartOfWord = context.currSyllableIndex === 0;
  const prevSyllable = context.word.syllables[context.currSyllableIndex - 1];
  const syllableCount = context.syllableCount;
  const monosyllabic = syllableCount === 1;

  let newSyllable: Syllable = {
    onset: [],
    nucleus: [],
    coda: [],
  };

  const hasOnset = determineHasOnset(isStartOfWord, prevSyllable);
  const hasCoda = determineHasCoda(isEndOfWord, monosyllabic);

  if (hasOnset) {
    newSyllable.onset = pickOnset(rt, context, isStartOfWord, monosyllabic);
  }

  newSyllable.nucleus = pickNucleus(rt, context, isStartOfWord, isEndOfWord, hasCoda);

  if (hasCoda) {
    newSyllable.coda = pickCoda(rt, context, newSyllable, isEndOfWord, monosyllabic);
  }

  return newSyllable;
}

function determineHasOnset(isStartOfWord: boolean, prevSyllable?: Syllable): boolean {
  if (isStartOfWord) {
    return getWeightedOption([[true, HAS_ONSET_START_OF_WORD], [false, 100 - HAS_ONSET_START_OF_WORD]]);
  } else {
    const prevHasCoda = prevSyllable && prevSyllable.coda.length > 0;
    return prevHasCoda ? getWeightedOption([[true, HAS_ONSET_AFTER_CODA], [false, 100 - HAS_ONSET_AFTER_CODA]]) : true;
  }
}

function determineHasCoda(isEndOfWord: boolean, monosyllabic: boolean): boolean {
  if (monosyllabic) {
    return getWeightedOption([[true, HAS_CODA_MONOSYLLABIC], [false, 100 - HAS_CODA_MONOSYLLABIC]]);
  } else if (isEndOfWord) {
    return getWeightedOption([[true, HAS_CODA_END_OF_WORD], [false, 100 - HAS_CODA_END_OF_WORD]]);
  } else {
    return getWeightedOption([[true, HAS_CODA_MID_WORD], [false, 100 - HAS_CODA_MID_WORD]]);
  }
}

function generateSyllablesWith(rt: GeneratorRuntime, context: WordGenerationContext) {
  if (!context.syllableCount) {
    context.syllableCount = getWeightedOption(rt.config.syllableStructure.syllableCountWeights);
  }

  const syllables = new Array(context.syllableCount);
  let prevSyllable: Syllable | undefined;

  for (let i = 0; i < context.syllableCount; i++) {
    let newSyllable = generateSyllable(rt, context);

    if (prevSyllable) {
      [prevSyllable, newSyllable] = adjustBoundary(rt, prevSyllable, newSyllable);
    }

    syllables[i] = newSyllable;
    prevSyllable = newSyllable;
    context.currSyllableIndex++;
  }

  context.word.syllables = syllables;
}

/** @deprecated Use generateSyllablesWith — kept for backward compat with tests */
export const generateSyllables = (context: WordGenerationContext) => {
  generateSyllablesWith(defaultRuntime, context);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a word generator from a {@link LanguageConfig}.
 *
 * All phoneme inventories, grapheme maps, sonority levels, and cluster
 * constraints are derived from the config at creation time — no global
 * state is referenced during generation.
 *
 * @param config - The language configuration to build from.
 * @returns An object with a `generateWord` function.
 *
 * @example
 * ```ts
 * import { createGenerator } from "word-generator/core/generate";
 * import { englishConfig } from "word-generator/config/english";
 *
 * const gen = createGenerator(englishConfig);
 * const word = gen.generateWord({ seed: 42 });
 * ```
 */
export function createGenerator(config: LanguageConfig) {
  const rt = buildRuntime(config);

  return {
    generateWord: (options: WordGenerationOptions = {}): Word => {
      return generateWordWith(rt, options);
    },
  };
}

function generateWordWith(rt: GeneratorRuntime, options: WordGenerationOptions = {}): Word {
  const originalRand: RandomFunction = getRand();
  const context: WordGenerationContext = {
    word: {
      syllables: [],
      pronunciation: '',
      written: { clean: '', hyphenated: '' },
    },
    syllableCount: options.syllableCount || 0,
    currSyllableIndex: 0,
  };

  if (options.seed !== undefined) {
    overrideRand(createSeededRandom(options.seed));
  }

  try {
    generateSyllablesWith(rt, context);
    rt.generateWrittenForm(context);
    generatePronunciation(context);

    return context.word;
  } finally {
    overrideRand(originalRand);
  }
}

/**
 * Generates a random English-like word based on phonotactic rules.
 *
 * The generator builds syllables (onset → nucleus → coda) using weighted
 * phoneme selection, then derives a written (spelled) form and an IPA
 * pronunciation string.
 *
 * @param options - Optional configuration for word generation.
 * @param options.syllableCount - Force the word to have this many syllables.
 *   When omitted a count is chosen by weighted random (1–7, favouring 2–3).
 * @param options.seed - Integer seed for deterministic output. The internal
 *   RNG is replaced for the duration of this call and restored afterwards.
 * @param options.word - Supply a partial {@link Word} to continue building on.
 * @returns A {@link Word} object with `syllables`, `pronunciation`, and `written` fields.
 *
 * @example
 * ```ts
 * import { generateWord } from "word-generator";
 *
 * // Fully random
 * const word = generateWord();
 * console.log(word.written.clean);       // e.g. "strandel"
 * console.log(word.pronunciation);       // IPA string
 *
 * // Deterministic (same seed → same word)
 * const w1 = generateWord({ seed: 123 });
 * const w2 = generateWord({ seed: 123 });
 * console.log(w1.written.clean === w2.written.clean); // true
 *
 * // Fixed syllable count
 * const mono = generateWord({ syllableCount: 1 });
 * ```
 */
export const generateWord = (options: WordGenerationOptions = {}): Word => {
  return generateWordWith(defaultRuntime, options);
};

export default generateWord;
