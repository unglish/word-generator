import type { GraphemeReading } from "../types.js";

/** A local operation at one of the writer's existing duplicate-letter sites. */
export type NormalizationSite = "adjacent-choice" | "syllable-join";
export type NormalizationRefusal =
  | "would-erase-phone"
  | "no-legal-remainder"
  | "unresolved-ownership"
  | "unknown-reading"
  | "construction-obligation"
  | "context-unavailable"
  | "unsupported-shared-construction";

/** Locate an observation among actual append/edit operations, including no-op refusals. */
export interface LedgerCursor {
  lastAppendedUnitId: number;
  nextEditId: number;
}

export interface HistoricalSelectionState {
  previousForm: string | null;
  doublingCount: number;
  nucleusForm: string;
  previousNucleusForm: string;
}

export interface NormalizationSupport {
  inventoryIndex: number;
  selected: string;
  afterDoubling: string;
  effectiveWeight: number;
  poolTotal: number;
  graphemeProbability: number;
  doublingProbability: number;
  pool: "ordinary" | "fallback";
  quotaRelaxed: boolean;
}

export type Observed<T> = { known: true; value: T } | { known: false };

export interface CheckedNormalizationReading {
  unitId: number;
  inputCellIds: number[];
  form: string;
  reading: GraphemeReading;
  source: { kind: "selection"; inventoryIndex: number }
    | { kind: "normalization"; certificateId: number };
  previousLetter: Observed<string>;
  nextLetter: Observed<string>;
  openPart: Observed<boolean>;
}

/** A local emitted spelling license, never a counterfactual whole-word probability. */
export interface UnitNormalizationCertificate {
  version: 1;
  kind: "local-unit-normalization";
  id: number;
  site: NormalizationSite;
  cursor: LedgerCursor;
  editId: number;
  unitId: number;
  phoneIds: number[];
  partId: number;
  predecessorCellId: number;
  inputCellIds: number[];
  before: string;
  after: string;
  originalInventoryIndex: number;
  /** Rederive from authoritative phones and actual prior original selections. */
  preUnitState: HistoricalSelectionState;
  support: NormalizationSupport;
  /** First experiment admits no new open-vowel, marker, or joint obligation. */
  targetReading: { kind: "single-phone" };
  checkedNeighbors: CheckedNormalizationReading[];
  /** V4 shared-mode evidence; original phones remain jointly owned. */
  preservedSharedConstructionIds?: number[];
}

export interface UnitNormalizationEpisode {
  version: 1;
  id: number;
  site: NormalizationSite;
  cursor: LedgerCursor;
  predecessorCellId: number;
  rightCellId: number;
  rightUnitId: number | null;
  outcome: { status: "normalized"; certificateId: number }
    | { status: "retained"; reason: NormalizationRefusal };
}

/** Every scheduled guard is recorded, including first-unit and empty-form skips. */
export interface UnitNormalizationCheck {
  site: NormalizationSite;
  cursor: LedgerCursor;
}

/** New version/capability is required; old v1/v2 readers must not accept this origin. */
export interface NormalizedCellOrigin {
  kind: "normalized";
  unitId: number;
  offset: number;
  editId: number;
  certificateId: number;
  sourceUnitIds: [number];
}

export interface UnitNormalizationObservation {
  version: 1;
  checks: UnitNormalizationCheck[];
  comparisons: Record<NormalizationSite, number>;
  collisions: Record<NormalizationSite, number>;
  episodes: UnitNormalizationEpisode[];
}
