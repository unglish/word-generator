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
import type { AspirationDecisionTrace, AspirationTargetSegment } from "./trace.js";

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
  return { ...phoneme, aspirated: true };
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
  // Rule 1: Primary stress
  applyPrimaryStress(context, rand, stress);

  // Rule 2: Secondary stress
  applySecondaryStress(context, rand, stress);

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
): number => {
  if (syllables.length === 2) {
    return getWeightedOption([[0, disyllabicWeights[0]], [1, disyllabicWeights[1]]], rand);
  }

  const penultimateIndex = syllables.length - 2;
  const antepenultIndex = Math.max(0, syllables.length - 3);
  const penultimateHeavy = isHeavySyllable(syllables[penultimateIndex]);

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

const applyPrimaryStress = (context: WordGenerationContext, rand: RNG, stress: ResolvedStressRules): void => {
  const syllables = context.word.syllables;
  const syllableCount = syllables.length;

  if (syllableCount <= 1) {
    // Monosyllabic words don't need stress marking
    return;
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
    );
    break;
  }
  case "ot": {
    primaryStressIndex = otEvaluate(syllables, stress.primary.otConfig, rand);
    break;
  }
  }

  syllables[primaryStressIndex].stress = "ˈ";
};

const applySecondaryStress = (context: WordGenerationContext, rand: RNG, stress: ResolvedStressRules): void => {
  const syllables = context.word.syllables;
  const syllableCount = syllables.length;

  if (syllableCount <= 1 || !stress.secondary.enabled) return;

  const primaryStressIndex = syllables.findIndex((s) => s.stress === "ˈ");
  if (primaryStressIndex < 0) return;

  const potentialIndices = (
    stress.secondary.candidateWindow === "all-nonprimary"
      ? Array.from({ length: syllableCount }, (_, i) => i)
      : [0, 1, 2].filter((i) => i < syllableCount)
  ).filter((i) => i !== primaryStressIndex);

  if (potentialIndices.length === 0) return;

  const secondaryStressIndex = getWeightedOption(
    potentialIndices.map((i) => [
      i,
      isHeavySyllable(syllables[i])
        ? stress.secondary.heavyWeight
        : stress.secondary.lightWeight,
    ]),
    rand,
  );

  if (getWeightedOption([[true, stress.secondary.probability], [false, 100 - stress.secondary.probability]], rand)) {
    syllables[secondaryStressIndex].stress = "ˌ";
  }
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

    if (getWeightedOption([[true, stress.rhythmic.probability], [false, 100 - stress.rhythmic.probability]], rand)) {
      syllables[i].stress = "ˌ";
    }
  }
};

const isHeavySyllable = (syllable: Syllable): boolean => {
  return syllable.nucleus.length > 1 || syllable.coda.length > 0;
};

const buildPronunciationGuide = (context: WordGenerationContext): void => {
  const { word } = context;
  let pronunciationGuide = "";
  const render = (phoneme: Phoneme): string =>
    phoneme.aspirated && !phoneme.sound.endsWith("ʰ")
      ? `${phoneme.sound}ʰ`
      : phoneme.sound;

  word.syllables.forEach((syllable, index) => {
    const onset = syllable.onset.map(render).join("");
    const nucleus = syllable.nucleus.map(render).join("");
    const coda = syllable.coda.map(render).join("");

    let syllablePronunciation = `${onset}${nucleus}${coda}`;

    // Add stress marker if the syllable is stressed
    if (syllable.stress === "ˈ") {
      syllablePronunciation = `ˈ${syllablePronunciation}`;
    } else if (syllable.stress === "ˌ") {
      syllablePronunciation = `ˌ${syllablePronunciation}`;
    } else if (index > 0) {
      syllablePronunciation = `.${syllablePronunciation}`;
    }

    pronunciationGuide += syllablePronunciation;
  });

  word.pronunciation = pronunciationGuide;
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

      if (getWeightedOption([[true, prob], [false, 100 - prob]], rand)) {
        syllable.nucleus[i] = { ...target, reduced: true };
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
  applyAspiration(context, pronunciation.aspiration);
  if (pronunciation.vowelReduction?.enabled) {
    reduceUnstressedVowels(context, pronunciation.vowelReduction, context.rand);
  }
  buildPronunciationGuide(context);
};
