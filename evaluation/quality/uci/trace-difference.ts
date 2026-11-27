import { isDeepStrictEqual } from "node:util";
import type { StageSnapshot, SyllableSnapshot, WordTrace } from "../../../src/core/trace.js";

type Slot = "onset" | "nucleus" | "coda";
interface Location { stageIndex: number; stage: string; snapshot: "before" | "after"; syllableIndex: number }
interface ObservedPhone { sound: string; aspirated: boolean; reduced: boolean }
export type StageDifference =
  | { kind: "stage"; stageIndex: number; before: string | null; after: string | null }
  | (Location & { kind: "syllable"; before: boolean; after: boolean })
  | (Location & { kind: "stress"; before: SyllableSnapshot["stress"] | null; after: SyllableSnapshot["stress"] | null })
  | (Location & { kind: "phone"; slot: Slot; phoneIndex: number; before: ObservedPhone | null; after: ObservedPhone | null });

function phoneAt(syllable: SyllableSnapshot, slot: Slot, index: number): ObservedPhone | null {
  const sound = syllable[slot][index];
  if (sound === undefined) return null;
  return {
    sound,
    aspirated: syllable.aspirated?.some(mark => mark.segment === slot && mark.index === index) ?? false,
    reduced: slot === "nucleus" && (syllable.reducedNuclei?.includes(index) ?? false),
  };
}

function syllableDifference(before: SyllableSnapshot | undefined, after: SyllableSnapshot | undefined, at: Location): StageDifference | null {
  if (!before || !after) return { kind: "syllable", ...at, before: Boolean(before), after: Boolean(after) };
  for (const slot of ["onset", "nucleus", "coda"] as const) {
    for (let index = 0; index < Math.max(before[slot].length, after[slot].length); index++) {
      const left = phoneAt(before, slot, index), right = phoneAt(after, slot, index);
      if (!isDeepStrictEqual(left, right)) return { kind: "phone", ...at, slot, phoneIndex: index, before: left, after: right };
    }
  }
  if (before.stress !== after.stress) return { kind: "stress", ...at, before: before.stress ?? null, after: after.stress ?? null };
  return null;
}

/** Compare observations in trace order. This locates a difference without assigning its cause. */
export function firstStageDifference(before: StageSnapshot[], after: StageSnapshot[]): StageDifference | null {
  for (let stageIndex = 0; stageIndex < Math.max(before.length, after.length); stageIndex++) {
    const left = before[stageIndex], right = after[stageIndex];
    if (left?.name !== right?.name) return { kind: "stage", stageIndex, before: left?.name ?? null, after: right?.name ?? null };
    for (const snapshot of ["before", "after"] as const) {
      const a = left[snapshot], b = right[snapshot];
      for (let syllableIndex = 0; syllableIndex < Math.max(a.length, b.length); syllableIndex++) {
        const change = syllableDifference(a[syllableIndex], b[syllableIndex], { stageIndex, stage: left.name, snapshot, syllableIndex });
        if (change) return change;
      }
    }
  }
  return null;
}

/** Other trace sections are independent records. Their order does not imply the order of generator events. */
function differingSections(before: WordTrace, after: WordTrace) {
  const sections = new Set([...Object.keys(before), ...Object.keys(after)] as (keyof WordTrace)[]);
  return [...sections].sort().flatMap(section => {
    const a = before[section], b = after[section];
    if (isDeepStrictEqual(a, b)) return [];
    let firstIndex: number | null = null;
    if (Array.isArray(a) && Array.isArray(b)) {
      const length = Math.min(a.length, b.length);
      let index = 0;
      while (index < length && isDeepStrictEqual(a[index], b[index])) index++;
      firstIndex = index;
    }
    return [{ section, firstIndex }];
  });
}

export function compareSelectedAttempts(before: number, after: number) {
  const scope: "same-attempt" | "different-winners" = before === after ? "same-attempt" : "different-winners";
  return { scope, before, after };
}

export function traceChanges(before: WordTrace, after: WordTrace) {
  if (!before.selection || !after.selection) throw new Error("Both traces need a selected root attempt.");
  const attemptComparison = compareSelectedAttempts(before.selection.selectedAttempt, after.selection.selectedAttempt);
  const events = (trace: WordTrace, names: readonly string[]) => trace.structural.filter(event => names.includes(event.event));
  const differ = (...names: string[]) => !isDeepStrictEqual(events(before, names), events(after, names));
  const stage = firstStageDifference(before.stages, after.stages);
  return {
    attemptComparison,
    firstStageDifference: stage,
    differingSectionsWithMatchingSnapshots: stage ? null : differingSections(before, after),
    selectedAttempt: attemptComparison.scope === "different-winners",
    retries: before.attempts !== after.attempts || before.selection?.attemptsExecuted !== after.selection?.attemptsExecuted,
    structuralBoundary: differ("boundaryDrop", "risingCodaBoundaryDrop", "sspBoundaryDrop", "junctionBoundaryDrop"),
    vowelHiatus: differ("vowelHiatusFallback", "morphPrefixHiatusFallback", "morphSuffixHiatusFallback", "morphHiatusDecision"),
    aspiration: differ("aspirationDecision"),
  };
}
