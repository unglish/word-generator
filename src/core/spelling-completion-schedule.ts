import type { BaseSpellingTraceV5 } from "./base-spelling.js";

/** Separate from operation replay: prove one ordered final completion pass and no later root edits. */
export function verifyCompletionSchedule(trace: BaseSpellingTraceV5): { nuclei: number; attempts: number } {
  const fail = (): never => { throw new Error("Invalid completion schedule"); };
  const nuclei = trace.phones.filter(phone => phone.segment === "nucleus").map(phone => phone.id);
  const attempts = trace.completion.attempts;
  if (attempts.length !== nuclei.length) fail();
  const timeline = trace.shared.timeline;
  const positions = timeline.flatMap((entry, index) => entry.kind === "completion-attempt" ? [index] : []);
  if (positions.length !== nuclei.length) fail();
  for (const [index, position] of positions.entries()) {
    const entry = timeline[position];
    const attempt = attempts[index].attempt;
    if (entry.index !== index || attempt.nucleusId !== nuclei[index] ||
        attempt.cursor.lastAppendedUnitId !== trace.phones.length - 1 ||
        entry.cursor.lastAppendedUnitId !== attempt.cursor.lastAppendedUnitId ||
        entry.cursor.nextEditId !== attempt.cursor.nextEditId ||
        (index > 0 && position !== positions[index - 1] + 1)) fail();
  }
  if (positions.length) {
    for (const entry of timeline.slice(positions[positions.length - 1] + 1)) {
      // Whole-root lexical spelling can supersede the completed root after the writer returns.
      if (entry.kind !== "shared") fail();
      const event = trace.shared.events[entry.index];
      if (event?.kind !== "supersession") fail();
      const replacement = trace.shared.supersessions[event.index];
      if (!replacement?.rule.startsWith("gapSpelling:")) fail();
    }
  }
  return { nuclei: nuclei.length, attempts: attempts.length };
}
