import type { LegacyOriginClaim, LexicalStylePolicy, StyleChoice, StyleWeightEvidence } from "./style-model.js";

interface SpellingCandidate { phoneme: string; form: string }
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function key(phoneme: string, form: string): string { return JSON.stringify([phoneme, form]); }
function sourceDate(value: unknown): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}
export function assessLegacyOrigin(code: number, labels: readonly string[]): LegacyOriginClaim {
  if (!Number.isSafeInteger(code)) throw new Error("Legacy origin code must be an integer.");
  return { code, label: code >= 0 && code < labels.length ? labels[code] : null, status: "unsourced-legacy" };
}
function validatePolicy(policy: LexicalStylePolicy): void {
  if (policy.version !== "soft-orthographic-style-v1" || !Number.isFinite(policy.strength) || policy.strength < 0 || policy.strength > 1 || !policy.styles.length) {
    throw new Error("Invalid soft orthographic style policy.");
  }
  const ids = new Set<string>();
  let priorMass = 0;
  for (const { style, prior } of policy.styles) {
    if (!nonempty(style.id) || !nonempty(style.label) || !nonempty(style.interpretation) || ids.has(style.id) || !Number.isFinite(prior) || prior <= 0) {
      throw new Error("Each style requires a unique interpreted ID and positive finite prior.");
    }
    ids.add(style.id); priorMass += prior;
  }
  if (!Number.isFinite(priorMass)) throw new Error("Style prior mass overflowed.");
  const sources = new Set<string>();
  for (const source of policy.sources) {
    if (!nonempty(source.id) || sources.has(source.id) || !nonempty(source.title) || !nonempty(source.url) || !/^https?:\/\//.test(source.url) ||
      !sourceDate(source.accessed_at) || !["lexeme-history", "orthographic-association"].includes(source.claim_scope)) {
      throw new Error("Invalid or duplicate style source reference.");
    }
    sources.add(source.id);
  }
  const features = new Set<string>();
  for (const feature of policy.features) {
    const identity = key(feature.phoneme, feature.form), associated = new Set<string>();
    if (!nonempty(feature.phoneme) || !nonempty(feature.form) || features.has(identity) || feature.strength_basis !== "experimental-heuristic" ||
      !feature.source_ids.length || feature.source_ids.some(id => !sources.has(id))) throw new Error("Invalid or unsupported style feature.");
    features.add(identity);
    for (const association of feature.associations) {
      if (!ids.has(association.style_id) || associated.has(association.style_id) || !Number.isFinite(association.multiplier) ||
        association.multiplier < .5 || association.multiplier > 2) throw new Error("Style associations require unique styles and bounded positive multipliers.");
      associated.add(association.style_id);
    }
    if (associated.size !== ids.size) throw new Error("Every feature must explicitly assess every configured style.");
  }
}
export function compileLexicalStyle(policy: LexicalStylePolicy | undefined, profileId: string) {
  if (!policy) return null;
  validatePolicy(policy);
  if (policy.strength === 0) return null;
  if (!nonempty(profileId)) throw new Error("A frozen style profile identifier is required.");
  const frozen = structuredClone(policy);
  const total = frozen.styles.reduce((sum, row) => sum + row.prior, 0);
  const priors = frozen.styles.map(row => ({ style_id: row.style.id, probability: row.prior / total }));
  if (priors.some(row => !Number.isFinite(row.probability) || row.probability <= 0)) throw new Error("Normalized style prior is not representable as positive mass.");
  const features = new Map(frozen.features.map(feature => [key(feature.phoneme, feature.form), feature]));
  function choiceForDraw(draw: number): StyleChoice {
    if (!Number.isFinite(draw) || draw < 0 || draw >= 1) throw new Error("Style RNG must return a finite draw in [0,1).");
    let cumulative = 0, selected = priors.at(-1)!.style_id;
    for (const row of priors) { cumulative += row.probability; if (draw < cumulative) { selected = row.style_id; break; } }
    return { profile_id: profileId, style_id: selected, draw, normalized_priors: structuredClone(priors) };
  }
  function choose(rand: () => number): StyleChoice { return choiceForDraw(rand()); }
  function apply<G extends SpellingCandidate>(weights: [G, number][], choice: StyleChoice): { weights: [G, number][]; evidence: StyleWeightEvidence[] } {
    const expected = choiceForDraw(choice.draw);
    if (choice.profile_id !== profileId || choice.style_id !== expected.style_id || !Array.isArray(choice.normalized_priors) ||
      choice.normalized_priors.length !== priors.length || choice.normalized_priors.some((row, index) =>
      row.style_id !== priors[index].style_id || row.probability !== priors[index].probability)) {
      throw new Error("Style choice or its draw evidence belongs to another profile.");
    }
    const evidence = weights.map(([grapheme, base_weight]) => {
      if (!Number.isFinite(base_weight) || base_weight <= 0) throw new Error("Style weighting accepts existing positive legal candidate weights only.");
      const feature = features.get(key(grapheme.phoneme, grapheme.form));
      const association = feature?.associations.find(row => row.style_id === choice.style_id);
      const multiplier = association ? 1 + frozen.strength * (association.multiplier - 1) : 1;
      const final_weight = base_weight * multiplier;
      if (!Number.isFinite(final_weight) || final_weight <= 0) throw new Error("Styled candidate weight is outside finite positive arithmetic.");
      return { phoneme: grapheme.phoneme, form: grapheme.form, base_weight, multiplier, final_weight,
        association_source_ids: feature ? [...feature.source_ids] : [] };
    });
    return { weights: weights.map<[G, number]>(([grapheme], index) => [grapheme, evidence[index].final_weight]), evidence };
  }
  return { choose, apply };
}
