import { registration as auditoryRegistration, syntheticSnapshot, wav } from "../auditory/auditory.fixture.js";
import { bytesHash } from "../auditory/audio.js";
import { digest } from "../snapshot.js";
import { allocateReadAloud } from "./allocation.js";
import { freezeReadAloud } from "./freeze.js";
import { freezeReading, freezeReadAloudRoster } from "./readings.js";
import type { AdjudicationRecord, BlindTranscription, ReadAloudRegistration, ReadingTranscription } from "./model.js";

export function registration(): ReadAloudRegistration {
  const auditory = auditoryRegistration();
  return { version: "read-aloud-v1", study_id: "read-aloud-fixture", purpose: "development-fixture",
    candidate_selection: auditory.candidate_selection, population: auditory.population,
    assignment_seed: auditory.assignment_seed, pairs_per_stratum: auditory.pairs_per_stratum,
    session_length: auditory.session_length, participant_slots: auditory.participant_slots, strata: auditory.strata,
    pronunciation: auditory.pronunciation, alternatives: [],
    recording: { sample_rate: 8000, maximum_seconds: 2,
      instructions: "Read each spelling aloud once as an English word. If unsure, give your first reading or skip. No pronunciation hints are supplied." } };
}
export function fixture() {
  const comparison = freezeReadAloud(registration(), {
    baseline: syntheticSnapshot("baseline-fixture", ["a", "i", "p", "a"], ["one", "same", "base", "same"]),
    candidate: syntheticSnapshot("candidate-fixture", ["a", "i", "t"], ["third", "same", "cand"]),
  });
  const plan = allocateReadAloud(comparison);
  const roster = freezeReadAloudRoster(comparison, "SYNTHETIC identities only, no actual verification", comparison.registration.participant_slots.map(slot => ({
    participant_slot: slot, person_key: digest(["synthetic-reader", slot]), verification_sha256: digest(["synthetic-verification", slot]),
  })));
  const session = plan.sessions[0], person = roster.entries.find(entry => entry.participant_slot === session.participant_slot)!;
  const recording = wav();
  const reading = freezeReading(comparison, plan, roster, { session_id: session.id, position: 0, item_id: session.item_ids[0],
    person_key: person.person_key, first_attempt: true }, { status: "recorded", wav: recording });
  return { comparison, plan, roster, reading, recording };
}
export function observed(phone = "a", stress: "primary" | "unknown" = "primary"): ReadingTranscription {
  return { status: "transcribed", syllables: [{ phones: [phone], stress }] };
}
export function coderFile(reading: ReturnType<typeof fixture>["reading"], person: string, transcription = observed()): Buffer {
  if (reading.outcome.status !== "recorded") throw new Error("Synthetic coding fixture requires audio.");
  const record: BlindTranscription = { version: "read-aloud-transcription-v1", reading_id: reading.id, audio_sha256: reading.outcome.audio.sha256,
    person_key: digest(person), blind_to_spelling_condition_and_target: true, independent_of_reader_and_other_coders: true,
    method: "SYNTHETIC phone annotation, not speech or human evidence", transcription };
  return Buffer.from(JSON.stringify(record));
}
export function files(reading: ReturnType<typeof fixture>["reading"], transcription = observed()): { coders: [Buffer, Buffer]; decision: Buffer } {
  if (reading.outcome.status !== "recorded") throw new Error("Synthetic adjudication fixture requires audio.");
  const coders: [Buffer, Buffer] = [coderFile(reading, "coder-one"), coderFile(reading, "coder-two", observed("i"))];
  const decision: AdjudicationRecord = { version: "read-aloud-adjudication-v1", reading_id: reading.id, audio_sha256: reading.outcome.audio.sha256,
    coder_file_sha256: [bytesHash(coders[0]), bytesHash(coders[1])], person_key: digest("third-adjudicator"),
    blind_to_spelling_condition_and_target: true, independent_of_reader_and_coders: true,
    method: "SYNTHETIC independent decision, no actual adjudicator", transcription };
  return { coders, decision: Buffer.from(JSON.stringify(decision)) };
}
