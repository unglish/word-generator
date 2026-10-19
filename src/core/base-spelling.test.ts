import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import { BaseSpelling, expandReplacement, parseReplaceCallbackArgs } from "./base-spelling.js";
import type { BaseSpellingTrace, SpellingCell, SpellingEdit } from "./base-spelling.js";
import type { Word } from "../types.js";
import { findExample, searchSeeds } from "../test-support/find-example.js";

function editsFor(word: Word, rule: string): SpellingEdit[] {
  return word.trace!.baseSpelling!.edits.filter(edit => edit.rule === rule);
}

/** A selection-cell origin, or undefined for rewritten cells. */
function selectionOrigin(cell: SpellingCell | undefined) {
  return cell?.origin.kind === "selection" ? cell.origin : undefined;
}

/** An edit that deletes part, but not all, of one multi-letter selected spelling. */
function partialCut(word: Word, rule: string): SpellingEdit | undefined {
  const base = word.trace!.baseSpelling!;
  return editsFor(word, rule).find(edit => {
    const unitId = selectionOrigin(edit.input[0])?.unitId;
    return edit.after === "" && unitId !== undefined
      && edit.input.every(cell => selectionOrigin(cell)?.unitId === unitId)
      && base.units[unitId].selected.length > edit.before.length;
  });
}

function expectLedgerReplay(base: BaseSpellingTrace): void {
  const cellsById = new Map<number, SpellingCell>();
  const remember = (cell: SpellingCell): void => {
    if (cellsById.has(cell.id)) expect(cell).toBe(cellsById.get(cell.id));
    else cellsById.set(cell.id, cell);
  };
  base.cells.forEach(remember);
  for (const edit of base.edits) {
    edit.input.forEach(remember);
    edit.output.forEach(remember);
  }

  let cells: SpellingCell[] = [];
  const createdIds = new Set<number>();
  for (const unit of base.units) {
    expect(unit.sourceCellIds).toHaveLength(unit.afterDoubling.length);
    for (const [offset, id] of unit.sourceCellIds.entries()) {
      expect(createdIds.has(id)).toBe(false);
      createdIds.add(id);
      const cell = cellsById.get(id)!;
      expect(cell).toEqual({ id, text: unit.afterDoubling[offset], origin: { kind: "selection", unitId: unit.id, offset } });
      cells.push(cell);
    }
  }
  for (const [id, edit] of base.edits.entries()) {
    expect(edit.id).toBe(id);
    expect(cells.slice(edit.start, edit.start + edit.input.length)).toEqual(edit.input);
    edit.input.forEach((cell, index) => expect(cell).toBe(cells[edit.start + index]));
    expect(edit.before).toBe(edit.input.map(cell => cell.text).join(""));
    expect(edit.after).toBe(edit.output.map(cell => cell.text).join(""));
    const sourceUnitIds = [...new Set(edit.input.flatMap(cell => cell.origin.kind === "selection" ? [cell.origin.unitId] : cell.origin.sourceUnitIds))];
    for (const cell of edit.output) {
      expect(createdIds.has(cell.id)).toBe(false);
      createdIds.add(cell.id);
      expect(cell.origin).toEqual({ kind: "rewrite", editId: id, sourceUnitIds, ownership: "unresolved" });
    }
    cells = cells.slice(0, edit.start).concat(edit.output, cells.slice(edit.start + edit.input.length));
  }
  expect(cells).toEqual(base.cells);
  cells.forEach((cell, index) => expect(cell).toBe(base.cells[index]));
  expect(base.surface).toBe(cells.map(cell => cell.text).join(""));
  expect(base.unresolvedCells).toBe(cells.filter(cell => cell.origin.kind === "rewrite").length);
}

describe("exact base-spelling provenance", () => {
  it("records a cut within a multi-letter spelling at its actual source cell without claiming it is repaired", () => {
    // A tighter consonant cap makes such cuts common enough to find quickly.
    const generator = createGenerator({
      ...englishConfig,
      writtenFormConstraints: { ...englishConfig.writtenFormConstraints!, maxConsonantGraphemes: 3, maxConsonantLetters: 3 },
    });
    const { word } = findExample(word => partialCut(word, "repairConsonantLetters") !== undefined, {
      property: "a consonant repair cutting part of one selected spelling", limit: 2000, generator, options: { morphology: true },
    });
    const base = word.trace!.baseSpelling!;
    const edit = partialCut(word, "repairConsonantLetters")!;
    const { unitId } = selectionOrigin(edit.input[0])!;
    const unit = base.units[unitId];
    const cutOffsets = new Set(edit.input.map(cell => selectionOrigin(cell)!.offset));
    const kept = [...unit.afterDoubling].filter((_, offset) => !cutOffsets.has(offset)).join("");
    expect(kept.length).toBeGreaterThan(0);
    expect(base.cells.filter(cell => selectionOrigin(cell)?.unitId === unitId).map(cell => cell.text).join("")).toBe(kept);
    for (const phoneId of unit.phoneIds) expect(base.phones[phoneId].soundAtSpelling).toBeTruthy();
    expect(word.trace!.orthography!.alignment).toBe("inferred");
    expectLedgerReplay(base);
  });

  it.each([
    { rule: "deduplicateSyllableJoin", shape: (edit: SpellingEdit) => edit.before.length === 1 && edit.after === "" },
    { rule: "postJoinVowelCap", shape: (edit: SpellingEdit) => /^[aeiouy]$/.test(edit.before) && edit.after === "" },
    { rule: "orthographicRepair:hard-g-silent-u", shape: (edit: SpellingEdit) => edit.before === "" && edit.after === "u" },
  ])("exposes the $rule edit without changing untraced output", ({ rule, shape }) => {
    const { word, options } = findExample(word => editsFor(word, rule).some(shape), {
      property: `a ${rule} edit`, limit: 2500, options: { morphology: false },
    });
    const base = word.trace!.baseSpelling!;
    expectLedgerReplay(base);
    expect(base.surface).toBe(word.written.clean);
    const { trace, ...traced } = word;
    expect(trace).toBeDefined();
    expect(traced).toEqual(generateWord({ ...options, trace: false }));
  });

  it("records empty emission separately from phoneme deletion", () => {
    const removesSelectedLetters = (edit: SpellingEdit) => edit.after === "" && edit.input.length > 0 && edit.input.every(cell => selectionOrigin(cell));
    const { word } = findExample(word => editsFor(word, "deduplicateAdjacentLetters").some(removesSelectedLetters), {
      property: "an adjacent-letter deduplication of selected letters", limit: 1500, options: { morphology: false },
    });
    const base = word.trace!.baseSpelling!;
    const edit = editsFor(word, "deduplicateAdjacentLetters").find(removesSelectedLetters)!;
    const unit = base.units[selectionOrigin(edit.input[0])!.unitId];
    // The unit emitted letters that were then removed; its phone was not deleted.
    expect(unit.afterDoubling.length).toBeGreaterThan(0);
    expect(unit.afterDoubling.includes(edit.before)).toBe(true);
    const sounds = word.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda].map(phone => phone.sound));
    for (const phoneId of unit.phoneIds) expect(sounds).toContain(base.phones[phoneId].soundAtSpelling);
    expectLedgerReplay(base);
  });

  it("keeps inserted silent-e ownership unresolved instead of assigning it to a neighbour", () => {
    const { word } = findExample(word => word.trace!.morphology!.template !== "bare" && editsFor(word, "silentE:marker").length > 0, {
      property: "a silent-e insertion in an affixed root", limit: 300, options: { morphology: true },
    });
    const base = word.trace!.baseSpelling!;
    expect(base.scope).toBe("root-before-morphology");
    const edit = editsFor(word, "silentE:marker")[0];
    expect(edit).toMatchObject({ before: "", after: "e" });
    expect(edit.output).toHaveLength(1);
    expect(edit.output[0].origin).toMatchObject({ kind: "rewrite", sourceUnitIds: [], ownership: "unresolved" });
    expectLedgerReplay(base);
  });

  it("records a bare gap override as an exact edit with unresolved internal ownership", () => {
    const options = { morphology: false, trace: true };
    // The override changes the root's letter length, so it can change which attempt is accepted.
    const { source, word } = searchSeeds({ property: "a bare gap override that survives root selection", limit: 50 }, seed => {
      const source = generateWord({ ...options, seed });
      const phonemes = source.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda].map(phone => phone.sound));
      const generator = createGenerator({
        ...englishConfig,
        gapSpellings: [{ name: "probe", phonemes, replacement: "other", targetLayer: "unknown" }],
      });
      const word = generator.generateWord({ ...options, seed });
      return word.trace!.baseSpelling!.scope === "bare-after-gap-spelling" ? { source, word } : undefined;
    });
    const base = word.trace!.baseSpelling!;
    expect(word.written.clean).toBe("other");
    expect(base.scope).toBe("bare-after-gap-spelling");
    expect(base.surface).toBe("other");
    const edit = base.edits[base.edits.length - 1];
    expect(edit).toMatchObject({ phase: "gap", rule: "gapSpelling:probe", before: source.written.clean, after: "other" });
    expect(edit.output.every(cell => cell.origin.kind === "rewrite" && cell.origin.ownership === "unresolved")).toBe(true);
    expect(edit.input.map(cell => cell.text).join("")).toBe(source.written.clean);
  });

  it.each([100, 53])("keeps public-API output and RNG parity with custom regex probability %s", probability => {
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: [{ name: "probe", pattern: "([aeiou])", replacement: "$1$1", probability, scope: "both" }],
    });
    const onRng = createSeededRng(281);
    const offRng = createSeededRng(281);
    let onCalls = 0;
    let offCalls = 0;
    for (let i = 0; i < 100; i++) {
      const on = generator.generateWord({ morphology: false, trace: true, rand: () => { onCalls++; return onRng(); } });
      const off = generator.generateWord({ morphology: false, trace: false, rand: () => { offCalls++; return offRng(); } });
      delete on.trace;
      expect(on).toEqual(off);
      expect(onCalls).toBe(offCalls);
    }
    expect(onRng()).toBe(offRng());
  });

  it("keeps live IDs and cells identical when historical event retention is off", () => {
    const phones = [{ id: 0, part: "root" as const, syllableIndex: 0, segment: "coda" as const, segmentIndex: 0, soundAtSpelling: "θ" }];
    const states = [new BaseSpelling(phones, false), new BaseSpelling(phones, true)];
    for (const state of states) {
      state.appendChoice(0, "th", "th");
      state.edit(0, 1, "", "cut");
      state.edit(1, 0, "e", "insert");
      state.assertSurface("he");
    }
    const [off, on] = states.map(state => state.snapshot());
    expect(off.cells).toEqual(on.cells);
    expect(off.units).toEqual(on.units);
    expect(off.edits).toEqual([]);
    expect(on.edits).toHaveLength(2);
  });
});

// Each case draws 30 words from a stream with tracing on and an identical stream
// with it off, and requires identical words and draw counts. The stream starts at
// the first seed whose word uses the rule. Exact output is pinned only by the
// golden fixture (`npm run golden:update`).
const replacementCases = [
  { name: "ck contraction", pattern: "ck", replacement: "k", flags: "g", scope: "both" },
  { name: "vowel pair", pattern: "([aeiou])", replacement: "$1e", flags: "g", scope: "syllable" },
  { name: "silent-e marker", pattern: "([aeiou])([bcdfg])", replacement: "$1$2e", flags: "g", scope: "word" },
  // A generous replacement-size check, not a generated-word length target or limit.
  { name: "100-character replacement", pattern: "([aeiou])", replacement: "a".repeat(100), flags: "", scope: "word" },
] as const;

describe.each([100, 53])("spelling replacements with probability %s", probability => {
  it.each(replacementCases)("preserves output, RNG and cell provenance for $name", ({ name, pattern, replacement, flags, scope }) => {
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: [{ name, pattern, replacement, flags, scope, probability }],
    });
    const { seed } = findExample(word => editsFor(word, `spellingRule:${name}`).length > 0, {
      property: `a ${name} replacement`, limit: 500, generator, options: { morphology: false },
    });
    const onRng = createSeededRng(seed);
    const offRng = createSeededRng(seed);
    let onCalls = 0;
    let offCalls = 0;
    for (let draw = 0; draw < 30; draw++) {
      const on = generator.generateWord({ morphology: false, trace: true, rand: () => { onCalls++; return onRng(); } });
      const off = generator.generateWord({ morphology: false, trace: false, rand: () => { offCalls++; return offRng(); } });
      const base = on.trace!.baseSpelling!;
      expectLedgerReplay(base);
      expect(base.surface).toBe(on.written.clean);
      const edits = base.edits.filter(edit => edit.rule === `spellingRule:${name}`);
      if (draw === 0) expect(edits.length).toBeGreaterThan(0);
      if (replacement.length === 100 && edits.length > 0) {
        expect(edits).toHaveLength(1);
        expect(edits[0].output).toHaveLength(100);
        expect(edits[0].after).toBe(replacement);
        expect(base.edits).toContainEqual(expect.objectContaining({ rule: "postJoinVowelCap", after: "" }));
      }
      delete on.trace;
      expect(on).toEqual(off);
      expect(onCalls).toBe(offCalls);
    }
    // Both streams end in the same state: tracing consumed no extra draws.
    expect(onRng()).toBe(offRng());
  });
});

describe("observed native replacement-string semantics", () => {
  it.each([
    ["xabz", "(a)(b)", "$2$1-$$-$&-$`-$'-$01-$10-$0-$99"],
    ["ab ab", "(?<first>a)(b)", "$<first>-$<missing>-$2"],
    ["b ab", "(a)?(b)", "$1$2"],
    ["xx", "x", "$1-$<unknown>-$$"],
    ["abc", "(?=b)", "$&$`$'"],
  ])("preserves replacement expansion for %s / %s", (source, pattern, replacement) => {
    const expected = source.replace(new RegExp(pattern, "g"), replacement);
    const actual = source.replace(new RegExp(pattern, "g"), (match: string, ...args: unknown[]) => {
      const { captures, offset, groups } = parseReplaceCallbackArgs(args);
      return expandReplacement(replacement, match, captures, offset, source, groups);
    });
    expect(actual).toBe(expected);
  });
});
