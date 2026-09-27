import { createSharedSurfaceGuard } from "./spelling-construction-edit.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import { isSingleOwned } from "./spelling-ownership.js";
import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import type { Grapheme } from "../types.js";
import type { SpellingCell, SpellingPhone, SpellingUnit } from "./base-spelling.js";
import { createGraphemeResolver, NoLegalGraphemeError } from "./grapheme-selection.js";
import type { SpellingBoundaryContext } from "./spelling-context.js";
import { createDoublingModel } from "./spelling-doubling.js";
import type {
  CheckedNormalizationReading, HistoricalSelectionState, LedgerCursor,
  NormalizationRefusal, NormalizationSite, NormalizationSupport,
  Observed, UnitNormalizationCertificate,
} from "./spelling-normalization-types.js";

export interface NormalizationInput {
  cells: readonly SpellingCell[];
  units: readonly SpellingUnit[];
  phones: readonly SpellingPhone[];
  certificates: readonly UnitNormalizationCertificate[];
  contexts: readonly SpellingBoundaryContext[];
  states: readonly HistoricalSelectionState[];
  cursor: LedgerCursor;
  site: NormalizationSite;
  rightIndex: number;
  /** Live producer records, or records authenticated by prior semantic replay. */
  shared?: Pick<ConstructionLedgerView, "constructions" | "certificates">;
}
export type NormalizationPlan = Omit<UnitNormalizationCertificate, "id">;
export type NormalizationDecision =
  | { status: "retained"; reason: NormalizationRefusal }
  | { status: "normalized"; plan: NormalizationPlan };

const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const known = <T>(value: T): Observed<T> => ({ known: true, value });
const owner = (cell: SpellingCell): number | undefined => isSingleOwned(cell.origin) ? cell.origin.unitId : undefined;

/** Local support only. It never rerolls or changes original selection/quota history. */
export function createSpellingNormalizer(
  config: LanguageConfig,
  resolve = createGraphemeResolver(config),
  doubling = createDoublingModel(config.doubling),
  sharedRules?: readonly SharedSpellingRule[],
) {
  const preserveShared = sharedRules === undefined ? undefined : createSharedSurfaceGuard(sharedRules);
  const graphemes = config.graphemes;
  const inventory = new Map(graphemes.map((grapheme, index) => [grapheme, index]));

  function supported(context: SpellingBoundaryContext, state: HistoricalSelectionState) {
    const pool = resolve(context.slot, {
      previousForm: state.previousForm === null ? undefined : state.previousForm,
      doublingCount: state.doublingCount,
    });
    const total = pool.weights.reduce((sum, [, weight]) => sum + weight, 0);
    const result: Array<{ grapheme: Grapheme; reading: Grapheme["reading"]; support: NormalizationSupport; countIncrement: number }> = [];
    if (!(total > 0) || !Number.isFinite(total)) return result;
    for (const [grapheme, weight] of pool.weights) {
      let nucleusForm = state.nucleusForm;
      if (context.slot.position === "onset") nucleusForm = state.previousNucleusForm;
      else if (context.slot.position === "nucleus") nucleusForm = grapheme.form;
      const decision = doubling.describe({ ...context.doubling, form: grapheme.form, nucleusForm }, state.doublingCount);
      const outcomes = decision.kind === "fixed"
        ? [{ form: decision.form, probability: 1, countIncrement: decision.countIncrement }]
        : [
          ...(decision.probability < 100 ? [{ form: decision.form, probability: 1 - decision.probability / 100, countIncrement: 0 }] : []),
          { form: decision.doubledForm, probability: decision.probability / 100, countIncrement: 1 },
        ];
      const graphemeProbability = weight / total;
      for (const outcome of outcomes) {
        if (!(graphemeProbability > 0 && graphemeProbability <= 1) || !Number.isFinite(graphemeProbability) ||
            !(outcome.probability > 0 && outcome.probability <= 1) || !Number.isFinite(outcome.probability)) continue;
        result.push({ grapheme, reading: doubling.readingFor(grapheme, outcome.form), countIncrement: outcome.countIncrement,
          support: { inventoryIndex: inventory.get(grapheme) ?? -1, selected: grapheme.form, afterDoubling: outcome.form,
            effectiveWeight: weight, poolTotal: total, graphemeProbability,
            doublingProbability: outcome.probability, pool: pool.fallback ? "fallback" : "ordinary", quotaRelaxed: !!pool.preferenceRelaxed } });
      }
    }
    return result;
  }

  /** Reconstruct sampled history, not the normalized surface, for certificate replay. */
  function historicalStates(units: readonly SpellingUnit[], contexts: readonly SpellingBoundaryContext[]): HistoricalSelectionState[] {
    const states: HistoricalSelectionState[] = [];
    const state: HistoricalSelectionState = { previousForm: null, doublingCount: 0, nucleusForm: "", previousNucleusForm: "" };
    for (const [id, unit] of units.entries()) {
      states.push({ ...state });
      const context = contexts[id];
      const option = supported(context, state).find(candidate =>
        candidate.support.inventoryIndex === unit.inventoryIndex && candidate.support.selected === unit.selected &&
        candidate.support.afterDoubling === unit.afterDoubling && candidate.countIncrement === unit.doublingIncrement);
      if (!option) throw new Error("Invalid normalization evidence: original selection support");
      state.previousForm = unit.afterDoubling;
      state.doublingCount += option.countIncrement;
      if (context.slot.position === "nucleus") state.nucleusForm = unit.selected;
      if (contexts[id + 1]?.slot.syllableIndex !== context.slot.syllableIndex) {
        state.previousNucleusForm = state.nucleusForm;
        state.nucleusForm = "";
      }
    }
    return states;
  }

  function intact(input: NormalizationInput, unitId: number): { indices: number[]; cells: SpellingCell[]; form: string; source: CheckedNormalizationReading["source"]; grapheme: Grapheme } | undefined {
    const unit = input.units[unitId];
    if (!unit || !equal(unit.phoneIds, [unitId])) return undefined;
    const indices: number[] = [];
    input.cells.forEach((cell, index) => { if (owner(cell) === unitId) indices.push(index); });
    const cells = indices.map(index => input.cells[index]);
    const normalized = [...input.certificates].reverse().find(certificate => certificate.unitId === unitId);
    const form = normalized?.after ?? unit.afterDoubling;
    const index = normalized?.support.inventoryIndex ?? unit.inventoryIndex;
    const grapheme = index === undefined ? undefined : graphemes[index];
    if (!grapheme || cells.length === 0 || cells.length !== form.length || cells.map(cell => cell.text).join("") !== form ||
        cells.some((cell, offset) => indices[offset] !== indices[0] + offset || cell.origin.kind === "rewrite" ||
          cell.origin.offset !== offset || cell.partId !== input.phones[unitId].syllableIndex ||
          (normalized ? cell.origin.kind !== "normalized" || cell.origin.certificateId !== normalized.id : cell.origin.kind !== "selection"))) return undefined;
    const source: CheckedNormalizationReading["source"] = normalized
      ? { kind: "normalization", certificateId: normalized.id }
      : { kind: "selection", inventoryIndex: index! };
    return { indices, cells, form, source, grapheme };
  }

  function readingContext(input: NormalizationInput, cells: readonly SpellingCell[], unitId: number) {
    const indices: number[] = [];
    cells.forEach((cell, index) => { if (owner(cell) === unitId) indices.push(index); });
    const first = indices[0]; const last = indices[indices.length - 1];
    const part = input.phones[unitId].syllableIndex;
    const next = cells[last + 1];
    const unappended = input.phones.slice(input.cursor.lastAppendedUnitId + 1);
    const nextLetter = next ? known(next.text.toLowerCase()) : unappended.length ? { known: false } as const : known("");
    let openPart: Observed<boolean>;
    if (cells.slice(last + 1).some(cell => cell.partId === part)) openPart = known(false);
    else if (unappended.some(phone => phone.syllableIndex === part) || cells.some(cell => cell.partId === null)) openPart = { known: false };
    else openPart = known(true);
    return { previousLetter: known(cells[first - 1]?.text.toLowerCase() ?? ""), nextLetter, openPart };
  }

  function checkNeighbors(input: NormalizationInput, unitId: number, after: string, sharedUnits: ReadonlySet<number>): CheckedNormalizationReading[] | NormalizationRefusal {
    const right = intact(input, unitId)!;
    const leftId = owner(input.cells[right.indices[0] - 1]);
    const parts = new Set([input.phones[unitId].syllableIndex, leftId === undefined ? undefined : input.phones[leftId].syllableIndex]);
    const left = input.cells[right.indices[0] - 1];
    if (left.origin.kind === "shared") {
      for (const id of left.origin.sourceUnitIds) parts.add(input.phones[id].syllableIndex);
    }
    if (input.cells.some(cell => cell.origin.kind === "rewrite" && (cell.partId == null || parts.has(cell.partId)))) return "unresolved-ownership";
    const proposed = input.cells.slice();
    // Context projection uses ownership only; cell IDs remain bound to the original input.
    proposed.splice(right.indices[0], right.cells.length, ...after.split("").map((text, offset) => ({ ...right.cells[0], text,
      origin: { kind: "selection" as const, unitId, offset } })));
    const checked: CheckedNormalizationReading[] = [];
    for (const [id, unit] of input.units.entries()) {
      if (id === unitId || sharedUnits.has(id) || !parts.has(input.phones[id].syllableIndex)) continue;
      const own = intact(input, id);
      if (!own) return "unresolved-ownership";
      const reading = doubling.readingFor(own.grapheme, own.form);
      if (!reading) return "unknown-reading";
      if (reading.kind === "unsupported-construction") return "construction-obligation";
      const context = readingContext(input, proposed, id);
      if (reading.kind === "following-letter") {
        if (!context.nextLetter.known) return "context-unavailable";
        if ((reading.require && !reading.require.includes(context.nextLetter.value)) || reading.forbid?.includes(context.nextLetter.value)) return "construction-obligation";
      }
      if (reading.kind === "open-vowel-or-split-marker") {
        if (!context.openPart.known) return "context-unavailable";
        const slot = input.contexts[id].slot;
        if (slot.position !== "nucleus" || slot.codaLength !== 0 || !context.openPart.value) return "construction-obligation";
      }
      checked.push({ unitId: unit.id, inputCellIds: own.cells.map(cell => cell.id), form: own.form, reading, source: own.source, ...context });
    }
    return checked;
  }

  function sharedContext(input: NormalizationInput): { sharedView?: ConstructionLedgerView; sharedUnits: Set<number> } | NormalizationRefusal {
    const hasShared = input.cells.some(cell => cell.origin.kind === "shared");
    if (hasShared && (!preserveShared || !input.shared)) return "unsupported-shared-construction";
    const sharedUnits = new Set<number>();
    let sharedView: ConstructionLedgerView | undefined;
    if (input.shared) {
      if (!preserveShared) return "unsupported-shared-construction";
      sharedView = { cells: input.cells, units: input.units, phones: input.phones, cursor: input.cursor,
        constructions: input.shared.constructions, certificates: input.shared.certificates, normalizationCertificates: input.certificates };
      const ids = new Set(input.shared.constructions.map(entry => entry.id));
      if (ids.size !== input.shared.constructions.length || input.cells.some(cell => cell.origin.kind === "shared" && !ids.has(cell.origin.constructionId))) return "unresolved-ownership";
      if (preserveShared(sharedView, sharedView, sharedView.constructions).status === "refused") return "construction-obligation";
      for (const construction of sharedView.constructions) {
        for (const id of construction.sourceUnitIds) {
          if (sharedUnits.has(id)) return "unresolved-ownership";
          sharedUnits.add(id);
        }
      }
    }
    return { sharedView, sharedUnits };
  }

  function decide(input: NormalizationInput): NormalizationDecision {
    const refuse = (reason: NormalizationRefusal): NormalizationDecision => ({ status: "retained", reason });
    const left = input.cells[input.rightIndex - 1]; const first = input.cells[input.rightIndex];
    if (!left || !first || left.text !== first.text) throw new Error("Invalid normalization collision");
    if (first.origin.kind === "shared") return refuse("unsupported-shared-construction");
    const shared = sharedContext(input);
    if (typeof shared === "string") return refuse(shared);
    const { sharedView, sharedUnits } = shared;
    if (left.origin.kind === "rewrite" || first.origin.kind === "rewrite") return refuse("unresolved-ownership");
    if (isSingleOwned(left.origin) && left.origin.unitId === first.origin.unitId) return refuse("unsupported-shared-construction");
    const unitId = first.origin.unitId;
    const own = intact(input, unitId);
    if (!own || own.indices[0] !== input.rightIndex) return refuse("unresolved-ownership");
    const after = own.form.slice(1);
    if (!after) return refuse("would-erase-phone");
    const unit = input.units[unitId];
    const state = input.states[unitId];
    let options: ReturnType<typeof supported>;
    try { options = supported(input.contexts[unitId], state).filter(option => option.support.afterDoubling === after); }
    catch (error) { if (error instanceof NoLegalGraphemeError) return refuse("no-legal-remainder"); throw error; }
    if (!options.length) return refuse("no-legal-remainder");
    const option = options.find(candidate => candidate.reading?.kind === "single-phone");
    if (!option) return refuse(options.some(candidate => !candidate.reading) ? "unknown-reading" : "construction-obligation");
    const checkedNeighbors = checkNeighbors(input, unitId, after, sharedUnits);
    if (typeof checkedNeighbors === "string") return refuse(checkedNeighbors);
    const plan: NormalizationPlan = {
      version: 1, kind: "local-unit-normalization", site: input.site, cursor: { ...input.cursor }, editId: input.cursor.nextEditId,
      unitId, phoneIds: unit.phoneIds.slice(), partId: input.phones[unitId].syllableIndex,
      predecessorCellId: left.id, inputCellIds: own.cells.map(cell => cell.id), before: own.form, after,
      originalInventoryIndex: unit.inventoryIndex!, preUnitState: { ...state }, support: option.support,
      targetReading: { kind: "single-phone" }, checkedNeighbors,
      ...(sharedView ? { preservedSharedConstructionIds: sharedView.constructions.map(entry => entry.id) } : {}),
    };
    if (sharedView && preserveShared) {
      const certificateId = input.certificates.length;
      const projected = input.cells.slice();
      projected.splice(own.indices[0], own.cells.length, ...after.split("").map((text, offset): SpellingCell => ({
        id: -1 - offset, text, partId: plan.partId,
        origin: { kind: "normalized", unitId, offset, editId: plan.editId, certificateId, sourceUnitIds: [unitId] },
      })));
      const decision = preserveShared(sharedView, { ...sharedView, cells: projected,
        normalizationCertificates: [...input.certificates, { ...plan, id: certificateId }] }, sharedView.constructions);
      if (decision.status === "refused") return refuse("construction-obligation");
    }
    return { status: "normalized", plan };
  }

  function verify(input: NormalizationInput, plan: NormalizationPlan): void {
    const decision = decide(input);
    if (decision.status !== "normalized" || !equal(decision.plan, plan)) throw new Error("Invalid local normalization certificate");
  }
  return { decide, verify, historicalStates };
}
