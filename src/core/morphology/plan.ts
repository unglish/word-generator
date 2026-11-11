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
): MorphologyTemplate {
  const w = config.templateWeights[mode];
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
 * Plan morphology BEFORE root generation — picks template and affixes,
 * returns the plan and baseline affix syllable metadata. Root budgets are independent.
 */
export function planMorphology(
  config: MorphologyConfig,
  mode: GenerationMode,
  rand: RNG,
): PlannedMorphologySelection & { plan: GeneratedMorphologyPlan } {
  const template = pickTemplate(config, mode, rand);

  if (template === "bare") {
    return { plan: { template }, syllableReduction: 0 };
  }

  if (template === "prefixed") {
    const prefix = pickWeighted(config.prefixes, (a) => a.frequency, rand);
    return {
      plan: { template, prefix },
      syllableReduction: 0 + prefix.syllableCount,
    };
  }
  if (template === "suffixed") {
    const suffix = pickWeighted(config.suffixes, (a) => a.frequency, rand);
    return {
      plan: { template, suffix },
      syllableReduction: 0 + suffix.syllableCount,
    };
  }
  const prefix = pickWeighted(config.prefixes, (a) => a.frequency, rand);
  const suffix = pickWeighted(config.suffixes, (a) => a.frequency, rand);
  return {
    plan: { template, prefix, suffix },
    syllableReduction: 0 + prefix.syllableCount + suffix.syllableCount,
  };
}
