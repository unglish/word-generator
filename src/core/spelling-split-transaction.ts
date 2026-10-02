import type { SpellingCell } from "./base-spelling.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import type { createSplitConstructionPlanner } from "./spelling-split-planner.js";

type Planner = ReturnType<typeof createSplitConstructionPlanner>;
export type SplitConstructionAttempt = ReturnType<Planner["decide"]>;

export interface SplitVowelCellOrigin {
  kind: "split-vowel";
  constructionId: number;
  editId: number;
  unitId: number;
  phoneId: number;
  role: "component" | "marker";
  offset: number;
}
export type SplitVowelCell = Omit<SpellingCell, "origin"> & { origin: SplitVowelCellOrigin };
export type SplitSurfaceCell = SpellingCell | SplitVowelCell;

export interface SplitVowelConstruction {
  id: number;
  editId: number;
  nucleusUnitId: number;
  phoneId: number;
  inputCellIds: number[];
  componentCellIds: number[];
  markerCellIds: number[];
  codaUnitIds: number[];
  preservedCodaCellIds: number[];
  preservedCodaCells: SpellingCell[];
  sharedCodaIds: number[];
  partId: number;
  reading: { sound: string; component: string; marker: string };
  attempt: SplitConstructionAttempt;
}

export interface SplitVowelTransaction {
  construction: SplitVowelConstruction;
  start: number;
  input: SpellingCell[];
  output: SplitSurfaceCell[];
  before: string;
  after: string;
  cells: SplitSurfaceCell[];
  nextCellId: number;
  nextEditId: number;
}

/** Authenticate first and return one complete detached transition; never mutates producer state. */
export function prepareSplitVowelTransaction(view: ConstructionLedgerView, planner: Planner,
  attempt: SplitConstructionAttempt, constructionId: number, nextCellId: number): SplitVowelTransaction {
  if (!Number.isSafeInteger(constructionId) || constructionId < 0 || !Number.isSafeInteger(nextCellId) || nextCellId < 0 ||
      view.cells.some(cell => cell.id >= nextCellId) || view.units.some(unit => unit.sourceCellIds.some(id => id >= nextCellId))) {
    throw new Error("Invalid split-vowel allocation");
  }
  planner.verify(view, attempt.nucleusId, attempt.route, attempt);
  if (attempt.status !== "evaluated" || attempt.trial.status !== "formed") throw new Error("Split-vowel trial did not form");
  const { span, trial } = attempt;
  const cellEnd = nextCellId + trial.support.vowel.component.length + trial.support.marker.length;
  if (!Number.isSafeInteger(cellEnd) || !Number.isSafeInteger(view.cursor.nextEditId) ||
      view.cursor.nextEditId < 0 || !Number.isSafeInteger(view.cursor.nextEditId + 1)) throw new Error("Invalid split-vowel allocation");
  const partId = span.nucleus.displayPartId;
  const unitId = span.nucleus.sourceUnitIds[0];
  const phoneId = span.nucleus.phoneIds[0];
  const editId = view.cursor.nextEditId;
  const allocate = (form: string, role: SplitVowelCellOrigin["role"]): SplitVowelCell[] => form.split("").map((text, offset) => ({
    id: nextCellId++, text, partId, origin: { kind: "split-vowel", constructionId, editId, unitId, phoneId, role, offset },
  }));
  const component = allocate(trial.support.vowel.component, "component");
  const marker = allocate(trial.support.marker, "marker");
  const coda = structuredClone(view.cells.slice(span.nucleus.end, span.markerOffset));
  const input = structuredClone(view.cells.slice(span.nucleus.start, span.markerOffset));
  const output: SplitSurfaceCell[] = [...component, ...coda, ...marker];
  const cells: SplitSurfaceCell[] = structuredClone([...view.cells]);
  cells.splice(span.nucleus.start, input.length, ...structuredClone(output));
  const construction: SplitVowelConstruction = {
    id: constructionId, editId, nucleusUnitId: unitId, phoneId,
    inputCellIds: [...span.nucleus.inputCellIds], componentCellIds: component.map(cell => cell.id),
    markerCellIds: marker.map(cell => cell.id), codaUnitIds: [...span.codaUnitIds],
    preservedCodaCellIds: [...span.codaCellIds], preservedCodaCells: structuredClone(coda), sharedCodaIds: [...span.sharedCodaIds], partId,
    reading: { sound: trial.support.vowel.sound, component: trial.support.vowel.component, marker: trial.support.marker },
    attempt: structuredClone(attempt),
  };
  return { construction, start: span.nucleus.start, input, output, before: input.map(cell => cell.text).join(""),
    after: output.map(cell => cell.text).join(""), cells, nextCellId, nextEditId: editId + 1 };
}
