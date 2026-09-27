import type { SpellingCell, SpellingPhone, SpellingUnit } from "./base-spelling.js";
import type { SpellingCoverageCertificate } from "./spelling-coverage-types.js";
import type { LedgerCursor, UnitNormalizationCertificate } from "./spelling-normalization-types.js";
import type { Phoneme } from "../types.js";

/** Live producer state, or an archived state whose prior certificates were replayed. */
export interface ConstructionLedgerView {
  cursor: LedgerCursor;
  cells: readonly SpellingCell[];
  units: readonly SpellingUnit[];
  phones: readonly SpellingPhone[];
  certificates: readonly SpellingCoverageCertificate[];
  normalizationCertificates: readonly UnitNormalizationCertificate[];
}

export type ConstructionOwnershipRefusal = "invalid-units" | "invalid-phones" | "missing-boundary"
  | "unresolved-ownership" | "missing-unit" | "partial-unit" | "mixed-origin" | "missing-license"
  | "noncontiguous-span" | "wrong-part";

export interface CompleteConstructionSpan {
  status: "complete";
  start: number;
  end: number;
  before: string;
  sourceUnitIds: number[];
  phoneIds: number[];
  inputCellIds: number[];
  /** One source part per phone, independent of where the written output is displayed. */
  sourcePartIds: number[];
  displayPartId: number;
  phonemes: Phoneme[];
  following: { known: false } | { known: true; phoneme?: Phoneme; letter: string };
}

export type ConstructionSpanResult = CompleteConstructionSpan
  | { status: "refused"; reason: ConstructionOwnershipRefusal };

function sameIds(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Checks the current complete extent; prior semantic licenses remain the producer/verifier's responsibility. */
function completeUnit(view: ConstructionLedgerView, unit: SpellingUnit, cells: SpellingCell[]): ConstructionOwnershipRefusal | undefined {
  if (!cells.length) return "missing-unit";
  const first = cells[0].origin;
  if (first.kind === "rewrite") return "unresolved-ownership";
  if (cells.some(cell => cell.origin.kind !== first.kind)) return "mixed-origin";
  if (cells.some((cell, offset) => cell.origin.kind === "rewrite" || cell.origin.offset !== offset)) return "partial-unit";
  if (cells.some(cell => cell.partId !== view.phones[unit.phoneIds[0]].syllableIndex)) return "wrong-part";
  const form = cells.map(cell => cell.text).join("");
  if (first.kind === "selection") {
    if (!sameIds(cells.map(cell => cell.id), unit.sourceCellIds) || form !== unit.afterDoubling) return "partial-unit";
    return;
  }
  if (cells.some(cell => cell.origin.kind === "selection" || cell.origin.kind === "rewrite" ||
      cell.origin.certificateId !== first.certificateId || cell.origin.editId !== first.editId ||
      !sameIds(cell.origin.sourceUnitIds, [unit.id]))) return "mixed-origin";
  if (first.kind === "licensed") {
    const certificate = view.certificates[first.certificateId];
    const replacements = certificate?.replacements.filter(replacement => replacement.unitId === unit.id) ?? [];
    if (certificate?.id !== first.certificateId || replacements.length !== 1) return "missing-license";
    const replacement = replacements[0];
    if (!sameIds(replacement.phoneIds, unit.phoneIds) || replacement.after !== form ||
        replacement.partId !== cells[0].partId) return "missing-license";
    return;
  }
  const certificate = view.normalizationCertificates[first.certificateId];
  if (certificate?.id !== first.certificateId || certificate.editId !== first.editId ||
      certificate.unitId !== unit.id || !sameIds(certificate.phoneIds, unit.phoneIds) ||
      certificate.after !== form || certificate.partId !== cells[0].partId) return "missing-license";
}

function ownedPositions(view: ConstructionLedgerView, unitId: number): number[] {
  return view.cells.flatMap((cell, index) => cell.origin.kind !== "rewrite" && cell.origin.unitId === unitId ? [index] : []);
}

function followingContext(view: ConstructionLedgerView, phoneId: number, end: number): CompleteConstructionSpan["following"] {
  const phone = view.phones[phoneId];
  const cell = view.cells[end];
  if (!phone && !cell) return { known: true, letter: "" };
  const unit = view.units[phoneId];
  if (!phone?.boundary || phone.id !== phoneId || phone.boundary.phoneme.sound !== phone.soundAtSpelling ||
      !unit || unit.id !== phoneId || unit.choiceId !== phoneId || !sameIds(unit.phoneIds, [phoneId])) return { known: false };
  if (view.cells.some(entry => entry.origin.kind === "rewrite" && entry.origin.sourceUnitIds.includes(phoneId))) return { known: false };
  const positions = ownedPositions(view, phoneId);
  if (!positions.length || positions.some((index, offset) => index !== end + offset) ||
      completeUnit(view, unit, positions.map(index => view.cells[index]))) return { known: false };
  return { known: true, phoneme: structuredClone(phone.boundary.phoneme), letter: cell.text };
}

/** Never infers complete ownership from the union of generic rewrite ancestors. */
export function resolveConstructionSpan(view: ConstructionLedgerView, sourceUnitIds: readonly number[]): ConstructionSpanResult {
  const refuse = (reason: ConstructionOwnershipRefusal): ConstructionSpanResult => ({ status: "refused", reason });
  if (sourceUnitIds.length < 2 || sourceUnitIds.some((id, index) => !Number.isSafeInteger(id) || id < 0 ||
      view.units[id]?.id !== id || (index > 0 && id !== sourceUnitIds[index - 1] + 1))) return refuse("invalid-units");
  const units = sourceUnitIds.map(id => view.units[id]);
  if (units.some(unit => unit.choiceId !== unit.id || !sameIds(unit.phoneIds, [unit.id]) ||
      view.phones[unit.id]?.id !== unit.id)) return refuse("invalid-phones");
  const phones = units.map(unit => view.phones[unit.id]);
  if (phones.some(phone => !phone.boundary || phone.boundary.phoneme.sound !== phone.soundAtSpelling)) return refuse("missing-boundary");
  const wanted = new Set(sourceUnitIds);
  if (view.cells.some(cell => cell.origin.kind === "rewrite" && cell.origin.sourceUnitIds.some(id => wanted.has(id)))) {
    return refuse("unresolved-ownership");
  }
  const indices: number[] = [];
  for (const unit of units) {
    const positions = ownedPositions(view, unit.id);
    const cells = positions.map(index => view.cells[index]);
    const reason = completeUnit(view, unit, cells);
    if (reason) return refuse(reason);
    indices.push(...positions);
  }
  if (indices.some((index, offset) => index !== indices[0] + offset)) return refuse("noncontiguous-span");
  const cells = indices.map(index => view.cells[index]);
  if (new Set(cells.map(cell => cell.id)).size !== cells.length) return refuse("partial-unit");
  const end = indices[indices.length - 1] + 1;
  const following = followingContext(view, phones[phones.length - 1].id + 1, end);
  return { status: "complete", start: indices[0], end, before: cells.map(cell => cell.text).join(""),
    sourceUnitIds: [...sourceUnitIds], phoneIds: phones.map(phone => phone.id), inputCellIds: cells.map(cell => cell.id),
    sourcePartIds: phones.map(phone => phone.syllableIndex), displayPartId: phones[0].syllableIndex,
    phonemes: phones.map(phone => structuredClone(phone.boundary!.phoneme)), following };
}
