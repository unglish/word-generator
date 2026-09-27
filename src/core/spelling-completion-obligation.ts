import type { LanguageConfig } from "../config/language.js";
import type { GraphemeReading } from "../types.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import { createDoublingModel } from "./spelling-doubling.js";
import { createSplitLiveGuard } from "./spelling-split-live.js";
import type { SplitVowelSupport } from "./spelling-split-policy.js";
import type { SplitVowelConstruction } from "./spelling-split-transaction.js";

export type CompletionObligation =
  | { status: "unavailable"; reason: string }
  | { status: "not-target" }
  | { status: "satisfied"; reading: "open" | "split"; constructionId?: number }
  | { status: "unresolved"; unitId: number; inputCellIds: number[]; form: string };

/** Classify the current reading, not the original selected text or generic edit ancestry. */
export function createCompletionObligationInspector(config: Pick<LanguageConfig, "graphemes" | "doubling">, supports: readonly SplitVowelSupport[]) {
  const graphemes = structuredClone(config.graphemes);
  const doubling = createDoublingModel(structuredClone(config.doubling));
  const live = createSplitLiveGuard(supports);
  return (view: ConstructionLedgerView, unitId: number, constructions: readonly SplitVowelConstruction[]): CompletionObligation => {
    if (view.cursor.lastAppendedUnitId !== view.phones.length - 1) return { status: "unavailable", reason: "incomplete-root" };
    const phone = view.phones[unitId]; const unit = view.units[unitId];
    if (!Number.isSafeInteger(unitId) || unitId < 0 || !phone || !unit) return { status: "unavailable", reason: "invalid-unit" };
    if (phone.segment !== "nucleus") return { status: "not-target" };
    const owned = constructions.filter(entry => entry.nucleusUnitId === unitId);
    if (owned.length) {
      if (owned.length !== 1 || live(view.cells, view.phones, constructions).status !== "preserved") return { status: "unavailable", reason: "invalid-split-reading" };
      return { status: "satisfied", reading: "split", constructionId: owned[0].id };
    }
    const span = resolveSingleSpellingUnit(view, unitId);
    if (span.status === "refused") return { status: "unavailable", reason: span.reason };
    const origin = view.cells[span.start].origin;
    let reading: GraphemeReading | undefined;
    if (origin.kind === "licensed") reading = view.certificates[origin.certificateId]?.replacements.find(entry => entry.unitId === unitId)?.reading;
    else if (origin.kind === "normalized") reading = view.normalizationCertificates[origin.certificateId]?.targetReading;
    else if (origin.kind === "selection") {
      const grapheme = unit.inventoryIndex === undefined ? undefined : graphemes[unit.inventoryIndex];
      if (grapheme?.form === unit.selected && grapheme.phoneme === phone.soundAtSpelling) reading = doubling.readingFor(grapheme, span.before);
    }
    if (!reading) return { status: "unavailable", reason: "unknown-reading" };
    if (reading.kind !== "open-vowel-or-split-marker") return { status: "not-target" };
    const closed = view.phones.some(entry => entry.syllableIndex === phone.syllableIndex && entry.segment === "coda");
    const following = view.cells.slice(span.end);
    if (!closed && following.some(cell => cell.partId == null)) return { status: "unavailable", reason: "unknown-written-edge" };
    if (!closed && !following.some(cell => cell.partId === phone.syllableIndex)) return { status: "satisfied", reading: "open" };
    return { status: "unresolved", unitId, inputCellIds: [...span.inputCellIds], form: span.before };
  };
}
