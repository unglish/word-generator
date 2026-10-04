import type { Answer } from "../../protocol.js";
import type { ComparisonPlan } from "../../comparison/comparison-model.js";
import type { AuditoryComparison, AuditoryExport, AuditoryRelease, AuditoryResponse } from "../model.js";

export interface AuditoryEnrollment {
  version: "auditory-enrollment-v1";
  comparison_digest: string;
  verification_method: string;
  entries: { participant_slot: string; person_key: string; verification_record_sha256: string }[];
  digest: string;
}
export interface AuditoryCollectorManifest {
  version: "auditory-collector-v1";
  comparison: AuditoryComparison;
  release: AuditoryRelease;
  plan: ComparisonPlan;
  roster: AuditoryEnrollment | null;
  created_at: string;
  participant_credentials: { participant_slot: string; token_sha256: string }[];
  owner_token_sha256: string;
  digest: string;
}
export interface AuditoryCredentials {
  version: "auditory-credentials-v1";
  manifest_digest: string;
  owner_token: string;
  participants: { participant_slot: string; token: string }[];
}
export interface AuditoryAnswerSubmission { session_id: string; position: number; answer: Answer }
export interface PlaybackEvidence {
  verified_audio_sha256: string;
  duration_seconds: number;
  played_ranges: [number, number][];
  ended: true;
}
export interface PlaybackSubmission {
  session_id: string;
  position: number;
  delivery_id: string;
  evidence: PlaybackEvidence;
}
export interface AudioDelivery {
  id: string;
  session_id: string;
  position: number;
  item_id: string;
  audio_sha256: string;
}
export interface PlaybackRecord extends PlaybackSubmission { item_id: string; audio_sha256: string }
export type AuditoryEventContent = {
  version: "auditory-event-v1";
  sequence: number;
  previous_sha256: string;
  participant_slot: string;
  received_at: string;
} & (
  | { kind: "audio-delivery"; delivery: AudioDelivery }
  | { kind: "playback-complete"; playback: PlaybackRecord }
  | { kind: "answer"; response: AuditoryResponse }
);
export type AuditoryEvent = AuditoryEventContent & { sha256: string };
export interface AuditoryCollectorState {
  manifest: AuditoryCollectorManifest;
  events: AuditoryEvent[];
  data: AuditoryExport;
}
