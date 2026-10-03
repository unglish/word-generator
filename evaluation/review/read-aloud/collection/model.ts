import type { ComparisonPlan } from "../../comparison/comparison-model.js";
import type { AudioFacts } from "../../auditory/model.js";
import type { ReadAloudComparison, ReadAloudExport, ReadAloudRoster, Reading } from "../model.js";

export type CaptureSource = "microphone" | "synthetic-fixture";
export interface CaptureDeclaration {
  source: CaptureSource;
  context_sample_rate: number;
  device_sample_rate: number | null;
  device_channel_count: number | null;
  echo_cancellation: boolean | null;
  noise_suppression: boolean | null;
  auto_gain_control: boolean | null;
}
export interface ReadAloudCollectorManifest {
  version: "read-aloud-collector-v1";
  comparison: ReadAloudComparison;
  plan: ComparisonPlan;
  roster: ReadAloudRoster;
  capture_source: CaptureSource;
  created_at: string;
  participant_credentials: { participant_slot: string; token_sha256: string }[];
  owner_token_sha256: string;
  digest: string;
}
export interface ReadAloudCredentials {
  version: "read-aloud-credentials-v1";
  manifest_digest: string;
  owner_token: string;
  participants: { participant_slot: string; token: string }[];
}
export interface PresentationSubmission {
  session_id: string;
  position: number;
  request_id: string;
  capture: CaptureDeclaration;
}
export interface Presentation extends PresentationSubmission {
  attempt_id: string;
  item_id: string;
}
export interface FailureSubmission {
  attempt_id: string;
  status: "skipped" | "recording-failed";
  reason: string;
}
export type ReadAloudEventContent = {
  version: "read-aloud-event-v1";
  sequence: number;
  previous_sha256: string;
  participant_slot: string;
  received_at: string;
} & (
  | { kind: "presentation"; presentation: Presentation }
  | { kind: "recording-intent"; attempt_id: string; audio: AudioFacts }
  | { kind: "reading"; attempt_id: string; reading: Reading }
);
export type ReadAloudEvent = ReadAloudEventContent & { sha256: string };
export interface ReadAloudCollectorState {
  manifest: ReadAloudCollectorManifest;
  events: ReadAloudEvent[];
  data: ReadAloudExport;
}
