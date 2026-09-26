import type { Grapheme, GraphemeReading } from "../../types.js";

const single: GraphemeReading = { kind: "single-phone" };
const open: GraphemeReading = { kind: "open-vowel-or-split-marker" };
const soft: GraphemeReading = { kind: "following-letter", require: ["e", "i", "y"] };
const hard: GraphemeReading = { kind: "following-letter", forbid: ["e", "i", "y"] };

function unsupported(reason: string): GraphemeReading {
  return { kind: "unsupported-construction", reason };
}

const lexical = unsupported("Requires lexical identity not represented by the spelling unit.");
const coalescence = unsupported("Requires a larger vowel/consonant construction not represented by one unit.");
const suffix = unsupported("Requires a morphological suffix and its pronunciation context.");
const marker = unsupported("The unit's final e can interact with a preceding vowel; marker scope is unrepresented.");
const rhotic = unsupported("Requires stress or rhotic context not represented by this reading obligation.");

/**
 * An explicit audit of the existing English inventory, independent of frequency.
 * `single` licenses the configured correspondence after its hard conditions;
 * it does not promise unique decoding (ea has both /i:/ and /ɛ/ readings).
 *
 * Ordinary correspondences and c/g contexts follow English Appendix 1: Spelling:
 * https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study
 * This is not a dialect conversion: the inventory's phones remain unchanged.
 * Unsupported entries remain selectable by the legacy writer. A future explicit
 * construction can replace their refusal without treating their weight as proof.
 */
const readings: Record<string, Record<string, GraphemeReading>> = {
  "i:": { ee: single, ea: single, e: open, y: open, ie: single, ei: single, eo: lexical },
  "ɪ": { i: single, y: single, ui: lexical },
  "ɛ": { e: single, ea: single },
  "æ": { a: single },
  "ɑ": { a: lexical, o: single, ah: single, aa: lexical, au: lexical, aue: lexical },
  "ɔ": { o: lexical, aw: single, ough: lexical },
  "ʊ": { oo: single, u: single, ou: lexical },
  "u": { ou: lexical, oo: single, u: open, ue: single, ew: single },
  "ʌ": { u: single, o: lexical, uh: single },
  // These are configured reduction outputs, not claims about lexical stress.
  "ə": { e: single, a: single, o: single, ou: lexical, u: single, i: single },
  "aɪ": { i: open, igh: single, y: open, ie: single, ai: lexical, is: lexical, ye: single, eye: single },
  "aʊ": { ow: single, ou: single },
  "ɔɪ": { oi: single, oy: single },
  "eɪ": { a: open, ai: single, ay: single, eigh: single, ea: lexical, ey: single, ae: lexical },
  "əʊ": { ow: single, o: open, ou: lexical, oe: single, ough: lexical },
  // Source comments conflict with this symbol's purported rhotic identity.
  "ɜ": {
    e: unsupported("The inventory's /ɜ/ identity is unresolved; no reading is certified."),
    ai: unsupported("The inventory's /ɜ/ identity is unresolved; no reading is certified."),
  },
  "ɚ": { er: single, ir: single, ur: single, or: rhotic, ar: rhotic, eir: lexical, re: rhotic, ure: rhotic },
  "j": { y: single, j: lexical },
  "w": { w: single, wh: single },
  "l": { l: single },
  "r": { r: single, wr: single, rh: single },
  "m": { m: single, mb: single, mn: lexical, lm: lexical },
  "n": { n: single, mn: single, kn: single, gn: lexical, pn: single },
  "ŋ": { ng: single, n: { kind: "following-letter", require: ["k", "g"] } },
  "f": { f: single, ph: single, gh: lexical },
  "v": { v: single, f: lexical, ve: marker, ph: lexical },
  "θ": { th: single },
  "ð": { th: single },
  "s": { s: single, c: soft, sc: soft, ps: lexical, st: lexical, ce: marker, se: marker },
  "z": { z: single, s: single, x: single, ze: marker },
  "ʃ": { sh: single, ti: coalescence, ci: coalescence, ch: lexical, s: lexical, si: coalescence,
    ce: coalescence, ssi: coalescence, sc: lexical, sch: lexical },
  "ʒ": { s: lexical, si: coalescence, z: lexical, g: lexical, ge: lexical },
  "h": { h: single, wh: lexical },
  "tʃ": { ch: single, tch: single, tu: coalescence, te: coalescence },
  // dge's existing lax-vowel guard is required. Its e belongs to this unit,
  // and is never available as a split marker for a different vowel unit.
  "dʒ": { g: soft, j: single, ge: marker, dge: single, di: coalescence },
  "p": { p: single },
  "b": { b: single, pb: lexical },
  "t": { t: single, th: lexical, bt: lexical, ed: suffix },
  "d": { d: single, ed: suffix },
  "k": { k: single, c: hard, ck: single, ch: lexical, lk: lexical,
    q: unsupported("Requires lexical identity or a joint qu construction; neither is represented.") },
  "g": { g: hard, gh: lexical, gu: { kind: "following-letter", require: ["e", "i"] }, gue: lexical },
};

function readingFor(grapheme: Grapheme): GraphemeReading | undefined {
  // The Mc entry explicitly permits hard c before a front vowel. It cannot
  // inherit the general hard-c certificate without modeling the name pattern.
  if (grapheme.phoneme === "k" && grapheme.form === "c"
    && grapheme.condition?.leftGraphemeContext?.includes("m")) {
    return unsupported("Requires the lexical Mc name pattern.");
  }
  if (!Object.hasOwn(readings, grapheme.phoneme)) return undefined;
  const forms = readings[grapheme.phoneme];
  if (!Object.hasOwn(forms, grapheme.form)) return undefined;
  const reading = forms[grapheme.form];
  if (reading.kind !== "following-letter") return { ...reading };
  return {
    ...reading,
    ...(reading.require ? { require: [...reading.require] } : {}),
    ...(reading.forbid ? { forbid: [...reading.forbid] } : {}),
  };
}

/** Only the bundled English inventory opts in; custom map construction does not. */
export function withEnglishReadings(graphemes: readonly Grapheme[]): Grapheme[] {
  return graphemes.map(grapheme => {
    const reading = readingFor(grapheme);
    return reading ? { ...grapheme, reading } : { ...grapheme };
  });
}
