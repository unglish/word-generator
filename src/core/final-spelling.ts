import { serializeTraceEvidence } from "./trace-evidence.js";
import type { SpellingCell } from "./base-spelling.js";
import type { RegexSpellingEdit } from "./spelling-regex-edits.js";
import { replaySpellingEdits } from "./spelling-regex-edits.js";

type Part = "prefix" | "root" | "suffix";
export interface FinalSpellingCell {
  id: number;
  text: string;
  part: Part;
  source: { kind: "base-cell"; cellId: number } |
    { kind: "affix"; offset: number } | { kind: "unresolved-root"; offset: number } |
    { kind: "edit"; eventId: number; offset: number };
}
export interface FinalSpellingEvent {
  id: number;
  part: Part;
  rule: string;
  start: number;
  before: string;
  after: string;
  inputIds: number[];
  outputIds: number[];
}
export interface FinalSpellingTrace {
  version: 1;
  scope: "operational-cell-lineage";
  surface: string;
  cells: FinalSpellingCell[];
  initial: FinalSpellingCell[];
  events: FinalSpellingEvent[];
}

/** Tracks operations, without assigning replacement or affix letters to phonemes. */
export class FinalSpelling {
  private nextId = 0;
  private parts: Record<Part, FinalSpellingCell[]> = { prefix: [], root: [], suffix: [] };
  private initial: FinalSpellingCell[] = [];
  private events: FinalSpellingEvent[] = [];

  constructor(root: string, cells?: readonly SpellingCell[]) {
    if (cells && (cells.map(cell => cell.text).join("") !== root || cells.some(cell => cell.text.length !== 1))) {
      throw new Error("Final spelling root does not match base cells");
    }
    this.parts.root = root.split("").map((text, offset) => ({ id: this.nextId++, text, part: "root",
      source: cells ? { kind: "base-cell", cellId: cells[offset].id } : { kind: "unresolved-root", offset } }));
    this.initial = structuredClone(this.parts.root);
  }

  attach(part: "prefix" | "suffix", text: string): void {
    if (this.parts[part].length) throw new Error("Affix already attached");
    this.parts[part] = text.split("").map((letter, offset) => ({ id: this.nextId++, text: letter, part,
      source: { kind: "affix", offset } }));
    this.initial.push(...structuredClone(this.parts[part]));
  }

  replace(part: Part, start: number, before: string, after: string, rule: string): void {
    const cells = this.parts[part];
    if (!Number.isSafeInteger(start) || start < 0 || start + before.length > cells.length ||
        cells.slice(start, start + before.length).map(cell => cell.text).join("") !== before) {
      throw new Error("Final spelling edit does not match cells");
    }
    const id = this.events.length;
    const output: FinalSpellingCell[] = after.split("").map((text, offset) => ({ id: this.nextId++, text, part,
      source: { kind: "edit", eventId: id, offset } }));
    const input = cells.splice(start, before.length, ...output);
    this.events.push({ id, part, rule, start, before, after, inputIds: input.map(cell => cell.id),
      outputIds: output.map(cell => cell.id) });
  }

  applyRootEdits(before: string, after: string, edits: readonly RegexSpellingEdit[], rule: string): void {
    if (this.parts.root.map(cell => cell.text).join("") !== before || replaySpellingEdits(before, edits) !== after) {
      throw new Error("Final spelling regex replay mismatch");
    }
    let delta = 0;
    for (const edit of edits) {
      this.replace("root", edit.start + delta, edit.before, edit.after, rule);
      delta += edit.after.length - edit.before.length;
    }
  }

  snapshot(): FinalSpellingTrace {
    const cells = [...this.parts.prefix, ...this.parts.root, ...this.parts.suffix];
    const copyCell = (cell: FinalSpellingCell): FinalSpellingCell => ({ ...cell, source: { ...cell.source } });
    return { version: 1, scope: "operational-cell-lineage", surface: cells.map(cell => cell.text).join(""),
      cells: cells.map(copyCell), initial: this.initial.map(copyCell),
      events: this.events.map(event => ({ ...event, inputIds: [...event.inputIds], outputIds: [...event.outputIds] })) };
  }
}


/** Internal replay only; the caller must separately authenticate initial cells and rules. */
export function replayFinalSpelling(trace: FinalSpellingTrace): FinalSpellingCell[] {
  const require = (condition: unknown, detail: string): void => {
    if (!condition) throw new Error(`Invalid final spelling: ${detail}`);
  };
  require(trace.version === 1 && trace.scope === "operational-cell-lineage", "version");
  const parts: Record<Part, FinalSpellingCell[]> = { prefix: [], root: [], suffix: [] };
  const allocated = new Set<number>();
  function allocate(id: number): void {
    require(Number.isSafeInteger(id) && id >= 0 && !allocated.has(id), "cell identity");
    allocated.add(id);
  }
  for (const cell of trace.initial) {
    require(Object.hasOwn(parts, cell.part) && cell.text.length === 1, "initial cell");
    allocate(cell.id);
    require(cell.source.kind !== "edit", "initial edit origin");
    require(cell.part === "root" ? cell.source.kind === "base-cell" || cell.source.kind === "unresolved-root"
      : cell.source.kind === "affix", "initial part origin");
    if (cell.source.kind === "base-cell") require(Number.isSafeInteger(cell.source.cellId) && cell.source.cellId >= 0, "base identity");
    else require(cell.source.offset === parts[cell.part].length, "source offset");
    parts[cell.part].push(structuredClone(cell));
  }
  for (const [id, event] of trace.events.entries()) {
    require(event.id === id && Object.hasOwn(parts, event.part), "event identity");
    const cells = parts[event.part];
    require(Number.isSafeInteger(event.start) && event.start >= 0 && event.start + event.before.length <= cells.length,
      "event span");
    const input = cells.slice(event.start, event.start + event.before.length);
    require(input.map(cell => cell.text).join("") === event.before, "event text");
    require(serializeTraceEvidence(input.map(cell => cell.id)) === serializeTraceEvidence(event.inputIds), "event input identities");
    require(event.outputIds.length === event.after.length, "output count");
    const output: FinalSpellingCell[] = event.after.split("").map((text, offset) => {
      const cellId = event.outputIds[offset]; allocate(cellId);
      return { id: cellId, text, part: event.part, source: { kind: "edit", eventId: id, offset } };
    });
    cells.splice(event.start, event.before.length, ...output);
  }
  const cells = [...parts.prefix, ...parts.root, ...parts.suffix];
  require(cells.map(cell => cell.text).join("") === trace.surface, "surface");
  require(serializeTraceEvidence(cells) === serializeTraceEvidence(trace.cells), "final cells");
  return cells;
}
