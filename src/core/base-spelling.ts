import type { Phoneme } from "../types.js";
import type { SpellingCoverageCertificate } from "./spelling-coverage-types.js";

/** Exact base-word edit provenance. Offsets are JavaScript UTF-16 string offsets. */
export interface SpellingPhone {
  id: number;
  part: "root";
  syllableIndex: number;
  segment: "onset" | "nucleus" | "coda";
  segmentIndex: number;
  soundAtSpelling: string;
  /** V2 only: detached actual writer input, independent of certificate claims. */
  boundary?: { phoneme: Phoneme; stress?: string };
}

export interface SpellingUnit {
  id: number;
  choiceId: number;
  phoneIds: number[];
  selected: string;
  afterDoubling: string;
  sourceCellIds: number[];
  /** V2: actual inventory choice at selection, before repairs. */
  inventoryIndex?: number;
}

export type SpellingCellOrigin =
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
  /** V1: unavailable. V2: exact write-operation part, or null after a cross-part rewrite. */
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
  /** Actual operation part in v2; null when a rewrite crosses part boundaries. */
  partId?: number | null;
}

export interface BaseSpellingTrace {
  version: 1 | 2;
  capabilities?: { exactParts: 1; licensedOrigins: 1; writerBoundary: 1 };
  certificates?: SpellingCoverageCertificate[];
  scope: "root-before-morphology" | "bare-after-gap-spelling";
  surface: string;
  phones: SpellingPhone[];
  units: SpellingUnit[];
  cells: SpellingCell[];
  edits: SpellingEdit[];
  /** Inserted/replaced cells have exact edit provenance but unresolved phoneme ownership. */
  unresolvedCells: number;
}

export type SpellingEditObserver = (
  start: number,
  deleteCount: number,
  insert: string,
  rule: string,
) => void;
export type PartEditObserver = (
  part: number,
  start: number,
  deleteCount: number,
  insert: string,
  rule: string,
) => void;

/** Live units/cells exist independently of tracing; only discarded edit history is optional. */
export class BaseSpelling {
  private cells: SpellingCell[] = [];
  private units: SpellingUnit[] = [];
  private readonly certificates: SpellingCoverageCertificate[] = [];
  private nextCellId = 0;
  private nextEditId = 0;
  private readonly edits?: SpellingEdit[];
  private phase: SpellingEdit["phase"] = "selection";
  private scope: BaseSpellingTrace["scope"] = "root-before-morphology";

  constructor(
    private readonly phones: SpellingPhone[],
    retainHistory: boolean,
    private readonly licensed = false,
  ) {
    if (retainHistory) this.edits = [];
  }

  appendChoice(
    choiceId: number,
    selected: string,
    afterDoubling: string,
    inventoryIndex?: number,
  ): void {
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
      sourceCellIds: cells.map((cell) => cell.id),
    });
    this.cells.push(...cells);
  }

  get length(): number {
    return this.cells.length;
  }

  edit(start: number, deleteCount: number, insert: string, rule: string, partId?: number): void {
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
    if (before === insert) return;
    const id = this.nextEditId++;
    const sourceUnitIds = [
      ...new Set(
        input.flatMap((cell) =>
          cell.origin.kind !== "rewrite"
            ? [cell.origin.unitId]
            : cell.origin.sourceUnitIds,
        ),
      ),
    ];
    const parts = new Set(input.map(cell => cell.partId));
    const resolvedPart = parts.size === 1 && !parts.has(null) && !parts.has(undefined)
      ? input[0].partId! : input.length === 0 ? partId ?? null : null;
    const output = insert.split("").map(
      (text): SpellingCell => ({
        id: this.nextCellId++,
        text,
        ...(this.licensed ? { partId: resolvedPart } : {}),
        origin: {
          kind: "rewrite",
          editId: id,
          sourceUnitIds,
          ownership: "unresolved",
        },
      }),
    );
    this.cells.splice(start, deleteCount, ...output);
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
    return (part, start, deleteCount, insert, rule) => {
      let offset = start;
      for (let i = 0; i < part; i++) offset += parts[i].length;
      this.edit(offset, deleteCount, insert, rule, part);
    };
  }

  setPhase(phase: SpellingEdit["phase"]): void {
    this.phase = phase;
  }

  markGapSpelling(): void {
    this.scope = "bare-after-gap-spelling";
    this.phase = "gap";
  }

  assertSurface(surface: string): void {
    if (this.cells.map((cell) => cell.text).join("") !== surface)
      throw new Error("Unrecorded base-spelling edit.");
  }

  /** Internal planner view; callers must not mutate the live cells or units. */
  current(): { cells: readonly SpellingCell[]; units: readonly SpellingUnit[]; phones: readonly SpellingPhone[] } {
    return { cells: this.cells, units: this.units, phones: this.phones };
  }

  /** Structural validation precedes every mutation, including ID advancement. */
  commitLicensedPlan(plan: Omit<SpellingCoverageCertificate, "id">): number {
    const fail = (): never => { throw new Error("Invalid spelling coverage certificate"); };
    if (!this.licensed || plan.version !== 1 || plan.budgets.exceeded.length > 0) fail();
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
      const owned = this.cells.filter(cell => cell.origin.kind !== "rewrite" && cell.origin.unitId === unit.id);
      const start = this.cells.findIndex(cell => cell.id === replacement.inputCellIds[0]);
      const input = this.cells.slice(start, start + replacement.inputCellIds.length);
      if (start < previousEnd || owned.length !== input.length || input.length === 0 ||
          input.some((cell, i) => cell.id !== replacement.inputCellIds[i] || cell.origin.kind === "rewrite" ||
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
    const trace: BaseSpellingTrace = {
      version: this.licensed ? 2 : 1,
      ...(this.licensed ? { capabilities: { exactParts: 1 as const, licensedOrigins: 1 as const, writerBoundary: 1 as const }, certificates: this.certificates.slice() } : {}),
      scope: this.scope,
      surface: this.cells.map((cell) => cell.text).join(""),
      phones: this.phones,
      units: this.units.slice(),
      cells: this.cells.slice(),
      edits: this.edits?.slice() ?? [],
      unresolvedCells: this.cells.filter(
        (cell) => cell.origin.kind === "rewrite",
      ).length,
    };
    return this.licensed ? structuredClone(trace) : trace;
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
