/** Exact base-word edit provenance. Offsets are JavaScript UTF-16 string offsets. */
export interface SpellingPhone {
  id: number;
  part: "root";
  syllableIndex: number;
  segment: "onset" | "nucleus" | "coda";
  segmentIndex: number;
  soundAtSpelling: string;
}

export interface SpellingUnit {
  id: number;
  choiceId: number;
  phoneIds: number[];
  selected: string;
  afterDoubling: string;
  sourceCellIds: number[];
}

export type SpellingCellOrigin =
  | { kind: "selection"; unitId: number; offset: number }
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
}

export interface BaseSpellingTrace {
  version: 1;
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
  private nextCellId = 0;
  private nextEditId = 0;
  private readonly edits?: SpellingEdit[];
  private phase: SpellingEdit["phase"] = "selection";
  private scope: BaseSpellingTrace["scope"] = "root-before-morphology";

  constructor(
    private readonly phones: SpellingPhone[],
    retainHistory: boolean,
  ) {
    if (retainHistory) this.edits = [];
  }

  appendChoice(
    choiceId: number,
    selected: string,
    afterDoubling: string,
  ): void {
    this.phase = "selection";
    const id = this.units.length;
    const cells = afterDoubling.split("").map(
      (text, offset): SpellingCell => ({
        id: this.nextCellId++,
        text,
        origin: { kind: "selection", unitId: id, offset },
      }),
    );
    this.units.push({
      id,
      choiceId,
      phoneIds: [choiceId],
      selected,
      afterDoubling,
      sourceCellIds: cells.map((cell) => cell.id),
    });
    this.cells.push(...cells);
  }

  get length(): number {
    return this.cells.length;
  }

  edit(start: number, deleteCount: number, insert: string, rule: string): void {
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
          cell.origin.kind === "selection"
            ? [cell.origin.unitId]
            : cell.origin.sourceUnitIds,
        ),
      ),
    ];
    const output = insert.split("").map(
      (text): SpellingCell => ({
        id: this.nextCellId++,
        text,
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
    });
  }

  observe(offset = 0): SpellingEditObserver {
    return (start, deleteCount, insert, rule) =>
      this.edit(offset + start, deleteCount, insert, rule);
  }

  observeParts(parts: string[]): PartEditObserver {
    return (part, start, deleteCount, insert, rule) => {
      let offset = start;
      for (let i = 0; i < part; i++) offset += parts[i].length;
      this.edit(offset, deleteCount, insert, rule);
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

  snapshot(): BaseSpellingTrace {
    return {
      version: 1,
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
