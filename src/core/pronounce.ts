import { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import type { RNG } from "../utils/random.js";
import {
  AspirationPredicate,
  AspirationTargetSelector,
  ResolvedAspirationRules,
  ResolvedStressRules,
  SyllableIndexClass,
  VowelReductionConfig,
} from "../config/language.js";
import { phonemes } from "../elements/phonemes.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { otEvaluate } from "./ot-stress.js";
import { analyzeWordWeight } from "./syllable-weight.js";
import type { SyllableWeightAnalysis, StressWeightTrace } from "./syllable-weight.js";
import type { AspirationDecisionTrace, AspirationTargetSegment } from "./trace.js";
import { clonePhoneme, cloneSyllables } from "./lexical.js";

/** Fast boolean probability check (avoids tuple array allocation). */
export function coinFlip(rand: RNG, probability: number): boolean {
  return rand() * 100 < probability;
}

export interface PronunciationRuntimeConfig {
  aspiration: ResolvedAspirationRules;
  vowelReduction?: VowelReductionConfig;
}

interface AspirationTargetMatch {
  segment: AspirationTargetSegment;
  index: number;
  phoneme: Phoneme;
}

const applyAspirationMarker = (phoneme: Phoneme): Phoneme => {
  if (phoneme.aspirated) return phoneme;
  const aspirated = clonePhoneme(phoneme);
  aspirated.aspirated = true;
  return aspirated;
};

const getSyllableSegment = (
  syllable: Syllable,
  segment: AspirationTargetSegment,
): Phoneme[] => {
  if (segment === "onset") return syllable.onset;
  if (segment === "nucleus") return syllable.nucleus;
  return syllable.coda;
};

const matchesAspirationTarget = (
  phoneme: Phoneme,
  selector: AspirationTargetSelector,
): boolean => {
  if (selector.sounds && !selector.sounds.includes(phoneme.sound)) return false;
  if (selector.manner && !selector.manner.includes(phoneme.mannerOfArticulation)) return false;
  if (selector.place && !selector.place.includes(phoneme.placeOfArticulation)) return false;
  if (selector.voiced !== undefined && selector.voiced !== phoneme.voiced) return false;
  return true;
};

const findAspirationTarget = (
  syllable: Syllable,
  selectors: AspirationTargetSelector[],
): AspirationTargetMatch | undefined => {
  for (const selector of selectors) {
    const segment = getSyllableSegment(syllable, selector.segment);
    const index = selector.index ?? 0;
    const phoneme = segment[index];
    if (!phoneme) continue;
    if (!matchesAspirationTarget(phoneme, selector)) continue;
    return { segment: selector.segment, index, phoneme };
  }
  return undefined;
};

const classifySyllableIndex = (index: number, syllableCount: number): SyllableIndexClass => {
  if (index === 0) return "initial";
  if (index === syllableCount - 1) return "final";
  return "medial";
};

const matchesAspirationPredicate = (
  predicate: AspirationPredicate,
  syllableIndex: number,
  context: WordGenerationContext,
): boolean => {
  const syllables = context.word.syllables;
  const syllable = syllables[syllableIndex];
  const previous = syllableIndex > 0 ? syllables[syllableIndex - 1] : undefined;

  if (predicate.wordInitial !== undefined && predicate.wordInitial !== (syllableIndex === 0)) {
    return false;
  }
  if (predicate.stressed !== undefined && predicate.stressed !== Boolean(syllable.stress)) {
    return false;
  }
  if (predicate.postStressed !== undefined && predicate.postStressed !== Boolean(previous?.stress)) {
    return false;
  }
  if (
    predicate.syllableIndexClass !== undefined
    && predicate.syllableIndexClass !== classifySyllableIndex(syllableIndex, syllables.length)
  ) {
    return false;
  }
  if (predicate.previousCodaSounds) {
    const previousCoda = previous?.coda.at(-1)?.sound;
    if (!previousCoda || !predicate.previousCodaSounds.includes(previousCoda)) {
      return false;
    }
  }

  return true;
};

const resolveAspirationDecision = (
  syllableIndex: number,
  context: WordGenerationContext,
  rules: ResolvedAspirationRules,
): { ruleId: string | "fallback"; probability: number } => {
  for (const rule of rules.rules) {
    if (matchesAspirationPredicate(rule.when, syllableIndex, context)) {
      return { ruleId: rule.id, probability: rule.probability };
    }
  }
  return { ruleId: "fallback", probability: rules.fallbackProbability };
};

const recordAspirationDecision = (
  context: WordGenerationContext,
  payload: AspirationDecisionTrace,
): void => {
  if (!context.trace) return;
  context.trace.recordStructural(payload);
};

const applyAspiration = (context: WordGenerationContext, rules: ResolvedAspirationRules): void => {
  const syllables = context.word.syllables;

  // Keep hot path lean when tracing is disabled and aspiration is disabled.
  if (!context.trace && !rules.enabled) return;

  for (let i = 0; i < syllables.length; i++) {
    const target = findAspirationTarget(syllables[i], rules.targets);
    const targetSegment = target?.segment ?? null;
    const targetIndex = target?.index ?? null;
    const targetPhoneme = target?.phoneme.sound ?? null;
    const eligible = !!target;

    if (!rules.enabled || !target) {
      recordAspirationDecision(context, {
        event: "aspirationDecision",
        evaluated: false,
        syllableIndex: i,
        ruleId: null,
        probability: null,
        roll: null,
        eligible,
        applied: false,
        targetSegment,
        targetIndex,
        targetPhoneme,
      });
      continue;
    }

    const decision = resolveAspirationDecision(i, context, rules);
    const roll = context.rand() * 100;
    const applied = roll < decision.probability;

    if (applied) {
      const segment = getSyllableSegment(syllables[i], target.segment);
      segment[target.index] = applyAspirationMarker(target.phoneme);
    }

    recordAspirationDecision(context, {
      event: "aspirationDecision",
      evaluated: true,
      syllableIndex: i,
      ruleId: decision.ruleId,
      probability: decision.probability,
      roll: Number(roll.toFixed(5)),
      eligible: true,
      applied,
      targetSegment: target.segment,
      targetIndex: target.index,
      targetPhoneme: target.phoneme.sound,
    });
  }
};

/** @internal exported for testing */
export const _applyAspiration = applyAspiration;

export const applyStress = (context: WordGenerationContext, stress: ResolvedStressRules): void => {
  const { rand } = context;
  const analysis = analyzeWordWeight(context.word.syllables, stress.syllableWeight);
  // Rule 1: Primary stress
  const primaryIndex = applyPrimaryStress(context, rand, stress, analysis);

  // Rule 2: Secondary stress
  const secondary = applySecondaryStress(context, rand, stress, analysis);

  if (context.trace) {
    context.trace.stressWeight = {
      version: 1,
      stage: "applyStress",
      domain: "root-before-nucleus-repair",
      policy: { ...stress.syllableWeight },
      syllables: analysis,
      primary: { strategy: stress.primary.type, selectedIndex: primaryIndex },
      secondary,
    };
  }

  // Rule 3: Rhythmic stress
  applyRhythmicStress(context, rand, stress);
};

const chooseWeightSensitivePrimaryStress = (
  syllables: Syllable[],
  rand: RNG,
  disyllabicWeights: [number, number],
  polysyllabicWeights: {
    heavyPenult: number;
    lightPenult: number;
    antepenultHeavy: number;
    antepenultLight: number;
    initial: number;
  },
  analysis: readonly SyllableWeightAnalysis[],
): number => {
  if (syllables.length === 2) {
    return getWeightedOption([[0, disyllabicWeights[0]], [1, disyllabicWeights[1]]], rand);
  }

  const penultimateIndex = syllables.length - 2;
  const antepenultIndex = Math.max(0, syllables.length - 3);
  const penultimateHeavy = analysis[penultimateIndex].operational.weight === "heavy";

  const penultWeight = penultimateHeavy
    ? polysyllabicWeights.heavyPenult
    : polysyllabicWeights.lightPenult;
  const antepenultWeight = penultimateHeavy
    ? polysyllabicWeights.antepenultHeavy
    : polysyllabicWeights.antepenultLight;

  return getWeightedOption([
    [penultimateIndex, penultWeight],
    [antepenultIndex, antepenultWeight],
    [0, polysyllabicWeights.initial],
  ], rand);
};

const applyPrimaryStress = (context: WordGenerationContext, rand: RNG, stress: ResolvedStressRules, analysis: readonly SyllableWeightAnalysis[]): number | null => {
  const syllables = context.word.syllables;
  const syllableCount = syllables.length;

  if (syllableCount === 0) return null;
  if (syllableCount === 1) {
    // Lexical prominence survives affixation; IPA can omit the display mark.
    syllables[0].stress = "ˈ";
    return 0;
  }

  let primaryStressIndex = 0;

  switch (stress.primary.type) {
  case "fixed": {
    primaryStressIndex = Math.max(0, Math.min(syllableCount - 1, stress.primary.fixedPosition));
    break;
  }
  case "initial": {
    primaryStressIndex = 0;
    break;
  }
  case "penultimate": {
    primaryStressIndex = Math.max(0, syllableCount - 2);
    break;
  }
  case "weight-sensitive": {
    primaryStressIndex = chooseWeightSensitivePrimaryStress(
      syllables,
      rand,
      stress.primary.disyllabicWeights,
      stress.primary.polysyllabicWeights,
      analysis,
    );
    break;
  }
  case "ot": {
    primaryStressIndex = otEvaluate(syllables, stress.primary.otConfig, rand, analysis);
    break;
  }
  }

  syllables[primaryStressIndex].stress = "ˈ";
  return primaryStressIndex;
};

const applySecondaryStress = (context: WordGenerationContext, rand: RNG, stress: ResolvedStressRules, analysis: readonly SyllableWeightAnalysis[]): StressWeightTrace["secondary"] => {
  const syllables = context.word.syllables;
  const syllableCount = syllables.length;
  const skipped: StressWeightTrace["secondary"] = { candidates: [], selectedIndex: null, applied: false };

  if (syllableCount <= 1 || !stress.secondary.enabled) return skipped;

  const primaryStressIndex = syllables.findIndex((s) => s.stress === "ˈ");
  if (primaryStressIndex < 0) return skipped;

  const potentialIndices = (
    stress.secondary.candidateWindow === "all-nonprimary"
      ? Array.from({ length: syllableCount }, (_, i) => i)
      : [0, 1, 2].filter((i) => i < syllableCount)
  ).filter((i) => i !== primaryStressIndex);

  if (potentialIndices.length === 0) return skipped;

  const candidates = potentialIndices.map((i) => ({
    syllableIndex: i,
    weight: analysis[i].operational.weight === "heavy" ? stress.secondary.heavyWeight : stress.secondary.lightWeight,
  }));

  const secondaryStressIndex = getWeightedOption(
    candidates.map(candidate => [candidate.syllableIndex, candidate.weight]),
    rand,
  );

  const applied = coinFlip(rand, stress.secondary.probability);
  if (applied) {
    syllables[secondaryStressIndex].stress = "ˌ";
  }
  return { candidates, selectedIndex: secondaryStressIndex, applied };
};

const applyRhythmicStress = (context: WordGenerationContext, rand: RNG, stress: ResolvedStressRules): void => {
  const syllables = context.word.syllables;
  if (!stress.rhythmic.enabled) return;

  for (let i = 1; i < syllables.length - 1; i++) {
    if (syllables[i].stress) continue;

    const hasUnstressedNeighbors = !syllables[i - 1].stress && !syllables[i + 1].stress;
    if (stress.rhythmic.requireUnstressedNeighbors && !hasUnstressedNeighbors) {
      continue;
    }

    if (coinFlip(rand, stress.rhythmic.probability)) {
      syllables[i].stress = "ˌ";
    }
  }
};

const buildPronunciationGuide = (context: WordGenerationContext): void => {
  const { syllables } = context.word;
  let guide = "";
  const render = (phoneme: Phoneme): string =>
    phoneme.aspirated && !phoneme.sound.endsWith("ʰ")
      ? `${phoneme.sound}ʰ`
      : phoneme.sound;

  for (let index = 0; index < syllables.length; index++) {
    const syllable = syllables[index];

    // Add stress/separator prefix
    if (syllable.stress === "ˈ" && syllables.length > 1) guide += "ˈ";
    else if (syllable.stress === "ˌ") guide += "ˌ";
    else if (index > 0) guide += ".";

    for (let i = 0; i < syllable.onset.length; i++) guide += render(syllable.onset[i]);
    for (let i = 0; i < syllable.nucleus.length; i++) guide += render(syllable.nucleus[i]);
    for (let i = 0; i < syllable.coda.length; i++) guide += render(syllable.coda[i]);
  }

  context.word.pronunciation = guide;
};

/**
 * Post-generation pass: reduce vowels in unstressed syllables.
 *
 * Only vowels with a matching rule in the config are candidates.
 * Tense vowels are skipped. Per-rule target and probability are used,
 * modified by syllable position and secondary stress settings.
 *
 * NOTE: Spelling intentionally does NOT update after vowel reduction.
 * English uses etymological/historical spelling — the written form is
 * generated before pronunciation, so reduction only affects the IPA
 * output (e.g. we produce "banana" not "bənænə"). This mirrors real
 * English orthography where unstressed vowels are spelled with their
 * full letters despite being pronounced as schwa.
 */
const reduceUnstressedVowels = (
  context: WordGenerationContext,
  config: VowelReductionConfig,
  rand: RNG,
): void => {
  const { word } = context;
  const syllables = word.syllables;

  // Monosyllabic words don't reduce
  if (syllables.length <= 1) return;

  // Build a lookup map for rules by source sound
  const ruleMap = new Map(config.rules.map((r) => [r.source, r]));

  for (let si = 0; si < syllables.length; si++) {
    const syllable = syllables[si];

    // Primary-stressed syllables never reduce
    if (syllable.stress === "ˈ") continue;

    // Secondary-stressed syllables: only reduce if config allows
    if (syllable.stress === "ˌ") {
      if (!config.reduceSecondaryStress) continue;
    }

    // Determine positional modifier
    let positionalMod = 1.0;
    if (config.positionalModifiers) {
      if (si === 0) {
        positionalMod = config.positionalModifiers.wordInitial ?? 1.0;
      } else if (si === syllables.length - 1) {
        positionalMod = config.positionalModifiers.wordFinal ?? 1.0;
      } else {
        positionalMod = config.positionalModifiers.wordMedial ?? 1.0;
      }
    }

    for (let i = 0; i < syllable.nucleus.length; i++) {
      const vowel = syllable.nucleus[i];

      // Skip tense vowels — they resist reduction
      if (vowel.tense) continue;

      // Look up rule; if not found, vowel is immune
      const rule = ruleMap.get(vowel.sound);
      if (!rule) continue;

      // Compute effective probability
      let prob = rule.probability * positionalMod;
      if (syllable.stress === "ˌ" && config.secondaryStressProbability != null) {
        prob = prob * (config.secondaryStressProbability / 100);
      }
      prob = Math.min(100, Math.max(0, Math.round(prob)));

      // Find target phoneme from inventory
      const target = phonemes.find((p) => p.sound === rule.target);
      if (!target) continue;

      if (coinFlip(rand, prob)) {
        const reduced = clonePhoneme(target);
        reduced.reduced = true;
        syllable.nucleus[i] = reduced;
      }
    }
  }
};

/** @internal exported for testing */
export const _reduceUnstressedVowels = reduceUnstressedVowels;

export const generatePronunciation = (
  context: WordGenerationContext,
  pronunciation: PronunciationRuntimeConfig,
): void => {
  if (context.word.lexical) {
    context.word.syllables = cloneSyllables(context.word.lexical.syllables);
  }
  applyAspiration(context, pronunciation.aspiration);
  if (pronunciation.vowelReduction?.enabled) {
    reduceUnstressedVowels(context, pronunciation.vowelReduction, context.rand);
  }
  buildPronunciationGuide(context);
};
