import { editPart } from "./spelling-ownership.js";
import type { SpellingCell } from "./base-spelling.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { followingConstructionContext } from "./spelling-construction-ownership.js";
import type { SharedSpellingConstruction } from "./spelling-construction-types.js";
import type { SharedSpellingRule } from "../config/language.js";
import { createSharedSpellingPolicy } from "./spelling-construction-policy.js";

export type SharedEditDecision = { status: "allowed" } | {
  status: "refused";
  constructionId: number;
  reason: "invalid-live-construction" | "consumes-shared-spelling" | "splits-shared-spelling" | "reading-context";
};
export interface ProposedSpellingEdit { start: number; deleteCount: number; insert: string; partId?: number }

function liveConstructionIndices(view: ConstructionLedgerView, construction: SharedSpellingConstruction): number[] | undefined {
  const indices = view.cells.flatMap((cell, index) => cell.origin.kind === "shared" &&
    cell.origin.constructionId === construction.id ? [index] : []);
  if (!indices.length || indices.length !== construction.outputCellIds.length || indices.some((index, offset) => {
    const cell = view.cells[index]; const origin = cell.origin;
    return index !== indices[0] + offset || cell.id !== construction.outputCellIds[offset] ||
      cell.text !== construction.after[offset] || cell.partId !== construction.displayPartId || origin.kind !== "shared" ||
      origin.editId !== construction.editId || origin.offset !== offset ||
      JSON.stringify(origin.phoneIds) !== JSON.stringify(construction.phoneIds) ||
      JSON.stringify(origin.sourceUnitIds) !== JSON.stringify(construction.sourceUnitIds);
  })) return;
  return indices;
}

/** Recheck every live shared reading against the proposed root surface, without mutation or RNG. */
export function createSharedEditGuard(rules: readonly SharedSpellingRule[]) {
  const policy = createSharedSpellingPolicy(rules);
  return (view: ConstructionLedgerView, constructions: readonly SharedSpellingConstruction[], edit: ProposedSpellingEdit): SharedEditDecision => {
    const { start, deleteCount, insert } = edit;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(deleteCount) || start < 0 || deleteCount < 0 ||
        start + deleteCount > view.cells.length) throw new Error("Invalid shared edit range");
    const partId = editPart(view.cells.slice(start, start + deleteCount), edit.partId);
    const inserted: SpellingCell[] = insert.split("").map((text, offset) => ({ id: -1 - offset, text, partId,
      origin: { kind: "rewrite", editId: view.cursor.nextEditId, sourceUnitIds: [], ownership: "unresolved" } }));
    const proposed = [...view.cells.slice(0, start), ...inserted, ...view.cells.slice(start + deleteCount)];
    for (const construction of constructions) {
      const refuse = (reason: Extract<SharedEditDecision, { status: "refused" }>["reason"]): SharedEditDecision =>
        ({ status: "refused", constructionId: construction.id, reason });
      const indices = liveConstructionIndices(view, construction);
      if (!indices) return refuse("invalid-live-construction");
      const left = indices[0]; const right = left + indices.length;
      if (deleteCount > 0 && start < right && start + deleteCount > left) return refuse("consumes-shared-spelling");
      if (insert && start > left && start < right) return refuse("splits-shared-spelling");
      const shifted = proposed.findIndex(cell => cell.id === construction.outputCellIds[0]);
      const slot = construction.attempt.slot;
      const scopeStart = slot.phase === "word" ? 0 : proposed.findIndex(cell => cell.partId === slot.partId);
      if (scopeStart < 0 || shifted < scopeStart) return refuse("reading-context");
      const phonemes = construction.phoneIds.map(id => view.phones[id]?.boundary?.phoneme);
      if (phonemes.some((phone, index) => !phone || phone.sound !== construction.reading.sounds[index])) return refuse("reading-context");
      const following = followingConstructionContext({ ...view, cells: proposed },
        construction.phoneIds[construction.phoneIds.length - 1] + 1, shifted + indices.length);
      const support = policy.describe(construction.attempt.ruleId, { phase: slot.phase, offsetInScope: shifted - scopeStart,
        phonemes: phonemes.map(phone => phone!), followingLetter: following.known ? following.letter : "",
        ...(following.known && following.phoneme ? { followingPhoneme: following.phoneme } : {}) });
      if (support.status !== "eligible" || support.form !== construction.after) return refuse("reading-context");
    }
    return { status: "allowed" };
  };
}
