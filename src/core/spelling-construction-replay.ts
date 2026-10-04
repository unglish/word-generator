import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import type { BaseSpellingTraceV4, SpellingCell, SpellingEdit } from "./base-spelling.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import type { SharedSpellingEvent } from "./spelling-construction-types.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import { createSharedEditGuard } from "./spelling-construction-edit.js";
import type { SharedEditDecision } from "./spelling-construction-edit.js";
import { editPart, sourceUnits } from "./spelling-ownership.js";

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function require(condition: unknown): asserts condition {
  if (!condition) throw new Error("Invalid shared event replay");
}

/** The enclosing replay authenticates this input state, allocation cursor and scheduled operation. */
export interface SharedReplayInput {
  view: ConstructionLedgerView;
  nextCellId: number;
}
export interface SharedReplayResult extends SharedReplayInput {
  appliedEdits: number;
}

/** Replays one decision. It does not establish completeness or writer-slot scheduling of the event stream. */
export function createSharedEventReplayer(config: Pick<LanguageConfig, "graphemes" | "doubling">, rules: readonly SharedSpellingRule[]) {
  const planner = createSharedConstructionPlanner(rules, config);
  const guard = createSharedEditGuard(rules);
  return (trace: BaseSpellingTraceV4, event: SharedSpellingEvent, input: SharedReplayInput): SharedReplayResult => {
    const { view } = input;
    require(equal(event.cursor, view.cursor) && Number.isSafeInteger(input.nextCellId) && input.nextCellId >= 0);
    const cells = view.cells.slice();
    let nextCellId = input.nextCellId;
    let nextEditId = view.cursor.nextEditId;
    let constructions = [...view.constructions];
    const expectedEdits: SpellingEdit[] = [];

    function rewrite(start: number, deleteCount: number, insert: string, rule: string, phase: SpellingEdit["phase"], partId?: number): void {
      require(Number.isSafeInteger(start) && Number.isSafeInteger(deleteCount) && start >= 0 && deleteCount >= 0 && start + deleteCount <= cells.length);
      const consumed = cells.slice(start, start + deleteCount);
      const sources = [...new Set(consumed.flatMap(cell => [...sourceUnits(cell.origin)]))];
      const part = editPart(consumed, partId);
      const id = nextEditId++;
      const output: SpellingCell[] = insert.split("").map(text => ({ id: nextCellId++, text, partId: part,
        origin: { kind: "rewrite", editId: id, sourceUnitIds: sources, ownership: "unresolved" } }));
      expectedEdits.push({ id, phase, rule, start, input: consumed, output,
        before: consumed.map(cell => cell.text).join(""), after: insert, partId: part });
      cells.splice(start, deleteCount, ...output);
    }

    if (event.kind === "attempt") {
      const entry = trace.shared.attempts[event.index];
      require(entry?.id === event.index && equal(entry.attempt.cursor, event.cursor));
      const attempt = entry.attempt;
      planner.verify(view, attempt.slot, attempt.ruleId, attempt.sourceUnitIds, attempt);
      const result = attempt.result;
      if (result.status === "evaluated" && result.trial.status === "formed") {
        require(entry.constructionId !== null);
        const construction = trace.shared.constructions[entry.constructionId];
        const { span, trial } = result;
        const id = nextEditId++;
        const output: SpellingCell[] = trial.support.form.split("").map((text, offset) => ({ id: nextCellId++, text, partId: span.displayPartId,
          origin: { kind: "shared", constructionId: entry.constructionId!, editId: id, offset,
            sourceUnitIds: [...span.sourceUnitIds], phoneIds: [...span.phoneIds] } }));
        require(equal(construction, { version: 1, id: entry.constructionId, editId: id, attemptId: entry.id,
          sourceUnitIds: span.sourceUnitIds, phoneIds: span.phoneIds, inputCellIds: span.inputCellIds,
          outputCellIds: output.map(cell => cell.id), sourcePartIds: span.sourcePartIds, displayPartId: span.displayPartId,
          before: span.before, after: trial.support.form, reading: { kind: "shared-phones", sounds: trial.support.sounds }, attempt }));
        expectedEdits.push({ id, phase: attempt.slot.phase, rule: `sharedSpelling:${attempt.ruleId}`, start: span.start,
          input: cells.slice(span.start, span.end), output, before: span.before, after: trial.support.form, partId: span.displayPartId });
        cells.splice(span.start, span.end - span.start, ...output);
        constructions.push(structuredClone(construction));
      } else require(entry.constructionId === null);
    } else if (event.kind === "guard") {
      const entry = trace.shared.editGuards[event.index];
      require(entry && equal(entry.cursor, event.cursor) && constructions.length > 0);
      require(cells.slice(entry.start, entry.start + entry.deleteCount).map(cell => cell.text).join("") !== entry.insert);
      const decision = guard(view, constructions, { start: entry.start, deleteCount: entry.deleteCount, insert: entry.insert,
        ...(entry.partId === null ? {} : { partId: entry.partId }) });
      require(equal(decision, entry.decision));
      if (decision.status === "allowed") rewrite(entry.start, entry.deleteCount, entry.insert, entry.rule, entry.phase, entry.partId ?? undefined);
    } else if (event.kind === "transaction") {
      const entry = trace.shared.transactions[event.index];
      require(entry && equal(entry.cursor, event.cursor));
      const checks: SharedEditDecision[] = [];
      let refused = false;
      for (const edit of entry.edits) {
        require(Number.isSafeInteger(edit.start) && Number.isSafeInteger(edit.deleteCount) && edit.start >= 0 && edit.deleteCount >= 0 && edit.start + edit.deleteCount <= cells.length);
        const before = cells.slice(edit.start, edit.start + edit.deleteCount).map(cell => cell.text).join("");
        const decision = before === edit.insert || !constructions.length ? { status: "allowed" as const }
          : guard({ ...view, cells, cursor: { ...view.cursor, nextEditId } }, constructions, edit);
        checks.push(decision);
        if (decision.status === "refused") { refused = true; break; }
        if (before !== edit.insert) rewrite(edit.start, edit.deleteCount, edit.insert, edit.rule, entry.phase, edit.partId);
      }
      require(equal(checks, entry.checks) && entry.status === (refused ? "refused" : "applied"));
      if (refused) return { view, nextCellId: input.nextCellId, appliedEdits: 0 };
    } else if (event.kind === "supersession") {
      const entry = trace.shared.supersessions[event.index];
      require(entry && entry.version === 1 && entry.id === event.index && equal(entry.cursor, event.cursor) && entry.editId === nextEditId &&
        entry.ownership === "unavailable" && entry.rule.startsWith("gapSpelling:") && entry.rule.length > "gapSpelling:".length &&
        entry.before === cells.map(cell => cell.text).join("") && equal(entry.inputCellIds, cells.map(cell => cell.id)) &&
        equal(entry.rootPhoneIds, view.phones.map(phone => phone.id)) && equal(entry.constructionIds, constructions.map(construction => construction.id)));
      rewrite(0, cells.length, entry.after, entry.rule, "gap");
      require(equal(entry.outputCellIds, cells.map(cell => cell.id)));
      constructions = [];
    } else require(false);

    require(equal(expectedEdits, trace.edits.slice(view.cursor.nextEditId, nextEditId)));
    return { view: { ...view, cells, constructions, cursor: { ...view.cursor, nextEditId } }, nextCellId, appliedEdits: expectedEdits.length };
  };
}
