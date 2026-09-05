import type { Word } from "../../src/types.js";
import type { Rubric, Submission } from "./protocol.js";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface SourceFile { path: string; content: string }
export interface Manifest {
  schema_version: 1;
  study_id: string;
  rubric: Rubric;
  session_length: number;
  sample_count: number;
  options: { seed: number; mode: "lexicon"; morphology: true; trace: true };
  effective_config: Json;
  generator: { package_version: string; commit: string; dirty: boolean; source_digest: string; source_files: SourceFile[]; patch: string };
}
export interface Sample { id: string; study_id: string; draw_index: number; spelling: string; word: Word }
export interface Snapshot { manifest: Manifest; digest: string; samples: Sample[] }
export interface StudyRow { id: string; manifest: Manifest; digest: string; session_length: number; enrollment_open: boolean; created_at?: string }
export interface SessionRow { id: string; study_id: string; assignments: string[]; created_at: string; completed_at: string | null }
export interface ResponseRow extends Omit<Submission, "submission_token" | "response_id"> {
  id: string;
  sample_id: string;
  received_at: string;
}
export interface ReviewExport {
  schema_version: 1;
  exported_at: string;
  study: StudyRow;
  samples: Sample[];
  sessions: SessionRow[];
  responses: ResponseRow[];
}
