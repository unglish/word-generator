import { inspectWav } from "../auditory/audio.js";
import { hash, nonempty } from "../auditory/targets.js";
import type { ComparisonPlan } from "../comparison/comparison-model.js";
import { digest } from "../snapshot.js";
import { validateReadAloudPlan } from "./allocation.js";
import { recordingContract, validateReadAloud } from "./freeze.js";
import type { ReadAloudComparison, ReadAloudRoster, Reading, ReadingIdentity, ReadingOutcome } from "./model.js";

export function freezeReadAloudRoster(comparison: ReadAloudComparison, verificationMethod: string,
  entries: ReadAloudRoster["entries"]): ReadAloudRoster {
  validateReadAloud(comparison);
  const expected = comparison.registration.participant_slots;
  if (!nonempty(verificationMethod) || entries.length !== expected.length ||
      new Set(entries.map(entry => entry.participant_slot)).size !== expected.length ||
      new Set(entries.map(entry => entry.person_key)).size !== expected.length ||
      new Set(entries.map(entry => entry.verification_sha256)).size !== expected.length ||
      entries.some(entry => !expected.includes(entry.participant_slot) || !hash(entry.person_key) || !hash(entry.verification_sha256))) {
    throw new Error("Read-aloud roster requires all registered slots and distinct verified person records.");
  }
  const content = { comparison_digest: comparison.digest, verification_method: verificationMethod, entries };
  return structuredClone({ ...content, digest: digest(content) });
}

export function validateReadAloudRoster(comparison: ReadAloudComparison, roster: ReadAloudRoster): void {
  if (digest(roster) !== digest(freezeReadAloudRoster(comparison, roster.verification_method, roster.entries))) {
    throw new Error("Read-aloud roster changed.");
  }
}

export function freezeReading(comparison: ReadAloudComparison, plan: ComparisonPlan, roster: ReadAloudRoster,
  identity: ReadingIdentity, input: { status: "recorded"; wav: Uint8Array } | { status: "skipped" | "recording-failed"; reason: string }): Reading {
  validateReadAloudPlan(comparison, plan);
  validateReadAloudRoster(comparison, roster);
  const session = plan.sessions.find(value => value.id === identity.session_id);
  const person = roster.entries.find(value => value.participant_slot === session?.participant_slot);
  if (!session || !person || person.person_key !== identity.person_key || identity.first_attempt !== true ||
      !Number.isSafeInteger(identity.position) || identity.position < 0 || session.item_ids[identity.position] !== identity.item_id) {
    throw new Error("Reading must bind the assigned first attempt and verified reader.");
  }
  let outcome: ReadingOutcome;
  if (input.status === "recorded") outcome = { status: "recorded", audio: inspectWav(input.wav, recordingContract(comparison.registration, identity.person_key)) };
  else if (["skipped", "recording-failed"].includes(input.status) && nonempty(input.reason)) outcome = { status: input.status, reason: input.reason };
  else throw new Error("Reading requires recorded bytes or an explicit skip/failure reason.");
  const content = { version: "read-aloud-recording-v1" as const, comparison_digest: comparison.digest,
    session_id: identity.session_id, position: identity.position, item_id: identity.item_id,
    person_key: identity.person_key, first_attempt: true as const, outcome };
  return { ...content, id: digest(content) };
}

export function verifyReading(comparison: ReadAloudComparison, plan: ComparisonPlan, roster: ReadAloudRoster,
  reading: Reading, wav?: Uint8Array): void {
  if (reading.outcome.status === "recorded" && !wav) throw new Error("Actual recording bytes are required for verification.");
  const input = reading.outcome.status === "recorded" ? { status: "recorded" as const, wav: wav! } : reading.outcome;
  if (digest(reading) !== digest(freezeReading(comparison, plan, roster, reading, input))) throw new Error("Reading, recording bytes or assignment changed.");
}

export function blindCoderPacket(comparison: ReadAloudComparison, plan: ComparisonPlan, roster: ReadAloudRoster, reading: Reading, wav: Uint8Array): {
  reading_id: string; audio_sha256: string; dialect: string; phones: ReadAloudComparison["registration"]["pronunciation"]["phones"];
} {
  if (reading.outcome.status !== "recorded") throw new Error("Blind coding requires an authenticated recorded reading.");
  verifyReading(comparison, plan, roster, reading, wav);
  return { reading_id: reading.id, audio_sha256: reading.outcome.audio.sha256,
    dialect: comparison.registration.pronunciation.dialect, phones: structuredClone(comparison.registration.pronunciation.phones) };
}
