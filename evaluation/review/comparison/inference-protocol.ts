import { digest } from "../snapshot.js";
import type { WrittenComparison } from "./comparison-model.js";
import type { EnrollmentRoster, WrittenInferenceProtocol } from "./inference-model.js";

function nonempty(value: string): boolean { return typeof value === "string" && value.trim().length > 0; }
export function validateInferenceProtocol(protocol: WrittenInferenceProtocol): void {
  if (protocol.version !== "written-crossed-bootstrap-v2" || protocol.metric !== "share-4-5" ||
      !["all-ratings", "unfamiliar-only"].includes(protocol.cohort) || !Number.isSafeInteger(protocol.seed) ||
      protocol.seed < 0 || protocol.seed > 0xffffffff || !Number.isSafeInteger(protocol.replicates) || protocol.replicates < 2 ||
      !Number.isFinite(protocol.confidence) || protocol.confidence <= 0 || protocol.confidence >= 1 ||
      !Number.isSafeInteger(protocol.minimum_rated_participants) || protocol.minimum_rated_participants < 2 ||
      !Number.isSafeInteger(protocol.minimum_spellings_per_condition) || protocol.minimum_spellings_per_condition < 2 ||
      !Number.isFinite(protocol.minimum_draw_coverage) || protocol.minimum_draw_coverage <= 0 || protocol.minimum_draw_coverage > 1 ||
      !nonempty(protocol.participant_sampling_assumption) || !nonempty(protocol.spelling_sampling_assumption) ||
      !nonempty(protocol.missingness_assumption)) throw new Error("Invalid preregistered written inference protocol.");
}
export function validateEnrollment(comparison: WrittenComparison, roster: EnrollmentRoster): void {
  if (roster.version !== "written-enrollment-v1" || roster.comparison_digest !== comparison.digest ||
      !nonempty(roster.verification_method) || !Array.isArray(roster.entries)) throw new Error("Invalid enrollment roster.");
  const slots = new Set<string>(), people = new Set<string>(), records = new Set<string>();
  for (const entry of roster.entries) {
    if (!comparison.registration.participant_slots.includes(entry.participant_slot) ||
        typeof entry.person_key !== "string" || typeof entry.verification_record_sha256 !== "string" ||
        !/^[a-z0-9][a-z0-9-]{0,79}$/.test(entry.person_key) || !/^[a-f0-9]{64}$/.test(entry.verification_record_sha256) ||
        slots.has(entry.participant_slot) || people.has(entry.person_key) || records.has(entry.verification_record_sha256)) {
      throw new Error("Enrollment must bind each planned slot to one unique owner-attested person and verification record.");
    }
    slots.add(entry.participant_slot); people.add(entry.person_key); records.add(entry.verification_record_sha256);
  }
  if (slots.size !== comparison.registration.participant_slots.length) throw new Error("Enrollment roster must cover every registered participant slot.");
  const { digest: supplied, ...content } = roster;
  if (supplied !== digest(content)) throw new Error("Enrollment roster changed.");
}
