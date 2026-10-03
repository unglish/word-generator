import type { Answer } from "../../protocol.js";
import type { ComparisonExport, ComparisonPlan, ComparisonResponse, WrittenComparison } from "../comparison-model.js";
import type { EnrollmentRoster } from "../inference-model.js";

export interface CollectorManifest {
  version: "written-collector-v1";
  comparison: WrittenComparison;
  plan: ComparisonPlan;
  roster: EnrollmentRoster | null;
  created_at: string;
  participant_credentials: { participant_slot: string; token_sha256: string }[];
  owner_token_sha256: string;
  digest: string;
}
export interface CollectorCredentials {
  version: "written-collector-credentials-v1";
  manifest_digest: string;
  owner_token: string;
  participants: { participant_slot: string; token: string }[];
}
export interface CollectorSubmission { session_id: string; position: number; answer: Answer }
export interface CollectorEvent {
  version: "written-response-event-v1";
  sequence: number;
  previous_sha256: string;
  participant_slot: string;
  received_at: string;
  response: ComparisonResponse;
  sha256: string;
}
export interface CollectorState { manifest: CollectorManifest; events: CollectorEvent[]; data: ComparisonExport }
