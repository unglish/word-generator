import { createSharedEditGuard } from "./spelling-construction-edit.js";
import type { SharedEditDecision } from "./spelling-construction-edit.js";
import { editPart, isSingleOwned, sourceUnits } from "./spelling-ownership.js";
import type { LanguageConfig, SharedSpellingRule } from "../config/language.js";
import { createSharedConstructionPlanner } from "./spelling-construction.js";
import type { SharedConstructionAttempt, SharedSpellingSlot } from "./spelling-construction.js";
import type { SharedCellOrigin, SharedSpellingConstruction, SharedSpellingSupersession, SharedSpellingEvent } from "./spelling-construction-types.js";
import type { ConstructionLedgerView } from "./spelling-construction-ownership.js";
import type { Phoneme } from "../types.js";
import type { SpellingCoverageCertificate } from "./spelling-coverage-types.js";
import type { NormalizationDecision, NormalizationPlan } from "./spelling-normalization.js";
import type { LedgerCursor, NormalizationSite, NormalizedCellOrigin, UnitNormalizationCertificate, UnitNormalizationCheck, UnitNormalizationEpisode, UnitNormalizationObservation } from "./spelling-normalization-types.js";

/** Exact base-word edit provenance. Offsets are JavaScript UTF-16 string offsets. */
export interface SpellingPhone {
  id: number;
  part: "root";
  syllableIndex: number;
  segment: "onset" | "nucleus" | "coda";
  segmentIndex: number;
  soundAtSpelling: string;
  /** V2 and later: detached actual writer input, independent of certificate claims. */
  boundary?: { phoneme: Phoneme; stress?: string };
}

export interface SpellingUnit {
  id: number;
  choiceId: number;
  phoneIds: number[];
  selected: string;
  afterDoubling: string;
  sourceCellIds: number[];
  /** V2 and later: actual inventory choice at selection, before repairs. */
  inventoryIndex?: number;
  /** V3: actual quota increment around the existing doubling sampler, even for equal-text outcomes. */
  doublingIncrement?: number;
}

export interface SpellingUnitV3 extends SpellingUnit {
  doublingIncrement: 0 | 1;
}

export type SpellingCellOrigin =
  | SharedCellOrigin
  | NormalizedCellOrigin
  | { kind: "selection"; unitId: number; offset: number }
  | { kind: "licensed"; unitId: number; offset: number; editId: number; certificateId: number; sourceUnitIds: number[] }
  | {
      kind: "rewrite";
      editId: number;
      sourceUnitIds: number[];
      ownership: "unresolved";
    };

export interface SpellingCell {
  id: number;
  text: string;
  origin: SpellingCellOrigin;
  /** V1: unavailable. V2 and later: exact write-operation part, or null after a cross-part rewrite. */
  partId?: number | null;
}

export interface SpellingEdit {
  phase: "selection" | "syllable" | "word" | "gap";
  id: number;
  rule: string;
  start: number;
  input: SpellingCell[];
  output: SpellingCell[];
  before: string;
  after: string;
  /** Actual operation part in v2 and later; null when a rewrite crosses part boundaries. */
  partId?: number | null;
}

interface BaseSpellingTraceData {
  scope: "root-before-morphology" | "bare-after-gap-spelling";
  surface: string;
  phones: SpellingPhone[];
  units: SpellingUnit[];
  cells: SpellingCell[];
  edits: SpellingEdit[];
  /** Generic rewrite cells retain exact ancestry, not licensed phone ownership. */
  unresolvedCells: number;
}
export interface BaseSpellingTraceV1 extends BaseSpellingTraceData {
  version: 1;
  capabilities?: never;
  certificates?: never;
  normalizationCertificates?: never;
  normalization?: never;
}
export interface BaseSpellingTraceV2 extends BaseSpellingTraceData {
  version: 2;
  capabilities: { exactParts: 1; licensedOrigins: 1; writerBoundary: 1 };
  certificates: SpellingCoverageCertificate[];
  normalizationCertificates?: never;
  normalization?: never;
}
export interface BaseSpellingTraceV3 extends BaseSpellingTraceData {
  version: 3;
  units: SpellingUnitV3[];
  capabilities: { exactParts: 1; licensedOrigins: 1; writerBoundary: 1; unitNormalization: 1 };
  certificates: SpellingCoverageCertificate[];
  normalizationCertificates: UnitNormalizationCertificate[];
  normalization: UnitNormalizationObservation;
}
export interface BaseSpellingTraceV4 extends Omit<BaseSpellingTraceV3, "version" | "capabilities"> {
  version: 4;
  capabilities: BaseSpellingTraceV3["capabilities"] & { sharedConstructions: 1 };
  shared: {
    version: 1;
    events: SharedSpellingEvent[];
    attempts: Array<{ id: number; attempt: SharedConstructionAttempt; constructionId: number | null }>;
    constructions: SharedSpellingConstruction[];
    supersessions: SharedSpellingSupersession[];
    liveConstructionIds: number[];
    transactions: SpellingEditTransaction[];
    editGuards: Array<{ cursor: LedgerCursor; phase: SpellingEdit["phase"]; rule: string; start: number; deleteCount: number; insert: string; partId: number | null; decision: SharedEditDecision }>;
  };
}
export type BaseSpellingTrace = BaseSpellingTraceV1 | BaseSpellingTraceV2 | BaseSpellingTraceV3 | BaseSpellingTraceV4;

export type SpellingEditObserver = (
  start: number,
  deleteCount: number,
  insert: string,
  rule: string,
) => void | boolean;
export interface PartSpellingBatchEdit { part: number; start: number; deleteCount: number; insert: string; rule: string }
export type PartEditObserver = ((
  part: number,
  start: number,
  deleteCount: number,
  insert: string,
  rule: string,
) => void | boolean) & { batch?: (edits: readonly PartSpellingBatchEdit[]) => boolean };

export interface SpellingBatchEdit {
  start: number;
  deleteCount: number;
  insert: string;
  rule: string;
  partId?: number;
}
export interface SpellingEditTransaction {
  cursor: LedgerCursor;
  phase: SpellingEdit["phase"];
  edits: SpellingBatchEdit[];
  checks: SharedEditDecision[];
  status: "applied" | "refused";
}

function rewriteCells(input: readonly SpellingCell[], insert: string, editId: number,
  nextCellId: number, partId: number | null, licensed: boolean): SpellingCell[] {
  const sourceUnitIds = [...new Set(input.flatMap(cell => [...sourceUnits(cell.origin)]))];
  return insert.split("").map((text, offset) => ({ id: nextCellId + offset, text,
    ...(licensed ? { partId } : {}),
    origin: { kind: "rewrite", editId, sourceUnitIds, ownership: "unresolved" },
  }));
}

/** Live units/cells exist independently of tracing; only discarded edit history is optional. */
export class BaseSpelling {
  private cells: SpellingCell[] = [];
  private units: SpellingUnit[] = [];
  private readonly certificates: SpellingCoverageCertificate[] = [];
  private readonly normalizationCertificates: UnitNormalizationCertificate[] = [];
  private readonly normalizationComparisons = { "adjacent-choice": 0, "syllable-join": 0 };
  private readonly normalizationCollisions = { "adjacent-choice": 0, "syllable-join": 0 };
  private readonly normalizationChecks?: UnitNormalizationCheck[];
  private readonly normalizationEpisodes?: UnitNormalizationEpisode[];
  private nextNormalizationEpisodeId = 0;
  private readonly sharedPlanner?: ReturnType<typeof createSharedConstructionPlanner>;
  private readonly sharedConstructions: SharedSpellingConstruction[] = [];
  private readonly sharedAttempts?: BaseSpellingTraceV4["shared"]["attempts"];
  private readonly sharedEditGuard?: ReturnType<typeof createSharedEditGuard>;
  private readonly sharedEditGuards?: BaseSpellingTraceV4["shared"]["editGuards"];
  private readonly sharedSupersessions: SharedSpellingSupersession[] = [];
  private readonly supersededConstructions = new Set<number>();
  private readonly sharedTransactions?: SpellingEditTransaction[];
  private readonly sharedEvents?: SharedSpellingEvent[];
  private nextSharedAttemptId = 0;
  private nextCellId = 0;
  private nextEditId = 0;
  private readonly edits?: SpellingEdit[];
  private phase: SpellingEdit["phase"] = "selection";
  private scope: BaseSpellingTrace["scope"] = "root-before-morphology";

  constructor(
    private readonly phones: SpellingPhone[],
    retainHistory: boolean,
    private readonly licensed = false,
    private readonly normalizeUnits = false,
    sharedRules?: readonly SharedSpellingRule[],
    readingConfig?: Pick<LanguageConfig, "graphemes" | "doubling">,
  ) {
    if (sharedRules !== undefined) {
      if (!normalizeUnits || !licensed) throw new Error("Shared spelling requires normalized spelling provenance");
      if (!readingConfig) throw new Error("Shared spelling requires a reading configuration");
      this.sharedPlanner = createSharedConstructionPlanner(sharedRules, readingConfig);
      this.sharedEditGuard = createSharedEditGuard(sharedRules);
      if (retainHistory) {
        this.sharedEditGuards = [];
        this.sharedTransactions = [];
        this.sharedAttempts = [];
        this.sharedEvents = [];
      }
    }
    if (normalizeUnits && !licensed) throw new Error("Unit normalization requires licensed spelling provenance");
    if (retainHistory) {
      this.edits = [];
      if (normalizeUnits) { this.normalizationEpisodes = []; this.normalizationChecks = []; }
    }
  }

  appendChoice(
    choiceId: number,
    selected: string,
    afterDoubling: string,
    inventoryIndex?: number,
    doublingIncrement?: number,
  ): void {
    if (this.normalizeUnits && doublingIncrement !== 0 && doublingIncrement !== 1) {
      throw new Error("Missing actual doubling increment");
    }
    this.phase = "selection";
    const id = this.units.length;
    const cells = afterDoubling.split("").map(
      (text, offset): SpellingCell => ({
        id: this.nextCellId++,
        text,
        origin: { kind: "selection", unitId: id, offset },
        ...(this.licensed ? { partId: this.phones[choiceId].syllableIndex } : {}),
      }),
    );
    this.units.push({
      id,
      choiceId,
      phoneIds: [choiceId],
      selected,
      afterDoubling,
      ...(this.licensed ? { inventoryIndex } : {}),
      ...(this.normalizeUnits ? { doublingIncrement } : {}),
      sourceCellIds: cells.map((cell) => cell.id),
    });
    this.cells.push(...cells);
  }

  get length(): number {
    return this.cells.length;
  }

  edit(start: number, deleteCount: number, insert: string, rule: string, partId?: number): boolean {
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(deleteCount) ||
      start < 0 ||
      deleteCount < 0 ||
      start + deleteCount > this.cells.length
    ) {
      throw new Error(`Invalid base-spelling edit range: ${rule}`);
    }
    const input = this.cells.slice(start, start + deleteCount);
    const before = input.map((cell) => cell.text).join("");
    if (before === insert) return true;
    if (this.sharedEditGuard && this.supersededConstructions.size < this.sharedConstructions.length) {
      const liveConstructions = this.liveConstructions();
      const decision = this.sharedEditGuard(this.constructionState(), liveConstructions, { start, deleteCount, insert, partId });
      this.sharedEditGuards?.push({ cursor: this.constructionState().cursor, phase: this.phase, rule, start, deleteCount, insert, partId: partId ?? null, decision });
      this.recordSharedEvent("guard", (this.sharedEditGuards?.length ?? 1) - 1, this.constructionState().cursor);
      if (decision.status === "refused") return false;
    }
    this.commitRewrite(start, input, before, insert, rule, partId);
    return true;
  }

  /** Coordinates refer to the evolving surface; no step is committed unless all are accepted. */
  editBatch(edits: readonly SpellingBatchEdit[]): boolean {
    const cells = this.cells.slice();
    let nextEditId = this.nextEditId;
    let nextCellId = this.nextCellId;
    const checks: SharedEditDecision[] = [];
    const liveConstructions = this.sharedEditGuard ? this.liveConstructions() : [];
    const cursor = this.constructionState().cursor;
    const prepared: Array<{ edit: SpellingBatchEdit; input: SpellingCell[]; before: string }> = [];
    for (const edit of edits) {
      const { start, deleteCount, insert, partId } = edit;
      if (!Number.isInteger(start) || !Number.isInteger(deleteCount) || start < 0 || deleteCount < 0 ||
          start + deleteCount > cells.length) throw new Error(`Invalid base-spelling batch range: ${edit.rule}`);
      const input = cells.slice(start, start + deleteCount);
      const before = input.map(cell => cell.text).join("");
      const decision: SharedEditDecision = before === insert || !this.sharedEditGuard || !liveConstructions.length
        ? { status: "allowed" }
        : this.sharedEditGuard({ ...this.constructionState(), cells, cursor: { ...cursor, nextEditId } }, liveConstructions, edit);
      checks.push(decision);
      if (decision.status === "refused") {
        this.sharedTransactions?.push(structuredClone({ cursor, phase: this.phase, edits: [...edits], checks, status: "refused" }));
        this.recordSharedEvent("transaction", (this.sharedTransactions?.length ?? 1) - 1, cursor);
        return false;
      }
      if (before === insert) continue;
      prepared.push({ edit, input, before });
      const output = rewriteCells(input, insert, nextEditId++, nextCellId, editPart(input, partId), this.licensed);
      nextCellId += output.length;
      cells.splice(start, deleteCount, ...output);
    }
    for (const { edit, input, before } of prepared) this.commitRewrite(edit.start, input, before, edit.insert, edit.rule, edit.partId);
    this.sharedTransactions?.push(structuredClone({ cursor, phase: this.phase, edits: [...edits], checks, status: "applied" }));
    this.recordSharedEvent("transaction", (this.sharedTransactions?.length ?? 1) - 1, cursor);
    return true;
  }

  private recordSharedEvent(kind: SharedSpellingEvent["kind"], index: number, cursor: LedgerCursor): void {
    this.sharedEvents?.push({ kind, index, cursor: { ...cursor } });
  }

  private liveConstructions(): SharedSpellingConstruction[] {
    return this.sharedConstructions.filter(construction => !this.supersededConstructions.has(construction.id));
  }

  /** Validated callers choose whether an identical-text replacement is a semantic edit. */
  private commitRewrite(start: number, input: SpellingCell[], before: string, insert: string, rule: string, partId?: number): void {
    const id = this.nextEditId++;
    const resolvedPart = editPart(input, partId);
    const output = rewriteCells(input, insert, id, this.nextCellId, resolvedPart, this.licensed);
    this.nextCellId += output.length;
    this.cells.splice(start, input.length, ...output);
    this.edits?.push({
      id,
      phase: this.phase,
      rule,
      start,
      input,
      output,
      before,
      after: insert,
      ...(this.licensed ? { partId: resolvedPart } : {}),
    });
  }

  observe(offset = 0, partId?: number): SpellingEditObserver {
    return (start, deleteCount, insert, rule) =>
      this.edit(offset + start, deleteCount, insert, rule, partId);
  }

  observeParts(parts: string[]): PartEditObserver {
    const observe: PartEditObserver = (part, start, deleteCount, insert, rule) => {
      let offset = start;
      for (let i = 0; i < part; i++) offset += parts[i].length;
      return this.edit(offset, deleteCount, insert, rule, part);
    };
    observe.batch = edits => {
      this.assertSurface(parts.join(""));
      const projected = [...parts];
      const absolute: SpellingBatchEdit[] = [];
      for (const edit of edits) {
        const part = projected[edit.part];
        if (!Number.isInteger(edit.part) || part === undefined || edit.start < 0 || edit.deleteCount < 0 ||
            edit.start + edit.deleteCount > part.length) throw new Error("Invalid part batch range");
        const offset = projected.slice(0, edit.part).reduce((sum, value) => sum + value.length, 0);
        absolute.push({ start: offset + edit.start, deleteCount: edit.deleteCount, insert: edit.insert, rule: edit.rule, partId: edit.part });
        projected[edit.part] = part.slice(0, edit.start) + edit.insert + part.slice(edit.start + edit.deleteCount);
      }
      return this.editBatch(absolute);
    };
    return observe;
  }

  setPhase(phase: SpellingEdit["phase"]): void {
    this.phase = phase;
  }

  markGapSpelling(): void {
    this.scope = "bare-after-gap-spelling";
    this.phase = "gap";
  }

  replaceWithGapSpelling(before: string, after: string, name: string): void {
    this.assertSurface(before);
    const rule = `gapSpelling:${name}`;
    if (!this.sharedPlanner) {
      this.markGapSpelling();
      this.edit(0, before.length, after, rule);
      return;
    }
    if (typeof after !== "string" || typeof name !== "string" || !name) throw new Error("Invalid gap spelling replacement");
    const constructionIds = this.liveConstructions().map(construction => construction.id);
    const cursor = this.constructionState().cursor;
    const inputCellIds = this.cells.map(cell => cell.id);
    const outputCellIds = after.split("").map((_, offset) => this.nextCellId + offset);
    const supersession: SharedSpellingSupersession = { version: 1, id: this.sharedSupersessions.length,
      cursor, editId: cursor.nextEditId, rule, constructionIds, rootPhoneIds: this.phones.map(phone => phone.id),
      inputCellIds, outputCellIds, before, after, ownership: "unavailable" };
    this.markGapSpelling();
    this.commitRewrite(0, this.cells.slice(), before, after, rule);
    for (const id of constructionIds) this.supersededConstructions.add(id);
    this.sharedSupersessions.push(supersession);
    this.recordSharedEvent("supersession", supersession.id, cursor);
  }

  assertSurface(surface: string): void {
    if (this.cells.map((cell) => cell.text).join("") !== surface)
      throw new Error("Unrecorded base-spelling edit.");
  }

  /** Internal planner view; callers must not mutate the live cells or units. */
  current(): { cells: readonly SpellingCell[]; units: readonly SpellingUnit[]; phones: readonly SpellingPhone[]; normalizationCount?: number } {
    return { cells: this.cells, units: this.units, phones: this.phones,
      ...(this.normalizeUnits ? { normalizationCount: this.normalizationCertificates.length } : {}) };
  }

  /** Read-only live construction input; prior licenses were checked when committed. */
  constructionState(): ConstructionLedgerView {
    return { cells: this.cells, units: this.units, phones: this.phones,
      cursor: { lastAppendedUnitId: this.units.length - 1, nextEditId: this.nextEditId },
      certificates: this.certificates, normalizationCertificates: this.normalizationCertificates };
  }

  normalizationState(): { cursor: LedgerCursor; certificates: readonly UnitNormalizationCertificate[] } {
    return { cursor: { lastAppendedUnitId: this.units.length - 1, nextEditId: this.nextEditId }, certificates: this.normalizationCertificates };
  }

  recordNormalizationCheck(site: NormalizationSite, compared: boolean): void {
    if (!this.normalizeUnits) throw new Error("Missing normalization capability");
    this.normalizationChecks?.push({ site, cursor: this.normalizationState().cursor });
    if (compared) this.normalizationComparisons[site]++;
  }

  recordNormalization(site: NormalizationSite, rightIndex: number, decision: NormalizationDecision): void {
    if (!this.normalizeUnits) throw new Error("Missing normalization capability");
    const first = this.cells[rightIndex];
    const previous = this.cells[rightIndex - 1];
    if (!first || !previous || first.text !== previous.text) throw new Error("Invalid normalization collision");
    const cursor = this.normalizationState().cursor;
    if (decision.status === "normalized" && (decision.plan.site !== site || decision.plan.inputCellIds[0] !== first.id)) {
      throw new Error("Mismatched normalization application point");
    }
    const outcome = decision.status === "normalized"
      ? { status: "normalized" as const, certificateId: this.commitNormalization(decision.plan) }
      : { status: "retained" as const, reason: decision.reason };
    this.normalizationCollisions[site]++;
    const id = this.nextNormalizationEpisodeId++;
    this.normalizationEpisodes?.push({ version: 1, id, site, cursor,
      predecessorCellId: previous.id, rightCellId: first.id,
      rightUnitId: !isSingleOwned(first.origin) ? null : first.origin.unitId, outcome });
  }

  /** Revalidate against live state before committing cells, IDs, certificates or attempts. */
  recordSharedAttempt(slot: SharedSpellingSlot, ruleId: string, sourceUnitIds: readonly number[], attempt: SharedConstructionAttempt): number | null {
    if (!this.sharedPlanner || this.phase !== slot.phase) throw new Error("Missing shared spelling capability or phase");
    this.sharedPlanner.verify(this.constructionState(), slot, ruleId, sourceUnitIds, attempt);
    const result = attempt.result;
    let constructionId: number | null = null;
    if (result.status === "evaluated" && result.trial.status === "formed") {
      const { span, trial } = result;
      const id = this.sharedConstructions.length;
      const editId = this.nextEditId;
      const input = this.cells.slice(span.start, span.end);
      const output = trial.support.form.split("").map((text, offset): SpellingCell => ({
        id: this.nextCellId + offset, text, partId: span.displayPartId,
        origin: { kind: "shared", constructionId: id, editId, offset,
          sourceUnitIds: [...span.sourceUnitIds], phoneIds: [...span.phoneIds] },
      }));
      const construction: SharedSpellingConstruction = structuredClone({ version: 1, id, editId,
        attemptId: this.nextSharedAttemptId, sourceUnitIds: span.sourceUnitIds, phoneIds: span.phoneIds,
        inputCellIds: span.inputCellIds, outputCellIds: output.map(cell => cell.id),
        sourcePartIds: span.sourcePartIds, displayPartId: span.displayPartId,
        before: span.before, after: trial.support.form,
        reading: { kind: "shared-phones", sounds: trial.support.sounds }, attempt });
      this.cells.splice(span.start, input.length, ...output);
      this.nextCellId += output.length;
      this.nextEditId++;
      this.sharedConstructions.push(construction);
      this.edits?.push({ id: editId, phase: this.phase, rule: `sharedSpelling:${ruleId}`, start: span.start,
        input, output, before: span.before, after: trial.support.form, partId: span.displayPartId });
      constructionId = id;
    }
    this.sharedAttempts?.push({ id: this.nextSharedAttemptId, attempt: structuredClone(attempt), constructionId });
    this.recordSharedEvent("attempt", this.nextSharedAttemptId, attempt.cursor);
    this.nextSharedAttemptId++;
    return constructionId;
  }

  /** Caller authenticates support; this atomic commit separately validates cell/phone structure. */
  commitNormalization(plan: NormalizationPlan): number {
    const fail = (): never => { throw new Error("Invalid local normalization certificate"); };
    const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
    const unit = this.units[plan.unitId];
    const cursor = this.normalizationState().cursor;
    if (!this.normalizeUnits || plan.version !== 1 || plan.kind !== "local-unit-normalization" || !unit ||
        !equal(plan.cursor, cursor) || plan.editId !== cursor.nextEditId ||
        !equal(plan.phoneIds, unit.phoneIds) || !equal(unit.phoneIds, [unit.id]) ||
        plan.originalInventoryIndex !== unit.inventoryIndex || plan.partId !== this.phones[unit.id].syllableIndex ||
        !plan.after || plan.after !== plan.before.slice(1)) fail();
    const support = plan.support;
    if (!(support.effectiveWeight > 0) || !Number.isFinite(support.effectiveWeight) ||
        !(support.poolTotal > 0) || !Number.isFinite(support.poolTotal) ||
        !(support.graphemeProbability > 0 && support.graphemeProbability <= 1) || !Number.isFinite(support.graphemeProbability) ||
        support.graphemeProbability !== support.effectiveWeight / support.poolTotal ||
        !(support.doublingProbability > 0 && support.doublingProbability <= 1) || !Number.isFinite(support.doublingProbability) ||
        support.afterDoubling !== plan.after || !Number.isInteger(support.inventoryIndex) || support.inventoryIndex < 0 ||
        plan.targetReading.kind !== "single-phone") fail();
    const start = this.cells.findIndex(cell => cell.id === plan.inputCellIds[0]);
    const input = this.cells.slice(start, start + plan.inputCellIds.length);
    const owned = this.cells.filter(cell => isSingleOwned(cell.origin) && cell.origin.unitId === unit.id);
    const previous = this.cells[start - 1];
    const prior = [...this.normalizationCertificates].reverse().find(certificate => certificate.unitId === unit.id);
    if (start < 1 || !previous || previous.id !== plan.predecessorCellId || previous.text !== input[0]?.text ||
        plan.before !== (prior?.after ?? unit.afterDoubling) || owned.length !== input.length || !input.length ||
        input.map(cell => cell.text).join("") !== plan.before ||
        input.some((cell, offset) => cell.id !== plan.inputCellIds[offset] || !isSingleOwned(cell.origin) ||
          cell.origin.kind === "licensed" || cell.origin.unitId !== unit.id || cell.origin.offset !== offset || cell.partId !== plan.partId ||
          (prior ? cell.origin.kind !== "normalized" || cell.origin.certificateId !== prior.id : cell.origin.kind !== "selection"))) fail();
    const certificateId = this.normalizationCertificates.length;
    const certificate = structuredClone({ ...plan, id: certificateId });
    const editId = this.nextEditId++;
    const output = plan.after.split("").map((text, offset): SpellingCell => ({
      id: this.nextCellId++, text, partId: plan.partId,
      origin: { kind: "normalized", unitId: unit.id, offset, editId, certificateId, sourceUnitIds: [unit.id] },
    }));
    this.cells.splice(start, input.length, ...output);
    this.edits?.push({ id: editId, phase: this.phase, rule: `unitNormalization:${plan.site}`, start,
      input, output, before: plan.before, after: plan.after, partId: plan.partId });
    this.normalizationCertificates.push(certificate);
    return certificateId;
  }

  /** Structural validation precedes every mutation, including ID advancement. */
  commitLicensedPlan(plan: Omit<SpellingCoverageCertificate, "id">): number {
    const fail = (): never => { throw new Error("Invalid spelling coverage certificate"); };
    if (!this.licensed || plan.version !== 1 || plan.budgets.exceeded.length > 0 || this.normalizationCertificates.length > 0) fail();
    if (plan.before !== this.cells.map(cell => cell.text).join("") ||
        plan.inputCellIds.length !== this.cells.length ||
        plan.inputCellIds.some((id, i) => id !== this.cells[i].id)) fail();
    const replacements = [...plan.replacements].sort((a, b) => a.unitId - b.unitId);
    const phoneIds: number[] = [];
    const ranges: Array<{ start: number; count: number; replacement: typeof replacements[number] }> = [];
    let previousEnd = -1;
    const seen = new Set<number>();
    for (const replacement of replacements) {
      const unit = this.units[replacement.unitId];
      if (!unit || seen.has(unit.id) || replacement.after.length === 0) fail();
      seen.add(unit.id);
      if (JSON.stringify(unit.phoneIds) !== JSON.stringify(replacement.phoneIds)) fail();
      const previousLicense = [...this.certificates].reverse().find(certificate => certificate.replacements.some(entry => entry.unitId === unit.id));
      const currentForm = previousLicense?.replacements.find(entry => entry.unitId === unit.id)?.after ?? unit.afterDoubling;
      if (replacement.before !== currentForm) fail();
      const owned = this.cells.filter(cell => isSingleOwned(cell.origin) && cell.origin.unitId === unit.id);
      const start = this.cells.findIndex(cell => cell.id === replacement.inputCellIds[0]);
      const input = this.cells.slice(start, start + replacement.inputCellIds.length);
      if (start < previousEnd || owned.length !== input.length || input.length === 0 ||
          input.some((cell, i) => cell.id !== replacement.inputCellIds[i] || !isSingleOwned(cell.origin) ||
            cell.origin.unitId !== unit.id || cell.origin.offset !== i || cell.partId !== replacement.partId) ||
          input.map(cell => cell.text).join("") !== replacement.before ||
          replacement.partId !== this.phones[unit.phoneIds[0]].syllableIndex) fail();
      const choice = plan.choices[unit.choiceId];
      if (!choice || choice.unitId !== unit.id || choice.afterDoubling !== replacement.after ||
          !(choice.graphemeProbability > 0 && choice.graphemeProbability <= 1) ||
          !(choice.doublingProbability > 0 && choice.doublingProbability <= 1)) fail();
      phoneIds.push(...unit.phoneIds);
      ranges.push({ start, count: input.length, replacement });
      previousEnd = start + input.length;
    }
    if (replacements.length === 0 || JSON.stringify(phoneIds) !== JSON.stringify(plan.phoneIds) ||
        plan.choices.length !== this.units.length || plan.choices.some((choice, i) => choice.unitId !== i) ||
        !Number.isFinite(plan.logProbability)) fail();
    let surface = plan.before;
    for (const { start, count, replacement } of [...ranges].reverse()) {
      surface = surface.slice(0, start) + replacement.after + surface.slice(start + count);
    }
    if (surface !== plan.after) fail();

    const certificateId = this.certificates.length;
    for (const { start, count, replacement } of ranges.reverse()) {
      const editId = this.nextEditId++;
      const input = this.cells.slice(start, start + count);
      const output = replacement.after.split("").map((text, offset): SpellingCell => ({
        id: this.nextCellId++, text, partId: replacement.partId,
        origin: { kind: "licensed", unitId: replacement.unitId, offset, editId, certificateId, sourceUnitIds: [replacement.unitId] },
      }));
      this.cells.splice(start, count, ...output);
      this.edits?.push({ id: editId, phase: this.phase, rule: "spellingBudget:respell", start,
        input, output, before: replacement.before, after: replacement.after, partId: replacement.partId });
    }
    this.certificates.push(structuredClone({ ...plan, id: certificateId }));
    return certificateId;
  }

  /** Project exactly known syllable parts; unresolved cross-part rewrites cannot be guessed. */
  projectParts(count: number): string[] | undefined {
    const parts = Array.from({ length: count }, () => "");
    let previous = 0;
    for (const cell of this.cells) {
      if (cell.partId == null || cell.partId < previous || cell.partId >= count) return undefined;
      parts[cell.partId] += cell.text;
      previous = cell.partId;
    }
    return parts;
  }

  snapshot(): BaseSpellingTrace {
    const data: BaseSpellingTraceData = {
      scope: this.scope,
      surface: this.cells.map((cell) => cell.text).join(""),
      phones: this.phones,
      units: this.units.slice(),
      cells: this.cells.slice(),
      edits: this.edits?.slice() ?? [],
      unresolvedCells: this.cells.filter(cell => cell.origin.kind === "rewrite").length,
    };
    if (!this.licensed) return { version: 1, ...data };
    const capabilities = { exactParts: 1 as const, licensedOrigins: 1 as const, writerBoundary: 1 as const };
    if (this.normalizeUnits) {
      const units: SpellingUnitV3[] = this.units.map(unit => {
        const doublingIncrement = unit.doublingIncrement;
        if (doublingIncrement !== 0 && doublingIncrement !== 1) throw new Error("Missing actual doubling increment");
        return { ...unit, doublingIncrement };
      });
      const trace: BaseSpellingTraceV3 = { version: 3, ...data, units,
        capabilities: { ...capabilities, unitNormalization: 1 }, certificates: this.certificates,
        normalizationCertificates: this.normalizationCertificates,
        normalization: { version: 1, checks: this.normalizationChecks ?? [], comparisons: this.normalizationComparisons, collisions: this.normalizationCollisions,
          episodes: this.normalizationEpisodes ?? [] },
      };
      if (this.sharedPlanner) return structuredClone({ ...trace, version: 4,
        capabilities: { ...trace.capabilities, sharedConstructions: 1 },
        shared: { version: 1, events: this.sharedEvents ?? [], attempts: this.sharedAttempts ?? [], constructions: this.sharedConstructions, supersessions: this.sharedSupersessions,
          liveConstructionIds: this.liveConstructions().map(construction => construction.id), editGuards: this.sharedEditGuards ?? [], transactions: this.sharedTransactions ?? [] } });
      return structuredClone(trace);
    }
    return structuredClone({ version: 2, capabilities, certificates: this.certificates, ...data });
  }

}

/** Native replacement-string expansion for an observed deterministic regex match. */
export function expandReplacement(
  template: string,
  match: string,
  captures: Array<string | undefined>,
  offset: number,
  source: string,
  groups?: Record<string, string>,
): string {
  return template.replace(
    /\$(\$|&|`|'|<[^>]*>|\d{1,2})/g,
    (token, key: string) => {
      if (key === "$") return "$";
      if (key === "&") return match;
      if (key === "`") return source.slice(0, offset);
      if (key === "'") return source.slice(offset + match.length);
      if (key.startsWith("<"))
        return groups ? groups[key.slice(1, -1)] ?? "" : token;
      const index = Number(key);
      if (index > 0 && index <= captures.length)
        return captures[index - 1] ?? "";
      const first = Number(key[0]);
      if (key.length === 2 && first > 0 && first <= captures.length)
        return (captures[first - 1] ?? "") + key[1];
      return token;
    },
  );
}
