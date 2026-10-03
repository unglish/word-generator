/** Lexical categories are explicit model assignments, not inferred meanings. */
export interface StemCategory { id: string; weight: number }
export interface CategoryTransition { input: string; output: string }
export interface AffixSense {
  id: string;
  affix: { type: "prefix" | "suffix"; index: number };
  /** Relative share of this configured affix's frequency, across its senses. */
  weight: number;
  transitions: CategoryTransition[];
}
export interface MorphologyCategories {
  stems: StemCategory[];
  senses: AffixSense[];
  /** Morphological construction order, independent of written affix order. */
  order: "prefix-then-suffix" | "suffix-then-prefix";
}
export interface CategoryStep { sense: string; input: string; output: string }
export interface CategoryPath {
  stem: string;
  final: string;
  prefixSense?: string;
  suffixSense?: string;
  steps: CategoryStep[];
  weight: number;
}

export function validateCategoryModel(model: MorphologyCategories, affixCounts: { prefix: number; suffix: number }): void {
  if (!["prefix-then-suffix", "suffix-then-prefix"].includes(model.order)) throw new Error("Unknown category construction order.");
  for (const count of Object.values(affixCounts)) {
    if (!Number.isInteger(count) || count < 0) throw new Error("Affix inventory sizes must be nonnegative integers.");
  }
  const categories = new Set<string>();
  for (const stem of model.stems) {
    if (!stem.id || categories.has(stem.id) || !(Number.isFinite(stem.weight) && stem.weight > 0)) {
      throw new Error("Stem categories require unique names and positive finite weights.");
    }
    categories.add(stem.id);
  }
  if (!categories.size) throw new Error("Stem categories are required.");
  const senses = new Set<string>();
  const covered = new Set<string>();
  for (const sense of model.senses) {
    if (!sense.id || senses.has(sense.id) || !(Number.isFinite(sense.weight) && sense.weight > 0)) {
      throw new Error("Affix senses require unique names and positive finite weights.");
    }
    senses.add(sense.id);
    const { type, index } = sense.affix;
    if (!(type === "prefix" || type === "suffix") || !Number.isInteger(index) || index < 0 || index >= affixCounts[type]) {
      throw new Error("Affix sense must reference an existing configured affix.");
    }
    covered.add(`${type}/${index}`);
    const inputs = new Set<string>();
    for (const transition of sense.transitions) {
      if (!categories.has(transition.input) || !categories.has(transition.output) || inputs.has(transition.input)) {
        throw new Error("Each affix sense needs one unambiguous output per declared input category.");
      }
      inputs.add(transition.input);
    }
    if (!inputs.size) throw new Error("Affix sense must have a category transition.");
  }
  for (const type of ["prefix", "suffix"] as const) {
    for (let index = 0; index < affixCounts[type]; index++) {
      if (!covered.has(`${type}/${index}`)) throw new Error("Every configured affix needs an explicit sense contract.");
    }
  }
}

function constructionRoles(template: "bare" | "prefixed" | "suffixed" | "both", order: MorphologyCategories["order"]): Array<"prefix" | "suffix"> {
  switch (template) {
    case "bare": return [];
    case "prefixed": return ["prefix"];
    case "suffixed": return ["suffix"];
    case "both": return order === "prefix-then-suffix" ? ["prefix", "suffix"] : ["suffix", "prefix"];
    default: throw new Error("Unknown morphology template.");
  }
}

/** Enumerate licensed paths; no sampling, retries, spelling heuristics or implicit fallback. */
export function categoryPaths(model: MorphologyCategories, template: "bare" | "prefixed" | "suffixed" | "both", affixWeights: { prefix: number[]; suffix: number[] }): CategoryPath[] {
  validateCategoryModel(model, { prefix: affixWeights.prefix.length, suffix: affixWeights.suffix.length });
  for (const weight of [...affixWeights.prefix, ...affixWeights.suffix]) {
    if (!Number.isFinite(weight) || weight < 0) throw new Error("Configured affix frequencies must be finite and nonnegative.");
  }
  const shares = new Map<string, number>();
  for (const sense of model.senses) {
    const key = `${sense.affix.type}/${sense.affix.index}`;
    shares.set(key, (shares.get(key) ?? 0) + sense.weight);
  }
  if ([...shares.values()].some(total => !Number.isFinite(total))) throw new Error("Sense weight totals must be finite.");
  const roles = constructionRoles(template, model.order);
  let paths: CategoryPath[] = model.stems.map(stem => ({ stem: stem.id, final: stem.id, steps: [], weight: stem.weight }));
  for (const role of roles) {
    const next: CategoryPath[] = [];
    const eligibleSenses = model.senses.filter(sense => sense.affix.type === role);
    for (const path of paths) {
      for (const sense of eligibleSenses) {
        const transition = sense.transitions.find(transition => transition.input === path.final);
        if (!transition) continue;
        const frequency = affixWeights[role][sense.affix.index];
        if (frequency === 0) continue;
        const share = sense.weight / shares.get(`${role}/${sense.affix.index}`)!;
        const weight = path.weight * frequency * share;
        if (!(Number.isFinite(weight) && weight > 0)) throw new Error("Category path weight cannot be represented as positive finite mass.");
        next.push({ ...path, final: transition.output, [role === "prefix" ? "prefixSense" : "suffixSense"]: sense.id,
          steps: [...path.steps, { sense: sense.id, ...transition }], weight });
      }
    }
    paths = next;
  }
  return paths;
}
