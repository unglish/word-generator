import { ClusterContext, Phoneme, WordGenerationContext, WordGenerationOptions, Word, Syllable } from "../types.js";
import { overrideRand, getRand, RandomFunction } from "../utils/random.js";
import { createSeededRandom } from "../utils/createSeededRandom.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { LanguageConfig, computeSonorityLevels } from "../config/language.js";
import { englishConfig } from "../config/english.js";
import { generatePronunciation } from "./pronounce.js";
import { createWrittenFormGenerator } from "./write.js";
import {
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
  invalidClusterRegexes: {
    onset: RegExp;
    coda: RegExp;
    /** Maps to config.invalidClusters.boundary — keyed "nucleus" because
     *  ClusterContext.position uses "nucleus" as the catch-all third position. */
    nucleus: RegExp;
  };
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
// Sonority
// ---------------------------------------------------------------------------

function getSonority(rt: GeneratorRuntime, phoneme: Phoneme): number {
  return rt.sonorityLevels.get(phoneme) ?? 0;
}

// ---------------------------------------------------------------------------
// Cluster building
// ---------------------------------------------------------------------------

function buildCluster(rt: GeneratorRuntime, context: ClusterContext): Phoneme[] {
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
    if (!isValidCandidate(candidates[i], rt, context)) {
      candidates.splice(i, 1);
    }
  }
}

function getValidCandidates(candidatePhonemes: Phoneme[], rt: GeneratorRuntime, context: ClusterContext): Phoneme[] {
  return candidatePhonemes.filter(p => isValidCandidate(p, rt, context));
}

function isValidCandidate(p: Phoneme, rt: GeneratorRuntime, context: ClusterContext): boolean {
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

function isValidCluster(rt: GeneratorRuntime, cluster: Phoneme[], position: "onset" | "coda" | "nucleus"): boolean {
  const potentialCluster = cluster.map(ph => ph.sound).join('');
  const patterns = getInvalidClusters(rt.config, position);
  return !patterns.some(regex => regex.test(potentialCluster));
}

function getInvalidClusters(config: LanguageConfig, position: "onset" | "coda" | "nucleus"): RegExp[] {
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

  return lastPhonemeWasAStop ? canFollowAStop : getSonority(rt, currPhoneme) > getSonority(rt, prevPhoneme!);
}

function checkCodaSonority(currPhoneme: Phoneme, rt: GeneratorRuntime, prevPhoneme: Phoneme | undefined): boolean {
  if (!prevPhoneme) return true;

  const prevSonority = getSonority(rt, prevPhoneme);
  const currSonority = getSonority(rt, currPhoneme);

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
  return buildCluster(rt, {
    position: "onset",
    cluster: [],
    ignore: toIgnore,
    isStartOfWord,
    isEndOfWord: false,
    syllableCount,
    maxLength,
  });
}

function pickNucleus(rt: GeneratorRuntime, context: WordGenerationContext, isStartOfWord: boolean, isEndOfWord: boolean): Phoneme[] {
  return buildCluster(rt, {
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

  let coda: Phoneme[] = buildCluster(rt, {
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

  const lastCodaSonority = getSonority(rt, lastCodaPhoneme);
  const firstOnsetSonority = getSonority(rt, firstOnsetPhoneme);
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

  const newSyllable: Syllable = {
    onset: [],
    nucleus: [],
    coda: [],
  };

  const hasOnset = determineHasOnset(isStartOfWord, prevSyllable);
  const hasCoda = determineHasCoda(isEndOfWord, monosyllabic);

  if (hasOnset) {
    newSyllable.onset = pickOnset(rt, context, isStartOfWord, monosyllabic);
  }

  newSyllable.nucleus = pickNucleus(rt, context, isStartOfWord, isEndOfWord);

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

function generateSyllables(rt: GeneratorRuntime, context: WordGenerationContext) {
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * A word generator instance created from a {@link LanguageConfig}.
 */
export interface WordGenerator {
  /** Generate a single random word. */
  generateWord: (options?: WordGenerationOptions) => Word;
}

/**
 * Creates a word generator from a {@link LanguageConfig}.
 *
 * All phoneme inventories, grapheme maps, sonority levels, and cluster
 * constraints are derived from the config at creation time — no global
 * state is referenced during generation.
 *
 * **Note:** Syllable-level generation weights (onset/coda length distributions,
 * boundary drop probability, has-onset/has-coda chances) are currently
 * English-specific constants from `weights.ts`. A future version will make
 * these part of the config.
 *
 * @param config - The language configuration to build from.
 * @returns A {@link WordGenerator} instance.
 *
 * @example
 * ```ts
 * import { createGenerator, englishConfig } from "word-generator";
 *
 * const gen = createGenerator(englishConfig);
 * const word = gen.generateWord({ seed: 42 });
 * console.log(word.written.clean);
 * ```
 */
export function createGenerator(config: LanguageConfig): WordGenerator {
  const rt = buildRuntime(config);

  return {
    generateWord: (options: WordGenerationOptions = {}): Word => {
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
        generateSyllables(rt, context);
        rt.generateWrittenForm(context);
        generatePronunciation(context);

        return context.word;
      } finally {
        overrideRand(originalRand);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Default English instance
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Test helpers — exported for unit tests, not part of the public API
// ---------------------------------------------------------------------------

/** @internal Build a cluster using the default English runtime. For tests only. */
export function _buildCluster(context: ClusterContext): Phoneme[] {
  return buildCluster(_defaultRuntime, context);
}

/** @internal Check cluster validity using the default English runtime. For tests only. */
export function _isValidCluster(cluster: Phoneme[], position: "onset" | "coda" | "nucleus"): boolean {
  return isValidCluster(_defaultRuntime, cluster, position);
}

/** @internal Exposed for tests that need the default runtime. */
const _defaultRuntime = buildRuntime(englishConfig);

// ---------------------------------------------------------------------------
// Default English instance
// ---------------------------------------------------------------------------

const english = createGenerator(englishConfig);

/**
 * Generates a random English-like word. Shorthand for the default English generator.
 *
 * @example
 * ```ts
 * import { generateWord } from "word-generator";
 * const word = generateWord();
 * ```
 */
export const generateWord = english.generateWord;

export default generateWord;
