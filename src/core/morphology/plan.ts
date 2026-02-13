import { MorphologyConfig, Affix } from "../../config/language.js";
import { GenerationMode } from "../../types.js";
import getWeightedOption from "../../utils/getWeightedOption.js";
import type { RNG } from "../../utils/random.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Template = "bare" | "suffixed" | "prefixed" | "both";

export interface MorphologyPlan {
  template: Template;
  prefix?: Affix;
  suffix?: Affix;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickWeighted<T>(items: T[], getWeight: (item: T) => number, rand: RNG): T {
  const options: [T, number][] = items.map(item => [item, getWeight(item)]);
  return getWeightedOption(options, rand);
}

function pickTemplate(config: MorphologyConfig, mode: GenerationMode, rand: RNG): Template {
  const w = config.templateWeights[mode];
  return getWeightedOption<Template>([
    ["bare", w.bare],
    ["suffixed", w.suffixed],
    ["prefixed", w.prefixed],
    ["both", w.both],
  ], rand);
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Plan morphology BEFORE root generation — picks template and affixes,
 * returns the plan and the syllable count adjustment.
 */
export function planMorphology(
  config: MorphologyConfig,
  mode: GenerationMode,
  rand: RNG,
): { plan: MorphologyPlan; syllableReduction: number } {
  const template = pickTemplate(config, mode, rand);

  if (template === "bare") {
    return { plan: { template }, syllableReduction: 0 };
  }

  const plan: MorphologyPlan = { template };
  let reduction = 0;

  if (template === "prefixed" || template === "both") {
    plan.prefix = pickWeighted(config.prefixes, a => a.frequency, rand);
    reduction += plan.prefix.syllableCount;
  }
  if (template === "suffixed" || template === "both") {
    plan.suffix = pickWeighted(config.suffixes, a => a.frequency, rand);
    reduction += plan.suffix.syllableCount;
  }

  return { plan, syllableReduction: reduction };
}
