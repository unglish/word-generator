import { bytesHash } from "../auditory/audio.js";
import { hash, nonempty, validatePronunciationPolicy } from "../auditory/targets.js";
import type { PronunciationPolicy } from "../auditory/model.js";
import { digest } from "../snapshot.js";
import { validateReadAloudRoster } from "./readings.js";
import type { AdjudicationRecord, BlindTranscription, FrozenAdjudication, ReadAloudComparison, ReadAloudRoster, Reading, ReadingSyllable, ReadingTranscription } from "./model.js";

export function validateReadingTranscription(policy: PronunciationPolicy, transcription: ReadingTranscription): void {
  validatePronunciationPolicy(policy);
  const phones = new Set(policy.phones.map(phone => phone.id));
  function validSyllables(syllables: ReadingSyllable[]): boolean {
    return Array.isArray(syllables) && syllables.length > 0 && syllables.every(syllable =>
      Array.isArray(syllable.phones) && syllable.phones.length > 0 && syllable.phones.every(phone => phones.has(phone)) &&
      ["primary", "secondary", "unmarked", "unknown"].includes(syllable.stress));
  }
  if (transcription.status === "transcribed" && validSyllables(transcription.syllables)) return;
  if (transcription.status === "untranscribable" && nonempty(transcription.reason)) return;
  if (transcription.status === "uncertain" && nonempty(transcription.reason) && Array.isArray(transcription.alternatives) &&
      transcription.alternatives.length > 0 && transcription.alternatives.every(validSyllables) &&
      new Set(transcription.alternatives.map(value => digest(value))).size === transcription.alternatives.length) return;
  throw new Error("Invalid observed phone/stress transcription; uncertainty cannot be replaced by a target.");
}

function parseFile<T>(bytes: Uint8Array): T {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as T;
}

export function freezeAdjudication(comparison: ReadAloudComparison, reading: Reading, roster: ReadAloudRoster,
  coderFiles: [Uint8Array, Uint8Array], decisionFile: Uint8Array): FrozenAdjudication {
  if (!Array.isArray(coderFiles) || coderFiles.length !== 2) throw new Error("Exactly two original independent coder files are required.");
  validateReadAloudRoster(comparison, roster);
  const policy = comparison.registration.pronunciation, readerPersonKeys = roster.entries.map(entry => entry.person_key);
  const { id, ...content } = reading;
  if (reading.comparison_digest !== comparison.digest || id !== digest(content) || reading.outcome.status !== "recorded" || !readerPersonKeys.includes(reading.person_key) ||
      readerPersonKeys.some(key => !hash(key))) throw new Error("Adjudication requires a recorded reading and reader identity inventory.");
  const audioHash = reading.outcome.audio.sha256, people = new Set(readerPersonKeys);
  const coders = coderFiles.map(bytes => ({ record: parseFile<BlindTranscription>(bytes), file_sha256: bytesHash(bytes) }));
  for (const { record } of coders) {
    if (record.version !== "read-aloud-transcription-v1" || record.reading_id !== reading.id || record.audio_sha256 !== audioHash ||
        !hash(record.person_key) || people.has(record.person_key) || record.blind_to_spelling_condition_and_target !== true ||
        record.independent_of_reader_and_other_coders !== true || !nonempty(record.method)) {
      throw new Error("Two distinct blind independent coders outside the reader cohort are required.");
    }
    people.add(record.person_key);
    validateReadingTranscription(policy, record.transcription);
  }
  const decision = parseFile<AdjudicationRecord>(decisionFile);
  if (decision.version !== "read-aloud-adjudication-v1" || decision.reading_id !== reading.id || decision.audio_sha256 !== audioHash ||
      digest(decision.coder_file_sha256) !== digest(coders.map(coder => coder.file_sha256)) || !hash(decision.person_key) ||
      people.has(decision.person_key) || decision.blind_to_spelling_condition_and_target !== true ||
      decision.independent_of_reader_and_coders !== true || !nonempty(decision.method)) {
    throw new Error("A third independent blind adjudicator must bind the exact original coder files.");
  }
  validateReadingTranscription(policy, decision.transcription);
  const frozen = { roster_digest: roster.digest, reading_id: reading.id, audio_sha256: audioHash, coders, decision, decision_file_sha256: bytesHash(decisionFile) };
  return structuredClone({ ...frozen, digest: digest(frozen) });
}

export function verifyAdjudication(comparison: ReadAloudComparison, reading: Reading, roster: ReadAloudRoster,
  frozen: FrozenAdjudication, coderFiles: [Uint8Array, Uint8Array], decisionFile: Uint8Array): void {
  if (digest(frozen) !== digest(freezeAdjudication(comparison, reading, roster, coderFiles, decisionFile))) {
    throw new Error("Frozen adjudication or original transcription bytes changed.");
  }
}
