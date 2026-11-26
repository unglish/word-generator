import { describe, expect, it } from "vitest";
import type { LetterContextRespelling, WrittenFormConstraints } from "../config/language.js";
import { createGenerator, englishConfig, generateWord, generateWords } from "../index.js";
import { findExample } from "../test-support/find-example.js";
import type { Word } from "../types.js";
import { measureSpellingBudgets } from "./spelling-budget.js";
import type { GraphemeTrace } from "./trace.js";

interface SelectionSite {
  selection: GraphemeTrace;
  /** Letter range in the root's base spelling written by this selection alone. */
  start: number;
  end: number;
  text: string;
  /** The root letter that follows; empty at the end of the root. */
  next: string;
}

/** The base-spelling letters that one selection wrote, after any later respelling. */
function selectionSite(word: Word, selection: GraphemeTrace): SelectionSite | undefined {
  const base = word.trace!.baseSpelling!;
  const unit = base.units.find(candidate => candidate.phoneIds.includes(selection.index));
  if (!unit) return undefined;
  const owned = base.cells.flatMap(({ origin }, index) => {
    const sources = origin.kind === "rewrite" ? origin.sourceUnitIds : [origin.unitId];
    return sources.length === 1 && sources[0] === unit.id ? [index] : [];
  });
  if (!owned.length || owned.at(-1)! + 1 - owned[0] !== owned.length) return undefined;
  const start = owned[0];
  const end = start + owned.length;
  return { selection, start, end, text: base.surface.slice(start, end), next: base.surface[end] ?? "" };
}

/** Selections of `phoneme` as `selected` whose next root letter is one of `letters`. */
function sitesBefore(word: Word, phoneme: string, selected: string, letters: string): SelectionSite[] {
  return (word.trace?.graphemeSelections ?? [])
    .filter(selection => selection.phoneme === phoneme && selection.selected === selected)
    .map(selection => selectionSite(word, selection))
    .filter((site): site is SelectionSite => !!site && site.next !== "" && letters.includes(site.next));
}

/** The sound of a root phone in the generated word's syllables. */
function rootSound(word: Word, phoneId: number): string | undefined {
  const phone = word.trace!.baseSpelling!.phones[phoneId];
  const syllable = word.syllables[word.lexical!.rootSyllableStart + phone.syllableIndex];
  return syllable[phone.segment][phone.segmentIndex]?.sound;
}

describe("soft c and sc before written vowels (#495)", () => {
  it("retains the syllable breaks when a word rule also crosses a join", () => {
    // English join-crossing rules (cw → qu, iw → w) are rare; this one often spans a join.
    const generator = createGenerator({
      ...englishConfig,
      spellingRules: [
        ...englishConfig.spellingRules!,
        { name: "l-to-r-between-vowels", pattern: "([aeiou])l(?=[aeiou])", replacement: "$1r", scope: "word" },
      ],
    });
    const { word } = findExample(candidate => {
      const base = candidate.trace?.baseSpelling;
      return !!base && base.edits.some(edit => edit.rule.startsWith("letterContext:"))
        && base.cells.some(cell => cell.partId === null);
    }, {
      property: "a letter-context repair in a root rewritten across a syllable join",
      limit: 3_000,
      generator,
      options: { mode: "lexicon", syllableCount: 3, morphology: false },
    });
    const parts = word.written.hyphenated.split("&shy;");
    expect(parts).toHaveLength(word.syllables.length);
    expect(parts.join("")).toBe(word.written.clean);
  });

  it("does not exceed a spelling budget through a custom context repair", () => {
    const custom: LetterContextRespelling = {
      name: "custom", phoneme: "k", forms: ["k"], hardBefore: ["a", "e", "i", "o", "u"], replacement: "e",
    };
    const constraints: WrittenFormConstraints = { ...englishConfig.writtenFormConstraints, letterContexts: [custom] };
    const generator = createGenerator({ ...englishConfig, writtenFormConstraints: constraints });
    const sites = (word: Word) => sitesBefore(word, "k", "k", "aeiou").filter(site => site.selection.emitted === "k");
    /** Budgets the root would exceed with `letters` in place of this k. */
    const exceededWith = (word: Word, site: SelectionSite, letters: string) => {
      const surface = word.trace!.baseSpelling!.surface;
      const spelled = surface.slice(0, site.start) + letters + surface.slice(site.end);
      return measureSpellingBudgets(spelled, constraints).exceeded;
    };
    const raisesBudget = (word: Word, site: SelectionSite) => {
      const kept = exceededWith(word, site, "k");
      return exceededWith(word, site, "e").some(key => !kept.includes(key));
    };
    const search = { limit: 300, generator, options: { mode: "lexicon", morphology: false } as const };

    const blocked = findExample(word => sites(word).some(site => raisesBudget(word, site)), {
      ...search, property: "a k before a vowel letter whose e respelling would exceed a budget",
    });
    const blockedSite = sites(blocked.word).find(site => raisesBudget(blocked.word, site))!;
    expect(blockedSite.text).toBe("k");
    expect(blockedSite.selection.letterRespelled).toBeUndefined();

    const fits = findExample(word => sites(word).some(site => !exceededWith(word, site, "e").length), {
      ...search, property: "a k before a vowel letter whose e respelling fits every budget",
    });
    const fitSite = sites(fits.word).find(site => !exceededWith(fits.word, site, "e").length)!;
    expect(fitSite.text).toBe("e");
    expect(fitSite.selection.letterRespelled).toMatchObject({ form: "e", rule: "letterContext:custom" });
  });

  it.each([
    { source: "c", letters: "a", limit: 500 },
    { source: "c", letters: "o", limit: 2_500 },
    { source: "c", letters: "u", limit: 1_500 },
    { source: "sc", letters: "aou", limit: 6_000 },
  ])("writes $source for /s/ as s before $letters while keeping its sound", ({ source, letters, limit }) => {
    const { word, options } = findExample(candidate => sitesBefore(candidate, "s", source, letters).length > 0, {
      property: `/s/ selected as ${source} before a written ${letters}`,
      limit,
      options: { mode: "lexicon" },
    });
    const base = word.trace!.baseSpelling!;
    const [site] = sitesBefore(word, "s", source, letters);
    expect(site.text).toBe("s");
    expect(site.selection.letterRespelled).toMatchObject({ form: "s", rule: "letterContext:soft-c" });
    expect(base.edits).toContainEqual(expect.objectContaining({ rule: "letterContext:soft-c", before: source, after: "s" }));
    expect(base.cells.map((cell) => cell.text).join("")).toBe(base.surface);
    expect(word.written.clean).toContain(base.surface.slice(site.start, site.end + 1));
    expect(rootSound(word, site.selection.index)).toBe("s");

    const untraced = generateWord({ ...options, trace: false });
    expect(untraced.written).toEqual(word.written);
    expect(untraced.pronunciation).toBe(word.pronunciation);
  });

  it("keeps /s/ when a suffix drops the e that softened a root-final c", () => {
    // Every word takes a suffix that starts with a back vowel, before which a bare c reads /k/.
    const morphology = englishConfig.morphology!;
    const suffixed = { bare: 0, prefixed: 0, suffixed: 100, both: 0 };
    const generator = createGenerator({
      ...englishConfig,
      morphology: {
        ...morphology,
        suffixes: morphology.suffixes.filter(affix => "aou".includes(affix.written[0])),
        templateWeights: { lexicon: suffixed, text: suffixed },
      },
    });
    const rootPart = (word: Word) => word.trace?.morphology?.realization?.emittedParts.find(part => part.role === "root");
    const finalCe = (word: Word) => word.trace?.graphemeSelections.find(selection =>
      selection.phoneme === "s" && selection.position === "coda" && selection.selected === "ce"
      && selection.syllableIndex === word.lexical!.root.length - 1);
    const { word, options } = findExample(candidate => {
      const base = candidate.trace?.baseSpelling;
      return !!finalCe(candidate) && !!base && rootPart(candidate)?.text === base.surface.slice(0, -1);
    }, {
      property: "a root-final /s/ spelled ce whose e a back-vowel suffix drops",
      limit: 3_000,
      generator,
      options: { mode: "lexicon" },
    });
    expect(finalCe(word)!.letterRespelled).toMatchObject({ form: "s", rule: "letterContext:soft-c" });
    expect(rootPart(word)!.text.endsWith("s")).toBe(true);
    expect(word.lexical!.root.at(-1)!.coda.at(-1)?.sound).toBe("s");
    expect(generator.generateWord({ ...options, trace: false }).written).toEqual(word.written);
  });

  it.each([
    { phoneme: "s", source: "c", letters: "eiy", limit: 300 },
    { phoneme: "s", source: "sc", letters: "eiy", limit: 2_500 },
    { phoneme: "k", source: "c", letters: "aou", limit: 200 },
  ])("retains $source for /$phoneme/ before $letters", ({ phoneme, source, letters, limit }) => {
    const { word } = findExample(candidate => sitesBefore(candidate, phoneme, source, letters).length > 0, {
      property: `/${phoneme}/ selected as ${source} before a written ${letters}`,
      limit,
      options: { mode: "lexicon" },
    });
    const [site] = sitesBefore(word, phoneme, source, letters);
    expect(site.text).toBe(source);
    expect(site.selection.letterRespelled).toBeUndefined();
    expect(word.written.clean).toContain(source + site.next);
    expect(rootSound(word, site.selection.index)).toBe(phoneme);
  });

  it("uses c for /k/ only where the written vowel cues hard /k/", { timeout: 20_000 }, () => {
    const hardCs = { "eɪ": 0, "ɚ": 0 };
    let ksBeforeSoftLetters = 0;
    const falseSoftCs: string[] = [];
    for (const word of generateWords(6_000, { seed: 4950, mode: "lexicon", trace: true })) {
      const base = word.trace!.baseSpelling!;
      const root = word.trace?.morphology?.realization?.emittedParts.find(part => part.role === "root")?.text
        ?? base.surface;
      if (!base.surface.startsWith(root)) continue;
      for (const [index, cell] of base.cells.entries()) {
        if (index >= root.length) continue;
        const { origin } = cell;
        const sourceIds = origin.kind === "rewrite" ? origin.sourceUnitIds : [origin.unitId];
        if (sourceIds.length !== 1) continue;
        const unit = base.units[sourceIds[0]];
        const phone = base.phones[unit.phoneIds[0]];
        const vowel = base.phones[phone.id + 1];
        if (phone.soundAtSpelling !== "k" || phone.segment !== "onset" ||
            vowel?.segment !== "nucleus" || phone.syllableIndex !== vowel.syllableIndex) continue;
        const sound = vowel.soundAtSpelling;
        if (sound !== "eɪ" && sound !== "ɚ") continue;
        const next = root[index + 1] ?? "";
        if (cell.text === "c" && /^[aou]/.test(next)) hardCs[sound]++;
        if (cell.text === "c" && /^[eiy]/.test(next)) falseSoftCs.push(word.written.clean);
        if (cell.text === "k" && /^[eiy]/.test(next)) ksBeforeSoftLetters++;
      }
    }
    expect(hardCs["eɪ"]).toBeGreaterThan(5);
    expect(hardCs["ɚ"]).toBeGreaterThan(5);
    expect(ksBeforeSoftLetters).toBeGreaterThan(5);
    expect(falseSoftCs).toEqual([]);
  });
});
