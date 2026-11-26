import type { RootRepetitionPolicy } from "../config/language.js";
import type { GenerationMode, Syllable, SyllableShapePlan } from "../types.js";
import type { RNG } from "../utils/random.js";
import type { TraceCollector } from "./trace.js";

export type StructuralRecorder = Pick<TraceCollector, "recordStructural">;

export interface SegmentSelectionInput {
  mode: GenerationMode;
  rootRepetition?: RootRepetitionPolicy;
  /** Only streams belonging to segment selection on this attempt. */
  streams(stage: "select_segments" | "adjust_boundary" | "repair_vowel_hiatus"): RNG;
  trace?: StructuralRecorder;
}

/** A generator's prepared engine for selecting one attempt's lexical root. */
export interface SegmentEngine {
  selectSegments(plans: readonly SyllableShapePlan[], input: SegmentSelectionInput): Syllable[];
}
