import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import { BaseSpelling, expandReplacement, parseReplaceCallbackArgs } from "./base-spelling.js";

function archivedDraws(indices: number[]) {
  const rand = createSeededRng(1304238451);
  const selected = new Map<number, ReturnType<typeof generateWord>>();
  for (let i = 0; i <= Math.max(...indices); i++) {
    const word = generateWord({ rand, morphology: false, trace: indices.includes(i) });
    if (indices.includes(i)) selected.set(i, word);
  }
  return selected;
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
    const draws = archivedDraws([963, 1921, 4322]);
    expect(draws.get(963)!.written.clean).toBe("cageatsaps");
    expect(draws.get(963)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "deduplicateSyllableJoin", before: "e", after: "" }));
    expect(draws.get(1921)!.written.clean).toBe("owloduety");
    expect(draws.get(1921)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "postJoinVowelCap", before: "a", after: "" }));
    expect(draws.get(4322)!.written.clean).toBe("atiguet");
    expect(draws.get(4322)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "orthographicRepair:hard-g-silent-u", before: "", after: "u" }));
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
    const word = generateWord({ seed: 38, morphology: true, trace: true });
    expect(word.written.clean).toBe("canes");
    const base = word.trace!.baseSpelling!;
    expect(base.surface).toBe("cane");
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
