import type { ReadAloudInferenceProtocol } from "./inference-model.js";

const METRICS = ["intended_phones", "intended_phones_and_stress", "accepted_phones", "accepted_phones_and_stress"];
function nonempty(value: string): boolean { return typeof value === "string" && value.trim().length > 0; }
export function validateReadAloudInference(protocol: ReadAloudInferenceProtocol): void {
  if (!protocol || protocol.version !== "read-aloud-crossed-stability-v1" || !METRICS.includes(protocol.primary_metric) ||
      !Number.isSafeInteger(protocol.seed) || protocol.seed < 0 || protocol.seed > 0xffffffff ||
      !Number.isSafeInteger(protocol.replicates) || protocol.replicates < 2 || !Number.isFinite(protocol.confidence) || protocol.confidence <= 0 || protocol.confidence >= 1 ||
      !Number.isSafeInteger(protocol.minimum_scored_readers_per_condition) || protocol.minimum_scored_readers_per_condition < 2 ||
      !Number.isSafeInteger(protocol.minimum_scored_spellings_per_condition) || protocol.minimum_scored_spellings_per_condition < 2 ||
      !Number.isFinite(protocol.minimum_draw_coverage) || protocol.minimum_draw_coverage <= 0 || protocol.minimum_draw_coverage > 1 ||
      !nonempty(protocol.reader_sampling_assumption) || !nonempty(protocol.spelling_sampling_assumption) ||
      !nonempty(protocol.missingness_assumption) || !nonempty(protocol.coding_assumption)) throw new Error("Invalid prospective read-aloud stability protocol.");
}
