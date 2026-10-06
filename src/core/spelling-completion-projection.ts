import { measureSpellingBudgets } from "./spelling-budget.js";
import { completionReadingForUnit } from "./spelling-completion-reading.js";
import type { LanguageConfig } from "../config/language.js";
import type { GraphemeReading } from "../types.js";
import type { SpellingCell } from "./base-spelling.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { sourceUnits } from "./spelling-ownership.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import { createSharedSurfaceGuard } from "./spelling-construction-edit.js";
import { createSplitLiveGuard } from "./spelling-split-live.js";
import { createDoublingModel } from "./spelling-doubling.js";
import type { SplitVowelSupport } from "./spelling-split-policy.js";
import type { SplitVowelConstruction } from "./spelling-split-transaction.js";

export type CompletionProjectionResult =
  | { status: "preserved"; form: string; reading: GraphemeReading; checkedUnitIds: number[] }
  | { status: "refused"; reason: string; unitId?: number };

function readingAllowed(reading: GraphemeReading | undefined, next: string, open: boolean): boolean {
  if (!reading || reading.kind === "unsupported-construction") return false;
  if (reading.kind === "open-vowel-or-split-marker") return open;
  if (reading.kind === "following-letter") return (!reading.require || reading.require.includes(next)) && !reading.forbid?.includes(next);
  return true;
}

function preservesOpaqueContext(before: readonly SpellingCell[], after: readonly SpellingCell[], unitId: number): boolean {
  const positions = before.flatMap((cell, index) => sourceUnits(cell.origin).includes(unitId) ? [index] : []);
  if (!positions.length) return false;
  return positions.every(index => {
    const cell = before[index];
    const projectedIndex = after.findIndex(candidate => candidate.id === cell.id);
    return projectedIndex >= 0 && after[projectedIndex] === cell &&
      (before[index + 1]?.text.toLowerCase() ?? "") === (after[projectedIndex + 1]?.text.toLowerCase() ?? "");
  });
}

/** Validate the proposed surface without changing any live state or consuming RNG. */
export function createCompletionProjectionGuard(configuration: LanguageConfig, supports: readonly SplitVowelSupport[]) {
  const config = structuredClone(configuration);
  const doubling = createDoublingModel(config.doubling);
  const sharedGuard = createSharedSurfaceGuard(config.sharedSpellings ?? []);
  const splitGuard = createSplitLiveGuard(supports);
  return (view: ConstructionLedgerView, nucleusId: number, inventoryIndex: number, splits: readonly SplitVowelConstruction[], neighbor?: { unitId: number; inventoryIndex: number }): CompletionProjectionResult => {
    const refuse = (reason: string, unitId?: number): CompletionProjectionResult => ({ status: "refused", reason, ...(unitId === undefined ? {} : { unitId }) });
    const own = resolveSingleSpellingUnit(view, nucleusId);
    if (own.status !== "complete" || view.phones[nucleusId].segment !== "nucleus") return refuse("unavailable-nucleus", nucleusId);
    const grapheme = config.graphemes[inventoryIndex];
    if (!Number.isSafeInteger(inventoryIndex) || !grapheme || grapheme.phoneme !== view.phones[nucleusId].soundAtSpelling || !grapheme.form) return refuse("invalid-candidate", nucleusId);
    const reading = grapheme.reading;
    if (!reading || reading.kind === "unsupported-construction" || reading.kind === "open-vowel-or-split-marker") return refuse("unsupported-completion-reading", nucleusId);
    const replacements = [{ unitId: nucleusId, span: own, grapheme }];
    if (neighbor) {
      const neighborSpan = resolveSingleSpellingUnit(view, neighbor.unitId);
      const neighborGrapheme = config.graphemes[neighbor.inventoryIndex];
      const phone = view.phones[neighbor.unitId];
      if (neighborSpan.status !== "complete" || !phone || phone.segment === "nucleus" ||
          !Number.isSafeInteger(neighbor.inventoryIndex) || !neighborGrapheme?.form ||
          neighborGrapheme.phoneme !== phone.soundAtSpelling || !neighborGrapheme.reading ||
          neighborGrapheme.reading.kind === "unsupported-construction" || neighborGrapheme.reading.kind === "open-vowel-or-split-marker" ||
          (neighborSpan.end !== own.start && own.end !== neighborSpan.start)) return refuse("invalid-neighbor-candidate", neighbor.unitId);
      replacements.push({ unitId: neighbor.unitId, span: neighborSpan, grapheme: neighborGrapheme });
    }
    let syntheticId = -1;
    const outputs = new Map<number, SpellingCell[]>();
    for (const replacement of replacements) outputs.set(replacement.unitId, replacement.grapheme.form.split("").map((text, offset) => ({
      id: syntheticId--, text, partId: replacement.span.displayPartId,
      origin: { kind: "selection", unitId: replacement.unitId, offset },
    })));
    const cells = view.cells.slice();
    for (const replacement of [...replacements].sort((a, b) => b.span.start - a.span.start)) {
      cells.splice(replacement.span.start, replacement.span.end - replacement.span.start, ...outputs.get(replacement.unitId)!);
    }
    // Synthetic selection identity is for context resolution only, never committed as provenance.
    const units = view.units.map(unit => {
      const replacement = replacements.find(entry => entry.unitId === unit.id);
      return replacement ? { ...unit, afterDoubling: replacement.grapheme.form, sourceCellIds: outputs.get(unit.id)!.map(cell => cell.id) } : unit;
    });
    const projected = { ...view, cells, units };
    if (neighbor && measureSpellingBudgets(cells.map(cell => cell.text).join(""), config.writtenFormConstraints).exceeded.length) {
      return refuse("written-form-budget");
    }
    if (sharedGuard(view, projected, view.constructions).status !== "allowed") return refuse("shared-reading");
    if (splitGuard(cells, view.phones, splits).status !== "preserved") return refuse("split-reading");
    const sharedIds = new Set(view.constructions.map(entry => entry.id));
    if (sharedIds.size !== view.constructions.length || view.cells.some(cell => cell.origin.kind === "shared" && !sharedIds.has(cell.origin.constructionId))) return refuse("unknown-shared-ownership");
    const covered = new Set(view.constructions.flatMap(entry => entry.sourceUnitIds));
    for (const split of splits) covered.add(split.nucleusUnitId);
    const affected = new Set(replacements.map(entry => entry.span.displayPartId));
    for (const { span } of replacements) {
      for (const cell of [view.cells[span.start - 1], view.cells[span.end]]) if (cell?.partId != null) affected.add(cell.partId);
    }
    const checkedUnitIds: number[] = [];
    for (const unit of view.units) {
      if (covered.has(unit.id) || !affected.has(view.phones[unit.id].syllableIndex)) continue;
      const replacement = replacements.find(entry => entry.unitId === unit.id);
      const span = replacement?.span ?? resolveSingleSpellingUnit(view, unit.id);
      if (span.status !== "complete") {
        if (span.reason === "unresolved-ownership" && preservesOpaqueContext(view.cells, cells, unit.id)) continue;
        return refuse("unresolved-neighbor", unit.id);
      }
      const oldEnd = span.end - 1;
      const output = outputs.get(unit.id);
      const end = cells.findIndex(cell => cell.id === (output ? output[output.length - 1].id : span.inputCellIds[span.inputCellIds.length - 1]));
      const next = cells[end + 1]?.text.toLowerCase() ?? "";
      const oldNext = view.cells[oldEnd + 1]?.text.toLowerCase() ?? "";
      if (!replacement && next === oldNext) continue;
      let current: GraphemeReading | undefined = replacement?.grapheme.reading;
      const origin = view.cells[span.start].origin;
      if (!replacement) {
        if (origin.kind === "licensed") current = view.certificates[origin.certificateId]?.replacements.find(entry => entry.unitId === unit.id)?.reading;
        else if (origin.kind === "completion") current = completionReadingForUnit(view.completionCertificates?.[origin.certificateId], unit.id);
        else if (origin.kind === "normalized") current = view.normalizationCertificates[origin.certificateId]?.targetReading;
        else if (origin.kind === "selection") {
          const selected = unit.inventoryIndex === undefined ? undefined : config.graphemes[unit.inventoryIndex];
          if (selected?.form === unit.selected && selected.phoneme === view.phones[unit.id].soundAtSpelling) current = doubling.readingFor(selected, span.before);
        }
      }
      const phone = view.phones[unit.id];
      const open = phone.segment === "nucleus" && !view.phones.some(entry => entry.syllableIndex === phone.syllableIndex && entry.segment === "coda") &&
        !cells.slice(end + 1).some(cell => cell.partId === phone.syllableIndex || cell.partId == null);
      if (!readingAllowed(current, next, open)) return refuse("neighbor-reading", unit.id);
      checkedUnitIds.push(unit.id);
    }
    return { status: "preserved", form: grapheme.form, reading: structuredClone(reading), checkedUnitIds };
  };
}
