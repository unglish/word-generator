import type { AgreementMetric } from "./report.js";

export interface ReadAloudInferenceProtocol {
  version: "read-aloud-crossed-stability-v1";
  primary_metric: AgreementMetric;
  seed: number;
  replicates: number;
  confidence: number;
  minimum_scored_readers_per_condition: number;
  minimum_scored_spellings_per_condition: number;
  minimum_draw_coverage: number;
  reader_sampling_assumption: string;
  spelling_sampling_assumption: string;
  missingness_assumption: string;
  coding_assumption: string;
}
export interface ReadAloudFactors { readers: string[]; spellings: string[] }
export interface ReadAloudWeights { readers: number[]; spellings: number[] }
