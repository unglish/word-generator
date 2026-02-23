import type { Syllable } from "../types.js";

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
  prefix?: string;
  suffix?: string;
  syllableReduction: number;
}

export interface StructuralTrace {
  /** Which phoneme was dropped and why. */
  event: string;
  detail: string;
}

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
  /** Target syllable count chosen for this word. */
  syllableCount: number;
  /** How many letter-length rejection attempts before acceptance (0 = first try). */
  attempts: number;
  /** Morphology plan details (only when morphology was applied). */
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

  recordStructural(event: string, detail: string): void {
    this.structural.push({ event, detail });
  }

  recordRepair(rule: string, before: string, after: string, detail?: string): void {
    if (before !== after) {
      this.repairs.push({ rule, before, after, detail });
    }
  }

  syllableCount: number = 0;
  attempts: number = 0;

  toTrace(morphApplied: boolean): WordTrace {
    return {
      syllableCount: this.syllableCount,
      attempts: this.attempts,
      morphology: this.morphologyTrace,
      structural: this.structural,
      stages: this.stages,
      graphemeSelections: this.graphemeSelections,
      orthography: this.orthographyTrace,
      repairs: this.repairs,
      summary: {
        totalDecisions: this.graphemeSelections.length,
        repairCount: this.repairs.length,
        morphologyApplied: morphApplied,
      },
    };
  }
}
