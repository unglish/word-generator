import { freezeComparison } from "../comparison/comparison-freeze.js";
import type { ComparisonRegistration, Condition } from "../comparison/comparison-model.js";
import type { Snapshot } from "../model.js";
import { digest } from "../snapshot.js";
import { assessTarget, hash, makeTarget, nonempty, validatePronunciationPolicy } from "../auditory/targets.js";
import { validateProduction } from "../auditory/freeze.js";
import type { ProductionContract } from "../auditory/model.js";
import type { ReadAloudComparison, ReadAloudDraw, ReadAloudRegistration } from "./model.js";

export function recordingContract(registration: ReadAloudRegistration, personKey: string): ProductionContract {
  return { method: "recorded-speech", voice: "Participant first-attempt read aloud",
    producer_person_key: personKey, settings_digest: digest(registration.recording),
    sample_rate: registration.recording.sample_rate, maximum_seconds: registration.recording.maximum_seconds };
}

export function freezeReadAloud(registration: ReadAloudRegistration, conditions: Record<Condition, Snapshot>): ReadAloudComparison {
  if (registration.version !== "read-aloud-v1" || !nonempty(registration.recording.instructions) || !Array.isArray(registration.alternatives)) {
    throw new Error("Invalid read-aloud registration.");
  }
  validatePronunciationPolicy(registration.pronunciation);
  validateProduction(recordingContract(registration, digest("registration-validation")));
  const partitionRegistration: ComparisonRegistration = {
    version: "written-comparison-v1", study_id: registration.study_id, purpose: registration.purpose,
    candidate_selection: registration.candidate_selection, population: registration.population,
    assignment_seed: registration.assignment_seed, pairs_per_stratum: registration.pairs_per_stratum,
    session_length: registration.session_length, participant_slots: registration.participant_slots, strata: registration.strata,
  };
  const partition = freezeComparison(partitionRegistration, conditions);
  const samples = new Map((["baseline", "candidate"] as const).flatMap(condition =>
    conditions[condition].samples.map(sample => [`${condition}/${sample.id}`, sample] as const)));
  const draws: ReadAloudDraw[] = partition.items.flatMap(item => item.draws.map(draw => {
    const sample = samples.get(`${draw.condition}/${draw.sample_id}`)!;
    return { ...draw, intended: assessTarget(sample.word, registration.pronunciation), alternatives: [] };
  }));
  const bySource = new Map(draws.map(draw => [`${draw.condition}/${draw.sample_id}`, draw]));
  for (const alternative of registration.alternatives) {
    const draw = bySource.get(`${alternative.condition}/${alternative.sample_id}`);
    if (!draw || draw.intended.status !== "resolved" || !nonempty(alternative.rationale) || !hash(alternative.evidence_sha256) ||
        digest(makeTarget(registration.pronunciation, alternative.target.syllables)) !== digest(alternative.target)) {
      throw new Error("Accepted alternative requires an authenticated resolved source, declared dialect phones, rationale and evidence hash.");
    }
    if ([draw.intended.target, ...draw.alternatives].some(target => target.digest === alternative.target.digest)) {
      throw new Error("Duplicate intended or accepted pronunciation alternative.");
    }
    draw.alternatives.push(alternative.target);
  }
  const content = { registration, partition, draws };
  return structuredClone({ ...content, digest: digest(content) });
}

export function validateReadAloud(comparison: ReadAloudComparison): void {
  if (digest(comparison) !== digest(freezeReadAloud(comparison.registration, comparison.partition.conditions))) {
    throw new Error("Read-aloud registration, source draws, alternatives or targets changed.");
  }
}
