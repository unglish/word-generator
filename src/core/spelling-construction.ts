import { createConstructionNeighborGuard } from "./spelling-construction-neighbors.js";
import type { ConstructionNeighborResult } from "./spelling-construction-neighbors.js";
import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import type { RNG } from "../utils/random.js";
import type { LedgerCursor } from "./spelling-normalization-types.js";
import { resolveConstructionSpan } from "./spelling-construction-ownership.js";
import type { CompleteConstructionSpan, ConstructionLedgerView, ConstructionOwnershipRefusal } from "./spelling-construction-ownership.js";
import { createSharedSpellingPolicy } from "./spelling-construction-policy.js";
import type { SharedSpellingContext, SharedSpellingTrial } from "./spelling-construction-policy.js";

export type SharedSpellingSlot = { phase: "word"; partId: null } | { phase: "syllable"; partId: number };
export type SharedConstructionResult =
  | { status: "unavailable"; reason: ConstructionOwnershipRefusal | "outside-scope" }
  | { status: "neighbor-refused"; span: CompleteConstructionSpan; context: SharedSpellingContext; neighbors: Extract<ConstructionNeighborResult, { status: "refused" }> }
  | { status: "evaluated"; span: CompleteConstructionSpan; context: SharedSpellingContext; trial: SharedSpellingTrial;
      neighbors?: Extract<ConstructionNeighborResult, { status: "preserved" }> };

/** Event-time decision only. A formed trial still requires an authenticated atomic ledger commit. */
export interface SharedConstructionAttempt {
  version: 1;
  cursor: LedgerCursor;
  slot: SharedSpellingSlot;
  ruleId: string;
  sourceUnitIds: number[];
  result: SharedConstructionResult;
}

function scopeOffset(view: ConstructionLedgerView, span: CompleteConstructionSpan, slot: SharedSpellingSlot): number | undefined {
  if (slot.phase === "word") return span.start;
  if (span.sourcePartIds.some(part => part !== slot.partId)) return;
  const start = view.cells.findIndex(cell => cell.partId === slot.partId);
  if (start < 0 || view.cells.slice(start, span.end).some(cell => cell.partId !== slot.partId)) return;
  return span.start - start;
}

function validateSlot(slot: SharedSpellingSlot): void {
  if (slot.phase === "word" && slot.partId === null) return;
  if (slot.phase === "syllable" && Number.isSafeInteger(slot.partId) && slot.partId >= 0) return;
  throw new Error("Invalid shared spelling slot");
}

/** Combines live complete ownership with phonological support before any random draw. */
export function createSharedConstructionPlanner(rules: readonly SharedSpellingRule[], readingConfig: Pick<LanguageConfig, "graphemes" | "doubling">) {
  if (!readingConfig) throw new Error("Shared construction planning requires a reading configuration");
  const policy = createSharedSpellingPolicy(rules);
  const checkNeighbors = createConstructionNeighborGuard(readingConfig, rules);

  function decide(view: ConstructionLedgerView, slot: SharedSpellingSlot, ruleId: string,
    sourceUnitIds: readonly number[], rand: RNG): SharedConstructionAttempt {
    validateSlot(slot);
    if (!policy.ruleIds.includes(ruleId)) throw new Error(`Unknown shared spelling rule: ${ruleId}`);
    const cursor = view.cursor;
    if (!Number.isSafeInteger(cursor.lastAppendedUnitId) || cursor.lastAppendedUnitId !== view.units.length - 1 ||
        !Number.isSafeInteger(cursor.nextEditId) || cursor.nextEditId < 0) throw new Error("Invalid shared spelling cursor");
    const attempt = (result: SharedConstructionResult): SharedConstructionAttempt => ({ version: 1,
      cursor: { ...cursor }, slot: { ...slot }, ruleId, sourceUnitIds: [...sourceUnitIds], result });
    const span = resolveConstructionSpan(view, sourceUnitIds);
    if (span.status === "refused") return attempt({ status: "unavailable", reason: span.reason });
    const offset = scopeOffset(view, span, slot);
    if (offset === undefined) return attempt({ status: "unavailable", reason: "outside-scope" });
    const context: SharedSpellingContext = { phase: slot.phase, offsetInScope: offset,
      phonemes: structuredClone(span.phonemes), followingLetter: span.following.known ? span.following.letter : "",
      ...(span.following.known && span.following.phoneme ? { followingPhoneme: structuredClone(span.following.phoneme) } : {}) };
    const support = policy.describe(ruleId, context);
    if (support.status === "refused") return attempt({ status: "evaluated", span, context, trial: support });
    const neighbors = checkNeighbors(view, sourceUnitIds, support.form);
    if (neighbors.status === "refused") return attempt({ status: "neighbor-refused", span, context, neighbors });
    const trial = policy.sample(ruleId, context, rand);
    return attempt({ status: "evaluated", span, context, trial, neighbors });
  }

  /** Replay against authoritative event-time state and slot; never consumes a generator RNG. */
  function verify(view: ConstructionLedgerView, slot: SharedSpellingSlot, ruleId: string,
    sourceUnitIds: readonly number[], attempt: SharedConstructionAttempt): void {
    const trial = attempt.result.status === "evaluated" ? attempt.result.trial : undefined;
    const recordedRoll = trial && trial.status !== "refused" ? trial.roll : undefined;
    const expected = decide(view, slot, ruleId, sourceUnitIds, () => {
      if (recordedRoll === undefined) throw new Error("Missing shared spelling random draw");
      return recordedRoll;
    });
    if (JSON.stringify(attempt) !== JSON.stringify(expected)) throw new Error("Invalid shared spelling attempt");
  }

  return { ruleIds: policy.ruleIds, decide, verify };
}
