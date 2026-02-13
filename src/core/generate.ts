import { ClusterContext, Phoneme, WordGenerationContext, WordGenerationOptions, Word, Syllable, getPhonemePositionWeight, GenerationMode } from "../types.js";
import { RNG, createSeededRng, createDefaultRng } from "../utils/random.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { LanguageConfig, computeSonorityLevels, validateConfig, ClusterLimits, SonorityConstraints } from "../config/language.js";
import { englishConfig } from "../config/english.js";
import { applyStress, generatePronunciation } from "./pronounce.js";
import { createWrittenFormGenerator } from "./write.js";
import { repairClusters, repairFinalCoda, repairClusterShape, repairNgCodaSibilant } from "./repair.js";
import { repairStressedNuclei } from "./stress-repair.js";
import { planMorphology, applyMorphology } from "./morphology.js";
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
  bannedCodaSet?: Set<string>;
  clusterLimits?: ClusterLimits;
  sonorityConstraints?: SonorityConstraints;
  codaAppendantSet?: Set<string>;
  onsetPrependerSet?: Set<string>;
  sonorityExemptSet?: Set<string>;
  attestedOnsetSet?: Set<string>;
  attestedCodaSet?: Set<string>;
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
    bannedCodaSet: config.codaConstraints?.bannedCodas
      ? new Set(config.codaConstraints.bannedCodas)
      : undefined,
    clusterLimits: cl,
    sonorityConstraints: sc,
    codaAppendantSet: cl?.codaAppendants ? new Set(cl.codaAppendants) : undefined,
    onsetPrependerSet: cl?.onsetPrependers ? new Set(cl.onsetPrependers) : undefined,
    sonorityExemptSet: sc?.exempt ? new Set(sc.exempt) : undefined,
    attestedOnsetSet: cl?.attestedOnsets
      ? new Set(cl.attestedOnsets.map(a => a.join("|")))
      : undefined,
    attestedCodaSet: cl?.attestedCodas
      ? new Set(cl.attestedCodas.map(a => a.join("|")))
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

function getValidCandidates(candidatePhonemes: Phoneme[], rt: GeneratorRuntime, context: ClusterContext): Phoneme[] {
  return candidatePhonemes.filter(p => isValidCandidate(p, rt, context));
}

function isValidCandidate(p: Phoneme, rt: GeneratorRuntime, context: ClusterContext): boolean {
  if (context.ignore.includes(p.sound) ||
      context.cluster.some(existingP => existingP.sound === p.sound) ||
      !isValidPosition(p, context)) {
    return false;
  }

  // Reject phonemes banned from coda position entirely
  if (context.position === "coda" && rt.bannedCodaSet?.has(p.sound)) {
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

  // When attested coda whitelist exists, use it as the primary gate for codas
  if (context.position === "coda" && rt.attestedCodaSet && context.cluster.length > 0) {
    const key = [...context.cluster.map(ph => ph.sound), p.sound].join("|");
    if (rt.attestedCodaSet.has(key)) return true;
    return Array.from(rt.attestedCodaSet).some(a => a.startsWith(key + "|"));
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

function selectPhoneme(validCandidates: Phoneme[], { position, isStartOfWord, isEndOfWord, rand }: ClusterContext): Phoneme | null {
  const weightedCandidates = validCandidates.map(p => {
    const positionWeight = p[position] ?? 0;
    const wordPositionModifier =
      (isStartOfWord && p.startWord) ||
      (isEndOfWord && p.endWord) ||
      p.midWord || 1;
    return [p, positionWeight * wordPositionModifier] as [Phoneme, number];
  });
  return getWeightedOption(weightedCandidates, rand);
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

  // For codas with attested whitelist: stop if current cluster is an exact match
  // and no longer attested coda extends it
  if (position === "coda" && rt.attestedCodaSet && cluster.length >= 2) {
    const key = cluster.map(ph => ph.sound).join("|");
    if (rt.attestedCodaSet.has(key)) {
      const hasLonger = Array.from(rt.attestedCodaSet).some(a => a.startsWith(key + "|"));
      if (!hasLonger) return true;
    }
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

  const rand = context.rand;
  const maxLength = monosyllabic
    ? getWeightedOption(onsetLength.monosyllabic, rand)
    : getWeightedOption(isFollowingNucleus ? onsetLength.followingNucleus : onsetLength.default, rand);

  if (maxLength === 0) return [];

  const toIgnore = prevSyllable ? prevSyllable.coda.map((coda) => coda.sound) : [];
  return buildCluster(rt, {
    rand,
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
    rand: context.rand,
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

  const rand = context.rand;
  const maxLength: number = getWeightedOption(weights, rand);
  if (maxLength === 0) return [];

  const coda: Phoneme[] = buildCluster(rt, {
    rand: context.rand,
    position: "coda",
    cluster: [],
    ignore: [],
    isStartOfWord: false,
    isEndOfWord,
    syllableCount,
    maxLength,
  });

  // Add 's' to the end of the last syllable occasionally
  if (isEndOfWord && getWeightedOption([[true, probability.finalS], [false, 100 - probability.finalS]], rand)) {
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
function adjustBoundary(rt: GeneratorRuntime, prevSyllable: Syllable, currentSyllable: Syllable, rand: RNG): [Syllable, Syllable] {
  const lastCodaPhoneme = prevSyllable.coda.at(-1);
  const firstOnsetPhoneme = currentSyllable.onset[0];

  if (!lastCodaPhoneme || !firstOnsetPhoneme) return [prevSyllable, currentSyllable];

  const lastCodaSonority = getSonority(rt, lastCodaPhoneme);
  const firstOnsetSonority = getSonority(rt, firstOnsetPhoneme);
  const { boundaryDrop } = rt.config.generationWeights.probability;
  if (firstOnsetSonority === lastCodaSonority && getWeightedOption([[true, boundaryDrop], [false, 100 - boundaryDrop]], rand)) {
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
  const rand = context.rand;
  const hasOnset = determineHasOnset(probability, isStartOfWord, rand, prevSyllable);
  const hasCoda = determineHasCoda(probability, isEndOfWord, monosyllabic, rand);

  if (hasOnset) {
    newSyllable.onset = pickOnset(rt, context, isStartOfWord, monosyllabic);
  }

  newSyllable.nucleus = pickNucleus(rt, context, isStartOfWord, isEndOfWord);

  if (hasCoda) {
    newSyllable.coda = pickCoda(rt, context, newSyllable, isEndOfWord, monosyllabic);
  }

  return newSyllable;
}

function determineHasOnset(p: GenerationWeights["probability"], isStartOfWord: boolean, rand: RNG, prevSyllable?: Syllable): boolean {
  if (isStartOfWord) {
    return getWeightedOption([[true, p.hasOnsetStartOfWord], [false, 100 - p.hasOnsetStartOfWord]], rand);
  } else {
    const prevHasCoda = prevSyllable && prevSyllable.coda.length > 0;
    return prevHasCoda ? getWeightedOption([[true, p.hasOnsetAfterCoda], [false, 100 - p.hasOnsetAfterCoda]], rand) : true;
  }
}

function determineHasCoda(p: GenerationWeights["probability"], isEndOfWord: boolean, monosyllabic: boolean, rand: RNG): boolean {
  if (monosyllabic) {
    return getWeightedOption([[true, p.hasCodaMonosyllabic], [false, 100 - p.hasCodaMonosyllabic]], rand);
  } else if (isEndOfWord) {
    return getWeightedOption([[true, p.hasCodaEndOfWord], [false, 100 - p.hasCodaEndOfWord]], rand);
  } else {
    return getWeightedOption([[true, p.hasCodaMidWord], [false, 100 - p.hasCodaMidWord]], rand);
  }
}

function getSyllableCountWeights(rt: GeneratorRuntime, mode: GenerationMode): [number, number][] {
  const ss = rt.config.syllableStructure;
  if (mode === "text" && ss.syllableCountWeightsText) return ss.syllableCountWeightsText;
  if (mode === "lexicon" && ss.syllableCountWeightsLexicon) return ss.syllableCountWeightsLexicon;
  return ss.syllableCountWeights;
}

function generateSyllables(rt: GeneratorRuntime, context: WordGenerationContext, mode: GenerationMode) {
  if (!context.syllableCount) {
    context.syllableCount = getWeightedOption(getSyllableCountWeights(rt, mode), context.rand);
  }

  const syllables = new Array(context.syllableCount);
  let prevSyllable: Syllable | undefined;

  for (let i = 0; i < context.syllableCount; i++) {
    let newSyllable = generateSyllable(rt, context);

    if (prevSyllable) {
      [prevSyllable, newSyllable] = adjustBoundary(rt, prevSyllable, newSyllable, context.rand);
    }

    syllables[i] = newSyllable;
    prevSyllable = newSyllable;
    context.currSyllableIndex++;
  }

  // Repair vowel hiatus: insert glide onset when two nuclei meet with no
  // intervening consonant (no coda on prev + no onset on current).
  repairVowelHiatus(rt, syllables);

  context.word.syllables = syllables;
}

/**
 * Insert a glide onset to break vowel hiatus at syllable boundaries.
 *
 * When two consecutive syllables have no consonant between them (prev has no
 * coda, current has no onset), a glide is inserted as the onset of the second
 * syllable: /j/ after front vowels, /w/ after back/round vowels, and /j/ as
 * the default for central vowels.
 */
function repairVowelHiatus(rt: GeneratorRuntime, syllables: Syllable[]): void {
  const jPhoneme = rt.config.phonemes.find(p => p.sound === 'j');
  const wPhoneme = rt.config.phonemes.find(p => p.sound === 'w');
  if (!jPhoneme || !wPhoneme) return;

  for (let i = 1; i < syllables.length; i++) {
    const prev = syllables[i - 1];
    const curr = syllables[i];

    if (prev.coda.length === 0 && curr.onset.length === 0) {
      // Pick glide based on the place of the preceding nucleus vowel
      const lastNucleus = prev.nucleus[prev.nucleus.length - 1];
      if (!lastNucleus) continue;

      const place = lastNucleus.placeOfArticulation;
      const glide = place === 'back' ? wPhoneme : jPhoneme;
      curr.onset = [glide];
    }
  }
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
 * Resolve the RNG from generation options.
 *
 * Priority: `options.rand` > seeded RNG from `options.seed` > default (Math.random).
 * When both `rand` and `seed` are provided, `seed` is silently ignored.
 */
function resolveRng(options: WordGenerationOptions): RNG {
  return options.rand ?? (options.seed !== undefined ? createSeededRng(options.seed) : createDefaultRng());
}

/** Maximum retries for letter-length rejection sampling. */
const MAX_LENGTH_RETRIES = 3;

/**
 * Check whether a word's letter length passes rejection sampling
 * based on the syllable-count letter-length targets.
 *
 * - Within [peakMin, peakMax] → always accept
 * - Within [min, max] but outside peak → accept with 50% probability
 * - Outside [min, max] → always reject
 */
function acceptLetterLength(rt: GeneratorRuntime, context: WordGenerationContext): boolean {
  const targets = rt.config.syllableStructure.letterLengthTargets;
  if (!targets) return true;

  const bounds = targets[context.syllableCount];
  if (!bounds) return true;

  const [min, peakMin, peakMax, max] = bounds;
  const len = context.word.written.clean.length;

  if (len >= peakMin && len <= peakMax) return true;
  if (len >= min && len <= max) return context.rand() < 0.5;
  return false;
}

/**
 * Generate a single word with letter-length rejection sampling.
 *
 * Builds a fresh context on each attempt. After {@link MAX_LENGTH_RETRIES}
 * failed length checks, the last word is accepted unconditionally.
 */
function generateOneWord(
  rt: GeneratorRuntime,
  rand: RNG,
  mode: GenerationMode,
  syllableCount: number,
  applyMorph: boolean = false,
): Word {
  // Plan morphology before generating root (to adjust syllable count)
  const morphConfig = rt.config.morphology;
  const morphPlan = morphConfig?.enabled && applyMorph
    ? planMorphology(morphConfig, mode, rand)
    : undefined;

  // Guard: if "both" template would reduce root below 1 syllable, downgrade to single affix
  if (morphPlan && morphPlan.plan.template === "both" && syllableCount > 0) {
    const rootAfterReduction = syllableCount - morphPlan.syllableReduction;
    if (rootAfterReduction < 1) {
      // Drop prefix, keep suffix (more natural in English)
      if (morphPlan.plan.prefix) {
        morphPlan.syllableReduction -= morphPlan.plan.prefix.syllableCount;
        morphPlan.plan.prefix = undefined;
        morphPlan.plan.template = "suffixed";
      }
    }
  }

  for (let attempt = 0; attempt <= MAX_LENGTH_RETRIES; attempt++) {
    // Adjust syllable count for affix syllables
    let rootSyllableCount = syllableCount;
    if (morphPlan && morphPlan.syllableReduction > 0 && rootSyllableCount > 0) {
      rootSyllableCount = Math.max(1, rootSyllableCount - morphPlan.syllableReduction);
    }

    const context: WordGenerationContext = {
      rand,
      word: {
        syllables: [],
        pronunciation: '',
        written: { clean: '', hyphenated: '' },
      },
      syllableCount: rootSyllableCount,
      currSyllableIndex: 0,
    };
    runPipeline(rt, context, mode);

    // Apply morphology after pipeline produces the bare root
    if (morphPlan) {
      applyMorphology(rt, context, morphPlan.plan);
    }

    if (attempt === MAX_LENGTH_RETRIES || acceptLetterLength(rt, context)) {
      return context.word;
    }
  }
  throw new Error("unreachable");
}

/**
 * Shared pipeline: syllable generation → repair → write → pronounce.
 */
function runPipeline(rt: GeneratorRuntime, context: WordGenerationContext, mode: GenerationMode = "text"): void {
  generateSyllables(rt, context, mode);
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
  repairNgCodaSibilant(context.word.syllables);
  const stressRules = rt.config.stress ?? { strategy: "weight-sensitive" };
  applyStress(context, stressRules);
  repairStressedNuclei(context, rt.positionPhonemes.nucleus, stressRules);
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
      return generateOneWord(rt, resolveRng(options), options.mode ?? "text", options.syllableCount || 0, options.morphology ?? false);
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
 * const affixed = generateWord({ morphology: true });
 * ```
 */
export const generateWord = (options: WordGenerationOptions = {}): Word => {
  return generateOneWord(defaultRuntime, resolveRng(options), options.mode ?? "text", options.syllableCount || 0, options.morphology ?? false);
};

/**
 * Generate multiple words sharing a single RNG instance.
 *
 * With a shared RNG, `generateWords(50, { seed: 42 })` is deterministic AND
 * produces different words for each index. This is **not** equivalent to
 * calling `generateWord({ seed: 42 })` 50 times — the latter creates 50
 * identical RNG streams and therefore 50 identical words.
 *
 * @param count - Number of words to generate.
 * @param options - Generation options (seed, rand, syllableCount, etc.).
 * @returns An array of generated {@link Word} objects.
 *
 * @example
 * ```ts
 * import { generateWords } from "word-generator";
 * const words = generateWords(50, { seed: 42 });
 * // All 50 words are different but fully deterministic.
 * const affixed = generateWords(50, { morphology: true });
 * ```
 */
export const generateWords = (count: number, options: WordGenerationOptions = {}): Word[] => {
  const rand = resolveRng(options);
  const mode = options.mode ?? "text";
  const syllableCount = options.syllableCount || 0;
  const results: Word[] = [];
  for (let i = 0; i < count; i++) {
    results.push(generateOneWord(defaultRuntime, rand, mode, syllableCount, options.morphology ?? false));
  }
  return results;
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
