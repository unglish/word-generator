import type { LanguageConfig } from "../config/language.js";
import type { FollowingTarget } from "./spelling-sequence-model.js";
import { createDoublingModel } from "./spelling-doubling.js";
import { resolveSingleSpellingUnit, type ConstructionLedgerView } from "./spelling-construction-ownership.js";
import type { SpellingCell } from "./base-spelling.js";
import type { GraphemeReading } from "../types.js";

export interface FollowingObligation {
  unitId: number;
  cellIds: readonly number[];
  form: string;
  reading: Extract<GraphemeReading, { kind: "following-letter" }>;
}
export type FollowingGuardStatus = "compatible" | "incompatible" | "ownership-unavailable";

/** Checks an intact unit's physical following letter, including a known root edge. */
export function checkFollowingObligation(cells: readonly SpellingCell[], obligation: FollowingObligation): FollowingGuardStatus {
  if (!obligation.cellIds.length || obligation.cellIds.length !== obligation.form.length) return "ownership-unavailable";
  const start = cells.findIndex(cell => cell.id === obligation.cellIds[0]);
  if (start < 0 || obligation.cellIds.some((id, offset) =>
    cells[start + offset]?.id !== id || cells[start + offset]?.text !== obligation.form[offset])) return "ownership-unavailable";
  const letter = cells[start + obligation.cellIds.length]?.text.toLowerCase() ?? "";
  const { require, forbid } = obligation.reading;
  if (require && !require.some(value => value.toLowerCase() === letter) ||
      forbid?.some(value => value.toLowerCase() === letter)) return "incompatible";
  return "compatible";
}

/** Caller supplies authenticated intact obligations; transformed ownership needs separate licensing. */
export function guardFollowingEdit(
  before: readonly SpellingCell[], after: readonly SpellingCell[], obligations: readonly FollowingObligation[],
) {
  const checks = obligations.map(obligation => ({ unitId: obligation.unitId,
    before: checkFollowingObligation(before, obligation), after: checkFollowingObligation(after, obligation) }));
  return { status: checks.some(check => check.before === "compatible" && check.after !== "compatible")
    ? "refused" as const : "preserved" as const, checks };
}

export function createFollowingViewGuard(config: LanguageConfig, targets: readonly FollowingTarget[]) {
  const doubling = createDoublingModel(config.doubling);
  const targetKeys = new Set(targets.map(target => JSON.stringify([target.phoneme, target.form])));
  function inspect(view: ConstructionLedgerView, unitId: number) {
    const extent = resolveSingleSpellingUnit(view, unitId);
    if (extent.status !== "complete") return { status: "ownership-unavailable" as const, targeted: false };
    const targeted = targetKeys.has(JSON.stringify([view.phones[unitId].soundAtSpelling, extent.before]));
    const first = view.cells[extent.start].origin;
    let reading: GraphemeReading | undefined;
    if (first.kind === "selection") {
      const unit = view.units[unitId];
      const grapheme = unit.inventoryIndex === undefined ? undefined : config.graphemes[unit.inventoryIndex];
      if (grapheme && grapheme.form === unit.selected && grapheme.phoneme === view.phones[unitId].soundAtSpelling) {
        reading = doubling.readingFor(grapheme, unit.afterDoubling);
      }
    } else if (first.kind === "licensed") {
      reading = view.certificates[first.certificateId]?.replacements.find(entry => entry.unitId === unitId)?.reading;
    } else if (first.kind === "normalized") {
      reading = view.normalizationCertificates[first.certificateId]?.targetReading;
    } else if (first.kind === "completion") {
      reading = view.completionCertificates?.[first.certificateId]?.reading;
    }
    if (reading?.kind === "single-phone") return { status: "compatible" as const, targeted };
    if (reading?.kind !== "following-letter") return { status: "reading-unavailable" as const, targeted };
    if (extent.end === view.cells.length && view.units.length < view.phones.length) {
      return { status: "pending-context" as const, targeted };
    }
    const obligation = { unitId, cellIds: extent.inputCellIds, form: extent.before, reading };
    return { status: checkFollowingObligation(view.cells, obligation), targeted };
  }
  return (before: ConstructionLedgerView, after: ConstructionLedgerView) => {
    const checks = before.units.flatMap(unit => {
      const previous = inspect(before, unit.id);
      const projected = inspect(after, unit.id);
      if (!previous.targeted && !projected.targeted) return [];
      return [{ unitId: unit.id, before: previous.status, after: projected.status }];
    });
    return { status: checks.some(check => check.after !== "compatible" &&
      !(check.before === "pending-context" && check.after === "pending-context"))
      ? "refused" as const : "preserved" as const, checks };
  };
}
