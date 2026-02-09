import { ClusterContext, Phoneme, WordGenerationContext, WordGenerationOptions, Word, Syllable, getPhonemePositionWeight } from "../types.js";
import { overrideRand, getRand, RandomFunction } from "../utils/random.js";
import { createSeededRandom } from "../utils/createSeededRandom.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { LanguageConfig, computeSonorityLevels, validateConfig, ClusterLimits, SonorityConstraints } from "../config/language.js";
import { englishConfig } from "../config/english.js";
import { generatePronunciation } from "./pronounce.js";
import { createWrittenFormGenerator } from "./write.js";
import { repairClusters, repairFinalCoda, repairClusterShape } from "./repair.js";
import type { GenerationWeights } from "../config/language.js";

// ---------------------------------------------------------------------------
// Runtime: pre-computed data derived from a LanguageConfig
// ---------------------------------------------------------------------------

interface GeneratorRuntime {
  config: LanguageConfig;
  sonorityLevels: Map<Phoneme, number>;
  /** Sonority level by phoneme sound string (for quick lookup). */
  sonorityBySound: Map<string, number>;
  positionPhonemes: { onset: Phoneme[]; coda: Phoneme[]; nucleus: Phoneme[] };
  invalidClusterRegexes: {
    onset: RegExp | null;
    coda: RegExp | null;
    /** Maps to config.invalidClusters.boundary — keyed "nucleus" because
     *  ClusterContext.position uses "nucleus" as the catch-all third position. */
    nucleus: RegExp | null;
  };
  generateWrittenForm: (context: WordGenerationContext) => void;
  bannedSet?: Set<string>;
  clusterRepair?: "drop-coda" | "drop-onset";
  allowedFinalSet?: Set<string>;
  clusterLimits?: ClusterLimits;
  sonorityConstraints?: SonorityConstraints;
  codaAppendantSet?: Set<string>;
  onsetPrependerSet?: Set<string>;
  sonorityExemptSet?: Set<string>;
  attestedOnsetSet?: Set<string>;
}

function buildRuntime(config: LanguageConfig): GeneratorRuntime {
  validateConfig(config);
  const sonorityLevels = computeSonorityLevels(config);

  const positionPhonemes = {
    onset: Array.from(config.phonemeMaps.onset.values()).flat(),
    coda: Array.from(config.phonemeMaps.coda.values()).flat(),
    nucleus: Array.from(config.phonemeMaps.nucleus.values()).flat(),
  };

  const makeRegex = (patterns: string[]) =>
    patterns.length > 0 ? new RegExp(patterns.join('|'), 'i') : null;

  const invalidClusterRegexes = {
    onset: makeRegex(config.invalidClusters.onset),
    coda: makeRegex(config.invalidClusters.coda),
    nucleus: makeRegex(config.invalidClusters.boundary),
  };

  const generateWrittenForm = createWrittenFormGenerator(config);

  const bannedSet = config.clusterConstraint?.banned
    ? new Set(config.clusterConstraint.banned.map(([a, b]) => `${a}|${b}`))
    : undefined;

  const sonorityBySound = new Map<string, number>();
  for (const [phoneme, level] of sonorityLevels) {
    sonorityBySound.set(phoneme.sound, level);
  }

  const cl = config.clusterLimits;
  const sc = config.sonorityConstraints;

  return {
    config, sonorityLevels, sonorityBySound, positionPhonemes, invalidClusterRegexes, generateWrittenForm,
    bannedSet,
    clusterRepair: config.clusterConstraint?.repair,
    allowedFinalSet: config.codaConstraints?.allowedFinal
      ? new Set(config.codaConstraints.allowedFinal)
      : undefined,
    clusterLimits: cl,
    sonorityConstraints: sc,
    codaAppendantSet: cl?.codaAppendants ? new Set(cl.codaAppendants) : undefined,
    onsetPrependerSet: cl?.onsetPrependers ? new Set(cl.onsetPrependers) : undefined,
    sonorityExemptSet: sc?.exempt ? new Set(sc.exempt) : undefined,
    attestedOnsetSet: cl?.attestedOnsets
      ? new Set(cl.attestedOnsets.map(a => a.join("|")))
      : undefined,
  };
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
  const allPositionPhonemes = rt.positionPhonemes[context.position];

  while (context.cluster.length < context.maxLength) {
    const validCandidates = getValidCandidates(allPositionPhonemes, rt, context);
    if (validCandidates.length === 0) break;

    const newPhoneme = selectPhoneme(validCandidates, context);
    if (!newPhoneme) break;

    context.cluster.push(newPhoneme);
    if (shouldStopClusterGrowth(context, rt)) break;
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
      !isValidPosition(p, context)) {
    return false;
  }

  // When attested onset whitelist exists, use it as the primary gate for onsets
  // instead of the general sonority/regex checks
  if (context.position === "onset" && rt.attestedOnsetSet && context.cluster.length > 0) {
    const key = [...context.cluster.map(ph => ph.sound), p.sound].join("|");
    // Must be an exact attested onset or a prefix of one
    if (rt.attestedOnsetSet.has(key)) return true;
    return Array.from(rt.attestedOnsetSet).some(a => a.startsWith(key + "|"));
  }

  // Fallback: standard sonority and regex checks
  if (!checkSonority(p, rt, context)) return false;

  const regex = rt.invalidClusterRegexes[context.position];
  if (regex) {
    const potentialCluster = context.cluster.map(ph => ph.sound).join('') + p.sound;
    if (regex.test(potentialCluster)) return false;
  }

  return true;
}

function isValidPosition(p: Phoneme, { position, isStartOfWord, isEndOfWord }: ClusterContext): boolean {
  const positionWeight = getPhonemePositionWeight(p, position);
  return (positionWeight === undefined || positionWeight > 0) &&
         (!isStartOfWord || p.startWord === undefined || p.startWord > 0) &&
         (!isEndOfWord || p.endWord === undefined || p.endWord > 0);
}

function isValidCluster(rt: GeneratorRuntime, cluster: Phoneme[], position: "onset" | "coda" | "nucleus"): boolean {
  const regex = rt.invalidClusterRegexes[position];
  if (!regex) return true;
  const potentialCluster = cluster.map(ph => ph.sound).join('');
  return !regex.test(potentialCluster);
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
    (prevManner == 'nasal' && currManner === 'sibilant');

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

function shouldStopClusterGrowth(context: ClusterContext, rt: GeneratorRuntime): boolean {
  const { position, cluster } = context;

  // Check cluster length limits
  if (rt.clusterLimits) {
    const cl = rt.clusterLimits;
    if (position === "onset" && cluster.length >= cl.maxOnset) return true;
    if (position === "coda") {
      const effectiveMax = rt.codaAppendantSet && cluster.length > 0 &&
        rt.codaAppendantSet.has(cluster[cluster.length - 1].sound)
        ? cl.maxCoda + 1
        : cl.maxCoda;
      if (cluster.length >= effectiveMax) return true;
    }
  }

  // For onsets with attested whitelist: stop if current cluster is an exact match
  // and no longer attested onset extends it
  if (position === "onset" && rt.attestedOnsetSet && cluster.length >= 2) {
    const key = cluster.map(ph => ph.sound).join("|");
    if (rt.attestedOnsetSet.has(key)) {
      // Check if any longer attested onset extends this
      const hasLonger = Array.from(rt.attestedOnsetSet).some(a => a.startsWith(key + "|"));
      if (!hasLonger) return true;
    }
  }

  // Original heuristic: stop after liquid/nasal in onset
  if (position === "onset" &&
      cluster.length === 2 &&
      ['liquid', 'nasal'].includes(cluster[1].mannerOfArticulation)) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Syllable picking
// ---------------------------------------------------------------------------

function pickOnset(rt: GeneratorRuntime, context: WordGenerationContext, isStartOfWord: boolean, monosyllabic: boolean): Phoneme[] {
  const prevSyllable = context.word.syllables[context.currSyllableIndex - 1];
  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length === 0;
  const syllableCount = context.syllableCount;
  const { onsetLength } = rt.config.generationWeights;

  const maxLength = monosyllabic
    ? getWeightedOption(onsetLength.monosyllabic)
    : getWeightedOption(isFollowingNucleus ? onsetLength.followingNucleus : onsetLength.default);

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
  const onsetLen = newSyllable.onset.length;
  const { codaLength, probability } = rt.config.generationWeights;

  const weights: [number, number][] = monosyllabic
    ? (codaLength.monosyllabic[onsetLen] ?? codaLength.monosyllabicDefault)
    : [
        [0, isEndOfWord ? codaLength.zeroWeightEndOfWord : codaLength.zeroWeightMidWord],
        ...codaLength.polysyllabicNonzero,
      ];

  const maxLength: number = getWeightedOption(weights);
  if (maxLength === 0) return [];

  const coda: Phoneme[] = buildCluster(rt, {
    position: "coda",
    cluster: [],
    ignore: [],
    isStartOfWord: false,
    isEndOfWord,
    syllableCount,
    maxLength,
  });

  // Add 's' to the end of the last syllable occasionally
  if (isEndOfWord && getWeightedOption([[true, probability.finalS], [false, 100 - probability.finalS]])) {
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
  const { boundaryDrop } = rt.config.generationWeights.probability;
  if (firstOnsetSonority === lastCodaSonority && getWeightedOption([[true, boundaryDrop], [false, 100 - boundaryDrop]])) {
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

  const { probability } = rt.config.generationWeights;
  const hasOnset = determineHasOnset(probability, isStartOfWord, prevSyllable);
  const hasCoda = determineHasCoda(probability, isEndOfWord, monosyllabic);

  if (hasOnset) {
    newSyllable.onset = pickOnset(rt, context, isStartOfWord, monosyllabic);
  }

  newSyllable.nucleus = pickNucleus(rt, context, isStartOfWord, isEndOfWord);

  if (hasCoda) {
    newSyllable.coda = pickCoda(rt, context, newSyllable, isEndOfWord, monosyllabic);
  }

  return newSyllable;
}

function determineHasOnset(p: GenerationWeights["probability"], isStartOfWord: boolean, prevSyllable?: Syllable): boolean {
  if (isStartOfWord) {
    return getWeightedOption([[true, p.hasOnsetStartOfWord], [false, 100 - p.hasOnsetStartOfWord]]);
  } else {
    const prevHasCoda = prevSyllable && prevSyllable.coda.length > 0;
    return prevHasCoda ? getWeightedOption([[true, p.hasOnsetAfterCoda], [false, 100 - p.hasOnsetAfterCoda]]) : true;
  }
}

function determineHasCoda(p: GenerationWeights["probability"], isEndOfWord: boolean, monosyllabic: boolean): boolean {
  if (monosyllabic) {
    return getWeightedOption([[true, p.hasCodaMonosyllabic], [false, 100 - p.hasCodaMonosyllabic]]);
  } else if (isEndOfWord) {
    return getWeightedOption([[true, p.hasCodaEndOfWord], [false, 100 - p.hasCodaEndOfWord]]);
  } else {
    return getWeightedOption([[true, p.hasCodaMidWord], [false, 100 - p.hasCodaMidWord]]);
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

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Shared pipeline: syllable generation → repair → write → pronounce.
 */
function runPipeline(rt: GeneratorRuntime, context: WordGenerationContext): void {
  generateSyllables(rt, context);
  if (rt.bannedSet) repairClusters(context.word.syllables, rt.bannedSet, rt.clusterRepair!);
  if (rt.allowedFinalSet) repairFinalCoda(context.word.syllables, rt.allowedFinalSet);
  if (rt.clusterLimits || rt.config.codaConstraints?.voicingAgreement || rt.config.codaConstraints?.homorganicNasalStop) {
    repairClusterShape(context.word.syllables, {
      clusterLimits: rt.clusterLimits,
      sonorityConstraints: rt.sonorityConstraints,
      codaConstraints: rt.config.codaConstraints,
      sonorityBySound: rt.sonorityBySound,
      codaAppendantSet: rt.codaAppendantSet,
      sonorityExemptSet: rt.sonorityExemptSet,
    });
  }
  rt.generateWrittenForm(context);
  generatePronunciation(context, rt.config.vowelReduction);
}

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
        runPipeline(rt, context);

        return context.word;
      } finally {
        overrideRand(originalRand);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Default English instance (built once, shared by public API + test helpers)
// ---------------------------------------------------------------------------

const defaultRuntime = buildRuntime(englishConfig);

/**
 * Generates a random English-like word. Shorthand for the default English generator.
 *
 * @example
 * ```ts
 * import { generateWord } from "word-generator";
 * const word = generateWord();
 * ```
 */
export const generateWord = (options: WordGenerationOptions = {}): Word => {
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
    runPipeline(defaultRuntime, context);
    return context.word;
  } finally {
    overrideRand(originalRand);
  }
};

export default generateWord;

// ---------------------------------------------------------------------------
// Test helpers — exported for unit tests, not part of the public API
// ---------------------------------------------------------------------------

/** @internal Build a cluster using the default English runtime. For tests only. */
export function _buildCluster(context: ClusterContext): Phoneme[] {
  return buildCluster(defaultRuntime, context);
}

/** @internal Check cluster validity using the default English runtime. For tests only. */
export function _isValidCluster(cluster: Phoneme[], position: "onset" | "coda" | "nucleus"): boolean {
  return isValidCluster(defaultRuntime, cluster, position);
}
