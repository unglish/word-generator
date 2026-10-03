export type AuditoryCohort = "all-ratings" | "unfamiliar-only";
export interface AuditoryInferenceProtocol {
  version: "auditory-crossed-stability-v1";
  primary_cohort: AuditoryCohort;
  metric: "share-4-5";
  seed: number;
  replicates: number;
  confidence: number;
  minimum_rated_listeners_per_condition: number;
  minimum_rated_targets_per_condition: number;
  minimum_draw_coverage: number;
  listener_sampling_assumption: string;
  target_sampling_assumption: string;
  missingness_assumption: string;
  production_scope: string;
}
export interface AuditoryRoster {
  comparison_digest: string;
  verification_method: string;
  entries: { participant_slot: string; person_key: string; verification_sha256: string }[];
  digest: string;
}
export interface AuditoryFactors { listeners: string[]; targets: string[] }
export interface AuditoryWeights { listeners: number[]; targets: number[] }
