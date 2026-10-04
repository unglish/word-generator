import type { Syllable, SyllableShapePlan } from "../types.js";
import type { MorphologyRealizationTrace } from "./morphology/realization.js";
import type { StressWeightTrace } from "./syllable-weight.js";

export interface SyllableSnapshot {
  onset: string[];
  nucleus: string[];
  coda: string[];
}

export interface StageSnapshot {
  name: string;
  before: SyllableSnapshot[];
  after: SyllableSnapshot[];
}

export interface DoublingTrace {
  /** Whether doubling was attempted. */
  attempted: boolean;
  /** Why doubling was skipped (if it was). */
  reason?: string;
  /** Final probability used for the doubling roll. */
  probability?: number;
  /** The doubled form that was produced. */
  result?: string;
}

export interface GraphemeTrace {
  /** Stable grapheme-decision index in flattened phoneme order. */
  index: number;
  phoneme: string;
  position: string;
  syllableIndex: number;
  candidates: string[];
  afterCondition: string[];
  afterPosition: string[];
  weights: [string, number][];
  roll: number;
  selected: string;
  /** Grapheme form emitted before later orthographic repairs. */
  emitted: string;
  doubled: boolean;
  /** Detailed doubling decision (only present when tracing). */
  doubling?: DoublingTrace;
}

export interface RepairTrace {
  /** Which repair function fired. */
  rule: string;
  /** What was there before the repair. */
  before: string;
  /** What it became after the repair. */
  after: string;
  /** Optional detail (e.g. which phoneme was dropped, why). */
  detail?: string;
}

export interface MorphologyTrace {
  template: string;
  /** Planned prefix spelling, before allomorph selection. */
  prefix?: string;
  /** Planned suffix spelling, before allomorph selection. */
  suffix?: string;
  /** Legacy baseline affix syllable count; not a deduction from the root.
   * Selected allomorph counts are in realization, and may differ. */
  syllableReduction: number;
  alternations?: MorphophonemicAlternationTrace[];
  /** Selected forms and written parts; absent in historical traces. */
  realization?: MorphologyRealizationTrace;
}

export interface MorphophonemicAlternationTrace {
  rule: string;
  affix: string;
  boundary: "prefix-root" | "root-suffix";
  soundBefore?: string;
  soundAfter?: string;
  writtenBefore?: string;
  writtenAfter?: string;
}

export interface BoundaryDropTrace {
  event: "boundaryDrop";
  dropped: string;
  beforeOnset: string;
  equalSonority: number;
  probability: number;
  leftSyllableIndex: number;
  rightSyllableIndex: number;
}

export interface RisingCodaBoundaryDropTrace {
  event: "risingCodaBoundaryDrop";
  dropped: string;
  preDropCoda: string[];
  remainingCoda: string[];
  onset: string[];
  probability: number;
  leftSyllableIndex: number;
  rightSyllableIndex: number;
}

export interface SspBoundaryDropTrace {
  event: "sspBoundaryDrop";
  dropped: string;
  preDropCoda: string[];
  remainingCoda: string[];
  onset: string[];
  violation: "rule1" | "rule2" | "rule3" | "multi";
  leftSyllableIndex: number;
  rightSyllableIndex: number;
}

export interface JunctionBoundaryDropTrace {
  event: "junctionBoundaryDrop";
  dropped: string;
  preDropCoda: string[];
  remainingCoda: string[];
  onset: string[];
  leftSyllableIndex: number;
  rightSyllableIndex: number;
}

export interface FinalSTrace {
  event: "finalS";
  probability: number;
  clusterWeightApplied?: boolean;
  clusterWeight?: number;
  syllableIndex: number;
}

export interface NasalStopExtensionTrace {
  event: "nasalStopExtension";
  nasal: string;
  appendedStop: string;
  probability: number;
  syllableIndex: number;
}

export interface VowelHiatusFallbackTrace {
  event: "vowelHiatusFallback";
  inserted: string;
  leftSyllableIndex: number;
  rightSyllableIndex: number;
}

export interface MorphPrefixHiatusFallbackTrace {
  event: "morphPrefixHiatusFallback";
  inserted: string;
  syllableIndex: number;
}

export interface MorphSuffixHiatusFallbackTrace {
  event: "morphSuffixHiatusFallback";
  inserted: string;
  syllableIndex: number;
}

export type AspirationTargetSegment = "onset" | "nucleus" | "coda";

export interface AspirationDecisionEvaluatedTrace {
  event: "aspirationDecision";
  evaluated: true;
  syllableIndex: number;
  ruleId: string | "fallback";
  probability: number;
  roll: number;
  eligible: true;
  applied: boolean;
  targetSegment: AspirationTargetSegment;
  targetIndex: number;
  targetPhoneme: string;
}

export interface AspirationDecisionSkippedTrace {
  event: "aspirationDecision";
  evaluated: false;
  syllableIndex: number;
  ruleId: string | "fallback" | null;
  probability: number | null;
  roll: number | null;
  eligible: boolean;
  applied: false;
  targetSegment: AspirationTargetSegment | null;
  targetIndex: number | null;
  targetPhoneme: string | null;
}

export type AspirationDecisionTrace =
  | AspirationDecisionEvaluatedTrace
  | AspirationDecisionSkippedTrace;

export type StructuralTrace =
  | BoundaryDropTrace
  | RisingCodaBoundaryDropTrace
  | SspBoundaryDropTrace
  | JunctionBoundaryDropTrace
  | FinalSTrace
  | NasalStopExtensionTrace
  | VowelHiatusFallbackTrace
  | MorphPrefixHiatusFallbackTrace
  | MorphSuffixHiatusFallbackTrace
  | AspirationDecisionTrace;

export interface TraceLink {
  kind: "graphemeSelection" | "repair" | "structural";
  index: number;
  label: string;
}

export interface OrthographyCharOwner {
  index: number;
  char: string;
  unitId: number;
  graphemeSelectionIndex: number;
}

export interface OrthographyUnitTrace {
  id: number;
  graphemeSelectionIndex: number;
  phoneme: string;
  position: string;
  syllableIndex: number;
  selected: string;
  emitted: string;
  present: boolean;
  start: number | null;
  end: number | null;
  links?: TraceLink[];
}

export interface OrthographyTrace {
  /** Final written form after all orthographic repair stages. */
  surface: string;
  /** Per-character ownership in the final written form. */
  chars: OrthographyCharOwner[];
  /** Grapheme-level aligned units. */
  graphemeUnits: OrthographyUnitTrace[];
  /** Optional phoneme-level aligned units for custom UIs. */
  phonemeUnits?: OrthographyUnitTrace[];
}

export interface WordTrace {
  /** Weight input and decisions before root nucleus repair/reduction. Absent in historical traces. */
  stressWeight?: StressWeightTrace;
  /** Target syllable count chosen for the root, excluding affixes. */
  syllableCount: number;
  /** Target phoneme count for the generated root before morphology. */
  targetPhonemeCount?: number;
  /** Planned onset/coda counts for each generated root syllable. */
  syllablePlans?: SyllableShapePlan[];
  /** Root attempt index selected by phoneme/letter-length scoring (0 = first try). */
  attempts: number;
  /** Morphology plan selected for this generation, independent of root length. */
  morphology?: MorphologyTrace;
  /** Structural decisions during syllable generation (boundary adjustments, extensions). */
  structural: StructuralTrace[];
  stages: StageSnapshot[];
  graphemeSelections: GraphemeTrace[];
  orthography?: OrthographyTrace;
  repairs: RepairTrace[];
  summary: { totalDecisions: number; repairCount: number; morphologyApplied: boolean };
}

function snapshotSyllables(syllables: Syllable[]): SyllableSnapshot[] {
  return syllables.map(s => ({
    onset: s.onset.map(p => p.sound),
    nucleus: s.nucleus.map(p => p.sound),
    coda: s.coda.map(p => p.sound),
  }));
}

export class TraceCollector {
  stressWeight?: StressWeightTrace;
  stages: StageSnapshot[] = [];
  graphemeSelections: GraphemeTrace[] = [];
  orthographyTrace?: OrthographyTrace;
  repairs: RepairTrace[] = [];
  structural: StructuralTrace[] = [];
  morphologyTrace?: MorphologyTrace;
  private currentBefore: Map<string, SyllableSnapshot[]> = new Map();

  beforeStage(name: string, syllables: Syllable[]): void {
    this.currentBefore.set(name, snapshotSyllables(syllables));
  }

  afterStage(name: string, syllables: Syllable[]): void {
    const before = this.currentBefore.get(name) ?? [];
    this.currentBefore.delete(name);
    this.stages.push({ name, before, after: snapshotSyllables(syllables) });
  }

  recordGraphemeSelection(entry: GraphemeTrace): void {
    this.graphemeSelections.push(entry);
  }

  recordStructural(entry: StructuralTrace): void {
    this.structural.push(entry);
  }

  recordRepair(rule: string, before: string, after: string, detail?: string): void {
    if (before !== after) {
      this.repairs.push({ rule, before, after, detail });
    }
  }

  syllableCount: number = 0;
  targetPhonemeCount?: number;
  syllablePlans?: SyllableShapePlan[];
  attempts: number = 0;

  toTrace(morphApplied: boolean): WordTrace {
    return {
      syllableCount: this.syllableCount,
      targetPhonemeCount: this.targetPhonemeCount,
      syllablePlans: this.syllablePlans,
      attempts: this.attempts,
      morphology: this.morphologyTrace,
      structural: this.structural,
      stages: this.stages,
      graphemeSelections: this.graphemeSelections,
      orthography: this.orthographyTrace,
      repairs: this.repairs,
      stressWeight: this.stressWeight,
      summary: {
        totalDecisions: this.graphemeSelections.length,
        repairCount: this.repairs.length,
        morphologyApplied: morphApplied,
      },
    };
  }
}
