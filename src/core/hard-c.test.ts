import { describe, expect, it } from "vitest";
import { generateWord, generateWords } from "../index.js";
import type { GraphemeTrace } from "../index.js";
import type { Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";

// #460. Grapheme selection blocks /k/ → c only before front-vowel *sounds*, so
// c was still written before an e/i/y letter, where it reads /s/: a schwa
// spelled e or i (ececoontion), /j/ → y (facyorck), magic-e's e (brice), or an
// e/i/y-initial suffix (winwocive). The writer now respells such a c as ck
// after a short single vowel letter and k elsewhere.
//
// #469. A root-final /k/ was written c after consonants and long vowels
// (molstisc, urcs, isheec), where English writes k, ck or ke and keeps c
// for -ic/-ac (panic, maniac).

const SHORT_VOWELS = new Set(["ɪ", "ɛ", "æ", "ʌ", "ɑ", "ɔ", "ʊ", "ə"]);
const SOFT = new Set(["e", "i", "y"]);

interface WrittenC {
  /** The /k/ or /s/ that supplied the c. */
  sound: string;
  /** Letter after it in the attached root, or the suffix's first letter at its end. */
  next: string;
  /** Root letters after it that the suffix keeps. */
  rest: string;
  /** It follows a single i or a of a short vowel (-ic, -ac, maniac). */
  afterShortIA: boolean;
  /** The planned suffix's spelling. */
  following: string;
}

interface LetterPhone {
  id: number;
  sound: string;
}

/**
 * The phone that supplied each letter of the root's base spelling (as
 * BaseSpelling.letterSource), with the sound a suffix rule gives a root-final
 * /k/ (-ity makes it /s/).
 */
function letterPhones(word: Word): (LetterPhone | undefined)[] {
  const { cells, units, phones } = word.trace!.baseSpelling!;
  const resounded = word.trace!.morphology?.alternations?.find(
    (a) => a.boundary === "root-suffix" && a.soundBefore === "k" && a.soundAfter !== undefined,
  )?.soundAfter;
  return cells.map((cell) => {
    const ids = cell.origin.kind !== "rewrite"
      ? [cell.origin.unitId]
      : cell.origin.sourceUnitIds.filter((id) => units[id].afterDoubling.includes(cell.text));
    if (ids.length !== 1) return undefined;
    const phone = phones[units[ids[0]].phoneIds[0]];
    const last = phone.id === phones.length - 1;
    return { id: phone.id, sound: last && resounded ? resounded : phone.soundAtSpelling };
  });
}

function suffixText(word: Word): string {
  return word.trace!.morphology?.realization?.assembledParts.find((p) => p.role === "suffix")?.text ?? "";
}

/** Letters of the base spelling still before the suffix (a silent e dropped before -al is not). */
function keptRoot(word: Word): string {
  const surface = word.trace!.baseSpelling!.surface;
  const root = word.trace!.morphology?.realization?.assembledParts.find((p) => p.role === "root")?.text;
  return root !== undefined && root.length < surface.length && surface.startsWith(root) ? root : surface;
}

/** Every c in the root spelled for /k/ or /s/, with the letter that follows it once attached. */
function writtenCs(word: Word): WrittenC[] {
  const surface = keptRoot(word);
  const phones = letterPhones(word);
  const following = suffixText(word);
  return [...surface].flatMap((letter, i) => {
    const sound = phones[i]?.sound;
    if (letter !== "c" || (sound !== "k" && sound !== "s")) return [];
    const vowel = phones[i - 1];
    const afterShortIA = /[ia]/.test(surface[i - 1] ?? "") && !!vowel && SHORT_VOWELS.has(vowel.sound) &&
      !(/[aeiou]/.test(surface[i - 2] ?? "") && phones[i - 2]?.id === vowel.id);
    return [{
      sound,
      next: surface[i + 1] ?? following[0] ?? "",
      rest: surface.slice(i + 1),
      afterShortIA,
      following,
    }];
  });
}

const hardCBeforeSoft = (word: Word) => writtenCs(word).filter((c) => c.sound === "k" && SOFT.has(c.next));

/** /k/ selections a hard-letter rule respelled. */
function respelledKs(word: Word): GraphemeTrace[] {
  return word.trace!.graphemeSelections.filter(
    (g) => g.phoneme === "k" && g.letterRespelled?.rule === "hardLetter:hard-c",
  );
}

function selectionAt(word: Word, index: number): GraphemeTrace | undefined {
  return word.trace!.graphemeSelections.find((g) => g.index === index);
}

/** /k/ selections respelled for `reason`, as the repair detail names them. */
function respelledFor(word: Word, reason: string): GraphemeTrace[] {
  return respelledKs(word).filter((g) => word.trace!.repairs.some((r) =>
    r.rule === "hardLetter:hard-c" && r.detail?.startsWith(reason) && r.detail.endsWith(`(selection ${g.index})`)));
}

const isLastRootPhone = (word: Word, g: GraphemeTrace) =>
  g.index === word.trace!.baseSpelling!.phones.length - 1;

const search = { limit: 20_000, firstSeed: 2_000_000 };

describe("hard c before e/i/y letters (#460)", () => {
  it("respells a root-internal c before a schwa written e or i", () => {
    const { word } = findExample(
      (w) => respelledFor(w, "soft-letter").some((g) => {
        const next = selectionAt(w, g.index + 1);
        return next?.phoneme === "ə" && /^[ei]/.test(next.emitted);
      }),
      { property: "/k/ c before a schwa letter e or i", ...search },
    );
    const [k] = respelledKs(word);
    expect(k.selected).toBe("c");
    expect(["k", "ck"]).toContain(k.letterRespelled!.form);
    expect(word.trace!.repairs.some((r) => r.rule === "hardLetter:hard-c" && r.detail?.startsWith("soft-letter"))).toBe(true);
    expect(hardCBeforeSoft(word)).toEqual([]);
  });

  it("writes ck after a short single vowel letter and k after a consonant", () => {
    const afterVowel = findExample(
      (w) => respelledFor(w, "soft-letter").some((g) => {
        const prev = selectionAt(w, g.index - 1);
        return g.letterRespelled!.form === "ck" && !!prev && SHORT_VOWELS.has(prev.phoneme) && prev.emitted.length === 1;
      }),
      { property: "a c respelled ck after a short vowel letter", ...search },
    ).word;
    expect(afterVowel.written.clean).toMatch(/[aeiou]ck[eiy]/);

    const afterConsonant = findExample(
      (w) => respelledFor(w, "soft-letter").some((g) => {
        const prev = selectionAt(w, g.index - 1);
        return g.letterRespelled!.form === "k" && prev?.position !== "nucleus" && prev?.phoneme === "s";
      }),
      { property: "an sc respelled sk", ...search },
    ).word;
    expect(afterConsonant.written.clean).toMatch(/sk[eiy]/);
  });

  it("respells a root-final c before an e/i/y-initial suffix (panic → panicking)", () => {
    /** The root-final /k/ respelled because of the suffix's first letter, not a kept silent e. */
    const beforeSuffix = (w: Word) => respelledFor(w, "soft-letter").find((g) => isLastRootPhone(w, g) &&
      w.trace!.repairs.some((r) => r.rule === "hardLetter:hard-c" &&
        !!r.detail?.endsWith(`before "${suffixText(w)[0]}" (selection ${g.index})`)));
    const { word } = findExample(
      (w) => SOFT.has(suffixText(w)[0]) && beforeSuffix(w) !== undefined,
      { property: "a root-final /k/ c before an e/i/y suffix", ...search },
    );
    const k = beforeSuffix(word)!;
    const root = word.trace!.morphology!.realization!.assembledParts.find((p) => p.role === "root")!.text;
    expect(root.endsWith(k.letterRespelled!.form)).toBe(true);
    expect(word.written.clean).toContain(k.letterRespelled!.form + suffixText(word));
    expect(hardCBeforeSoft(word)).toEqual([]);
  });

  it("respells the c before magic-e's e (vutice → vutike)", () => {
    const { word } = findExample(
      (w) => respelledKs(w).length > 0 && w.trace!.repairs.some(
        (r) => r.rule === "spellingRule:magic-e" && /[aiouy]ce$/.test(r.after),
      ),
      { property: "magic-e writing ce for /k/", ...search },
    );
    const magic = word.trace!.repairs.find((r) => r.rule === "spellingRule:magic-e" && /[aiouy]ce$/.test(r.after))!;
    // The respell turns magic-e's syllable "…ice" into "…ike".
    expect(word.trace!.repairs.some((r) =>
      r.rule === "hardLetter:hard-c" && r.after.includes(magic.after.replace(/ce$/, "ke")))).toBe(true);
    expect(hardCBeforeSoft(word)).toEqual([]);
  });

  it("spells closed ae + /k/ as ak(e), never a soft ace", () => {
    // ae-hard-c-to-k writes the k before magic-e and ae-before-e-coda run; the
    // hard-c respell runs after them and must find no /k/ c before an e to fix.
    const { word } = findExample(
      (w) => w.trace!.graphemeSelections.some((g, i, all) => g.phoneme === "eɪ" && g.selected === "ae" &&
        all.slice(i + 1).some((h) => h.syllableIndex === g.syllableIndex && h.position === "coda" && h.phoneme === "k")),
      { property: "a closed ae before a /k/ coda", limit: 20_000, firstSeed: 5_000_000 },
    );
    expect(word.written.clean).toMatch(/a(i)?k/);
    expect(hardCBeforeSoft(word)).toEqual([]);
  });

  it("leaves no hard c before e/i/y over a seeded sample, and keeps soft c", () => {
    let respelled = 0;
    let softC = 0;
    for (const word of generateWords(4_000, { seed: 4600, trace: true })) {
      respelled += respelledKs(word).length;
      softC += writtenCs(word).filter((c) => c.sound === "s" && SOFT.has(c.next)).length;
      expect(hardCBeforeSoft(word), word.written.clean).toEqual([]);
    }
    // About 2% of words had one before the fix.
    expect(respelled).toBeGreaterThan(40);
    // Soft c for /s/ (cell, acid) is untouched.
    expect(softC).toBeGreaterThan(80);
  });

  it("is deterministic and trace-neutral", () => {
    const { seed, word } = findExample((w) => respelledKs(w).length > 0, {
      property: "a respelled hard c",
      ...search,
    });
    const untraced = generateWord({ seed });
    expect(untraced.written).toEqual(word.written);
    expect(untraced.pronunciation).toBe(word.pronunciation);
  });
});

/** A /k/ c that ends the root (alone or before a final s/se) where English writes k or ck. */
function isUnEnglishFinalC(c: WrittenC): boolean {
  if (c.sound !== "k" || !["", "s", "se"].includes(c.rest)) return false;
  if (c.rest === "" && /^[taou]/.test(c.following)) return false;
  return !c.afterShortIA;
}

/**
 * Letters before each `ks` that `ks-to-x` wrote as `x`, read from its repair
 * before/after strings. English writes x after a vowel (box), a vowel + ck
 * (necks) or n (jinx); after another consonant it keeps ks (desks, works).
 */
function ksToXContexts(word: Word): string[] {
  return word.trace!.repairs.filter((r) => r.rule === "spellingRule:ks-to-x").flatMap(({ before, after }) => {
    const contexts: string[] = [];
    for (let i = 0, j = 0; i < before.length; i++, j++) {
      if (before[i] === after[j]) continue;
      // The first difference is a ks → x replacement.
      contexts.push(before.slice(Math.max(0, i - 2), i));
      i++;
    }
    return contexts;
  });
}

const isEnglishXContext = (context: string) => /([aeiouyn]|[aeiouy]c)$/.test(context);

const finalSearch = { limit: 20_000, firstSeed: 2_000_000, options: { morphology: false } };

describe("root-final /k/ (#469)", () => {
  it.each([
    ["s", /sk$/],
    ["l", /lk$/],
    ["r", /rk$/],
  ])("writes k after %s", (consonant, ending) => {
    const { word } = findExample(
      (w) => respelledFor(w, "root-final").some((g) => isLastRootPhone(w, g) && selectionAt(w, g.index - 1)?.emitted.endsWith(consonant)),
      { property: `a final /k/ c after ${consonant}`, ...finalSearch },
    );
    expect(word.written.clean).toMatch(ending);
  });

  it("writes k after a vowel digraph (isheec → isheek)", () => {
    const { word } = findExample(
      (w) => respelledFor(w, "root-final").some((g) =>
        isLastRootPhone(w, g) && /^[aeiou]{2}$/.test(selectionAt(w, g.index - 1)?.emitted ?? "")),
      { property: "a final /k/ c after a vowel digraph", ...finalSearch },
    );
    expect(word.written.clean).toMatch(/[aeiou]{2}k$/);
  });

  it("writes a final /ks/ as ks, cks or x, not cs", () => {
    const { word } = findExample(
      (w) => respelledFor(w, "root-final").some((g) => selectionAt(w, g.index + 1)?.phoneme === "s" && isLastRootPhone(w, selectionAt(w, g.index + 1)!)),
      { property: "a /k/ c before a root-final /s/", ...finalSearch },
    );
    expect(word.written.clean).toMatch(/(ks|x)e?$/);
    expect(word.written.clean).not.toMatch(/cs$/);
  });

  it("keeps a c whose silent e the suffix drops before a/o/u (edice + al → edical)", () => {
    const { word } = findExample((w) => {
      const surface = w.trace!.baseSpelling!.surface;
      return /^[aou]/.test(suffixText(w)) && /ce$/.test(surface) && keptRoot(w).endsWith("c") &&
        writtenCs(w).some((c) => c.sound === "k" && c.rest === "");
    }, { property: "a /k/ c + silent e before an a/o/u suffix", ...search });
    expect(word.written.clean).toContain("c" + suffixText(word));
    expect(respelledFor(word, "soft-letter")).toEqual([]);
  });

  it("leaves a c that -ity re-sounds as /s/ (chace + ity → chacity)", () => {
    // -ity velar softening makes the root-final /k/ /s/; its writtenMatch misses
    // the silent e that drop-silent-e then removes, so the c itself reads /s/.
    const { word } = findExample((w) => suffixText(w) === "ity" &&
      /ce$/.test(w.trace!.baseSpelling!.surface) &&
      !!w.trace!.morphology?.alternations?.some((a) => a.rule === "ity-velar-softening" && a.soundAfter === "s"),
    { property: "-ity softening a /k/ c before a silent e", limit: 100_000, firstSeed: 2_000_000 });
    expect(respelledKs(word).filter((g) => isLastRootPhone(word, g))).toEqual([]);
    expect(word.written.clean).toMatch(/city$/);
  });

  it("keeps -ic and -ac", () => {
    const { word } = findExample(
      (w) => /[^aeiouy][ia]c$/.test(w.written.clean) && respelledKs(w).length === 0,
      { property: "a word ending in -ic or -ac", ...finalSearch },
    );
    const last = word.trace!.graphemeSelections.at(-1)!;
    expect(last.phoneme).toBe("k");
    expect(last.letterRespelled).toBeUndefined();
  });

  it("writes ck only after a short single vowel letter (yarck → yark)", () => {
    const { word } = findExample((w) => respelledFor(w, "not-after-short-vowel").length > 0, {
      property: "a ck respelled k",
      ...search,
    });
    const k = respelledFor(word, "not-after-short-vowel")[0];
    expect(k.selected === "ck" || k.emitted === "ck").toBe(true);
    expect(k.letterRespelled!.form).toBe("k");
  });

  it("leaves no root-final c outside -ic/-ac, no rck and no consonant + x over a seeded sample", () => {
    let icAc = 0;
    let xs = 0;
    let respelled = 0;
    for (const word of generateWords(4_000, { seed: 4690, trace: true })) {
      const cs = writtenCs(word);
      expect(cs.filter(isUnEnglishFinalC), word.written.clean).toEqual([]);
      expect(word.written.clean).not.toMatch(/rck/);
      expect(ksToXContexts(word).filter((c) => !isEnglishXContext(c)), word.written.clean).toEqual([]);
      xs += ksToXContexts(word).length;
      respelled += respelledFor(word, "root-final").length;
      if (/[^aeiouy][ia]cs?$/.test(word.written.clean)) icAc++;
    }
    // About 2% of words ended in such a c before the fix.
    expect(respelled).toBeGreaterThan(40);
    expect(icAc).toBeGreaterThan(3);
    // ks-to-x still writes x where English does (box, necks → nex).
    expect(xs).toBeGreaterThan(2);
  });
});
