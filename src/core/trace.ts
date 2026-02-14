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

export interface GraphemeTrace {
  phoneme: string;
  position: string;
  syllableIndex: number;
  candidates: string[];
  afterCondition: string[];
  afterPosition: string[];
  weights: [string, number][];
  roll: number;
  selected: string;
  doubled: boolean;
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

export interface WordTrace {
  stages: StageSnapshot[];
  graphemeSelections: GraphemeTrace[];
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
  repairs: RepairTrace[] = [];
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

  recordRepair(rule: string, before: string, after: string, detail?: string): void {
    if (before !== after) {
      this.repairs.push({ rule, before, after, detail });
    }
  }

  toTrace(morphApplied: boolean): WordTrace {
    return {
      stages: this.stages,
      graphemeSelections: this.graphemeSelections,
      repairs: this.repairs,
      summary: {
        totalDecisions: this.graphemeSelections.length,
        repairCount: this.repairs.length,
        morphologyApplied: morphApplied,
      },
    };
  }
}
