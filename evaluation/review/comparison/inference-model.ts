export interface WrittenInferenceProtocol {
  version: "written-crossed-bootstrap-v2";
  metric: "share-4-5";
  cohort: "all-ratings" | "unfamiliar-only";
  seed: number;
  replicates: number;
  confidence: number;
  minimum_rated_participants: number;
  minimum_spellings_per_condition: number;
  minimum_draw_coverage: number;
  participant_sampling_assumption: string;
  spelling_sampling_assumption: string;
  missingness_assumption: string;
}
export interface EnrollmentEntry {
  participant_slot: string;
  person_key: string;
  verification_record_sha256: string;
}
export interface EnrollmentRoster {
  version: "written-enrollment-v1";
  comparison_digest: string;
  verification_method: string;
  entries: EnrollmentEntry[];
  digest: string;
}
export interface CrossedFactors { participants: string[]; spellings: string[] }
export interface CrossedWeights { participants: number[]; spellings: number[] }
