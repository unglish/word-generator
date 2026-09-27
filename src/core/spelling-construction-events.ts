import type { BaseSpellingTraceV4 } from "./base-spelling.js";
import type { SharedSpellingEvent } from "./spelling-construction-types.js";
import type { LedgerCursor } from "./spelling-normalization-types.js";

/** Structural ordering only; full replay must still authenticate each referenced decision. */
export function validateSharedEventOrder(trace: BaseSpellingTraceV4): { events: number } {
  const fail = (): never => { throw new Error("Invalid shared spelling event order"); };
  if (trace.version !== 4 || trace.capabilities.sharedConstructions !== 1 || trace.shared.version !== 1) fail();
  const groups: Record<SharedSpellingEvent["kind"], readonly LedgerCursor[]> = {
    attempt: trace.shared.attempts.map(entry => entry.attempt.cursor),
    guard: trace.shared.editGuards.map(entry => entry.cursor),
    transaction: trace.shared.transactions.map(entry => entry.cursor),
    supersession: trace.shared.supersessions.map(entry => entry.cursor),
  };
  const next = { attempt: 0, guard: 0, transaction: 0, supersession: 0 };
  let lastUnit = -1;
  let lastEdit = 0;
  for (const event of trace.shared.events) {
    if (!Object.prototype.hasOwnProperty.call(groups, event.kind) || !Number.isSafeInteger(event.index) ||
        event.index !== next[event.kind]) fail();
    const cursor = groups[event.kind][event.index];
    if (!cursor || !Number.isSafeInteger(event.cursor.lastAppendedUnitId) || !Number.isSafeInteger(event.cursor.nextEditId) ||
        event.cursor.lastAppendedUnitId < lastUnit || event.cursor.lastAppendedUnitId >= trace.units.length ||
        event.cursor.nextEditId < lastEdit || event.cursor.nextEditId > trace.edits.length ||
        cursor.lastAppendedUnitId !== event.cursor.lastAppendedUnitId || cursor.nextEditId !== event.cursor.nextEditId) fail();
    next[event.kind]++;
    lastUnit = cursor.lastAppendedUnitId;
    lastEdit = cursor.nextEditId;
  }
  for (const kind of Object.keys(groups) as Array<SharedSpellingEvent["kind"]>) {
    if (next[kind] !== groups[kind].length) fail();
  }
  return { events: trace.shared.events.length };
}
