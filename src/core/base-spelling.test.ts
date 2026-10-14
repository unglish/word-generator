import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import { BaseSpelling, expandReplacement, parseReplaceCallbackArgs } from "./base-spelling.js";
import type { BaseSpellingTrace, SpellingCell } from "./base-spelling.js";

function archivedDraws(indices: number[]) {
  const rand = createSeededRng(1304238451);
  const selected = new Map<number, ReturnType<typeof generateWord>>();
  for (let i = 0; i <= Math.max(...indices); i++) {
    const word = generateWord({ rand, morphology: false, trace: indices.includes(i) });
    if (indices.includes(i)) selected.set(i, word);
  }
  return selected;
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
  it("records a cut within th at its actual source cell without claiming it is repaired", () => {
    const word = generateWord({ seed: 2643, morphology: true, trace: true });
    expect(word.written.clean).toBe("bunhtreern");
    const base = word.trace!.baseSpelling!;
    const edit = base.edits.find(entry => entry.rule === "repairConsonantLetters")!;
    expect(edit.before).toBe("t");
    expect(edit.after).toBe("");
    expect(edit.input[0].origin).toEqual({ kind: "selection", unitId: 3, offset: 0 });
    expect(base.units[3].selected).toBe("th");
    expect(base.phones[3].soundAtSpelling).toBe("θ");
    expect(base.cells.filter(cell => cell.origin.kind === "selection" && cell.origin.unitId === 3).map(cell => cell.text).join("")).toBe("h");
    expect(word.trace!.orthography!.alignment).toBe("inferred");
  });

  it("exposes the untraced join, boundary insertion and post-join vowel cap", () => {
    const draws = archivedDraws([24, 216, 413]);
    expect(draws.get(216)!.written.clean).toBe("fizeagsa");
    expect(draws.get(216)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "deduplicateSyllableJoin", before: "e", after: "" }));
    expect(draws.get(413)!.written.clean).toBe("iguems");
    expect(draws.get(413)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "postJoinVowelCap", before: "a", after: "" }));
    expect(draws.get(24)!.written.clean).toBe("jagguepeem");
    expect(draws.get(24)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "orthographicRepair:hard-g-silent-u", before: "", after: "u" }));
  });

  it("records empty emission separately from phoneme deletion", () => {
    const word = generateWord({ seed: 38, syllableCount: 1, morphology: false, trace: true });
    const base = word.trace!.baseSpelling!;
    expect(word.written.clean).toBe("quants");
    expect(base.units[6].afterDoubling).toBe("s");
    expect(base.phones[6].soundAtSpelling).toBe("s");
    expect(base.edits).toContainEqual(expect.objectContaining({ rule: "deduplicateAdjacentLetters", before: "s", after: "" }));
  });

  it("keeps inserted silent-e ownership unresolved instead of assigning it to n", () => {
    const word = generateWord({ seed: 3700, morphology: true, trace: true });
    expect(word.written.clean).toBe("maner");
    const base = word.trace!.baseSpelling!;
    expect(base.surface).toBe("mane");
    expect(base.scope).toBe("root-before-morphology");
    expect(base.cells[3].origin).toMatchObject({ kind: "rewrite", sourceUnitIds: [], ownership: "unresolved" });
    expect(base.edits[0]).toMatchObject({ rule: "silentE:marker", before: "", after: "e" });
  });

  it("records a bare gap override as an exact edit with unresolved internal ownership", () => {
    const options = { seed: 19, morphology: false, trace: true };
    const source = generateWord(options);
    const phonemes = source.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda].map(phone => phone.sound));
    const generator = createGenerator({
      ...englishConfig,
      gapSpellings: [{ name: "probe", phonemes, replacement: "other", targetLayer: "unknown" }],
    });
    const word = generator.generateWord(options);
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

// First outputs and 30-draw RNG controls were captured through the public API
// on main 3b1d2661731ebd28cae99a1accf294c051b0e062, with tracing on and off.
const replacementCases = [
  {
    name: "ck contraction", pattern: "ck", replacement: "k", flags: "g", scope: "both",
    seed: 11, expectedWritten: { clean: "watrork", hyphenated: "wa&shy;trork" },
    rngCalls: [2456, 2097], nextRng: [0.15194092551246285, 0.36783944605849683],
  },
  {
    name: "vowel pair", pattern: "([aeiou])", replacement: "$1e", flags: "g", scope: "syllable",
    seed: 0, expectedWritten: { clean: "baents", hyphenated: "baents" },
    rngCalls: [5894, 3749], nextRng: [0.8373291860334575, 0.6905383476987481],
  },
  {
    name: "silent-e marker", pattern: "([aeiou])([bcdfg])", replacement: "$1$2e", flags: "g", scope: "word",
    seed: 5, expectedWritten: { clean: "beceatien", hyphenated: "bec&shy;a&shy;tien" },
    rngCalls: [2055, 1724], nextRng: [0.5643121493048966, 0.6954051142092794],
  },
  {
    // A generous replacement-size check, not a generated-word length target or limit.
    name: "100-character replacement", pattern: "([aeiou])", replacement: "a".repeat(100), flags: "", scope: "word",
    seed: 0, expectedWritten: { clean: "baants", hyphenated: "bants" },
    rngCalls: [1994, 2292], nextRng: [0.5141555208247155, 0.6597050784621388],
  },
] as const;

describe.each([100, 53])("spelling replacements with probability %s", probability => {
  it.each(replacementCases)("preserves output, RNG and cell provenance for $name", ({ name, pattern, replacement, flags, scope, seed, expectedWritten, rngCalls, nextRng }) => {
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: [{ name, pattern, replacement, flags, scope, probability }],
    });
    const onRng = createSeededRng(seed);
    const offRng = createSeededRng(seed);
    let onCalls = 0;
    let offCalls = 0;
    let observedReplacements = 0;
    for (let draw = 0; draw < 30; draw++) {
      const on = generator.generateWord({ morphology: false, trace: true, rand: () => { onCalls++; return onRng(); } });
      const off = generator.generateWord({ morphology: false, trace: false, rand: () => { offCalls++; return offRng(); } });
      const base = on.trace!.baseSpelling!;
      expectLedgerReplay(base);
      expect(base.surface).toBe(on.written.clean);
      const edits = base.edits.filter(edit => edit.rule === `spellingRule:${name}`);
      observedReplacements += edits.length;
      if (replacement.length === 100 && edits.length > 0) {
        expect(edits).toHaveLength(1);
        expect(edits[0].output).toHaveLength(100);
        expect(edits[0].after).toBe(replacement);
        expect(base.edits).toContainEqual(expect.objectContaining({ rule: "postJoinVowelCap", after: "" }));
      }
      if (draw === 0) {
        expect(on.written).toEqual(expectedWritten);
        expect(edits.length).toBeGreaterThan(0);
      }
      delete on.trace;
      expect(on).toEqual(off);
      expect(onCalls).toBe(offCalls);
    }
    expect(observedReplacements).toBeGreaterThan(0);
    const controlIndex = probability === 100 ? 0 : 1;
    expect(onCalls).toBe(rngCalls[controlIndex]);
    const nextOn = onRng();
    expect(nextOn).toBe(offRng());
    expect(nextOn).toBe(nextRng[controlIndex]);
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
