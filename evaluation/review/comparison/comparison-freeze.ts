import { RUBRIC } from "../protocol.js";
import { digest, validateSnapshot } from "../snapshot.js";
import type { Sample, Snapshot } from "../model.js";
import type { ComparisonItem, ComparisonRegistration, Condition, MorphologyStratum, WrittenComparison, WrittenStratum } from "./comparison-model.js";

export const CONDITIONS: Condition[] = ["baseline", "candidate"];
const MORPHOLOGY: MorphologyStratum[] = ["bare", "prefixed", "suffixed", "prefixed-and-suffixed", "applied-unspecified"];

function validRange(range: number[]): boolean {
  return Array.isArray(range) && range.length === 2 && range.every(Number.isSafeInteger) && range[0] >= 1 && range[1] >= range[0];
}
function uniqueIds(ids: string[]): boolean {
  return ids.every(id => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) && new Set(ids).size === ids.length;
}
function validateRegistration(registration: ComparisonRegistration): void {
  if (registration.version !== "written-comparison-v1" || !uniqueIds([registration.study_id]) ||
      !["human-study", "development-fixture"].includes(registration.purpose) ||
      typeof registration.candidate_selection !== "string" || !registration.candidate_selection.trim() ||
      typeof registration.population !== "string" || !registration.population.trim() ||
      !Number.isSafeInteger(registration.assignment_seed) || registration.assignment_seed < 0 || registration.assignment_seed > 0xffffffff ||
      !Number.isSafeInteger(registration.pairs_per_stratum) || registration.pairs_per_stratum < 1 ||
      !Number.isSafeInteger(registration.session_length) || registration.session_length < 2 || registration.session_length > 20 || registration.session_length % 2 ||
      !Array.isArray(registration.participant_slots) || registration.participant_slots.length < 2 || registration.participant_slots.length % 2 ||
      !uniqueIds(registration.participant_slots) || !Array.isArray(registration.strata) || !registration.strata.length ||
      !uniqueIds(registration.strata.map(stratum => stratum.id))) throw new Error("Invalid written comparison registration.");
  for (const stratum of registration.strata) {
    if (!validRange(stratum.lengths) || !validRange(stratum.syllables) || !Array.isArray(stratum.morphology) ||
        !stratum.morphology.length || new Set(stratum.morphology).size !== stratum.morphology.length ||
        !stratum.morphology.every(value => MORPHOLOGY.includes(value))) throw new Error(`Invalid stratum ${stratum.id}.`);
  }
}
function morphology(sample: Sample): MorphologyStratum {
  const trace = sample.word.trace!;
  if (!trace.summary.morphologyApplied) return "bare";
  const { prefix, suffix } = trace.morphology ?? {};
  if (prefix && suffix) return "prefixed-and-suffixed";
  if (prefix) return "prefixed";
  if (suffix) return "suffixed";
  return "applied-unspecified";
}
function matches(sample: Sample, stratum: WrittenStratum): boolean {
  const length = sample.spelling.length, syllables = sample.word.syllables.length;
  return length >= stratum.lengths[0] && length <= stratum.lengths[1] &&
    syllables >= stratum.syllables[0] && syllables <= stratum.syllables[1] && stratum.morphology.includes(morphology(sample));
}
function validateCondition(snapshot: Snapshot, purpose: ComparisonRegistration["purpose"]): void {
  validateSnapshot(snapshot);
  if (digest(snapshot.manifest.rubric) !== digest(RUBRIC)) throw new Error("Comparison requires the unchanged written-v2 rubric.");
  if (purpose === "human-study" && (snapshot.manifest.generator.dirty || !/^[a-f0-9]{40}$/.test(snapshot.manifest.generator.commit) ||
      !snapshot.manifest.generator.source_files.some(file => file.path === "src/core/generate.ts"))) {
    throw new Error("Human-study conditions require committed generator sources.");
  }
}

export function freezeComparison(registration: ComparisonRegistration, conditions: Record<Condition, Snapshot>): WrittenComparison {
  validateRegistration(registration);
  if (Object.keys(conditions).sort().join(",") !== "baseline,candidate") throw new Error("Exactly two registered conditions are required.");
  const seedDigest = digest({ registration, conditions });
  const items = new Map<string, ComparisonItem>();
  for (const condition of CONDITIONS) {
    validateCondition(conditions[condition], registration.purpose);
    for (const sample of conditions[condition].samples) {
      const strata = registration.strata.filter(stratum => matches(sample, stratum));
      if (strata.length !== 1) throw new Error(`Draw ${condition}/${sample.draw_index} must belong to exactly one declared stratum; no filtering is allowed.`);
      const stratum = strata[0].id, key = digest([condition, stratum, sample.spelling]);
      if (!items.has(key)) items.set(key, { id: digest([seedDigest, key]), condition, stratum, spelling: sample.spelling, draws: [] });
      items.get(key)!.draws.push({ condition, stratum, sample_id: sample.id, draw_index: sample.draw_index });
    }
  }
  const content = { registration, conditions, items: [...items.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) };
  return structuredClone({ ...content, digest: digest(content) });
}
export function validateComparison(comparison: WrittenComparison): void {
  const expected = freezeComparison(comparison.registration, comparison.conditions);
  if (digest(comparison) !== digest(expected)) throw new Error("Comparison content or digest changed.");
}
