import type { MorphologyConfig } from "../../config/language.js";
import type { MorphologyTemplate } from "../../types.js";
import getWeightedOption from "../../utils/getWeightedOption.js";
import type { RNG } from "../../utils/random.js";
import { categoryPaths, type CategoryPath, type MorphologyCategories } from "./categories.js";
import type { MorphologyPlan } from "./plan.js";

export interface CategoryPlanningTrace {
  requestedTemplate: MorphologyTemplate;
  eligiblePaths: number;
  excludedProjections: number;
  totalWeight: number;
  planned: CategoryPath;
  retained: CategoryPath;
}
interface PlannedPath { plan: MorphologyPlan; syllableReduction: number; planned: CategoryPath; retained: CategoryPath }

function projectWithoutPrefix(model: MorphologyCategories, path: CategoryPath): CategoryPath | undefined {
  const sense = model.senses.find(sense => sense.id === path.suffixSense);
  if (!sense) return undefined;
  const transition = sense.transitions.find(transition => transition.input === path.stem);
  if (!transition) return undefined;
  return { stem: path.stem, final: transition.output, suffixSense: sense.id,
    steps: [{ sense: sense.id, ...transition }], weight: path.weight };
}
function realizePath(config: MorphologyConfig, model: MorphologyCategories, template: MorphologyTemplate,
  path: CategoryPath, forcedSyllableCount: number): PlannedPath | undefined {
  const prefixSense = model.senses.find(sense => sense.id === path.prefixSense);
  const suffixSense = model.senses.find(sense => sense.id === path.suffixSense);
  const prefix = prefixSense ? config.prefixes[prefixSense.affix.index] : undefined;
  const suffix = suffixSense ? config.suffixes[suffixSense.affix.index] : undefined;
  const reduction = (prefix?.syllableCount ?? 0) + (suffix?.syllableCount ?? 0);
  if (template === "both" && forcedSyllableCount > 0 && forcedSyllableCount - reduction < 1) {
    const retained = projectWithoutPrefix(model, path);
    if (!retained) return undefined;
    return { plan: { template: "suffixed", suffix }, syllableReduction: suffix?.syllableCount ?? 0,
      planned: path, retained };
  }
  return { plan: { template, ...(prefix ? { prefix } : {}), ...(suffix ? { suffix } : {}) },
    syllableReduction: reduction, planned: path, retained: path };
}

/** Category policy affects planning only when explicitly configured. */
export function planCategoryMorphology(config: MorphologyConfig, template: MorphologyTemplate, rand: RNG,
  forcedSyllableCount: number): { plan: MorphologyPlan; syllableReduction: number } {
  const model = config.categories;
  if (!model) throw new Error("Category-aware planning requires an explicit model.");
  const paths = categoryPaths(model, template, {
    prefix: config.prefixes.map(affix => affix.frequency), suffix: config.suffixes.map(affix => affix.frequency),
  });
  const eligible = paths.map(path => realizePath(config, model, template, path, forcedSyllableCount))
    .filter((path): path is PlannedPath => path !== undefined);
  if (!eligible.length) throw new Error(`No compatible category path for morphology template ${template}.`);
  const totalWeight = eligible.reduce((total, path) => total + path.planned.weight, 0);
  if (!Number.isFinite(totalWeight)) throw new Error("Category eligibility mass must be finite.");
  const selected = getWeightedOption(eligible.map(path => [path, path.planned.weight]), rand);
  const categories: CategoryPlanningTrace = { requestedTemplate: template, eligiblePaths: eligible.length,
    excludedProjections: paths.length - eligible.length, totalWeight,
    planned: structuredClone(selected.planned), retained: structuredClone(selected.retained) };
  return { plan: { ...selected.plan, categories }, syllableReduction: selected.syllableReduction };
}
