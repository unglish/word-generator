import type { ComparisonDraw, ComparisonPlan, ComparisonRegistration, Condition, WrittenComparison } from "../comparison/comparison-model.js";
import type { AudioFacts, PronunciationPolicy, PronunciationTarget, TargetAssessment } from "../auditory/model.js";

export interface AcceptedAlternative {
  condition: Condition;
  sample_id: string;
  target: PronunciationTarget;
  rationale: string;
  evidence_sha256: string;
}
export interface ReadAloudRegistration extends Omit<ComparisonRegistration, "version" | "inference"> {
  version: "read-aloud-v1";
  pronunciation: PronunciationPolicy;
  alternatives: AcceptedAlternative[];
  recording: { sample_rate: number; maximum_seconds: number; instructions: string };
}
export interface ReadAloudDraw extends ComparisonDraw {
  intended: TargetAssessment;
  alternatives: PronunciationTarget[];
}
export interface ReadAloudComparison {
  registration: ReadAloudRegistration;
  partition: WrittenComparison;
  draws: ReadAloudDraw[];
  digest: string;
}
export interface ReadAloudPacket {
  session_id: string;
  instructions: string;
  items: { position: number; item_id: string; spelling: string }[];
}
export interface ReadingSyllable {
  phones: string[];
  stress: "primary" | "secondary" | "unmarked" | "unknown";
}
export type ReadingTranscription =
  | { status: "transcribed"; syllables: ReadingSyllable[] }
  | { status: "uncertain"; alternatives: ReadingSyllable[][]; reason: string }
  | { status: "untranscribable"; reason: string };
export interface BlindTranscription {
  version: "read-aloud-transcription-v1";
  reading_id: string;
  audio_sha256: string;
  person_key: string;
  blind_to_spelling_condition_and_target: true;
  independent_of_reader_and_other_coders: true;
  method: string;
  transcription: ReadingTranscription;
}
export interface ReadingIdentity {
  session_id: string;
  position: number;
  item_id: string;
  person_key: string;
  first_attempt: true;
}
export type ReadingOutcome =
  | { status: "recorded"; audio: AudioFacts }
  | { status: "skipped" | "recording-failed"; reason: string };
export interface Reading extends ReadingIdentity {
  version: "read-aloud-recording-v1";
  comparison_digest: string;
  outcome: ReadingOutcome;
  id: string;
}
export interface AdjudicationRecord {
  version: "read-aloud-adjudication-v1";
  reading_id: string;
  audio_sha256: string;
  coder_file_sha256: [string, string];
  person_key: string;
  blind_to_spelling_condition_and_target: true;
  independent_of_reader_and_coders: true;
  method: string;
  transcription: ReadingTranscription;
}
export interface FrozenAdjudication {
  roster_digest: string;
  reading_id: string;
  audio_sha256: string;
  coders: { record: BlindTranscription; file_sha256: string }[];
  decision: AdjudicationRecord;
  decision_file_sha256: string;
  digest: string;
}
export interface ReadAloudRoster {
  comparison_digest: string;
  verification_method: string;
  entries: { participant_slot: string; person_key: string; verification_sha256: string }[];
  digest: string;
}
export interface ReadAloudExport {
  version: "read-aloud-export-v1";
  comparison: ReadAloudComparison;
  plan: ComparisonPlan;
  roster: ReadAloudRoster;
  readings: Reading[];
  adjudications: FrozenAdjudication[];
}
