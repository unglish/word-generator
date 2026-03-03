import { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import type { RNG } from "../utils/random.js";
import {
  AspirationContext,
  AspirationRules,
  PronunciationConfig,
  StressRules,
  VowelReductionConfig,
  resolveAspirationRules,
} from "../config/language.js";
import { phonemes } from "../elements/phonemes.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { otEvaluate } from "./ot-stress.js";
import type { AspirationDecisionTrace } from "./trace.js";

const applyAspirationMarker = (phoneme: Phoneme): Phoneme => {
  if (phoneme.aspirated) return phoneme;
  return { ...phoneme, aspirated: true };
};

const isAspiratableOnset = (phoneme: Phoneme | undefined): phoneme is Phoneme =>
  !!phoneme && !phoneme.voiced && phoneme.mannerOfArticulation === "stop";

const resolveAspirationDecision = (
  position: number,
  context: WordGenerationContext,
  rules: ReturnType<typeof resolveAspirationRules>,
): { context: AspirationContext; probability: number } => {
  const { word } = context;
  const syllable = word.syllables[position];
  const prevSyllable = position > 0 ? word.syllables[position - 1] : undefined;

  const matches: Record<AspirationContext, boolean> = {
    wordInitial: position === 0,
    postS: prevSyllable?.coda.at(-1)?.sound === "s",
    stressed: !!syllable.stress,
    postStressed: !!prevSyllable?.stress,
    default: true,
  };

  for (const candidate of rules.precedence) {
    if (matches[candidate]) {
      return { context: candidate, probability: rules.probabilities[candidate] };
    }
  }
  return { context: "default", probability: rules.probabilities.default };
};

const recordAspirationDecision = (
  context: WordGenerationContext,
  payload: Omit<AspirationDecisionTrace, "event">,
): void => {
  if (!context.trace) return;
  context.trace.recordStructural({ event: "aspirationDecision", ...payload });
};

const applyAspiration = (context: WordGenerationContext, aspiration?: AspirationRules): void => {
  const rules = resolveAspirationRules(aspiration);
  const syllables = context.word.syllables;

  // Keep hot path lean when tracing is disabled and aspiration is disabled.
  if (!context.trace && !rules.enabled) return;

  for (let i = 0; i < syllables.length; i++) {
    const onset = syllables[i].onset[0];
    const targetPhoneme = onset?.sound ?? null;
    const eligible = isAspiratableOnset(onset);

    if (!rules.enabled || !eligible) {
      recordAspirationDecision(context, {
        evaluated: false,
        syllableIndex: i,
        context: null,
        probability: null,
        roll: null,
        eligible,
        applied: false,
        targetPhoneme,
      });
      continue;
    }

    const decision = resolveAspirationDecision(i, context, rules);
    const roll = context.rand() * 100;
    const applied = roll < decision.probability;

    if (applied) {
      syllables[i].onset[0] = applyAspirationMarker(onset);
    }

    recordAspirationDecision(context, {
      evaluated: true,
      syllableIndex: i,
      context: decision.context,
      probability: decision.probability,
      roll: Number(roll.toFixed(5)),
      eligible: true,
      applied,
      targetPhoneme: onset.sound,
    });
  }
};

/** @internal exported for testing */
export const _applyAspiration = applyAspiration;

export const applyStress = (context: WordGenerationContext, stress: StressRules): void => {
  const { rand } = context;
  // Rule 1: Primary stress
  applyPrimaryStress(context, rand, stress);

  // Rule 2: Secondary stress
  applySecondaryStress(context, rand, stress);

  // Rule 3: Rhythmic stress
  applyRhythmicStress(context, rand, stress);
};

const applyPrimaryStress = (context: WordGenerationContext, rand: RNG, stress: StressRules): void => {
  const { word } = context;
  const syllables = word.syllables;
  const syllableCount = syllables.length;

  if (syllableCount === 1) {
    // Monosyllabic words don't need stress marking
    return;
  }

  let primaryStressIndex: number;

  if (stress.strategy === "ot" && stress.otConfig) {
    // Harmonic OT evaluation
    primaryStressIndex = otEvaluate(syllables, stress.otConfig, rand);
  } else {
    // Legacy weight-sensitive strategy
    const disyllabic = stress.disyllabicWeights ?? [70, 30];
    const poly = stress.polysyllabicWeights;

    if (syllableCount === 2) {
      primaryStressIndex = getWeightedOption([[0, disyllabic[0]], [1, disyllabic[1]]], rand);
    } else {
      const penultimateHeavy = isHeavySyllable(syllables[syllableCount - 2]);
      const penultWeight = penultimateHeavy
        ? (poly?.heavyPenult ?? 70)
        : (poly?.lightPenult ?? 30);
      const antepenultWeight = penultimateHeavy
        ? (poly?.antepenultHeavy ?? 20)
        : (poly?.antepenultLight ?? 60);
      const initialWeight = poly?.initial ?? 10;
      primaryStressIndex = getWeightedOption([
        [syllableCount - 2, penultWeight],
        [syllableCount - 3, antepenultWeight],
        [0, initialWeight],
      ], rand);
    }
  }

  syllables[primaryStressIndex].stress = "ˈ";
};

const applySecondaryStress = (context: WordGenerationContext, rand: RNG, stress: StressRules): void => {
  const { word } = context;
  const syllables = word.syllables;
  const syllableCount = syllables.length;

  if (syllableCount === 1) return;

  const heavyW = stress.secondaryStressHeavyWeight ?? 70;
  const lightW = stress.secondaryStressLightWeight ?? 30;
  const prob = stress.secondaryStressProbability ?? 40;

  const primaryStressIndex = syllables.findIndex(s => s.stress === "ˈ");
  const potentialIndices = [0, 1, 2].filter(i => i !== primaryStressIndex && i <= syllableCount - 1);
  const secondaryStressIndex = getWeightedOption(
    potentialIndices.map(i => [i, isHeavySyllable(syllables[i]) ? heavyW : lightW]),
    rand,
  );

  if (getWeightedOption([[true, prob], [false, 100 - prob]], rand)) {
    syllables[secondaryStressIndex].stress = "ˌ";
  }
};

const applyRhythmicStress = (context: WordGenerationContext, rand: RNG, stress: StressRules): void => {
  const { word } = context;
  const syllables = word.syllables;
  const prob = stress.rhythmicStressProbability ?? 40;

  for (let i = 1; i < syllables.length - 1; i++) {
    if (!syllables[i - 1].stress && !syllables[i].stress && !syllables[i + 1].stress) {
      if (getWeightedOption([[true, prob], [false, 100 - prob]], rand)) {
        syllables[i].stress = "ˌ";
      }
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
  pronunciation: PronunciationConfig,
): void => {
  applyAspiration(context, pronunciation.aspiration);
  if (pronunciation.vowelReduction?.enabled) {
    reduceUnstressedVowels(context, pronunciation.vowelReduction, context.rand);
  }
  buildPronunciationGuide(context);
};
