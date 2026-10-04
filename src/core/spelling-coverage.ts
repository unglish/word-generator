import type { Grapheme } from "../types.js";
import type { LanguageConfig } from "../config/language.js";
import { validateJunction } from "./junction.js";
import { BaseSpelling } from "./base-spelling.js";
import type { SpellingCell } from "./base-spelling.js";
import { createGraphemeResolver, NoLegalGraphemeError } from "./grapheme-selection.js";
import type { GraphemeSlot } from "./grapheme-selection.js";
import { createDoublingModel } from "./spelling-doubling.js";
import type { DoublingSlot } from "./spelling-doubling.js";
import { measureSpellingBudgets } from "./spelling-budget.js";
import type { SpellingBudgetOutcome, SpellingBudgetRefusal, SpellingChoiceLicense, SpellingCoverageCertificate, SpellingUnitReplacement } from "./spelling-coverage-types.js";

export interface SpellingChoiceState {
  slot: GraphemeSlot;
  doubling: Omit<DoublingSlot, "form" | "nucleusForm">;
  grapheme: Grapheme;
  form: string;
}

interface Option {
  grapheme: Grapheme;
  form: string;
  countIncrement: number;
  license: SpellingChoiceLicense;
}
interface SurfaceCell { text: string; unitId: number | null; partId: number | null }
interface UnitSpan { start: number; end: number; partId: number; cells: SpellingCell[] }

function owner(cell: SpellingCell): number | null {
  return cell.origin.kind === "rewrite" ? null : cell.origin.unitId;
}

function unitSpans(cells: readonly SpellingCell[], choices: SpellingChoiceState[]): Map<number, UnitSpan> {
  const spans = new Map<number, UnitSpan>();
  for (const [unitId, choice] of choices.entries()) {
    const indices: number[] = [];
    cells.forEach((cell, i) => { if (owner(cell) === unitId) indices.push(i); });
    const start = indices[0];
    const selected = indices.map(i => cells[i]);
    if (selected.length !== choice.form.length || selected.length === 0 ||
        selected.some((cell, i) => indices[i] !== start + i || cell.origin.kind === "rewrite" ||
          cell.origin.offset !== i || cell.partId !== choice.slot.syllableIndex) ||
        selected.map(cell => cell.text).join("") !== choice.form) continue;
    spans.set(unitId, { start, end: start + selected.length, partId: choice.slot.syllableIndex, cells: selected });
  }
  return spans;
}

function project(cells: readonly SpellingCell[], spans: Map<number, UnitSpan>, changes: Map<number, string>): SurfaceCell[] {
  const starts = new Map([...spans].map(([id, span]) => [span.start, { id, span }]));
  const result: SurfaceCell[] = [];
  for (let i = 0; i < cells.length;) {
    const entry = starts.get(i);
    const form = entry && changes.get(entry.id);
    if (entry && form !== undefined) {
      for (const text of form) result.push({ text, unitId: entry.id, partId: entry.span.partId });
      i = entry.span.end;
    } else {
      const cell = cells[i++];
      result.push({ text: cell.text, unitId: owner(cell), partId: cell.partId ?? null });
    }
  }
  return result;
}

function readingContext(cells: SurfaceCell[], unitId: number): { previous: string; next: string; open: boolean; neighbors: Array<number | null> } | undefined {
  const own = cells.flatMap((cell, i) => cell.unitId === unitId ? [i] : []);
  if (!own.length) return undefined;
  const end = own[own.length - 1];
  const partId = cells[end].partId;
  return {
    previous: cells[own[0] - 1]?.text.toLowerCase() ?? "",
    next: cells[end + 1]?.text.toLowerCase() ?? "",
    neighbors: [cells[own[0] - 1]?.unitId ?? null, cells[end + 1]?.unitId ?? null],
    open: partId !== null && !cells.slice(end + 1).some(cell => cell.partId === partId || cell.partId === null),
  };
}

function checkReadings(original: SurfaceCell[], proposed: SurfaceCell[], choices: SpellingChoiceState[], options: Option[], changed: Set<number>): SpellingBudgetRefusal | undefined {
  const changedParts = new Set([...changed].map(id => choices[id].slot.syllableIndex));
  if (proposed.some(cell => cell.unitId === null && (cell.partId === null || changedParts.has(cell.partId)))) return "unresolved-ownership";
  for (let unitId = 0; unitId < choices.length; unitId++) {
    const reading = options[unitId].grapheme.reading;
    const samePart = changedParts.has(choices[unitId].slot.syllableIndex);
    if (samePart && !reading) return "unknown-reading";
    if (samePart && reading?.kind === "unsupported-construction") return "construction-obligation";
    const before = readingContext(original, unitId);
    const after = readingContext(proposed, unitId);
    const changedNeighbor = [...(before?.neighbors ?? []), ...(after?.neighbors ?? [])].some(id => id !== null && changed.has(id));
    if (!changed.has(unitId) && !changedNeighbor && before?.previous === after?.previous && before?.next === after?.next && before?.open === after?.open) continue;
    if (!after) return "unresolved-ownership";
    if (!reading) return "unknown-reading";
    if (reading.kind === "unsupported-construction") return "construction-obligation";
    if (reading.kind === "following-letter") {
      if (reading.require && !reading.require.includes(after.next)) return "construction-obligation";
      if (reading.forbid?.includes(after.next)) return "construction-obligation";
    }
    if (reading.kind === "open-vowel-or-split-marker") {
      const slot = choices[unitId].slot;
      // Generic silent-e ancestry cannot certify a split marker. Open realization
      // requires both the phone structure and the final exact written part to be open.
      if (slot.position !== "nucleus" || slot.codaLength !== 0 || !after.open) return "construction-obligation";
    }
  }
  return undefined;
}

function hasInvalidJunction(choices: SpellingChoiceState[], config: LanguageConfig): boolean {
  const syllableCount = choices[0]?.slot.syllableCount ?? 0;
  for (let i = 0; i < syllableCount - 1; i++) {
    const coda = choices.filter(choice => choice.slot.syllableIndex === i && choice.slot.position === "coda").map(choice => choice.slot.phoneme);
    const onset = choices.filter(choice => choice.slot.syllableIndex === i + 1 && choice.slot.position === "onset").map(choice => choice.slot.phoneme);
    if (coda.length && onset.length && !validateJunction(coda, onset, config)) return true;
  }
  return false;
}

/** Deterministic constrained search. Selection RNG is never called here. */
export function createSpellingCoveragePlanner(
  config: LanguageConfig,
  resolve = createGraphemeResolver(config),
  doubling = createDoublingModel(config.doubling),
) {
  const inventory = new Map(config.graphemes.map((grapheme, i) => [grapheme, i]));
  const constraints = config.writtenFormConstraints;

  function optionsFor(choice: SpellingChoiceState, unitId: number, previousForm: string | undefined, count: number, nucleus: string, previousNucleus: string): Option[] {
    const pool = resolve(choice.slot, { previousForm, doublingCount: count });
    const total = pool.weights.reduce((sum, [, weight]) => sum + weight, 0);
    const options: Option[] = [];
    for (const [grapheme, weight] of pool.weights) {
      const decision = doubling.describe({ ...choice.doubling, form: grapheme.form,
        nucleusForm: choice.slot.position === "onset" ? previousNucleus : choice.slot.position === "nucleus" ? grapheme.form : nucleus }, count);
      const outcomes = decision.kind === "fixed"
        ? [{ form: decision.form, probability: 1, countIncrement: decision.countIncrement }]
        : [
          ...(decision.probability < 100 ? [{ form: decision.form, probability: 1 - decision.probability / 100, countIncrement: 0 }] : []),
          { form: decision.doubledForm, probability: decision.probability / 100, countIncrement: 1 },
        ];
      for (const outcome of outcomes) options.push({ grapheme, form: outcome.form, countIncrement: outcome.countIncrement,
        license: { unitId, inventoryIndex: inventory.get(grapheme) ?? -1, selected: grapheme.form, afterDoubling: outcome.form,
          graphemeProbability: weight / total, doublingProbability: outcome.probability,
          pool: pool.fallback ? "fallback" : "ordinary", quotaRelaxed: !!pool.preferenceRelaxed } });
    }
    // The original realization is visited first; all other ties retain inventory/outcome order.
    return options.sort((a, b) => Number(b.grapheme === choice.grapheme && b.form === choice.form) - Number(a.grapheme === choice.grapheme && a.form === choice.form));
  }

  const contextsFor = (choices: SpellingChoiceState[]) => choices.map(choice => ({
    slot: choice.slot, doubling: choice.doubling, inventoryIndex: inventory.get(choice.grapheme) ?? -1, afterDoubling: choice.form,
  }));

  /** Recompute every license and final reading; caller-provided probabilities are not trusted. */
  function verify(base: Pick<BaseSpelling, "current">, choices: SpellingChoiceState[], plan: Omit<SpellingCoverageCertificate, "id">): void {
    const fail = (): never => { throw new Error("Invalid spelling coverage certificate"); };
    const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
    if (plan.version !== 1 || plan.choices.length !== choices.length || !equal(plan.contexts, contextsFor(choices)) || hasInvalidJunction(choices, config)) fail();
    const state = base.current();
    if (!equal(plan.inputCellIds, state.cells.map(cell => cell.id)) ||
        plan.before !== state.cells.map(cell => cell.text).join("")) fail();
    const spans = unitSpans(state.cells, choices);
    const options: Option[] = [];
    const changed = new Set<number>();
    let previousForm: string | undefined;
    let count = 0;
    let nucleus = "";
    let previousNucleus = "";
    let score = 0;
    for (const [i, choice] of choices.entries()) {
      const option = optionsFor(choice, i, previousForm, count, nucleus, previousNucleus)
        .find(candidate => equal(candidate.license, plan.choices[i]));
      if (!option) fail();
      const selected = option!;
      if (selected.grapheme !== choice.grapheme || selected.form !== choice.form) {
        if (!spans.has(i)) fail();
        changed.add(i);
      }
      options.push(selected);
      previousForm = selected.form;
      count += selected.countIncrement;
      if (choice.slot.position === "nucleus") nucleus = selected.grapheme.form;
      if (choices[i + 1]?.slot.syllableIndex !== choice.slot.syllableIndex) { previousNucleus = nucleus; nucleus = ""; }
      score = score + Math.log(selected.license.graphemeProbability) + Math.log(selected.license.doublingProbability);
    }
    const original = project(state.cells, spans, new Map());
    const proposed = project(state.cells, spans, new Map([...changed].map(i => [i, options[i].form])));
    const after = proposed.map(cell => cell.text).join("");
    const budgets = measureSpellingBudgets(after, constraints);
    if (!changed.size || checkReadings(original, proposed, choices, options, changed) ||
        after !== plan.after || score !== plan.logProbability || !equal(plan.budgets, budgets) || budgets.exceeded.length) fail();
    const replacements = [...changed].map(unitId => ({
      unitId, phoneIds: [...state.units[unitId].phoneIds], partId: spans.get(unitId)!.partId,
      inputCellIds: spans.get(unitId)!.cells.map(cell => cell.id), before: choices[unitId].form,
      after: options[unitId].form, reading: options[unitId].grapheme.reading!,
    }));
    if (!equal(plan.replacements, replacements) || !equal(plan.phoneIds, replacements.flatMap(entry => entry.phoneIds))) fail();
  }

  function apply(base: BaseSpelling, choices: SpellingChoiceState[], scope: SpellingBudgetOutcome["scope"], invalidJunction = hasInvalidJunction(choices, config)): SpellingBudgetOutcome {
    const state = base.current();
    const surface = state.cells.map(cell => cell.text).join("");
    const before = measureSpellingBudgets(surface, constraints);
    const common = { version: 1 as const, scope, before, after: before, visitedAssignments: 0, legalOptions: 0,
      unresolvedCells: state.cells.filter(cell => cell.origin.kind === "rewrite").length, changedUnits: [] as number[] };
    if (!invalidJunction && before.exceeded.length === 0) return { ...common, status: "satisfied" };
    const refuse = (reason: SpellingBudgetRefusal, refusals: Partial<Record<SpellingBudgetRefusal, number>>): SpellingBudgetOutcome =>
      ({ ...common, status: "infeasible", reason, refusals });
    if (invalidJunction) return refuse("invalid-junction", { "invalid-junction": 1 });
    if (!base.projectParts(choices[0]?.slot.syllableCount ?? 0)) return refuse("unresolved-ownership", { "unresolved-ownership": 1 });
    const spans = unitSpans(state.cells, choices);
    const originalCells = project(state.cells, spans, new Map());
    const unresolvedParts = new Set(originalCells.filter(cell => cell.unitId === null).map(cell => cell.partId));
    const refusals: Partial<Record<SpellingBudgetRefusal, number>> = {};
    const note = (reason: SpellingBudgetRefusal): void => { refusals[reason] = (refusals[reason] ?? 0) + 1; };
    const selected: Option[] = [];
    const changed = new Set<number>();
    let best: { plan: Omit<SpellingCoverageCertificate, "id">; options: Option[] } | undefined;
    let exhausted = false;

    function evaluate(score: number): void {
      const changes = new Map([...changed].map(id => [id, selected[id].form]));
      const cells = project(state.cells, spans, changes);
      const after = cells.map(cell => cell.text).join("");
      const budgets = measureSpellingBudgets(after, constraints);
      if (budgets.exceeded.length) return;
      const readingRefusal = checkReadings(originalCells, cells, choices, selected, changed);
      if (readingRefusal) { note(readingRefusal); return; }
      const replacements: SpellingUnitReplacement[] = [...changed].sort((a, b) => a - b).map(unitId => ({
        unitId, phoneIds: [...state.units[unitId].phoneIds], partId: spans.get(unitId)!.partId,
        inputCellIds: spans.get(unitId)!.cells.map(cell => cell.id), before: choices[unitId].form,
        after: selected[unitId].form, reading: selected[unitId].grapheme.reading!,
      }));
      const plan: Omit<SpellingCoverageCertificate, "id"> = {
        version: 1, inputCellIds: state.cells.map(cell => cell.id), before: surface, after, replacements,
        choices: selected.map(option => ({ ...option.license })), contexts: structuredClone(contextsFor(choices)), phoneIds: replacements.flatMap(replacement => replacement.phoneIds),
        logProbability: score, budgets,
      };
      if (!best || score > best.plan.logProbability + 1e-12) best = { plan, options: selected.slice() };
    }

    function search(index: number, remaining: number, previousForm: string | undefined, count: number, nucleus: string, previousNucleus: string, score: number): void {
      if (exhausted) return;
      if (common.visitedAssignments >= 8192) { exhausted = true; return; }
      common.visitedAssignments++;
      // Count the assigned state before rejecting a fixed impossibility. Remaining
      // choices cannot supply a missing reading or an owned marker to this unit.
      if (changed.has(index - 1)) {
        const choice = choices[index - 1];
        const reading = selected[index - 1].grapheme.reading;
        if (unresolvedParts.has(choice.slot.syllableIndex)) { note("unresolved-ownership"); return; }
        if (!reading) { note("unknown-reading"); return; }
        if (reading.kind === "unsupported-construction" ||
            (reading.kind === "open-vowel-or-split-marker" && choice.slot.codaLength > 0)) {
          note("construction-obligation"); return;
        }
      }
      if (index === choices.length) { if (remaining === 0) evaluate(score); return; }
      if (remaining > choices.length - index) return;
      let options: Option[];
      try { options = optionsFor(choices[index], index, previousForm, count, nucleus, previousNucleus); }
      catch (error) { if (error instanceof NoLegalGraphemeError) { note("no-licensed-plan"); return; } throw error; }
      common.legalOptions += options.length;
      for (const option of options) {
        const choice = choices[index];
        const isChanged = option.grapheme !== choice.grapheme || option.form !== choice.form;
        if (isChanged && remaining === 0) continue;
        if (isChanged && !spans.has(index)) { note("unresolved-ownership"); continue; }
        if (option.license.inventoryIndex < 0) { note("unknown-reading"); continue; }
        selected[index] = option;
        if (isChanged) changed.add(index);
        let nextNucleus = choice.slot.position === "nucleus" ? option.grapheme.form : nucleus;
        let nextPreviousNucleus = previousNucleus;
        if (choices[index + 1]?.slot.syllableIndex !== choice.slot.syllableIndex) {
          nextPreviousNucleus = nextNucleus; nextNucleus = "";
        }
        search(index + 1, remaining - Number(isChanged), option.form, count + option.countIncrement,
          nextNucleus, nextPreviousNucleus, score + Math.log(option.license.graphemeProbability) + Math.log(option.license.doublingProbability));
        if (isChanged) changed.delete(index);
        if (exhausted) return;
      }
    }

    for (let changes = 1; changes <= spans.size; changes++) {
      search(0, changes, undefined, 0, "", "", 0);
      if (exhausted) return refuse("search-budget", { ...refusals, "search-budget": 1 });
      if (best) {
        verify(base, choices, best.plan);
        const certificateId = base.commitLicensedPlan(best.plan);
        best.options.forEach((option, i) => { choices[i].grapheme = option.grapheme; choices[i].form = option.form; });
        return { ...common, status: "respell", certificateId, logProbability: best.plan.logProbability,
          after: best.plan.budgets, changedUnits: best.plan.replacements.map(replacement => replacement.unitId) };
      }
    }
    const reasons: SpellingBudgetRefusal[] = ["unresolved-ownership", "unknown-reading", "construction-obligation"];
    const reason = reasons.find(reason => refusals[reason]) ?? "no-licensed-plan";
    return refuse(reason, { ...refusals, "no-licensed-plan": 1 });
  }
  return { apply, verify };
}
