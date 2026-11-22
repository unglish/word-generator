import { describe, expect, it } from "vitest";
import { englishConfig, generateWord, generateWords } from "../index.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import { DIGRAPH_CONSONANTS, openReading } from "../elements/graphemes/open-reading.js";
import type { Grapheme, Word } from "../types.js";
import { isVowelChar } from "../utils/letters.js";
import { createGraphemeResolver, INITIAL_GRAPHEME_PREFIX } from "./grapheme-selection.js";
import type { GraphemeTrace } from "./trace.js";
import { findExample } from "../test-support/find-example.js";

// Issue #470: a long vowel written with one vowel letter in a closed syllable
// reads short (liskicky /laɪz/ reads lis-, kalmrel /keɪl/ reads kal-). The bare
// letters carry an openReading condition: open syllable, an accepted coda
// (kind), or one consonant that a reader moves onto a following vowel (ti-ger).

const BARE: Record<string, string> = { "aɪ": "i", "eɪ": "a", "i:": "e", "u": "u" };
const ISSUE_SEEDS = [2000002, 2000201, 2000133, 2000319, 2000001] as const;

/** The shipped openReading requirement of each bare long-vowel letter. */
const REQUIREMENTS = new Map(Object.entries(BARE).map(([phoneme, form]) => {
  const requirement = englishConfig.graphemes.find(g => g.phoneme === phoneme && g.form === form)?.condition?.openReading;
  return [phoneme, requirement];
}));

interface LongNucleus {
  nucleus: GraphemeTrace;
  coda: string[];
  vowelAfter: boolean;
  final: boolean;
}

/** /aɪ eɪ i: u/ nuclei with their coda sounds and whether a vowel follows the coda, from the trace. */
function longNuclei(word: Word): LongNucleus[] {
  const selections = word.trace!.graphemeSelections;
  // The root is spelled before its resolved suffix (s → es after a sibilant).
  const suffix = word.trace!.morphology?.realization?.suffix?.resolved.written ?? "";
  return selections.flatMap((nucleus) => {
    if (nucleus.position !== "nucleus" || !(nucleus.phoneme in BARE)) return [];
    const rest = selections.filter(g => g.index > nucleus.index);
    const coda = rest.filter(g => g.syllableIndex === nucleus.syllableIndex && g.position === "coda").map(g => g.phoneme);
    const after = rest.find(g => g.syllableIndex !== nucleus.syllableIndex);
    const vowelAfter = after ? after.position === "nucleus" : suffix !== "" && isVowelChar(suffix[0], 0, suffix);
    return [{ nucleus, coda, vowelAfter, final: after === undefined }];
  });
}

/** The rime test the openReading condition applies, restated from the shipped requirement. */
function readsOpen({ nucleus, coda, vowelAfter }: LongNucleus): boolean {
  const requirement = REQUIREMENTS.get(nucleus.phoneme)!;
  if (coda.length === 0) return true;
  if ((requirement.codas ?? []).some(c => c.join(" ") === coda.join(" "))) return true;
  return coda.length === 1 && vowelAfter && !(requirement.heldCodas ?? []).includes(coda[0]);
}

const isBare = (n: LongNucleus) => n.nucleus.selected === BARE[n.nucleus.phoneme];

/** One-consonant codas a split e cannot reach across (si-nge), from the shipped silent-e limit. */
const SPLIT_HELD = new Set(englishConfig.silentE!.codaLimit!.heldCodas);
const SPLIT_CLUSTERS = englishConfig.silentE!.codaLimit!.clusters ?? {};

/** Rules that leave a nucleus split by an e after its coda. */
const SPLIT_RULES = /^spellingRule:(magic-e|magic-e-ie-ue|ie-ue-before-e-coda)$/;

interface WrittenRime {
  /** Letters spelling the nucleus before the coda. */
  vowel: string;
  /** An e after the coda marks the vowel (magic-e, silent-e, or a coda spelling such as ge). */
  split: boolean;
}

/** The written vowel of a root nucleus and whether a split e follows its coda, from the base spelling. */
function writtenRime(word: Word, n: LongNucleus): WrittenRime | undefined {
  // A split rule's rewrite leaves its letters' ownership unresolved; it always leaves one vowel letter split.
  const syllable = `syllable:${n.nucleus.syllableIndex}`;
  if (word.trace!.repairs.some(r => r.detail === syllable && SPLIT_RULES.test(r.rule))) {
    return { vowel: n.nucleus.selected[0], split: true };
  }
  const base = word.trace!.baseSpelling!;
  const owner = (cell: (typeof base.cells)[number]) =>
    cell.origin.kind === "rewrite" ? cell.origin.sourceUnitIds[0] : cell.origin.unitId;
  const roleOf = (cell: (typeof base.cells)[number]) => {
    const unit = owner(cell);
    if (unit === undefined) return undefined;
    const phone = base.phones[unit];
    return phone.syllableIndex === n.nucleus.syllableIndex ? phone.segment : undefined;
  };
  const roles = base.cells.map(roleOf);
  const firstCoda = roles.indexOf("coda");
  const lastCoda = roles.lastIndexOf("coda");
  if (firstCoda < 0) return undefined;
  const vowel = base.cells.filter((cell, i) => roles[i] === "nucleus" && i < firstCoda).map(cell => cell.text).join("");
  const next = base.cells[lastCoda + 1];
  const split = base.cells[lastCoda].text === "e" || (next?.text === "e" && (roles[lastCoda + 1] === "nucleus" || owner(next) === undefined));
  return { vowel, split };
}

/** Whether a syllable-scoped repair (detail "syllable:<n>") fired on a nucleus with one of these phonemes. */
function repairedNucleusIs(word: Word, detail: string | undefined, phonemes: readonly string[]): boolean {
  const syllable = Number(detail?.split(":")[1]);
  return word.trace!.graphemeSelections.some(g => g.syllableIndex === syllable && g.position === "nucleus" && phonemes.includes(g.phoneme));
}

/** Two-letter coda spellings of one consonant that no split rule can cross. */
const UNSPLITTABLE_CODA = /^(ch|gh|mn|lm|gn)$/;

/** The emitted spelling of a nucleus's coda. */
function codaSpelling(word: Word, n: LongNucleus): string {
  return word.trace!.graphemeSelections
    .filter(g => g.syllableIndex === n.nucleus.syllableIndex && g.position === "coda")
    .map(g => g.emitted).join("");
}

/** Whether a split vowel reads long across this coda: one non-held consonant, or a listed cluster (change). */
function splitReadsLong({ nucleus, coda }: LongNucleus): boolean {
  if (coda.length === 1) return !SPLIT_HELD.has(coda[0]);
  return (SPLIT_CLUSTERS[nucleus.phoneme] ?? []).some(c => c.join(" ") === coda.join(" "));
}

/** A closed long vowel written as one letter that reads short (the issue's count, on written output). */
function writtenShort(word: Word, n: LongNucleus): boolean {
  // A tense vowel before /ŋ/ has no English spelling (#463): declared residual.
  if (n.coda.length === 0 || n.nucleus.selection?.fallback || n.coda[0] === "ŋ") return false;
  const rime = writtenRime(word, n);
  if (!rime || rime.vowel.length !== 1) return false;
  // A digraph is a single letter only after silent-e swapped it (oo → u_e); one
  // shortened by a syllable join (ume + eas → yumeas, file + eenge) is not a
  // long-vowel letter choice.
  const swapped = n.final && word.trace!.baseSpelling!.edits.some(e => e.rule === "silentE:swap");
  if (n.nucleus.selected.length > 1 && !swapped) return false;
  return rime.split ? !splitReadsLong(n) && n.coda.join(" ") !== "dʒ" : !readsOpen(n);
}

describe("long-vowel single letters read long (#470)", () => {
  it("ships an openReading condition on each bare long-vowel letter", () => {
    for (const [phoneme, requirement] of REQUIREMENTS) {
      expect(requirement, `/${phoneme}/ ${BARE[phoneme]}`).toBeDefined();
    }
  });

  it("resolves openReading from the nucleus rime's coda sounds and following vowel", () => {
    const bare: Grapheme = {
      phoneme: "aɪ", form: "i", frequency: 1, startWord: 1, midWord: 1, endWord: 1,
      condition: { openReading: openReading(["n", "d"]) },
    };
    const digraph: Grapheme = { phoneme: "aɪ", form: "ie", frequency: 1, startWord: 1, midWord: 1, endWord: 1 };
    const graphemes = [bare, digraph];
    const resolve = createGraphemeResolver({ ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes) });
    const phoneme = englishConfig.phonemes.find(p => p.sound === "aɪ")!;
    const forms = (codaSounds?: string[], vowelAfterCoda = false): string[] => resolve({
      phoneme, index: 0, total: 3, position: "nucleus", syllableIndex: 0, syllableCount: 2,
      onsetLength: 0, nucleusLength: 1, codaLength: codaSounds?.length ?? 1, isCluster: false,
    }, INITIAL_GRAPHEME_PREFIX, codaSounds && (() => ({ codaSounds, vowelAfterCoda }))).conditioned.map(g => g.form);

    expect(forms([])).toEqual(["i", "ie"]);
    expect(forms(["n", "d"])).toEqual(["i", "ie"]);
    // ti-ger: one consonant before a vowel moves onto it.
    expect(forms(["s"], true)).toEqual(["i", "ie"]);
    // lis-kicky: closed by a consonant before a consonant.
    expect(forms(["s"])).toEqual(["ie"]);
    // si-nger: a held digraph consonant stays in the syllable.
    expect(forms(["ŋ"], true)).toEqual(["ie"]);
    expect(forms(["l", "s"], true)).toEqual(["ie"]);
    // A closed slot without a rime source cannot show an open reading.
    expect(forms()).toEqual(["ie"]);
  });

  it("does not write the issue's vowels as a short-reading single letter", () => {
    for (const seed of ISSUE_SEEDS) {
      const word = generateWord({ seed, trace: true });
      const short = longNuclei(word).filter(n => (isBare(n) && !readsOpen(n) && !n.nucleus.selection?.fallback) || writtenShort(word, n));
      expect(short.map(n => n.nucleus.selected), `seed ${seed} → ${word.written.clean}`).toEqual([]);
      expect(generateWord({ seed }).written.clean).toBe(word.written.clean);
    }
  });

  it("keeps bare letters to open readings in every syllable, with long spellings for the rest", () => {
    let closedNonFinal = 0;
    let bareOpen = 0;
    let bareBeforeVowel = 0;
    let fallbacks = 0;
    let bareBeforeVowelNonFinal = 0;
    let writtenShortCount = 0;
    const closedNonFinalForms = new Map<string, number>();
    for (const word of generateWords(4_000, { seed: 470, trace: true })) {
      for (const n of longNuclei(word)) {
        const where = `${word.written.clean}: /${n.nucleus.phoneme}/ ${n.nucleus.selected} + [${n.coda.join(" ")}]`;
        // The trace's legal pool agrees with the rime: never bare where it reads short.
        if (!readsOpen(n)) expect(n.nucleus.afterCondition, where).not.toContain(BARE[n.nucleus.phoneme]);
        if (isBare(n)) {
          // Where no long spelling is legal (/aɪ/ before most clusters), the
          // bare letter is the declared fallback, not the ordinary entry.
          if (!readsOpen(n)) {
            expect(n.nucleus.selection?.fallback, where).toBeDefined();
            fallbacks++;
            continue;
          }
          if (n.coda.length === 0) bareOpen++;
          else if (n.vowelAfter && n.coda.length === 1) {
            bareBeforeVowel++;
            // ti-ger inside a root, not only before a suffix.
            if (!n.final) bareBeforeVowelNonFinal++;
          }
        }
        // Written output, after magic-e and silent-e: no single letter reads short.
        if (writtenShort(word, n)) writtenShortCount++;
        const { selected } = n.nucleus;
        const closed = n.coda.length > 0;
        // /aɪ/ is (is-land) and ai are open-only; ue only where magic-e splits it;
        // closed ew only after an onset and before one alveolar (newt).
        if (n.nucleus.phoneme === "aɪ" && (selected === "is" || selected === "ai")) expect(closed, where).toBe(false);
        if (n.nucleus.phoneme === "u" && selected === "ue" && closed) {
          expect(n.coda.length, where).toBe(1);
          expect(DIGRAPH_CONSONANTS, where).not.toContain(n.coda[0]);
        }
        if (n.nucleus.phoneme === "u" && selected === "ew" && closed) {
          expect(n.coda, where).toHaveLength(1);
          expect(["t", "d", "n", "l", "s", "z"], where).toContain(n.coda[0]);
          expect(word.trace!.graphemeSelections.some(g => g.syllableIndex === n.nucleus.syllableIndex && g.position === "onset"), where).toBe(true);
        }
        if (!n.final && n.coda.length > 0 && !readsOpen(n)) {
          closedNonFinal++;
          closedNonFinalForms.set(n.nucleus.selected, (closedNonFinalForms.get(n.nucleus.selected) ?? 0) + 1);
        }
      }
    }
    expect(bareOpen).toBeGreaterThan(150);
    expect(fallbacks).toBeGreaterThan(0);
    expect(bareBeforeVowel).toBeGreaterThan(40);
    expect(bareBeforeVowelNonFinal).toBeGreaterThan(0);
    expect(writtenShortCount).toBe(0);
    // Closed non-final syllables (liskicky, kalmrel, celstorn) now take the
    // long spellings: ie (split by magic-e) / ae (split, else ai) / ea, ee / oo, ew.
    expect(closedNonFinal).toBeGreaterThan(120);
    for (const form of ["ie", "ae", "ea", "ee", "oo"]) {
      expect(closedNonFinalForms.get(form) ?? 0, `${form} in ${JSON.stringify([...closedNonFinalForms])}`).toBeGreaterThan(5);
    }
  });

  it("keeps initial ie, oo, and ee rare across five lexicon streams", () => {
    let initialDigraphs = 0;
    for (let seed = 470; seed < 475; seed++) {
      const words = generateWords(4000, { seed, mode: "lexicon" });
      initialDigraphs += words.filter(word => /^(?:ie|oo|ee)/.test(word.written.clean)).length;
    }
    // Retain the original 15 in 4,000 ceiling, with fewer draws of only one
    // initial digraph determining the result.
    expect(initialDigraphs).toBeLessThan(75);
  });

  it("still splits closed long vowels with magic-e in a non-final syllable", () => {
    const { word, options } = findExample(w => w.trace!.repairs.some(r =>
      r.rule === "spellingRule:magic-e" && r.detail === "syllable:0" && w.syllables.length > 1 &&
      longNuclei(w).some(n => n.nucleus.syllableIndex === 0 && n.nucleus.selected === "ie" && !readsOpen(n))),
    { property: "a closed first-syllable /aɪ/ ie split by magic-e", limit: 2_000, firstSeed: 470_000 });
    expect(word.written.clean).toMatch(/i[bcdfgjklmnpqrstvz]e/);
    const untraced = generateWord({ ...options, trace: false });
    expect(untraced.written.clean).toBe(word.written.clean);
    expect(untraced.pronunciation).toBe(word.pronunciation);
  });

  it("still reaches a final split vowel through silent-e from a digraph", () => {
    // Closed finals no longer take bare a/u, so silent-e reaches a_e / u_e
    // from the digraphs it already swapped (ai → a, oo → u).
    for (const [phoneme, from] of [["eɪ", "ai"], ["u", "oo"]] as const) {
      const { word } = findExample(w => {
        const swap = w.trace!.baseSpelling?.edits.find(e => e.rule === "silentE:swap");
        return swap?.before === from && longNuclei(w).some(n => n.final && n.nucleus.phoneme === phoneme && n.coda.length === 1);
      }, { property: `a silent-e swap from /${phoneme}/ ${from}`, limit: 20_000, firstSeed: 470_000 });
      // One consonant between the vowel and the split e: a cluster would read short (rinse).
      // The root's spelling: a vowel suffix later drops the e (drage + ive → dragive).
      const root = word.trace!.baseSpelling!.surface;
      expect(root, word.written.clean).toMatch(new RegExp(`${BARE[phoneme]}[bcdfgjklmnpqrstvz]e$`));
    }
  });

  it("splits a final long vowel with silent-e only across one non-held consonant", () => {
    let swaps = 0;
    for (const word of generateWords(4_000, { seed: 4702, trace: true })) {
      const edits = word.trace!.baseSpelling!.edits;
      if (!edits.some(e => e.rule === "silentE:swap")) continue;
      const final = longNuclei(word).find(n => n.final);
      if (!final) continue;
      swaps++;
      // snunde, bakadse: oo/ai before a cluster or a digraph consonant stays a digraph (snoond, bakaids).
      expect(splitReadsLong(final), `${word.written.clean}: [${final.coda.join(" ")}]`).toBe(true);
    }
    expect(swaps).toBeGreaterThan(50);
  });

  it("finishes magic-e's split of a closed /aɪ/ ie or /u/ ue, but not /i:/ ie", () => {
    let closed = 0;
    let residual = 0;
    let unsplitIe = 0;
    let splitOnIi = 0;
    for (const word of generateWords(4_000, { seed: 4703, trace: true })) {
      // The sound-limited rules never touch /i:/ ie (field): letterRoles.sounds guards them.
      for (const r of word.trace!.repairs) {
        if (!/^spellingRule:(magic-e-ie-ue|ie-ue-before-e-coda)$/.test(r.rule)) continue;
        if (repairedNucleusIs(word, r.detail, ["i:"])) splitOnIi++;
      }
      for (const sel of word.trace!.graphemeSelections) {
        // /i:/ ie (field) keeps its digraph where magic-e missed: the sound check skips it.
        if (sel.phoneme !== "i:" || sel.selected !== "ie" || sel.position !== "nucleus") continue;
        const scope = `syllable:${sel.syllableIndex}`;
        const closedIe = word.trace!.graphemeSelections.some(g => g.syllableIndex === sel.syllableIndex && g.position === "coda");
        if (closedIe && !word.trace!.repairs.some(r => r.detail === scope && /^spellingRule:magic-e/.test(r.rule))) unsplitIe++;
      }
      for (const n of longNuclei(word)) {
        if (!((n.nucleus.phoneme === "aɪ" && n.nucleus.selected === "ie") || (n.nucleus.phoneme === "u" && n.nucleus.selected === "ue"))) continue;
        if (n.coda.length === 0) continue;
        closed++;
        const rime = writtenRime(word, n);
        // cieftow (chief), atier: an unsplit ie/ue reads /i:/ or /ju/. A coda
        // spelled with two consonant letters that no rule can cross (ch, gh,
        // mn, lm, gn) is a declared residual (about 8 per 100k words).
        if (!rime?.split && UNSPLITTABLE_CODA.test(codaSpelling(word, n))) { residual++; continue; }
        expect(rime?.split, `${word.written.clean}: ${n.nucleus.selected}`).toBe(true);
      }
    }
    expect(closed).toBeGreaterThan(50);
    expect(residual).toBeLessThan(5);
    expect(unsplitIe).toBeGreaterThan(0);
    expect(splitOnIi).toBe(0);
    const { word } = findExample(w => w.trace!.repairs.some(r => r.rule === "spellingRule:magic-e-ie-ue"), {
      property: "a magic-e miss finished for /aɪ/ ie or /u/ ue", limit: 20_000, firstSeed: 470_000,
    });
    expect(word.written.clean).not.toMatch(/[iu]e[bcdfghjklmnpqrstvwxz]$/);
  });

  it("keeps a root-final bare letter before a vowel-letter suffix (rise + -ing)", () => {
    // The vowel after the coda comes from the planned suffix's spelling, not a
    // following root syllable.
    // Not a listed coda (kind, /aɪŋ/): only the suffix's vowel can license it.
    const listed = (n: LongNucleus) => (REQUIREMENTS.get(n.nucleus.phoneme)!.codas ?? []).some(c => c.join(" ") === n.coda.join(" "));
    const { word, options } = findExample(w => longNuclei(w).some(n =>
      n.final && isBare(n) && n.coda.length === 1 && n.vowelAfter && !n.nucleus.selection?.fallback && !listed(n)
      && w.trace!.morphology?.realization?.suffix !== undefined), {
      property: "a root-final bare long-vowel letter before a vowel-initial suffix", limit: 5_000, firstSeed: 470_000,
    });
    const suffix = word.trace!.morphology!.realization!.suffix!.resolved.written;
    expect(isVowelChar(suffix[0], 0, suffix), suffix).toBe(true);
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("spells a closed /aɪ/ or /u/ before /k/ as k, so the split reads bike, duke", () => {
    const firedOn = (w: Word, phonemes: string[]) => w.trace!.repairs.some(r =>
      r.rule === "spellingRule:ie-ue-hard-c-to-k" && repairedNucleusIs(w, r.detail, phonemes));
    const { word } = findExample(w => firedOn(w, ["aɪ", "u"]), {
      property: "a closed /aɪ/ ie or /u/ ue + c respelled before magic-e", limit: 20_000, firstSeed: 470_000,
    });
    expect(word.trace!.baseSpelling!.surface).toMatch(/[iu]ke/);
    // /i:/ ie is never split, so its /k/ stays a hard k after the digraph (chief).
    const ii = findExample(w => firedOn(w, ["i:"]), {
      property: "a closed /i:/ ie + c respelled", limit: 20_000, firstSeed: 470_000,
    });
    expect(ii.word.trace!.baseSpelling!.surface).toMatch(/iek/);
    expect(ii.word.trace!.baseSpelling!.surface).not.toMatch(/ike/);
    let soft = 0;
    for (const w of generateWords(4_000, { seed: 4704, trace: true })) {
      for (const n of longNuclei(w)) {
        if (!["aɪ", "u"].includes(n.nucleus.phoneme) || n.coda.length !== 1 || !["k", "g"].includes(n.coda[0])) continue;
        // bices, mucetuns, pigevanting: an e after c or g softens it.
        const scope = `syllable:${n.nucleus.syllableIndex}`;
        const letters = w.trace!.repairs.filter(r => r.detail === scope && r.rule.startsWith("spellingRule:")).at(-1)?.after ?? "";
        if (/[cg]e$/.test(letters)) soft++;
      }
    }
    expect(soft).toBe(0);
  });

  it("drops a closed ie's e before a coda spelled with a final e (fliece → flice)", () => {
    const { word, options } = findExample(w => w.trace!.repairs.some(r => r.rule === "spellingRule:ie-ue-before-e-coda"), {
      property: "an /aɪ/ ie or /u/ ue before an e-final coda spelling", limit: 20_000, firstSeed: 470_000,
    });
    const repair = word.trace!.repairs.find(r => r.rule === "spellingRule:ie-ue-before-e-coda")!;
    expect(repair.after).toMatch(/[iu][bcdfgjklmnpqrstvz]e$/);
    expect(repair.after).not.toMatch(/[iu]e[bcdfgjklmnpqrstvz]e$/);
    expect(generateWord({ ...options, trace: false }).written.clean).toBe(word.written.clean);
  });

  it("never splits /i:/ ie with magic-e, and keeps closed /i:/ ie to English codas (shriek, chief, field)", () => {
    let closedIi = 0;
    for (const w of generateWords(4_000, { seed: 4705, trace: true })) {
      for (const r of w.trace!.repairs) {
        if (r.rule !== "spellingRule:magic-e") continue;
        expect(repairedNucleusIs(w, r.detail, ["i:"]), w.written.clean).toBe(false);
      }
      for (const n of longNuclei(w)) {
        if (n.nucleus.phoneme !== "i:" || n.nucleus.selected !== "ie" || n.coda.length === 0) continue;
        closedIi++;
        // Before other single codas ie reads with an extra syllable (edien as in alien, fatmiet as in diet, -ier, -ies).
        if (n.coda.length === 1) expect(["f", "v", "k", "dʒ"], `${w.written.clean}: [${n.coda.join(" ")}]`).toContain(n.coda[0]);
      }
    }
    expect(closedIi).toBeGreaterThan(30);
  });

  it("writes closed /aɪ/ ie only where magic-e can split it", () => {
    let closed = 0;
    let fallback = 0;
    for (const word of generateWords(4_000, { seed: 4701, trace: true })) {
      for (const n of longNuclei(word)) {
        if (n.nucleus.phoneme !== "aɪ" || n.coda.length === 0) continue;
        closed++;
        const where = `${word.written.clean}: ${n.nucleus.selected} + [${n.coda.join(" ")}]`;
        // Before a cluster or digraph coda ie reads /i:/ (fiechloties, as in field).
        if (n.nucleus.selected === "ie") {
          expect(n.coda.length, where).toBe(1);
          expect(DIGRAPH_CONSONANTS, where).not.toContain(n.coda[0]);
        }
        if (n.nucleus.selection?.fallback) {
          fallback++;
          expect(n.nucleus.selected, where).toBe("i");
        }
      }
    }
    expect(closed).toBeGreaterThan(100);
    expect(fallback).toBeGreaterThan(0);
  });
});
