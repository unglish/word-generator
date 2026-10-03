import { digest } from "../snapshot.js";
import { hash, nonempty } from "./targets.js";
import { validateAuditory } from "./freeze.js";
import type { AuditoryComparison } from "./model.js";
import type { AuditoryInferenceProtocol, AuditoryRoster } from "./inference-model.js";

export function validateAuditoryInference(protocol: AuditoryInferenceProtocol): void {
  if (!protocol || protocol.version !== "auditory-crossed-stability-v1" || protocol.metric !== "share-4-5" ||
      !["all-ratings", "unfamiliar-only"].includes(protocol.primary_cohort) ||
      !Number.isSafeInteger(protocol.seed) || protocol.seed < 0 || protocol.seed > 0xffffffff ||
      !Number.isSafeInteger(protocol.replicates) || protocol.replicates < 2 ||
      !Number.isFinite(protocol.confidence) || protocol.confidence <= 0 || protocol.confidence >= 1 ||
      !Number.isSafeInteger(protocol.minimum_rated_listeners_per_condition) || protocol.minimum_rated_listeners_per_condition < 2 ||
      !Number.isSafeInteger(protocol.minimum_rated_targets_per_condition) || protocol.minimum_rated_targets_per_condition < 2 ||
      !Number.isFinite(protocol.minimum_draw_coverage) || protocol.minimum_draw_coverage <= 0 || protocol.minimum_draw_coverage > 1 ||
      !nonempty(protocol.listener_sampling_assumption) || !nonempty(protocol.target_sampling_assumption) ||
      !nonempty(protocol.missingness_assumption) || !nonempty(protocol.production_scope)) {
    throw new Error("Invalid prospective auditory stability protocol.");
  }
}

export function freezeAuditoryRoster(comparison: AuditoryComparison, verificationMethod: string,
  entries: AuditoryRoster["entries"]): AuditoryRoster {
  validateAuditory(comparison);
  const slots = comparison.registration.participant_slots;
  if (!nonempty(verificationMethod) || entries.length !== slots.length ||
      new Set(entries.map(entry => entry.participant_slot)).size !== slots.length ||
      new Set(entries.map(entry => entry.person_key)).size !== slots.length ||
      new Set(entries.map(entry => entry.verification_sha256)).size !== slots.length ||
      entries.some(entry => !slots.includes(entry.participant_slot) || !hash(entry.person_key) || !hash(entry.verification_sha256))) {
    throw new Error("Auditory roster requires every registered slot and distinct owner-attested person records.");
  }
  const content = { comparison_digest: comparison.digest, verification_method: verificationMethod, entries };
  return structuredClone({ ...content, digest: digest(content) });
}

export function validateAuditoryRoster(comparison: AuditoryComparison, roster: AuditoryRoster): void {
  if (digest(roster) !== digest(freezeAuditoryRoster(comparison, roster.verification_method, roster.entries))) {
    throw new Error("Auditory enrollment roster changed.");
  }
}
