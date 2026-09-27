import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import type { GraphemeReading } from "../types.js";
import type { SpellingCell } from "./base-spelling.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import { createSharedSurfaceGuard } from "./spelling-construction-edit.js";
import { createDoublingModel } from "./spelling-doubling.js";
import type { CompleteSplitSpan } from "./spelling-split-ownership.js";
import type { SplitVowelSupport } from "./spelling-split-policy.js";

export type SplitNeighborResult = { status: "preserved"; checkedUnitIds: number[]; sharedConstructionIds: number[] }
  | { status: "refused"; unitId: number | null; reason: "unresolved-neighbor" | "unknown-reading" | "reading-obligation" | "shared-reading-obligation" };

/** A temporary surface for context checks; its synthetic identities are never committed or certified. */
function projectSurface(view: ConstructionLedgerView, span: CompleteSplitSpan, support: SplitVowelSupport): ConstructionLedgerView {
  const unitId = span.nucleus.sourceUnitIds[0];
  const partId = span.nucleus.displayPartId;
  const component: SpellingCell[] = support.vowel.component.split("").map((text, offset) => ({
    id: -1 - offset, text, partId, origin: { kind: "selection", unitId, offset },
  }));
  const marker: SpellingCell[] = support.marker.split("").map((text, offset) => ({
    id: -1 - component.length - offset, text, partId,
    origin: { kind: "rewrite", editId: view.cursor.nextEditId, ownership: "unresolved", sourceUnitIds: [] },
  }));
  const cells = view.cells.slice();
  cells.splice(span.markerOffset, 0, ...marker);
  cells.splice(span.nucleus.start, span.nucleus.end - span.nucleus.start, ...component);
  // Following-context resolution needs the proposed whole nucleus, not its old extent.
  const units = view.units.map(unit => unit.id === unitId ? { ...unit,
    afterDoubling: support.vowel.component, sourceCellIds: component.map(cell => cell.id) } : unit);
  return { ...view, cells, units };
}

/** Call only after source ownership and support have been authenticated by the planner. */
export function createSplitNeighborGuard(config: Pick<LanguageConfig, "graphemes" | "doubling">, sharedRules: readonly SharedSpellingRule[]) {
  const graphemes = structuredClone(config.graphemes);
  const doubling = createDoublingModel(structuredClone(config.doubling));
  const preserveShared = createSharedSurfaceGuard(sharedRules);

  function readingFor(view: ConstructionLedgerView, unitId: number, first: SpellingCell, form: string): GraphemeReading | undefined {
    const origin = first.origin;
    if (origin.kind === "licensed") return view.certificates[origin.certificateId]?.replacements.find(entry => entry.unitId === unitId)?.reading;
    if (origin.kind === "completion") return view.completionCertificates?.[origin.certificateId]?.reading;
    if (origin.kind === "normalized") return view.normalizationCertificates[origin.certificateId]?.targetReading;
    if (origin.kind !== "selection") return;
    const unit = view.units[unitId];
    const grapheme = unit.inventoryIndex === undefined ? undefined : graphemes[unit.inventoryIndex];
    if (!grapheme || grapheme.form !== unit.selected || grapheme.phoneme !== view.phones[unitId].soundAtSpelling) return;
    return doubling.readingFor(grapheme, form);
  }

  return (view: ConstructionLedgerView, span: CompleteSplitSpan, support: SplitVowelSupport): SplitNeighborResult => {
    const projected = projectSurface(view, span, support);
    const sharedIds = new Set(view.constructions.map(entry => entry.id));
    const sharedUnits = new Set<number>();
    if (sharedIds.size !== view.constructions.length || view.cells.some(cell => cell.origin.kind === "shared" &&
        !sharedIds.has(cell.origin.constructionId))) return { status: "refused", unitId: null, reason: "unresolved-neighbor" };
    for (const construction of view.constructions) {
      for (const id of construction.sourceUnitIds) {
        if (sharedUnits.has(id)) return { status: "refused", unitId: id, reason: "unresolved-neighbor" };
        sharedUnits.add(id);
      }
    }
    if (preserveShared(view, projected, view.constructions).status === "refused") {
      return { status: "refused", unitId: null, reason: "shared-reading-obligation" };
    }
    const affectedParts = new Set([span.nucleus.displayPartId]);
    for (const cell of [view.cells[span.nucleus.start - 1], view.cells[span.markerOffset]]) {
      if (cell?.partId != null) affectedParts.add(cell.partId);
    }
    const checkedUnitIds: number[] = [];
    for (const unit of view.units) {
      if (unit.id === span.nucleus.sourceUnitIds[0] || sharedUnits.has(unit.id) ||
          !affectedParts.has(view.phones[unit.id].syllableIndex)) continue;
      const refuse = (reason: Extract<SplitNeighborResult, { status: "refused" }>["reason"]): SplitNeighborResult =>
        ({ status: "refused", unitId: unit.id, reason });
      const own = resolveSingleSpellingUnit(view, unit.id);
      if (own.status !== "complete") return refuse("unresolved-neighbor");
      const reading = readingFor(view, unit.id, view.cells[own.start], own.before);
      if (!reading) return refuse("unknown-reading");
      if (reading.kind === "unsupported-construction") return refuse("reading-obligation");
      const end = projected.cells.findIndex(cell => cell.id === own.inputCellIds[own.inputCellIds.length - 1]);
      const next = projected.cells[end + 1]?.text.toLowerCase();
      if (reading.kind === "following-letter") {
        const future = view.phones.length > view.cursor.lastAppendedUnitId + 1;
        if (next === undefined && future) return refuse("unresolved-neighbor");
        if (reading.require && !reading.require.includes(next ?? "") || reading.forbid?.includes(next ?? "")) return refuse("reading-obligation");
      }
      if (reading.kind === "open-vowel-or-split-marker") {
        const phone = view.phones[unit.id];
        if (phone.segment !== "nucleus" || view.phones.some(entry => entry.syllableIndex === phone.syllableIndex && entry.segment === "coda") ||
            projected.cells.slice(end + 1).some(cell => cell.partId === phone.syllableIndex || cell.partId === null)) return refuse("reading-obligation");
      }
      checkedUnitIds.push(unit.id);
    }
    return { status: "preserved", checkedUnitIds, sharedConstructionIds: [...sharedIds] };
  };
}
