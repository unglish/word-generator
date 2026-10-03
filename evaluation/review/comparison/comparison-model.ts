import type { Snapshot } from "../model.js";
import type { Assignment, Answer } from "../protocol.js";

export type Condition = "baseline" | "candidate";
export type MorphologyStratum = "bare" | "prefixed" | "suffixed" | "prefixed-and-suffixed" | "applied-unspecified";
export interface WrittenStratum {
  id: string;
  lengths: [number, number];
  syllables: [number, number];
  morphology: MorphologyStratum[];
}
export interface ComparisonRegistration {
  version: "written-comparison-v1";
  study_id: string;
  purpose: "human-study" | "development-fixture";
  candidate_selection: string;
  population: string;
  assignment_seed: number;
  pairs_per_stratum: number;
  session_length: number;
  participant_slots: string[];
  strata: WrittenStratum[];
}
export interface ComparisonDraw {
  condition: Condition;
  stratum: string;
  sample_id: string;
  draw_index: number;
}
export interface ComparisonItem {
  id: string;
  condition: Condition;
  stratum: string;
  spelling: string;
  draws: ComparisonDraw[];
}
export interface WrittenComparison {
  registration: ComparisonRegistration;
  conditions: Record<Condition, Snapshot>;
  items: ComparisonItem[];
  digest: string;
}
export interface PlannedSession {
  id: string;
  participant_slot: string;
  ordinal: number;
  item_ids: string[];
}
export interface ComparisonPlan {
  comparison_digest: string;
  sessions: PlannedSession[];
  digest: string;
}
// Participant slot, condition, stratum and traces stay in owner-only artifacts.
export interface ReviewerPacket { session_id: string; assignment: Assignment }
export interface ComparisonResponse {
  id: string;
  session_id: string;
  position: number;
  item_id: string;
  answer: Answer;
}
export interface ComparisonExport {
  version: "written-comparison-export-v1";
  comparison: WrittenComparison;
  plan: ComparisonPlan;
  responses: ComparisonResponse[];
}
