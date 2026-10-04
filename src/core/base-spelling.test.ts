import { verifyBareWordOperations } from "./bare-word-evidence.js";
import { replayFinalSpelling } from "./final-spelling.js";
import { replayFinalPhones } from "./final-phones.js";
import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig } from "../index.js";
import { BaseSpelling, expandReplacement } from "./base-spelling.js";

const legacyConfig = { ...englishConfig, sharedSpellings: undefined, doubling: { ...englishConfig.doubling!, realizations: undefined }, writtenFormConstraints: { ...englishConfig.writtenFormConstraints, policy: undefined } };
const { generateWord } = createGenerator(legacyConfig);

// Coordinates are trace-verified for the Q14b + Q04 dependency composition.
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
    const word = archivedDraws([5328]).get(5328)!;
    expect(word.written.clean).toBe("coibruhry");
    const base = word.trace!.baseSpelling!;
    const edit = base.edits.find(entry => entry.rule === "repairConsonantLetters")!;
    expect(edit.before).toBe("t");
    expect(edit.after).toBe("");
    expect(edit.input[0].origin).toEqual({ kind: "selection", unitId: 6, offset: 0 });
    expect(base.units[6].selected).toBe("th");
    expect(base.phones[6].soundAtSpelling).toBe("θ");
    expect(base.cells.filter(cell => cell.origin.kind === "selection" && cell.origin.unitId === 6).map(cell => cell.text).join("")).toBe("h");
    expect(word.trace!.orthography!.alignment).toBe("inferred");
  });

  it("exposes the untraced join, boundary insertion and post-join vowel cap", () => {
    const draws = archivedDraws([273, 205]);
    expect(draws.get(205)!.written.clean).toBe("mechise");
    expect(draws.get(205)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "deduplicateSyllableJoin", before: "c", after: "" }));
    expect(draws.get(273)!.written.clean).toBe("ukayguilp");
    expect(draws.get(273)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "postJoinVowelCap", before: "e", after: "" }));
    expect(draws.get(273)!.trace!.baseSpelling!.edits).toContainEqual(expect.objectContaining({ rule: "orthographicRepair:hard-g-silent-u", before: "", after: "u" }));
  });

  it("records empty emission separately from phoneme deletion", () => {
    const word = archivedDraws([103]).get(103)!;
    const base = word.trace!.baseSpelling!;
    expect(word.written.clean).toBe("bazzerm");
    expect(base.units[4].afterDoubling).toBe("r");
    expect(base.phones[4].soundAtSpelling).toBe("r");
    expect(base.cells.some(cell => cell.origin.kind === "selection" && cell.origin.unitId === 4)).toBe(false);
    expect(base.edits).toContainEqual(expect.objectContaining({ rule: "deduplicateAdjacentLetters", before: "r", after: "" }));
  });

  it("keeps inserted silent-e ownership unresolved instead of assigning it to n", () => {
    const word = generateWord({ seed: 190, morphology: true, trace: true });
    expect(word.written.clean).toBe("flonal");
    const base = word.trace!.baseSpelling!;
    expect(base.surface).toBe("flone");
    expect(base.scope).toBe("root-before-morphology");
    expect(base.cells[4].origin).toMatchObject({ kind: "rewrite", sourceUnitIds: [], ownership: "unresolved" });
    expect(base.edits.find(edit => edit.rule === "silentE:marker")).toMatchObject({ rule: "silentE:marker", before: "", after: "e" });
  });

  it("records a bare gap override as an exact edit with unresolved internal ownership", () => {
    const options = { seed: 19, morphology: false, trace: true };
    const source = generateWord(options);
    const phonemes = source.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda].map(phone => phone.sound));
    const config = { ...legacyConfig,
      gapSpellings: [{ name: "probe", phonemes, replacement: "other", targetLayer: "unknown" as const }],
    };
    const generator = createGenerator(config);
    const word = generator.generateWord(options);
    const base = word.trace!.baseSpelling!;
    expect(word.written.clean).toBe("other");
    expect(base.scope).toBe("bare-after-gap-spelling");
    expect(base.surface).toBe("other");
    const edit = base.edits[base.edits.length - 1];
    expect(edit).toMatchObject({ phase: "gap", rule: "gapSpelling:probe", before: source.written.clean, after: "other" });
    expect(edit.output.every(cell => cell.origin.kind === "rewrite" && cell.origin.ownership === "unresolved")).toBe(true);
    expect(edit.input.map(cell => cell.text).join("")).toBe(source.written.clean);
    const final = word.trace!.finalWord!;
    expect(replayFinalSpelling(final.spelling).map(cell => cell.text).join("")).toBe("other");
    expect(final.spelling.events.at(-1)).toMatchObject({ rule: "gapSpelling:probe", before: source.written.clean, after: "other" });
    expect(final.spelling.cells.every(cell => cell.source.kind === "edit")).toBe(true);
    expect(replayFinalPhones(final.phones)).toEqual(phonemes);
    verifyBareWordOperations(word, config);
    const forged = structuredClone(word); forged.trace!.gapSpellingPass!.rolls.push(0.5);
    expect(() => verifyBareWordOperations(forged, config)).toThrow("Unused gap draws");
  });

  it.each([100, 53])("keeps public-API output and RNG parity with custom regex probability %s", probability => {
    const generator = createGenerator({
      ...legacyConfig,
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
      const named = typeof args[args.length - 1] === "object";
      const count = named ? 3 : 2;
      return expandReplacement(replacement, match, args.slice(0, -count) as Array<string | undefined>, args[args.length - count] as number, source, named ? args[args.length - 1] as Record<string, string> : undefined);
    });
    expect(actual).toBe(expected);
  });
});
