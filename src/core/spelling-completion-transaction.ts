import type { SpellingCell } from "./base-spelling.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import type { createCompletionPlanner } from "./spelling-completion-planner.js";
import type { SplitVowelConstruction } from "./spelling-split-transaction.js";
import type { GraphemeReading } from "../types.js";

type Planner = ReturnType<typeof createCompletionPlanner>;
export type CompletionAttempt = ReturnType<Planner["decide"]>;
export interface CompletionCellOrigin {
  kind: "completion";
  certificateId: number;
  editId: number;
  unitId: number;
  offset: number;
  sourceUnitIds: number[];
}
export type CompletionCell = Omit<SpellingCell, "origin"> & { origin: CompletionCellOrigin };
export interface CompletionCertificate {
  id: number;
  editId: number;
  unitId: number;
  phoneIds: number[];
  partId: number;
  inputCellIds: number[];
  outputCellIds: number[];
  before: string;
  after: string;
  inventoryIndex: number;
  reading: GraphemeReading;
  attempt: CompletionAttempt;
}

/** Detached commit plan: all validation precedes allocation and no producer object is mutated. */
export function prepareCompletionTransaction(view: ConstructionLedgerView, planner: Planner,
  splits: readonly SplitVowelConstruction[], attempt: CompletionAttempt, certificateId: number, nextCellId: number) {
  planner.verify(view, attempt.nucleusId, splits, attempt);
  if (attempt.status !== "evaluated" || attempt.sample.status !== "selected") throw new Error("Completion did not select");
  const selectedIndex = attempt.sample.inventoryIndex;
  const proposal = attempt.proposals.find(entry => entry.inventoryIndex === selectedIndex);
  if (!proposal || !("projection" in proposal) || proposal.projection.status !== "preserved") throw new Error("Missing completion projection");
  const span = resolveSingleSpellingUnit(view, attempt.nucleusId);
  if (span.status !== "complete") throw new Error("Unavailable completion input");
  const editId = view.cursor.nextEditId;
  const cellEnd = nextCellId + proposal.form.length;
  if (![certificateId, nextCellId, editId, cellEnd, editId + 1].every(value => Number.isSafeInteger(value) && value >= 0) ||
      view.cells.some(cell => cell.id >= nextCellId) || view.units.some(unit => unit.sourceCellIds.some(id => id >= nextCellId))) {
    throw new Error("Invalid completion allocation");
  }
  const unitId = attempt.nucleusId;
  const output: CompletionCell[] = proposal.form.split("").map((text, offset) => ({ id: nextCellId + offset,
    text, partId: span.displayPartId, origin: { kind: "completion", certificateId, editId, unitId, offset, sourceUnitIds: [unitId] } }));
  const input = structuredClone(view.cells.slice(span.start, span.end));
  const cells: (SpellingCell | CompletionCell)[] = structuredClone([...view.cells]);
  cells.splice(span.start, input.length, ...structuredClone(output));
  const certificate: CompletionCertificate = { id: certificateId, editId, unitId, phoneIds: [...span.phoneIds],
    partId: span.displayPartId, inputCellIds: [...span.inputCellIds], outputCellIds: output.map(cell => cell.id),
    before: span.before, after: proposal.form, inventoryIndex: selectedIndex,
    reading: structuredClone(proposal.projection.reading), attempt: structuredClone(attempt) };
  return { certificate, start: span.start, input, output, cells, nextCellId: cellEnd, nextEditId: editId + 1 };
}
