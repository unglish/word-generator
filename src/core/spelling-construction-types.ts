import type { LedgerCursor } from "./spelling-normalization-types.js";
import type { SharedConstructionAttempt } from "./spelling-construction.js";

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
