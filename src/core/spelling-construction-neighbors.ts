import { createSharedEditGuard } from "./spelling-construction-edit.js";
import type { SharedEditDecision } from "./spelling-construction-edit.js";
import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import type { GraphemeReading } from "../types.js";
import type { SpellingCell } from "./base-spelling.js";
import { resolveConstructionSpan, resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { createDoublingModel } from "./spelling-doubling.js";

type ReadingContext = { nextLetter: string | null; openPart: boolean | null };
export interface ConstructionNeighborCheck {
  unitId: number;
  inputCellIds: number[];
  form: string;
  reading: GraphemeReading;
  before: ReadingContext;
  after: ReadingContext;
}
export type ConstructionNeighborResult =
  | { status: "preserved"; checks: ConstructionNeighborCheck[]; unchangedContextUnitIds: number[]; sharedConstructionIds: number[] }
  | { status: "refused"; unitId: number | null; reason: "invalid-source" | "unresolved-neighbor" | "unknown-reading" | "reading-obligation" | "context-unavailable" | "shared-reading-obligation";
      shared?: Extract<SharedEditDecision, { status: "refused" }> };

function readingContext(view: ConstructionLedgerView, cells: readonly SpellingCell[], inputCellIds: readonly number[], part: number): ReadingContext {
  const end = cells.findIndex(cell => cell.id === inputCellIds[inputCellIds.length - 1]);
  const futurePhones = view.phones.slice(view.cursor.lastAppendedUnitId + 1);
  const nextLetter = cells[end + 1]?.text.toLowerCase() ?? (futurePhones.length ? null : "");
  const following = cells.slice(end + 1);
  let openPart: boolean | null = true;
  if (following.some(cell => cell.partId === part)) openPart = false;
  else if (futurePhones.some(phone => phone.syllableIndex === part) || cells.some(cell => cell.partId == null)) openPart = null;
  return { nextLetter, openPart };
}

/** Prior coverage/normalization certificates must already be authenticated by their producer or replay. */
export function createConstructionNeighborGuard(config: Pick<LanguageConfig, "graphemes" | "doubling">, sharedRules?: readonly SharedSpellingRule[]) {
  const preserveShared = sharedRules ? createSharedEditGuard(sharedRules) : undefined;
  const graphemes = structuredClone(config.graphemes);
  const doubling = createDoublingModel(structuredClone(config.doubling));

  function unitReading(view: ConstructionLedgerView, unitId: number, first: SpellingCell, form: string): GraphemeReading | undefined {
    const origin = first.origin;
    if (origin.kind === "licensed") return view.certificates[origin.certificateId]?.replacements.find(entry => entry.unitId === unitId)?.reading;
    if (origin.kind === "normalized") return view.normalizationCertificates[origin.certificateId]?.targetReading;
    if (origin.kind !== "selection") return;
    const unit = view.units[unitId];
    const grapheme = unit.inventoryIndex === undefined ? undefined : graphemes[unit.inventoryIndex];
    if (!grapheme || grapheme.form !== unit.selected || grapheme.phoneme !== view.phones[unitId].soundAtSpelling) return;
    return doubling.readingFor(grapheme, form);
  }

  return (view: ConstructionLedgerView, sourceUnitIds: readonly number[], after: string): ConstructionNeighborResult => {
    const span = resolveConstructionSpan(view, sourceUnitIds);
    if (span.status !== "complete" || !after) return { status: "refused", unitId: null, reason: "invalid-source" };
    const sharedIds = new Set(view.constructions.map(construction => construction.id));
    if (sharedIds.size !== view.constructions.length || view.cells.some(cell => cell.origin.kind === "shared" && !sharedIds.has(cell.origin.constructionId))) {
      return { status: "refused", unitId: null, reason: "unresolved-neighbor" };
    }
    const sharedUnits = new Set<number>();
    if (view.constructions.length) {
      if (!preserveShared) return { status: "refused", unitId: null, reason: "unresolved-neighbor" };
      const shared = preserveShared(view, view.constructions, { start: span.start, deleteCount: span.end - span.start,
        insert: after, formationSourceUnitIds: sourceUnitIds });
      if (shared.status === "refused") return { status: "refused", unitId: null, reason: "shared-reading-obligation", shared };
      for (const construction of view.constructions) {
        for (const id of construction.sourceUnitIds) {
          if (sharedUnits.has(id)) return { status: "refused", unitId: id, reason: "unresolved-neighbor" };
          sharedUnits.add(id);
        }
      }
    }
    const proposed = view.cells.slice();
    proposed.splice(span.start, span.end - span.start, ...after.split("").map((text, offset): SpellingCell => ({
      id: -1 - offset, text, partId: span.displayPartId, origin: { kind: "shared", constructionId: -1,
        editId: view.cursor.nextEditId, offset, sourceUnitIds: [...span.sourceUnitIds], phoneIds: [...span.phoneIds] },
    })));
    const changedParts = new Set(span.sourcePartIds);
    for (const cell of [view.cells[span.start - 1], view.cells[span.end]]) if (cell?.partId != null) changedParts.add(cell.partId);
    const consumed = new Set(sourceUnitIds);
    const checks: ConstructionNeighborCheck[] = [];
    const unchangedContextUnitIds: number[] = [];
    for (const unit of view.units) {
      if (consumed.has(unit.id) || sharedUnits.has(unit.id) || !changedParts.has(view.phones[unit.id].syllableIndex)) continue;
      const refuse = (reason: Extract<ConstructionNeighborResult, { status: "refused" }>["reason"]): ConstructionNeighborResult =>
        ({ status: "refused", unitId: unit.id, reason });
      const own = resolveSingleSpellingUnit(view, unit.id);
      if (own.status !== "complete") return refuse("unresolved-neighbor");
      const part = view.phones[unit.id].syllableIndex;
      const before = readingContext(view, view.cells, own.inputCellIds, part);
      const context = readingContext(view, proposed, own.inputCellIds, part);
      if (before.nextLetter === context.nextLetter && before.openPart === context.openPart) {
        unchangedContextUnitIds.push(unit.id);
        continue;
      }
      const reading = unitReading(view, unit.id, view.cells[own.start], own.before);
      if (!reading) return refuse("unknown-reading");
      if (reading.kind === "unsupported-construction") return refuse("reading-obligation");
      if (reading.kind === "following-letter") {
        if (context.nextLetter === null) return refuse("context-unavailable");
        if ((reading.require && !reading.require.includes(context.nextLetter)) || reading.forbid?.includes(context.nextLetter)) return refuse("reading-obligation");
      }
      if (reading.kind === "open-vowel-or-split-marker") {
        if (context.openPart === null) return refuse("context-unavailable");
        if (!context.openPart || view.phones[unit.id].segment !== "nucleus" ||
            view.phones.some(phone => phone.syllableIndex === part && phone.segment === "coda")) return refuse("reading-obligation");
      }
      checks.push({ unitId: unit.id, inputCellIds: [...own.inputCellIds], form: own.before,
        reading: structuredClone(reading), before, after: context });
    }
    return { status: "preserved", checks, unchangedContextUnitIds, sharedConstructionIds: [...sharedIds] };
  };
}
