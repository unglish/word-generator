import type { BaseSpellingTraceV4 } from "./base-spelling.js";

/** Structural bindings only; event-time ownership, configured support and RNG require semantic replay. */
export function validateSharedFormationBindings(trace: BaseSpellingTraceV4): { formations: number } {
  const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
  function require(condition: unknown): asserts condition {
    if (!condition) throw new Error("Invalid shared formation binding");
  }
  require(trace.version === 4 && trace.capabilities.sharedConstructions === 1 && trace.shared.version === 1);
  const seenEdits = new Set<number>();
  let formations = 0;
  for (const [id, entry] of trace.shared.attempts.entries()) {
    require(entry.id === id && entry.attempt.version === 1);
    const { attempt } = entry;
    const result = attempt.result;
    if (result.status !== "evaluated" || result.trial.status !== "formed") {
      require(entry.constructionId === null);
      continue;
    }
    require(entry.constructionId === formations);
    const construction = trace.shared.constructions[formations];
    require(construction && construction.version === 1 && construction.id === formations && construction.attemptId === id &&
      equal(construction.attempt, attempt) && construction.editId === attempt.cursor.nextEditId);
    const { span, trial } = result;
    require(equal(attempt.sourceUnitIds, span.sourceUnitIds) && equal(construction.sourceUnitIds, span.sourceUnitIds) &&
      equal(construction.phoneIds, span.phoneIds) && equal(construction.inputCellIds, span.inputCellIds) &&
      equal(construction.sourcePartIds, span.sourcePartIds) && construction.displayPartId === span.displayPartId &&
      construction.before === span.before && construction.after === trial.support.form &&
      equal(construction.reading, { kind: "shared-phones", sounds: trial.support.sounds }));
    require(!seenEdits.has(construction.editId));
    seenEdits.add(construction.editId);
    const edit = trace.edits[construction.editId];
    require(edit && edit.id === construction.editId && edit.phase === attempt.slot.phase &&
      edit.rule === `sharedSpelling:${attempt.ruleId}` && edit.start === span.start &&
      edit.before === construction.before && edit.after === construction.after && edit.partId === construction.displayPartId &&
      equal(edit.input.map(cell => cell.id), construction.inputCellIds) &&
      equal(edit.output.map(cell => cell.id), construction.outputCellIds) &&
      edit.input.map(cell => cell.text).join("") === construction.before && edit.output.map(cell => cell.text).join("") === construction.after &&
      edit.input.length === span.end - span.start && edit.output.length === construction.after.length);
    for (const [offset, cell] of edit.output.entries()) {
      require(cell.partId === construction.displayPartId && cell.text.length === 1 && equal(cell.origin, {
        kind: "shared", constructionId: construction.id, editId: edit.id, offset,
        sourceUnitIds: construction.sourceUnitIds, phoneIds: construction.phoneIds,
      }));
    }
    formations++;
  }
  require(formations === trace.shared.constructions.length);
  for (const edit of trace.edits) {
    if (edit.rule.startsWith("sharedSpelling:") || edit.output.some(cell => cell.origin.kind === "shared")) require(seenEdits.has(edit.id));
  }
  return { formations };
}
