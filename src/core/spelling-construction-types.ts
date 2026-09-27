import type { LedgerCursor } from "./spelling-normalization-types.js";
import type { SharedConstructionAttempt, SharedSpellingSlot } from "./spelling-construction.js";

/** Multiple ordered phones share these cells; no singular unit owner is implied. */
export interface SharedCellOrigin {
  kind: "shared";
  constructionId: number;
  editId: number;
  offset: number;
  sourceUnitIds: number[];
  phoneIds: number[];
}

export interface SharedSpellingConstruction {
  version: 1;
  id: number;
  editId: number;
  attemptId: number;
  sourceUnitIds: number[];
  phoneIds: number[];
  inputCellIds: number[];
  outputCellIds: number[];
  sourcePartIds: number[];
  displayPartId: number;
  before: string;
  after: string;
  reading: { kind: "shared-phones"; sounds: string[] };
  /** The complete event-time decision is retained, including context and draw/skip. */
  attempt: SharedConstructionAttempt;
}

/** Explicit lexical replacement retires prior constructions without claiming new phone ownership. */
export interface SharedSpellingSupersession {
  version: 1;
  id: number;
  cursor: LedgerCursor;
  editId: number;
  rule: string;
  constructionIds: number[];
  rootPhoneIds: number[];
  inputCellIds: number[];
  outputCellIds: number[];
  before: string;
  after: string;
  ownership: "unavailable";
}

/** Orders shared decisions that may consume neither an edit ID nor an RNG value. */
export interface SharedSpellingEvent {
  kind: "attempt" | "guard" | "transaction" | "supersession";
  index: number;
  cursor: LedgerCursor;
}

export interface SharedSpellingScan {
  id: number;
  slot: SharedSpellingSlot;
  ruleId: string;
  cursor: LedgerCursor;
  candidates: number[][];
  firstAttemptId: number;
}

export interface SharedWriterStep {
  kind: "pass-start" | "pass-end" | "slot-start" | "slot-end";
  slot: SharedSpellingSlot;
  slotIndex: number | null;
  cursor: LedgerCursor;
}

/** Actual producer operation order, including decisions that allocate no cells or edits. */
export interface SpellingTimelineEntry {
  kind: "split-attempt" | "split-guard" | "writer-step" | "scan-start" | "scan-end" | "append" | "rewrite" | "shared" | "normalization-check" | "normalization-episode" | "normalization" | "coverage";
  index: number;
  cursor: LedgerCursor;
}
