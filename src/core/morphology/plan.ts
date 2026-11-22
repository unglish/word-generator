import { MorphologyConfig, Affix } from "../../config/language.js";
import { GenerationMode, MorphologyTemplate } from "../../types.js";
import getWeightedOption from "../../utils/getWeightedOption.js";
import type { RNG } from "../../utils/random.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MorphologyPlan {
  template: MorphologyTemplate;
  prefix?: Affix;
  suffix?: Affix;
}

export type NonBareMorphologyPlan = MorphologyPlan & {
  template: Exclude<MorphologyTemplate, "bare">;
};
type GeneratedMorphologyPlan =
  | { template: "bare"; prefix?: undefined; suffix?: undefined }
  | { template: "prefixed"; prefix: Affix; suffix?: undefined }
  | { template: "suffixed"; prefix?: undefined; suffix: Affix }
  | { template: "both"; prefix: Affix; suffix: Affix };

export interface PlannedMorphologySelection {
  plan: MorphologyPlan;
  /** Legacy field: baseline affix syllables, never deducted from the root. */
  syllableReduction: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickWeighted<T>(
  items: T[],
  getWeight: (item: T) => number,
  rand: RNG,
): T {
  const options: [T, number][] = items.map((item) => [item, getWeight(item)]);
  return getWeightedOption(options, rand);
}

function pickTemplate(
  config: MorphologyConfig,
  mode: GenerationMode,
  rand: RNG,
  rootSyllables?: number,
): MorphologyTemplate {
  const measured = mode === "lexicon" && rootSyllables !== undefined
    ? config.templateWeights.lexiconCalibration?.byRootSyllables[rootSyllables]
    : undefined;
  const w = measured ?? config.templateWeights[mode];
  return getWeightedOption<MorphologyTemplate>(
    [
      ["bare", w.bare],
      ["suffixed", w.suffixed],
      ["prefixed", w.prefixed],
      ["both", w.both],
    ],
    rand,
  );
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Plan morphology before generating the root phones. Lexicon calibration can
 * condition the template on the already sampled syllable budget.
 */
export function planMorphology(
  config: MorphologyConfig,
  mode: GenerationMode,
  rand: RNG,
  rootSyllables?: number,
): PlannedMorphologySelection & { plan: GeneratedMorphologyPlan } {
  const template = pickTemplate(config, mode, rand, rootSyllables);

  if (template === "bare") {
    return { plan: { template }, syllableReduction: 0 };
  }

  const measured = mode === "lexicon" ? config.templateWeights.lexiconCalibration?.affixes : undefined;
  const weight = (affix: Affix) => measured?.[affix.type][affix.written] ?? affix.frequency;

  // Keep the former zero-initialized accumulator arithmetic, including coercion
  // for untyped custom affix counts, rather than changing deep-import behavior.
  if (template === "prefixed") {
    const prefix = pickWeighted(config.prefixes, weight, rand);
    return {
      plan: { template, prefix },
      syllableReduction: 0 + prefix.syllableCount,
    };
  }
  if (template === "suffixed") {
    const suffix = pickWeighted(config.suffixes, weight, rand);
    return {
      plan: { template, suffix },
      syllableReduction: 0 + suffix.syllableCount,
    };
  }
  const prefix = pickWeighted(config.prefixes, weight, rand);
  const suffix = pickWeighted(config.suffixes, weight, rand);
  return {
    plan: { template, prefix, suffix },
    syllableReduction: 0 + prefix.syllableCount + suffix.syllableCount,
  };
}
