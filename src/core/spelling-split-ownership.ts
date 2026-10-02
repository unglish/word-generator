import type { SharedSpellingRule } from "../config/language.js";
import { createSharedSurfaceGuard } from "./spelling-construction-edit.js";
import { resolveSingleSpellingUnit } from "./spelling-construction-ownership.js";
import type { ConstructionLedgerView, ConstructionOwnershipRefusal, CompleteConstructionSpan } from "./spelling-construction-ownership.js";
import type { SplitVowelContext } from "./spelling-split-policy.js";

export type SplitOwnershipRefusal = ConstructionOwnershipRefusal | "not-single-nucleus" | "missing-coda"
  | "invalid-syllable-order" | "incomplete-syllable-edge" | "invalid-shared-coda";

export interface CompleteSplitSpan {
  status: "complete";
  nucleus: CompleteConstructionSpan;
  codaUnitIds: number[];
  codaCellIds: number[];
  sharedCodaIds: number[];
  markerOffset: number;
  context: SplitVowelContext;
}

export type SplitSpanResult = CompleteSplitSpan | { status: "refused"; reason: SplitOwnershipRefusal };

const equal = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

/** Requires producer state or prior replayed licenses, never mere ancestor unions. */
export function createSplitSpanResolver(sharedRules: readonly SharedSpellingRule[]) {
  const checkShared = createSharedSurfaceGuard(sharedRules);
  return (view: ConstructionLedgerView, nucleusId: number, route: SplitVowelContext["route"]): SplitSpanResult => {
    const refuse = (reason: SplitOwnershipRefusal): SplitSpanResult => ({ status: "refused", reason });
    const phone = view.phones[nucleusId];
    if (!Number.isSafeInteger(nucleusId) || nucleusId < 0 || !phone || phone.segment !== "nucleus") return refuse("not-single-nucleus");
    const part = phone.syllableIndex;
    const syllable = view.phones.filter(entry => entry.syllableIndex === part);
    if (syllable.filter(entry => entry.segment === "nucleus").length !== 1) return refuse("not-single-nucleus");
    const codas = syllable.filter(entry => entry.segment === "coda");
    if (!codas.length) return refuse("missing-coda");
    if (codas.some((entry, index) => entry.id !== nucleusId + index + 1) ||
        syllable.some(entry => entry.segment === "onset" && entry.id >= nucleusId)) return refuse("invalid-syllable-order");
    if (codas.some(entry => view.phones[entry.id] !== entry || !entry.boundary ||
        entry.boundary.phoneme.sound !== entry.soundAtSpelling)) return refuse("missing-boundary");
    if (codas.some(entry => view.units[entry.id]?.id !== entry.id || view.units[entry.id]?.choiceId !== entry.id ||
        !equal(view.units[entry.id]?.phoneIds ?? [], [entry.id]))) return refuse("invalid-units");
    const nucleus = resolveSingleSpellingUnit(view, nucleusId);
    if (nucleus.status === "refused") return nucleus;
    let offset = nucleus.end;
    const codaCellIds: number[] = [];
    const sharedCodaIds: number[] = [];
    const codaUnitIds = codas.map(entry => entry.id);
    let codaWritten = "";
    for (let index = 0; index < codas.length;) {
      const id = codas[index].id;
      const unit = view.units[id];
      if (!unit || unit.id !== id || unit.choiceId !== id || !equal(unit.phoneIds, [id])) return refuse("invalid-units");
      const shared = view.constructions.filter(entry => entry.sourceUnitIds.includes(id));
      if (shared.length) {
        if (shared.length !== 1) return refuse("invalid-shared-coda");
        const construction = shared[0];
        const ids = construction.sourceUnitIds;
        if (!ids.length || !equal(ids, codaUnitIds.slice(index, index + ids.length)) ||
            !equal(construction.phoneIds, ids) || construction.sourcePartIds.some(source => source !== part) ||
            construction.displayPartId !== part || checkShared(view, view, [construction]).status !== "allowed") return refuse("invalid-shared-coda");
        const cells = view.cells.slice(offset, offset + construction.outputCellIds.length);
        if (!equal(cells.map(cell => cell.id), construction.outputCellIds)) return refuse("noncontiguous-span");
        codaCellIds.push(...construction.outputCellIds);
        codaWritten += construction.after;
        sharedCodaIds.push(construction.id);
        offset += cells.length;
        index += ids.length;
      } else {
        const span = resolveSingleSpellingUnit(view, id);
        if (span.status === "refused") return span;
        if (span.start !== offset) return refuse("noncontiguous-span");
        codaCellIds.push(...span.inputCellIds);
        codaWritten += span.before;
        offset = span.end;
        index++;
      }
    }
    if (view.cells.slice(offset).some(cell => cell.partId === part || cell.partId === null)) return refuse("incomplete-syllable-edge");
    const lastPart = Math.max(...view.phones.map(entry => entry.syllableIndex));
    return { status: "complete", nucleus, codaUnitIds, codaCellIds, sharedCodaIds, markerOffset: offset,
      context: { vowel: { sound: phone.soundAtSpelling, form: nucleus.before, position: "nucleus" },
        coda: { sounds: codas.map(entry => entry.soundAtSpelling), written: codaWritten }, route,
        finalRootSyllable: part === lastPart, syllableCount: lastPart + 1 } };
  };
}
