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
export interface CompletionReplacement {
  unitId: number;
  phoneIds: number[];
  partId: number;
  inputCellIds: number[];
  outputCellIds: number[];
  before: string;
  after: string;
  inventoryIndex: number;
  reading: GraphemeReading;
}
export interface CompletionCertificate extends CompletionReplacement {
  id: number;
  editId: number;
  attempt: CompletionAttempt;
  neighborReplacements?: CompletionReplacement[];
}

/** Detached commit plan: all validation precedes allocation and no producer object is mutated. */
export function prepareCompletionTransaction(view: ConstructionLedgerView, planner: Planner,
  splits: readonly SplitVowelConstruction[], attempt: CompletionAttempt, certificateId: number, nextCellId: number) {
  planner.verify(view, attempt.nucleusId, splits, attempt);
  if (attempt.status !== "evaluated") throw new Error("Completion did not select");
  const jointSample = "joint" in attempt ? attempt.joint.sample : undefined;
  const joint = "joint" in attempt && jointSample?.status === "selected"
    ? attempt.joint.proposals.find(entry => entry.inventoryIndex === jointSample.inventoryIndex) : undefined;
  const sample = attempt.sample;
  const proposal = joint?.nucleus ?? (sample.status === "selected"
    ? attempt.proposals.find(entry => entry.inventoryIndex === sample.inventoryIndex) : undefined);
  const projection = joint?.projection ?? (proposal && "projection" in proposal ? proposal.projection : undefined);
  if (!proposal) throw new Error("Completion did not select");
  if (!projection || projection.status !== "preserved") throw new Error("Missing completion projection");
  const candidates = [{ unitId: attempt.nucleusId, form: proposal.form, inventoryIndex: proposal.inventoryIndex, reading: projection.reading }];
  if (joint) {
    if (!joint.neighbor.reading) throw new Error("Missing neighbor reading");
    candidates.push({ unitId: joint.neighbor.unitId, form: joint.neighbor.form,
      inventoryIndex: joint.neighbor.inventoryIndex, reading: joint.neighbor.reading });
  }
  const spans = candidates.map(candidate => {
    const span = resolveSingleSpellingUnit(view, candidate.unitId);
    if (span.status !== "complete") throw new Error("Unavailable completion input");
    return { candidate, span };
  }).sort((a, b) => a.span.start - b.span.start);
  if (spans.some((entry, index) => index > 0 && spans[index - 1].span.end !== entry.span.start)) throw new Error("Noncontiguous completion input");
  const editId = view.cursor.nextEditId;
  const cellEnd = nextCellId + candidates.reduce((sum, candidate) => sum + candidate.form.length, 0);
  if (![certificateId, nextCellId, editId, cellEnd, editId + 1].every(value => Number.isSafeInteger(value) && value >= 0) ||
      view.cells.some(cell => cell.id >= nextCellId) || view.units.some(unit => unit.sourceCellIds.some(id => id >= nextCellId))) {
    throw new Error("Invalid completion allocation");
  }
  let allocated = nextCellId;
  const output: CompletionCell[] = [];
  const replacements: CompletionReplacement[] = [];
  for (const { candidate, span } of spans) {
    const cells: CompletionCell[] = candidate.form.split("").map((text, offset) => ({ id: allocated++, text,
      partId: span.displayPartId, origin: { kind: "completion", certificateId, editId, unitId: candidate.unitId, offset, sourceUnitIds: [candidate.unitId] } }));
    output.push(...cells);
    replacements.push({ unitId: candidate.unitId, phoneIds: [...span.phoneIds], partId: span.displayPartId,
      inputCellIds: [...span.inputCellIds], outputCellIds: cells.map(cell => cell.id), before: span.before,
      after: candidate.form, inventoryIndex: candidate.inventoryIndex, reading: structuredClone(candidate.reading) });
  }
  const start = spans[0].span.start;
  const input = structuredClone(view.cells.slice(start, spans[spans.length - 1].span.end));
  const cells: (SpellingCell | CompletionCell)[] = structuredClone([...view.cells]);
  cells.splice(start, input.length, ...structuredClone(output));
  const nucleus = replacements.find(entry => entry.unitId === attempt.nucleusId)!;
  const certificate: CompletionCertificate = { id: certificateId, editId, ...nucleus, attempt: structuredClone(attempt),
    ...(joint ? { neighborReplacements: replacements.filter(entry => entry.unitId !== attempt.nucleusId) } : {}) };
  return { certificate, start, input, output, cells, nextCellId: cellEnd, nextEditId: editId + 1 };
}
