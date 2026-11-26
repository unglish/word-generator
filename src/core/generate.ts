import type { NonBareMorphologyPlan } from "./morphology/plan.js";
import { measureSpellingBudgets } from "./spelling-budget.js";
import {
  ClusterContext,
  Phoneme,
  WordGenerationContext,
  WordGenerationOptions,
  Word,
  LexicalForm,
  Syllable,
  SyllableShapePlan,
  GenerationMode,
} from "../types.js";
import { RNG, createSeededRng, createDefaultRng } from "../utils/random.js";
import getWeightedOption, { coinFlip } from "../utils/getWeightedOption.js";
import {
  LanguageConfig,
  computeSonorityLevels,
  defaultFallbackBridgeOnsets,
  validateConfig,
  resolveLetterLengthRelaxedAfter,
  expandClusterConstraintBans,
  ResolvedStressRules,
  resolveStressRules,
  resolveAspirationRules,
} from "../config/language.js";
import { englishConfig } from "../config/english.js";
import {
  applyStress,
  generatePronunciation,
  PronunciationRuntimeConfig,
} from "./pronounce.js";
import {
  createWrittenFormGenerator,
  repairConsonantLetters,
  type RootAttachment,
  type WrittenFormGenerator,
} from "./write.js";
import {
  createGapSpellingApplicator,
  type GapSpellingApplicator,
} from "./gap-spelling.js";
import type { BaseSpelling } from "./base-spelling.js";
import {
  repairClusters,
  repairFinalCoda,
  repairClusterShape,
  repairHAfterBackVowel,
} from "./repair.js";
import { clearBannedSecondaryStress } from "./stress-repair.js";
import {
  alternateUnstressedRootNuclei,
  repairRootNuclei,
  repairStressedNuclei,
  type NucleusRepairPolicy,
} from "./nucleus-repair.js";
import { RejectionTraceCollector } from "./rejection-trace.js";
import { chooseRootAttempt } from "./root-attempt-search.js";
import {
  assertRootRimeCompatibility,
  buildRootRimePolicy,
} from "./rime-compatibility.js";
import {
  attachRootWritten,
  planMorphology,
  prepareMorphology,
  resoundedRootPhones,
  writeMorphology,
} from "./morphology/index.js";
import type { PreparedMorphology } from "./morphology/index.js";
import { clonePhoneme, cloneSyllables } from "./lexical.js";
import { ROOT_ATTEMPT_CRITERIA, scoreGenerationAttempt } from "./length-semantics.js";
import { sampleRootLengths, type RootLengthPolicy } from "./syllable-sampling.js";
import {
  TraceCollector,
  traceStage,
  type SelectionTrace,
  type OrthographySource,
} from "./trace.js";
import { createMedialOnsetDoubler } from "./medial-onset-doubling.js";
import {
  BETWEEN_STAGES, createWordStreams, formatStreamKey, inStage, STAGE_STREAM_SCHEME,
  type StreamContext, type StreamKey,
} from "./stage-streams.js";
import { buildCluster, buildPrefixSet, createLegacyWeightedEngine, isValidCluster, type LegacySelectionRuntime } from "./legacy-weighted.js";
import type { SegmentEngine } from "./segment-selection.js";

// ---------------------------------------------------------------------------
// Runtime: pre-computed data derived from a LanguageConfig
// ---------------------------------------------------------------------------

interface GeneratorRuntime extends LegacySelectionRuntime {
  segmentEngine: SegmentEngine;
  resolvedStress: ResolvedStressRules;
  resolvedPronunciation: PronunciationRuntimeConfig;
  /** Sonority level by phoneme sound string (for quick lookup). */
  sonorityBySound: Map<string, number>;
  /** Phoneme by sound string (avoids repeated config.phonemes.find). */
  phonemeBySound: Map<string, Phoneme>;
  generateWrittenForm: WrittenFormGenerator;
  applyGapSpellings: GapSpellingApplicator;
  doubleMedialOnset: ReturnType<typeof createMedialOnsetDoubler>;
  bannedSet?: Set<string>;
  clusterRepair?: "drop-coda" | "drop-onset";
  nucleusRepair: NucleusRepairPolicy;
  sonorityConstraints?: LanguageConfig["sonorityConstraints"];
  onsetPrependerSet?: Set<string>;
  sonorityExemptSet?: Set<string>;
  rootLengthPolicy: RootLengthPolicy;
}

const DEFAULT_PLAN_GUARD_PROBABILITY = 98;

function getPlanGuardProbability(rt: GeneratorRuntime): number {
  return (
    rt.config.hiatusPolicy?.planGuardProbability ??
    DEFAULT_PLAN_GUARD_PROBABILITY
  );
}

function buildRuntime(config: LanguageConfig): GeneratorRuntime {
  validateConfig(config);
  const sonorityLevels = computeSonorityLevels(config);
  const resolvedStress = resolveStressRules(config.pronunciation.stress);
  const resolvedPronunciation: PronunciationRuntimeConfig = {
    aspiration: resolveAspirationRules(config.pronunciation.aspiration),
    vowelReduction: config.pronunciation.vowelReduction,
    secondaryStressBan: resolvedStress.nucleus.secondaryStressBan,
  };

  const positionPhonemes = {
    onset: Array.from(config.phonemeMaps.onset.values()).flat(),
    coda: Array.from(config.phonemeMaps.coda.values()).flat(),
    nucleus: Array.from(config.phonemeMaps.nucleus.values()).flat(),
  };

  const makeRegex = (patterns: string[]) =>
    patterns.length > 0 ? new RegExp(patterns.join("|"), "i") : null;

  const invalidClusterRegexes = {
    onset: makeRegex(config.invalidClusters.onset),
    coda: makeRegex(config.invalidClusters.coda),
    nucleus: makeRegex(config.invalidClusters.boundary),
  };

  const generateWrittenForm = createWrittenFormGenerator(config);
  const applyGapSpellings = createGapSpellingApplicator(config);

  const bannedPairs = expandClusterConstraintBans(config);
  const bannedSet =
    bannedPairs.length > 0
      ? new Set(bannedPairs.map(([a, b]) => `${a}|${b}`))
      : undefined;

  const sonorityBySound = new Map<string, number>();
  const phonemeBySound = new Map<string, Phoneme>();
  for (const [phoneme, level] of sonorityLevels) {
    sonorityBySound.set(phoneme.sound, level);
    phonemeBySound.set(phoneme.sound, phoneme);
  }

  const cl = config.clusterLimits;
  const sc = config.sonorityConstraints;

  const clusterWeights = config.clusterWeights
    ? {
      onset: config.clusterWeights.onset
        ? new Map(Object.entries(config.clusterWeights.onset))
        : undefined,
      boundary: config.clusterWeights.boundary
        ? new Map(Object.entries(config.clusterWeights.boundary).map(([coda, onsets]) =>
          [coda, new Map(Object.entries(onsets))],
        ))
        : undefined,
      coda: config.clusterWeights.coda
        ? // Check if position-based format (has 'final' or 'nonFinal' keys)
        typeof config.clusterWeights.coda === "object" &&
            ("final" in config.clusterWeights.coda ||
              "nonFinal" in config.clusterWeights.coda)
          ? {
            final: config.clusterWeights.coda.final
              ? new Map(Object.entries(config.clusterWeights.coda.final))
              : undefined,
            nonFinal: config.clusterWeights.coda.nonFinal
              ? new Map(Object.entries(config.clusterWeights.coda.nonFinal))
              : undefined,
          }
          : new Map(
            Object.entries(
                  config.clusterWeights.coda as Record<string, number>,
            ),
          )
        : undefined,
    }
    : undefined;

  const bridgePairs =
    config.hiatusPolicy?.fallbackBridgeOnsets ?? defaultFallbackBridgeOnsets();
  const bridgePhonemeOptions: [Phoneme, number][] = [];
  for (const [sound, weight] of bridgePairs) {
    const p = phonemeBySound.get(sound);
    if (p && weight > 0) bridgePhonemeOptions.push([p, weight]);
  }
  const nucleusRepair: NucleusRepairPolicy = {
    phonemes: positionPhonemes.nucleus,
    stress: resolvedStress,
    rimes: buildRootRimePolicy(config.codaConstraints),
    forbidOpenCheckedFinal: config.forbidOpenCheckedFinal === true,
  };
  const selection: LegacySelectionRuntime = {
    config,
    sonorityLevels,
    positionPhonemes,
    invalidClusterRegexes,
    nucleusRepair,
    allowedFinalSet: config.codaConstraints?.allowedFinal
      ? new Set(config.codaConstraints.allowedFinal)
      : undefined,
    bannedCodaSet: config.codaConstraints?.bannedCodas
      ? new Set(config.codaConstraints.bannedCodas)
      : undefined,
    preservedCodaInitials: config.rootRepetition?.preserveCodaInitials
      ? new Set(config.rootRepetition.preserveCodaInitials)
      : undefined,
    clusterLimits: cl,
    codaAppendantSet: cl?.codaAppendants
      ? new Set(cl.codaAppendants)
      : undefined,
    attestedOnsetSet: cl?.attestedOnsets
      ? new Set(cl.attestedOnsets.map((a) => a.join("|")))
      : undefined,
    attestedCodaSet: cl?.attestedCodas
      ? new Set(cl.attestedCodas.map((a) => a.join("|")))
      : undefined,
    attestedOnsetPrefixSet: cl?.attestedOnsets
      ? buildPrefixSet(cl.attestedOnsets)
      : undefined,
    attestedCodaPrefixSet: cl?.attestedCodas
      ? buildPrefixSet(cl.attestedCodas)
      : undefined,
    clusterWeights,
    bridgePhonemeOptions,
  };
  return {
    ...selection,
    segmentEngine: createLegacyWeightedEngine(selection),
    nucleusRepair,
    resolvedStress,
    resolvedPronunciation,
    sonorityBySound,
    phonemeBySound,
    generateWrittenForm,
    applyGapSpellings,
    doubleMedialOnset: createMedialOnsetDoubler(config),
    bannedSet,
    clusterRepair: config.clusterConstraint?.repair,
    sonorityConstraints: sc,
    onsetPrependerSet: cl?.onsetPrependers
      ? new Set(cl.onsetPrependers)
      : undefined,
    sonorityExemptSet: sc?.exempt ? new Set(sc.exempt) : undefined,
    rootLengthPolicy: {
      phonemeLengthWeights: config.phonemeLengthWeights,
      phonemeToSyllableWeights: config.phonemeToSyllableWeights,
      maxOnsetLength: cl?.maxOnset ?? config.syllableStructure.maxOnsetLength,
      maxCodaLength: cl?.maxCoda ?? config.syllableStructure.maxCodaLength,
    },
  };
}

// ---------------------------------------------------------------------------
// Syllable generation
// ---------------------------------------------------------------------------

function getOnsetLengthWeights(
  rt: GeneratorRuntime,
  syllableCount: number,
  prevCodaLength: number,
): [number, number][] {
  const { onsetLength } = rt.config.generationWeights;
  if (syllableCount === 1) return onsetLength.monosyllabic;
  if (prevCodaLength === 0) return onsetLength.followingNucleus;
  if (syllableCount >= 3 && onsetLength.long) return onsetLength.long;
  return onsetLength.default;
}

function getCodaLengthWeights(
  rt: GeneratorRuntime,
  syllableCount: number,
  onsetLen: number,
  isEndOfWord: boolean,
): [number, number][] {
  const { codaLength } = rt.config.generationWeights;
  if (syllableCount === 1) {
    return codaLength.monosyllabic[onsetLen] ?? codaLength.monosyllabicDefault;
  }
  return [
    [
      0,
      isEndOfWord
        ? codaLength.zeroWeightEndOfWord
        : codaLength.zeroWeightMidWord,
    ],
    ...codaLength.polysyllabicNonzero,
  ];
}

function getLengthWeight(weights: [number, number][], length: number): number {
  return weights.find(([len]) => len === length)?.[1] ?? 0.0001;
}

function sampleRootFinalCodaLength(
  rt: GeneratorRuntime,
  mode: GenerationMode,
  phones: number,
  syllables: number,
  rand: RNG,
): number | undefined {
  const profile = rt.config.generationWeights.codaLength.rootFinalByMode?.[mode];
  const weights = profile?.lengths[syllables]?.[phones];
  if (!weights) return undefined;
  const rootConsonants = phones - syllables;
  const maxOnset = rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda = rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;
  const otherSlots = maxOnset * syllables + maxCoda * (syllables - 1);
  const options: [number, number][] = [];
  for (const [length, weight] of weights) {
    if (length >= rootConsonants - otherSlots && length <= maxCoda) options.push([length, weight]);
  }
  return options.length ? getWeightedOption(options, rand) : undefined;
}

function sampleRootInitialOnsetLength(
  rt: GeneratorRuntime,
  mode: GenerationMode,
  phones: number,
  syllables: number,
  finalCodaLength: number | undefined,
  rand: RNG,
): number | undefined {
  if (finalCodaLength === undefined || syllables === 1) return undefined;
  const profile = rt.config.generationWeights.onsetLength.rootInitialByMode?.[mode];
  const weights = profile?.[syllables]?.[phones]?.[finalCodaLength];
  if (!weights) return undefined;

  const maxOnset = rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda = rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;
  const remainingConsonants = phones - syllables - finalCodaLength;
  const medialBoundaries = syllables - 1;
  const medialCapacity = medialBoundaries * (maxOnset + maxCoda);
  // Reserve a consonant per medial boundary when the hiatus guard is enabled.
  const medialMinimum = getPlanGuardProbability(rt) > 0 ? medialBoundaries : 0;
  const options: [number, number][] = [];
  for (const [length, weight] of weights) {
    const medial = remainingConsonants - length;
    if (length <= maxOnset && medial >= medialMinimum && medial <= medialCapacity) {
      options.push([length, weight]);
    }
  }
  return options.length ? getWeightedOption(options, rand) : undefined;
}

interface RootEdgeLengths {
  initialOnsetLength: number | undefined;
  finalCodaLength: number | undefined;
}

function sampleConsonantPlan(
  rt: GeneratorRuntime,
  syllableCount: number,
  rand: RNG,
  { initialOnsetLength, finalCodaLength }: RootEdgeLengths,
): SyllableShapePlan[] {
  const plan: SyllableShapePlan[] = [];
  let prevCodaLength = 0;

  for (let i = 0; i < syllableCount; i++) {
    const isEndOfWord = i === syllableCount - 1;
    const onsetWeights = getOnsetLengthWeights(
      rt,
      syllableCount,
      prevCodaLength,
    );
    const onsetLength = i === 0 && initialOnsetLength !== undefined
      ? initialOnsetLength
      : getWeightedOption(onsetWeights, rand);
    const codaWeights = getCodaLengthWeights(
      rt,
      syllableCount,
      onsetLength,
      isEndOfWord,
    );
    const codaLength = isEndOfWord && finalCodaLength !== undefined
      ? finalCodaLength
      : getWeightedOption(codaWeights, rand);
    plan.push({ onsetLength, codaLength });
    prevCodaLength = codaLength;
  }

  return plan;
}

function tweakConsonantPlanToBudget(
  rt: GeneratorRuntime,
  plan: SyllableShapePlan[],
  targetConsonants: number,
  rand: RNG,
  { initialOnsetLength, finalCodaLength }: RootEdgeLengths,
): SyllableShapePlan[] {
  const adjusted = plan.map((s) => ({ ...s }));
  const syllableCount = adjusted.length;
  const canAdjustOnset = (index: number) => index !== 0 || initialOnsetLength === undefined;
  const canAdjustCoda = (index: number) => index !== syllableCount - 1 || finalCodaLength === undefined;
  const maxOnset =
    rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda =
    rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;
  const createsHiatus = (
    index: number,
    position: "onset" | "coda",
    nextLen: number,
  ): boolean => {
    if (position === "onset") {
      if (index === 0) return false;
      return adjusted[index - 1].codaLength === 0 && nextLen === 0;
    }
    if (index >= adjusted.length - 1) return false;
    return nextLen === 0 && adjusted[index + 1].onsetLength === 0;
  };
  const planGuardProbability = getPlanGuardProbability(rt);
  const shouldBlockHiatusMutation = (wouldCreateHiatus: boolean): boolean => {
    if (!wouldCreateHiatus) return false;
    if (initialOnsetLength !== undefined && planGuardProbability > 0) return true;
    return coinFlip(rand, planGuardProbability);
  };

  let total = adjusted.reduce(
    (sum, s) => sum + s.onsetLength + s.codaLength,
    0,
  );

  while (total < targetConsonants) {
    const candidates: Array<{
      syllableIndex: number;
      position: "onset" | "coda";
      weight: number;
    }> = [];

    for (let i = 0; i < syllableCount; i++) {
      const isEndOfWord = i === syllableCount - 1;
      const prevCodaLength = i === 0 ? 0 : adjusted[i - 1].codaLength;
      const onsetWeights = getOnsetLengthWeights(
        rt,
        syllableCount,
        prevCodaLength,
      );
      const codaWeights = getCodaLengthWeights(
        rt,
        syllableCount,
        adjusted[i].onsetLength,
        isEndOfWord,
      );

      if (canAdjustOnset(i) && adjusted[i].onsetLength < maxOnset) {
        const next = adjusted[i].onsetLength + 1;
        candidates.push({
          syllableIndex: i,
          position: "onset",
          weight: getLengthWeight(onsetWeights, next),
        });
      }
      if (canAdjustCoda(i) && adjusted[i].codaLength < maxCoda) {
        const next = adjusted[i].codaLength + 1;
        candidates.push({
          syllableIndex: i,
          position: "coda",
          weight: getLengthWeight(codaWeights, next),
        });
      }
    }

    if (candidates.length === 0) break;
    const picked = getWeightedOption(
      candidates.map((c) => [c, c.weight]),
      rand,
    );
    adjusted[picked.syllableIndex][
      picked.position === "onset" ? "onsetLength" : "codaLength"
    ]++;
    total++;
  }

  while (total > targetConsonants) {
    const candidates: Array<{
      syllableIndex: number;
      position: "onset" | "coda";
      weight: number;
    }> = [];

    for (let i = 0; i < syllableCount; i++) {
      const isEndOfWord = i === syllableCount - 1;
      const prevCodaLength = i === 0 ? 0 : adjusted[i - 1].codaLength;
      const onsetWeights = getOnsetLengthWeights(
        rt,
        syllableCount,
        prevCodaLength,
      );
      const codaWeights = getCodaLengthWeights(
        rt,
        syllableCount,
        adjusted[i].onsetLength,
        isEndOfWord,
      );

      if (canAdjustOnset(i) && adjusted[i].onsetLength > 0) {
        const curr = adjusted[i].onsetLength;
        const next = curr - 1;
        if (!shouldBlockHiatusMutation(createsHiatus(i, "onset", next))) {
          candidates.push({
            syllableIndex: i,
            position: "onset",
            weight: 1 / getLengthWeight(onsetWeights, curr),
          });
        }
      }
      if (canAdjustCoda(i) && adjusted[i].codaLength > 0) {
        const curr = adjusted[i].codaLength;
        const next = curr - 1;
        if (!shouldBlockHiatusMutation(createsHiatus(i, "coda", next))) {
          candidates.push({
            syllableIndex: i,
            position: "coda",
            weight: 1 / getLengthWeight(codaWeights, curr),
          });
        }
      }
    }

    if (candidates.length === 0) break;
    const picked = getWeightedOption(
      candidates.map((c) => [c, c.weight]),
      rand,
    );
    adjusted[picked.syllableIndex][
      picked.position === "onset" ? "onsetLength" : "codaLength"
    ]--;
    total--;
  }

  return adjusted;
}

function distributePhonemes(
  rt: GeneratorRuntime,
  targetPhonemes: number,
  syllableCount: number,
  rand: RNG,
  edges: RootEdgeLengths,
): SyllableShapePlan[] {
  const maxOnset =
    rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda =
    rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;
  const maxConsonants = syllableCount * (maxOnset + maxCoda);

  const rawTargetConsonants = targetPhonemes - syllableCount;
  const targetConsonants = Math.max(
    0,
    Math.min(rawTargetConsonants, maxConsonants),
  );

  const plan = sampleConsonantPlan(rt, syllableCount, rand, edges);
  const consonants = plan.reduce(
    (sum, s) => sum + s.onsetLength + s.codaLength,
    0,
  );
  if (consonants === targetConsonants) return plan;
  return tweakConsonantPlanToBudget(rt, plan, targetConsonants, rand, edges);
}

type PlannedRootContext = WordGenerationContext & {
  targetPhonemeCount: number;
  syllablePlans: SyllableShapePlan[];
};

/**
 * One root attempt's context. Its stage streams travel with it, so every stage
 * of the attempt, including the finishing stages of a selected attempt, binds
 * that attempt's streams with {@link inStage}.
 */
type AttemptContext = PlannedRootContext & StreamContext;

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
  return (
    options.rand ??
    (options.seed !== undefined
      ? createSeededRng(options.seed)
      : createDefaultRng())
  );
}

interface ResolvedGenerationOptions {
  rand: RNG;
  mode: GenerationMode;
  syllableCount: number;
  options: WordGenerationOptions;
}

function resolveGenerationOptions(
  options: WordGenerationOptions,
): ResolvedGenerationOptions {
  return {
    rand: resolveRng(options),
    mode: options.mode ?? "lexicon",
    syllableCount: resolveForcedSyllableCount(options),
    options,
  };
}

function countPhonemes(syllables: Syllable[]): number {
  let total = 0;
  for (const syl of syllables) {
    total += syl.onset.length + syl.nucleus.length + syl.coda.length;
  }
  return total;
}

/**
 * Spell base-root syllables into `context.word.written` and return their base
 * spelling; their indices stay root-relative in the orthography trace.
 * `following` is the planned suffix's spelling, so the root's last grapheme can
 * respect letter conditions across the root edge.
 */
function spellLexicalRoot(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  root: Syllable[],
  wordSyllableStart: number,
  following?: string,
  attachment?: RootAttachment,
): BaseSpelling {
  const rootContext: WordGenerationContext = {
    ...context,
    word: {
      syllables: root,
      written: { clean: "", hyphenated: "" },
      pronunciation: "",
    },
  };
  const source: OrthographySource = { kind: "lexical-root", wordSyllableStart };
  assertRootRimeCompatibility(root, rt.nucleusRepair.rimes);
  const baseSpelling = traceStage(
    context.trace,
    "generateWrittenForm",
    rootContext.word,
    () => rt.generateWrittenForm(rootContext, source, following, attachment),
  );
  context.word.written = rootContext.word.written;
  return baseSpelling;
}

function realizeSurface(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
): void {
  traceStage(context.trace, "generatePronunciation", context.word, () =>
    generatePronunciation(context, rt.resolvedPronunciation),
  );
}

/**
 * Copy final stress repairs back into the base root. A repaired root syllable
 * takes the repaired vowel and its final-word stress, so its spelling follows
 * the stress that forced the repair; other root syllables keep root stress.
 */
function carryRootStressRepairs(
  lexicalRoot: Syllable[],
  assembled: Syllable[],
  nucleiBeforeRepair: Phoneme[][],
  rootSyllableStart: number,
): void {
  for (let rootIndex = 0; rootIndex < lexicalRoot.length; rootIndex++) {
    const finalIndex = rootSyllableStart + rootIndex;
    const finalSyllable = assembled[finalIndex];
    let repaired = false;
    for (let index = 0; index < finalSyllable.nucleus.length; index++) {
      if (
        finalSyllable.nucleus[index] === nucleiBeforeRepair[finalIndex][index]
      )
        continue;
      lexicalRoot[rootIndex].nucleus[index] = clonePhoneme(
        finalSyllable.nucleus[index],
      );
      repaired = true;
    }
    if (repaired) lexicalRoot[rootIndex].stress = finalSyllable.stress;
  }
}

/**
 * An affixed attempt after look-ahead. `root` is the base root to spell, a copy
 * independent of the attempt's working syllables (the assembled word). The
 * word's full {@link LexicalForm} is built only by {@link selectAttempt}.
 */
interface AffixedRoot {
  root: Syllable[];
  /** Prepared attachment, whose written half is applied once the attempt is selected. */
  morphology: PreparedMorphology;
}

/**
 * What a spelled attempt carries to scoring and selection; both kinds expose the
 * spelled `root`. A bare word's lexical form is complete once it is spelled and
 * realized; an affixed word's waits for {@link selectAttempt}.
 */
type SpelledRoot = (Pick<LexicalForm, "root"> | AffixedRoot) & { baseSpelling: BaseSpelling };

function isAffixedRoot(spelled: SpelledRoot): spelled is AffixedRoot & { baseSpelling: BaseSpelling } {
  return "morphology" in spelled;
}

/** The attempt chosen for output. Only {@link selectAttempt} produces one. */
interface SelectedAttempt {
  context: AttemptContext;
  morphology?: PreparedMorphology;
  root: Syllable[];
  baseSpelling: BaseSpelling;
}

/**
 * Look-ahead: assemble the planned affixes' sounds onto a freshly built root,
 * resolve final stress, and repair forbidden stressed nuclei, all before the
 * root is spelled. Returns the base root to spell (with any repaired nuclei)
 * and the prepared attachment.
 */
function resolveAffixedRoot(
  rt: GeneratorRuntime,
  context: AttemptContext,
  morphPlan: NonBareMorphologyPlan,
): AffixedRoot {
  const traceCollector = context.trace;
  const lexicalRoot = cloneSyllables(context.word.syllables);
  // Affix-side random choices (hiatus bridges, stressed-nucleus re-picks) draw
  // from the attempt's preview_morphology stream.
  return inStage(context, "preview_morphology", () => {
    const prepared = traceStage(
      traceCollector,
      "assembleMorphology",
      context.word,
      () => prepareMorphology(rt, context, morphPlan),
    );
    const rootSyllableStart = prepared.rootSyllableStart;

    // Final primary stress may fall on a formerly unstressed root vowel. Repair
    // the lexical choice before spelling, while retaining genuine alternations
    // (such as -ity shortening) as separate base and derived segments.
    const nucleiBeforeRepair = context.word.syllables.map((syllable) => [
      ...syllable.nucleus,
    ]);
    traceStage(traceCollector, "repairFinalStressedNuclei", context.word, () => {
      repairStressedNuclei(context, rt.nucleusRepair, { syllables: lexicalRoot, start: rootSyllableStart });
      clearBannedSecondaryStress(context, rt.resolvedStress.nucleus);
      carryRootStressRepairs(
        lexicalRoot,
        context.word.syllables,
        nucleiBeforeRepair,
        rootSyllableStart,
      );
    });
    return { root: lexicalRoot, morphology: prepared };
  });
}

/** Spell a bare root and realize its surface; its lexical form is complete here. */
function spellBareWord(
  rt: GeneratorRuntime,
  context: AttemptContext,
): SpelledRoot {
  const syllables = context.word.syllables;
  const baseSpelling = inStage(context, "spell", () => spellLexicalRoot(rt, context, syllables, 0));
  const lexical: LexicalForm = {
    root: cloneSyllables(syllables),
    syllables: cloneSyllables(syllables),
    rootSyllableStart: 0,
  };
  context.word.lexical = lexical;
  inStage(context, "render_pronunciation", () => realizeSurface(rt, context));
  // Exact bare-word overrides retain their existing place in root scoring. They
  // match the realized syllables, so pronunciation draws can change which applies.
  inStage(context, "spell", () => rt.applyGapSpellings(context, baseSpelling));
  return { root: lexical.root, baseSpelling };
}

/** Spell an attempt's root. Affixed words defer their written morphology and surface to selection. */
function spellAttempt(
  rt: GeneratorRuntime,
  context: AttemptContext,
  affixed: AffixedRoot | undefined,
): SpelledRoot {
  if (!affixed) return spellBareWord(rt, context);
  const { morphology } = affixed;
  const baseSpelling = inStage(context, "spell", () => spellLexicalRoot(
    rt,
    context,
    affixed.root,
    morphology.rootSyllableStart,
    morphology.suffixWritten,
    {
      attach: (written) =>
        attachRootWritten(morphology, written, affixed.root),
      resounded: resoundedRootPhones(morphology, affixed.root),
    },
  ));
  return { ...affixed, baseSpelling };
}

/**
 * Choose an attempt for output. An affixed word's lexical form is built here,
 * with its own copy of the assembled syllables, so surface realization cannot
 * alter it; a bare word's was completed when it was spelled.
 */
function selectAttempt(
  context: AttemptContext,
  spelled: SpelledRoot,
): SelectedAttempt {
  const { root, baseSpelling } = spelled;
  if (!isAffixedRoot(spelled)) return { context, root, baseSpelling };
  const { morphology } = spelled;
  context.word.lexical = {
    root,
    syllables: cloneSyllables(context.word.syllables),
    rootSyllableStart: morphology.rootSyllableStart,
  };
  return { context, morphology, root, baseSpelling };
}

/** Apply the written half of the prepared morphology to the selected root, then realize the surface. */
function finishAffixedWord(
  rt: GeneratorRuntime,
  context: AttemptContext,
  prepared: PreparedMorphology,
): void {
  const traceCollector = context.trace;
  const root = context.word.lexical?.root;
  if (!root) throw new Error("An affixed word's lexical form is built before its morphology is written");
  const morphology = writeMorphology(context, prepared, root);
  // Preserve selected allomorph parts through final consonant-letter repair.
  const maxCons = rt.config.writtenFormConstraints?.maxConsonantLetters;
  const preservePhones =
    rt.config.writtenFormConstraints?.policy === "preserve-phones";
  const finalBudget = preservePhones
    ? measureSpellingBudgets(
      context.word.written.clean,
      rt.config.writtenFormConstraints,
    )
    : undefined;
  if (finalBudget)
    traceCollector?.recordSpellingBudget({
      version: 1,
      scope: "final-morphology",
      before: finalBudget,
      after: finalBudget,
      visitedAssignments: 0,
      legalOptions: 0,
      unresolvedCells: context.word.written.clean.length,
      changedUnits: [],
      ...(finalBudget.exceeded.length
        ? {
          status: "infeasible",
          reason: "unresolved-ownership",
          refusals: { "unresolved-ownership": 1 },
        }
        : { status: "satisfied" }),
    });
  if (maxCons) {
    const activeParts = morphology.parts.filter((part) => part.text);
    const cleanParts = activeParts.map((part) => part.text);
    // repairConsonantLetters expects part strings at even indices.
    const hyphParts: string[] = [];
    for (let i = 0; i < cleanParts.length; i++) {
      hyphParts.push(cleanParts[i]);
      if (i < cleanParts.length - 1) hyphParts.push("");
    }
    if (!finalBudget?.exceeded.length)
      repairConsonantLetters(cleanParts, hyphParts, maxCons);
    for (let i = 0; i < activeParts.length; i++)
      activeParts[i].text = cleanParts[i];
    context.word.written.clean = cleanParts.join("");
    context.word.written.hyphenated = hyphParts.join("");
  }
  const realization = traceCollector?.morphologyTrace?.realization;
  if (realization)
    realization.emittedParts = morphology.parts.map((part) => ({ ...part }));
  inStage(context, "render_pronunciation", () => realizeSurface(rt, context));
}

/**
 * Finish the selected attempt with its own streams: medial doubling, written
 * morphology (if any) and the trace, which records the word's stream `key`.
 */
function finishWord(
  rt: GeneratorRuntime,
  { context, morphology, root, baseSpelling }: SelectedAttempt,
  key: StreamKey,
  selection: SelectionTrace | undefined,
): Word {
  const traceCollector = context.trace;
  const morphApplied = !!morphology;
  inStage(context, "finalize_root_spelling", () => rt.doubleMedialOnset?.({
    context, baseSpelling, root,
    projectAttachment: morphology ? (written) => {
      const attached = attachRootWritten(morphology, written, root);
      return {
        prefix: attached.prefixOverride ?? morphology.prefixWritten,
        root: attached.written,
        suffix: attached.suffixOverride ?? morphology.suffixWritten,
      };
    } : undefined,
  }));
  if (morphology) finishAffixedWord(rt, context, morphology);
  if (traceCollector && selection) {
    traceCollector.random = { scheme: STAGE_STREAM_SCHEME, key: formatStreamKey(key) };
    traceCollector.syllableCount = context.syllableCount;
    traceCollector.targetPhonemeCount = context.targetPhonemeCount;
    traceCollector.syllablePlans = context.syllablePlans;
    traceCollector.selection = selection;
    context.word.trace = traceCollector.toTrace(morphApplied);
  }
  return context.word;
}

/** Select a root by phoneme/letter targets, then finish its planned morphology.
 * Each attempt resolves the planned affixes' sound effects before spelling the
 * root. Optional medial doubling preserves the selected spelling's length score.
 * After the retry limit, finish the best root seen rather than reject an affix. */
function generateOneWord(
  rt: GeneratorRuntime,
  { rand, mode, syllableCount, options }: ResolvedGenerationOptions,
): Word {
  const repetition = rt.config.rootRepetition;
  const rootRepetition = repetition?.mode === undefined || repetition.mode === mode
    ? repetition
    : undefined;
  const applyMorph = options.morphology ?? true;
  const enableTrace = options.trace ?? false;
  const morphConfig = applyMorph && rt.config.morphology?.enabled
    ? rt.config.morphology
    : undefined;
  const wordStreams = createWordStreams(rand);
  const constraintsRand = wordStreams.word("set_constraints");
  const { phonemes: targetPhonemeCountRoot, syllables: sampledSyllableCount } = sampleRootLengths(
    rt.rootLengthPolicy, mode, constraintsRand, syllableCount > 0 ? syllableCount : undefined,
  );
  // The affix plan has its own stream, so affix changes leave root shapes alone.
  const morphPlan = morphConfig
    ? planMorphology(morphConfig, mode, wordStreams.word("plan_morphology"), sampledSyllableCount)
    : undefined;
  const affixPlan = morphPlan && morphPlan.plan.template !== "bare"
    ? morphPlan.plan
    : undefined;
  const finalCodaLength = sampleRootFinalCodaLength(
    rt, mode, targetPhonemeCountRoot, sampledSyllableCount, constraintsRand,
  );
  // Keep root edges fixed through retries so acceptance cannot reweight these draws.
  const edges = {
    finalCodaLength,
    initialOnsetLength: sampleRootInitialOnsetLength(
      rt, mode, targetPhonemeCountRoot, sampledSyllableCount, finalCodaLength, constraintsRand,
    ),
  };
  const lengthRules = rt.config.syllableStructure;
  const rejectionTrace = enableTrace ? new RejectionTraceCollector(ROOT_ATTEMPT_CRITERIA) : undefined;

  const selection = chooseRootAttempt(ROOT_ATTEMPT_CRITERIA, targetPhonemeCountRoot, (attempt) => {
    const streams = wordStreams.attempt(attempt);
    // Shape planning runs before the attempt has a context, so it takes its stream directly.
    const syllablePlans = distributePhonemes(
      rt,
      targetPhonemeCountRoot,
      sampledSyllableCount,
      streams("plan_shape"),
      edges,
    );
    const traceCollector = enableTrace ? new TraceCollector() : undefined;
    if (traceCollector && morphPlan) {
      traceCollector.morphologyTrace = {
        template: morphPlan.plan.template,
        prefix: morphPlan.plan.prefix?.written,
        suffix: morphPlan.plan.suffix?.written,
        syllableReduction: morphPlan.syllableReduction,
      };
    }
    const context: AttemptContext = {
      rand: BETWEEN_STAGES,
      streams,
      word: {
        syllables: [],
        pronunciation: "",
        written: { clean: "", hyphenated: "" },
      },
      syllableCount: sampledSyllableCount,
      currSyllableIndex: 0,
      rootRepetition,
      targetPhonemeCount: targetPhonemeCountRoot,
      syllablePlans,
      trace: traceCollector,
    };
    runPipeline(rt, context, mode, affixPlan);
    return {
      context,
      lengths: { syllables: context.word.syllables.length, phonemes: countPhonemes(context.word.syllables) },
    };
  }, ({ context }) => {
    const affixed = affixPlan ? resolveAffixedRoot(rt, context, affixPlan) : undefined;
    const spelled = spellAttempt(rt, context, affixed);
    const root = spelled.root;
    const rootPhonemeCount = countPhonemes(root);
    const letterLength = context.word.written.clean.length;
    const attemptScore = scoreGenerationAttempt(
      rootPhonemeCount,
      targetPhonemeCountRoot,
      letterLength,
      root.length,
      lengthRules.letterLengthTargets,
    );
    return {
      value: { context, spelled },
      score: attemptScore,
      lengths: { syllables: root.length, phonemes: rootPhonemeCount, letters: letterLength },
      relaxedAfter: resolveLetterLengthRelaxedAfter(lengthRules, root.length, letterLength),
    };
  }, rejectionTrace);
  const { context, spelled } = selection.selected.value;
  return finishWord(rt, selectAttempt(context, spelled), wordStreams.key, rejectionTrace?.finish(selection));
}

/**
 * Build a lexical root; morphology, spelling and surface realization follow.
 */
function runPipeline(
  rt: GeneratorRuntime,
  context: AttemptContext,
  mode: GenerationMode,
  affixes?: NonBareMorphologyPlan,
): void {
  const t = context.trace;
  const word = context.word;
  const stressRules = rt.resolvedStress;

  const plans = context.syllablePlans;
  if (plans.length !== context.syllableCount) {
    throw new Error(`Top-down syllable plan mismatch: expected ${context.syllableCount}, got ${plans.length}`);
  }
  inStage(context, "select_segments", () => traceStage(t, "generateSyllables", word, () => {
    word.syllables = rt.segmentEngine.selectSegments(plans, {
      mode, rand: context.rand, rootRepetition: context.rootRepetition, trace: t,
    });
    context.currSyllableIndex = word.syllables.length;
  }));
  // The structural repairs take no random stream.
  traceStage(t, "repairClusters", word, () => {
    if (rt.bannedSet)
      repairClusters(word.syllables, rt.bannedSet, rt.clusterRepair!, t);
  });
  traceStage(t, "repairFinalCoda", word, () => {
    if (rt.allowedFinalSet)
      repairFinalCoda(word.syllables, rt.allowedFinalSet, t);
  });
  traceStage(t, "repairClusterShape", word, () => {
    if (
      rt.clusterLimits ||
      rt.config.codaConstraints?.voicingAgreement ||
      rt.config.codaConstraints?.homorganicNasalStop
    ) {
      repairClusterShape(
        word.syllables,
        {
          clusterLimits: rt.clusterLimits,
          sonorityConstraints: rt.sonorityConstraints,
          codaConstraints: rt.config.codaConstraints,
          sonorityBySound: rt.sonorityBySound,
          codaAppendantSet: rt.codaAppendantSet,
          sonorityExemptSet: rt.sonorityExemptSet,
        },
        t,
      );
    }
  });
  traceStage(t, "repairHAfterBackVowel", word, () =>
    repairHAfterBackVowel(word.syllables, t),
  );
  inStage(context, "assign_stress", () =>
    traceStage(t, "applyStress", word, () => applyStress(context, stressRules)));
  inStage(context, "post_stress_repair", () => {
    traceStage(t, "repairStressedNuclei", word, () =>
      repairStressedNuclei(context, rt.nucleusRepair),
    );
    traceStage(t, "repairNucleusWordPositions", word, () => {
      repairRootNuclei(context, rt.nucleusRepair);
      clearBannedSecondaryStress(context, stressRules.nucleus);
    });
    const alternations = rt.config.unstressedRootNuclei;
    if (alternations?.mode === mode && word.syllables.length > 1) {
      traceStage(t, "alternateUnstressedRootNuclei", word, () =>
        alternateUnstressedRootNuclei(context, rt.nucleusRepair, alternations, affixes),
      );
    }
  });
}

const MAX_FORCED_SYLLABLE_COUNT = 7;
const MAX_BATCH_COUNT = 1_000_000;

function resolveForcedSyllableCount(options: WordGenerationOptions): number {
  const syllableCount = options.syllableCount;
  if (syllableCount === undefined || syllableCount === 0) return 0;
  if (
    !Number.isInteger(syllableCount) ||
    syllableCount < 1 ||
    syllableCount > MAX_FORCED_SYLLABLE_COUNT
  ) {
    throw new RangeError(
      "options.syllableCount must be an integer from 1 to 7 (or 0/undefined for automatic sampling).",
    );
  }
  return syllableCount;
}

function resolveBatchCount(count: number): number {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("count must be a non-negative integer.");
  }
  if (count > MAX_BATCH_COUNT) {
    throw new RangeError(
      `count must be less than or equal to ${MAX_BATCH_COUNT}.`,
    );
  }
  return count;
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
      return generateOneWord(rt, resolveGenerationOptions(options));
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
  return generateOneWord(defaultRuntime, resolveGenerationOptions(options));
};

/**
 * Generate multiple words sharing a single RNG instance.
 *
 * With a shared RNG, `generateWords(50, { seed: 42 })` is deterministic AND
 * produces different words for each index. This is **not** equivalent to
 * calling `generateWord({ seed: 42 })` 50 times — the latter creates 50
 * identical RNG streams and therefore 50 identical words.
 *
 * @param count - Number of words to generate. Must be an integer from 0 to 1,000,000.
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
export const generateWords = (
  count: number,
  options: WordGenerationOptions = {},
): Word[] => {
  const total = resolveBatchCount(count);
  const resolved = resolveGenerationOptions(options);
  const results: Word[] = [];
  for (let i = 0; i < total; i++) {
    results.push(generateOneWord(defaultRuntime, resolved));
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
export function _isValidCluster(
  cluster: Phoneme[],
  position: "onset" | "coda" | "nucleus",
): boolean {
  return isValidCluster(defaultRuntime, cluster, position);
}
