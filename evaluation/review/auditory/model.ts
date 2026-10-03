import type { AuditoryInferenceProtocol } from "./inference-model.js";
import type { Snapshot } from "../model.js";
import type { Condition, ComparisonDraw, ComparisonPlan, WrittenStratum } from "../comparison/comparison-model.js";
import type { Answer } from "../protocol.js";

export interface TargetPhone {
  id: string;
  ipa: string;
  description: string;
}
export type PhoneMapping =
  | { source: string; status: "mapped"; phones: string[]; rationale: string }
  | { source: string; status: "ambiguous"; alternatives: string[][]; rationale: string };
export interface PronunciationPolicy {
  version: "auditory-pronunciation-v1";
  dialect: string;
  scope: string;
  phones: TargetPhone[];
  mappings: PhoneMapping[];
}
export interface TargetSyllable { phones: string[]; stress: "primary" | "secondary" | "unmarked" }
export interface PronunciationTarget {
  policy_digest: string;
  syllables: TargetSyllable[];
  digest: string;
}
export interface TargetIssue {
  kind: "unknown-phone" | "ambiguous-phone" | "missing-primary" | "multiple-primary" | "empty-nucleus" | "invalid-stress";
  syllable: number | null;
  source: string | null;
}
export type TargetAssessment =
  | { status: "resolved"; target: PronunciationTarget }
  | { status: "unresolved"; issues: TargetIssue[] };
export interface ProductionContract {
  method: "recorded-speech" | "speech-synthesis" | "development-fixture";
  voice: string;
  producer_person_key: string;
  settings_digest: string;
  sample_rate: number;
  maximum_seconds: number;
}
export interface AuditoryRegistration {
  version: "auditory-comparison-v1";
  study_id: string;
  purpose: "human-study" | "development-fixture";
  candidate_selection: string;
  population: string;
  assignment_seed: number;
  pairs_per_stratum: number;
  session_length: number;
  participant_slots: string[];
  strata: WrittenStratum[];
  pronunciation: PronunciationPolicy;
  production: ProductionContract;
  inference?: AuditoryInferenceProtocol;
}
export interface AuditoryDraw extends ComparisonDraw { assessment: TargetAssessment }
export interface AuditoryItem {
  id: string;
  condition: Condition;
  stratum: string;
  target: PronunciationTarget;
  draws: ComparisonDraw[];
}
export interface AuditoryComparison {
  registration: AuditoryRegistration;
  conditions: Record<Condition, Snapshot>;
  draws: AuditoryDraw[];
  items: AuditoryItem[];
  digest: string;
}
export interface AudioFacts {
  sha256: string;
  bytes: number;
  format: "pcm16-mono-wav";
  sample_rate: number;
  frames: number;
  seconds: number;
  peak_absolute_sample: number;
  clipped_samples: number;
}
export interface AudioVerification {
  person_key: string;
  audio_sha256: string;
  policy_digest: string;
  transcription_sha256: string;
  transcription: TargetSyllable[];
  independent_of_production: true;
  blind_to_condition_and_target: true;
  method: string;
}
export interface AudioAsset {
  target_digest: string;
  audio: AudioFacts;
  production: ProductionContract;
  production_record_sha256: string;
  verification: AudioVerification[];
}
export interface AuditoryRelease {
  comparison_digest: string;
  assets: AudioAsset[];
  digest: string;
}
export interface AuditoryPacket {
  session_id: string;
  rubric: typeof import("./protocol.js").AUDITORY_RUBRIC;
  items: { position: number; item_id: string; audio_sha256: string; mime_type: "audio/wav" }[];
}
export interface AuditoryResponse {
  id: string;
  session_id: string;
  position: number;
  item_id: string;
  audio_sha256: string;
  played_complete: boolean;
  answer: Answer;
}
export interface AuditoryExport {
  version: "auditory-export-v1";
  comparison: AuditoryComparison;
  release: AuditoryRelease;
  plan: ComparisonPlan;
  responses: AuditoryResponse[];
}
