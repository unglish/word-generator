import { validateAuditoryInference } from "./inference-protocol.js";
import { freezeComparison } from "../comparison/comparison-freeze.js";
import type { ComparisonRegistration, Condition } from "../comparison/comparison-model.js";
import type { Snapshot } from "../model.js";
import { digest } from "../snapshot.js";
import { assessTarget, hash, nonempty, validId, validatePronunciationPolicy } from "./targets.js";
import type { AuditoryComparison, AuditoryDraw, AuditoryItem, AuditoryRegistration, ProductionContract } from "./model.js";

export function validateProduction(contract: ProductionContract): void {
  if (!["recorded-speech", "speech-synthesis", "development-fixture"].includes(contract.method) ||
      !nonempty(contract.voice) || !hash(contract.producer_person_key) || !hash(contract.settings_digest) ||
      !Number.isSafeInteger(contract.sample_rate) || contract.sample_rate < 8000 || contract.sample_rate > 192000 ||
      !Number.isFinite(contract.maximum_seconds) || contract.maximum_seconds <= 0 || contract.maximum_seconds > 120) {
    throw new Error("Invalid registered audio production contract.");
  }
}

export function freezeAuditory(registration: AuditoryRegistration, conditions: Record<Condition, Snapshot>): AuditoryComparison {
  if (registration.version !== "auditory-comparison-v1" || !validId(registration.study_id)) throw new Error("Invalid auditory study registration.");
  if (registration.inference !== undefined) validateAuditoryInference(registration.inference);
  validatePronunciationPolicy(registration.pronunciation);
  validateProduction(registration.production);
  if (registration.purpose === "human-study" && registration.production.method === "development-fixture") {
    throw new Error("Development audio cannot register a human study.");
  }
  // Written infrastructure authenticates the source snapshots and exhaustive strata.
  // Its spelling groups and rubric are not used for auditory identity or presentation.
  const partitionRegistration: ComparisonRegistration = {
    version: "written-comparison-v1", study_id: registration.study_id, purpose: registration.purpose,
    candidate_selection: registration.candidate_selection, population: registration.population,
    assignment_seed: registration.assignment_seed, pairs_per_stratum: registration.pairs_per_stratum,
    session_length: registration.session_length, participant_slots: registration.participant_slots, strata: registration.strata,
  };
  const partition = freezeComparison(partitionRegistration, conditions);
  const drawStrata = new Map(partition.items.flatMap(item => item.draws.map(draw => [`${draw.condition}/${draw.sample_id}`, draw.stratum] as const)));
  const seedDigest = digest({ registration, conditions }), draws: AuditoryDraw[] = [], items = new Map<string, AuditoryItem>();
  for (const condition of ["baseline", "candidate"] as const) {
    for (const sample of conditions[condition].samples) {
      const stratum = drawStrata.get(`${condition}/${sample.id}`)!;
      const draw = { condition, stratum, sample_id: sample.id, draw_index: sample.draw_index };
      const assessment = assessTarget(sample.word, registration.pronunciation);
      draws.push({ ...draw, assessment });
      if (assessment.status === "unresolved") continue;
      const key = digest([condition, stratum, assessment.target.digest]);
      if (!items.has(key)) items.set(key, { id: digest([seedDigest, key]), condition, stratum, target: assessment.target, draws: [] });
      items.get(key)!.draws.push(draw);
    }
  }
  const content = { registration, conditions, draws, items: [...items.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) };
  return structuredClone({ ...content, digest: digest(content) });
}

export function validateAuditory(comparison: AuditoryComparison): void {
  if (digest(comparison) !== digest(freezeAuditory(comparison.registration, comparison.conditions))) {
    throw new Error("Auditory source, draw inventory or target content changed.");
  }
}
