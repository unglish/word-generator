import type { SharedSpellingRule } from "../config/language.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import type { SharedSpellingSlot } from "./spelling-construction.js";
import { createSharedSpellingPolicy } from "./spelling-construction-policy.js";

/** Enumerates original sound windows only; each attempt must still validate live ownership. */
export function createSharedCandidateScanner(rules: readonly SharedSpellingRule[]) {
  createSharedSpellingPolicy(rules);
  const sequences = new Map(rules.map(rule => [rule.id, {
    scope: rule.scope, sounds: rule.phonemes.map(phone => phone.sound),
  }]));
  return (view: ConstructionLedgerView, slot: SharedSpellingSlot, ruleId: string): number[][] => {
    const rule = sequences.get(ruleId);
    if (!rule || (rule.scope !== "both" && rule.scope !== slot.phase)) throw new Error("Invalid shared scan rule/phase");
    if (!["syllable", "word"].includes(slot.phase) || (slot.phase === "word" && slot.partId !== null) ||
        (slot.phase === "syllable" && (!Number.isSafeInteger(slot.partId) || slot.partId < 0))) {
      throw new Error("Invalid shared scan slot");
    }
    if (view.cursor.lastAppendedUnitId !== view.units.length - 1) throw new Error("Invalid shared scan cursor");
    for (const [id, unit] of view.units.entries()) {
      if (unit.id !== id || unit.phoneIds.length !== 1 || unit.phoneIds[0] !== id || view.phones[id]?.id !== id) {
        throw new Error("Invalid shared scan original unit identity");
      }
    }
    const candidates: number[][] = [];
    for (let start = 0; start + rule.sounds.length <= view.units.length; start++) {
      const ids = rule.sounds.map((_, offset) => start + offset);
      if (ids.every((id, offset) => view.phones[id].soundAtSpelling === rule.sounds[offset] &&
          (slot.phase === "word" || view.phones[id].syllableIndex === slot.partId))) candidates.push(ids);
    }
    return candidates;
  };
}
