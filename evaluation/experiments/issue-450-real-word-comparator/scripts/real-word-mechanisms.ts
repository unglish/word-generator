/**
 * Issue #450 Part 1 — align uninflected real-word CMU monos + mechanism /
 * vowel-strategy tables vs ungated generator (probe only).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  buildReference,
  syllabify,
  CMU_SHA256,
} from "/agent/repos/word-generator/evaluation/review/wordlikeness/model.ts";
import { graphemeMaps } from "/agent/repos/word-generator/src/elements/graphemes/index.ts";
import {
  createGenerator,
  englishConfig,
  createSeededRng,
} from "/agent/repos/word-generator/src/index.ts";
import type { LanguageConfig, Word } from "/agent/repos/word-generator/src/types.ts";

const OUT =
  process.env.OUT_DIR ??
  "/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/internal/issue-450/packets/real-word-comparator";
mkdirSync(OUT, { recursive: true });

const EXPECTED = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
const text = readFileSync("/tmp/wordlikeness-cmudict.dict", "utf8");
const sha = createHash("sha256").update(text, "utf8").digest("hex");
if (sha !== EXPECTED || sha !== CMU_SHA256) throw new Error(`CMU SHA ${sha}`);

const norm = JSON.parse(
  readFileSync("/agent/repos/word-generator/data/cmu/phoneme-normalization.json", "utf8"),
);
const arpabetToIpa = norm.arpabetToIpa as Record<string, string>;
const generatedAliases = norm.generatedAliases as Record<string, string>;
function toIpa(base: string): string | null {
  const ipa = arpabetToIpa[base];
  if (!ipa) return null;
  return generatedAliases[ipa] ?? ipa;
}

const IPA_FALLBACKS: Record<string, string[]> = {
  ə: ["ʌ", "ɜ", "ɚ"],
  ɜ: ["ɚ", "ə", "ʌ"],
  ɚ: ["ɜ", "ə"],
  ʌ: ["ə"],
  u: ["u:"],
  "u:": ["u"],
};

type Position = "onset" | "nucleus" | "coda";
type UnitKind =
  | "grapheme"
  | "single-letter-fallback"
  | "ortho-extra"
  | "silent-final-e"
  | "silent-e-before-coda"
  | "silent-k-in-kn"
  | "silent-w-in-wr"
  | "silent-g-in-gn"
  | "silent-b-in-mb"
  | "silent-n-in-mn"
  | "silent-gh"
  | "silent-h"
  | "silent-l"
  | "geminate-extra";

type AlignUnit = {
  kind: UnitKind;
  form: string;
  phoneme: string | null;
  position: Position | "word";
  letters: number;
};

const ORTHO_EXTRA: Record<string, string[]> = {
  s: ["s", "ss", "c", "ps", "tz", "z"],
  z: ["z", "zz", "s", "ss", "tz", "x"],
  t: ["t", "tt", "tz", "ed"],
  d: ["d", "dd", "ed"],
  k: ["k", "c", "ck", "ch", "q", "lk"],
  f: ["f", "ff", "ph", "gh"],
  l: ["l", "ll"],
  n: ["n", "nn", "kn", "gn"],
  m: ["m", "mm", "mb", "mn", "lm"],
  r: ["r", "rr", "wr", "rh"],
  p: ["p", "pp"],
  b: ["b", "bb"],
  g: ["g", "gg", "gh"],
  ɔ: ["o", "a", "aw", "au", "ough", "oa"],
  ɑ: ["a", "o", "ah"],
  əʊ: ["o", "ow", "oa", "oe", "ough"],
  eɪ: ["a", "ai", "ay", "ei", "ey", "eigh", "ae"],
  aɪ: ["i", "y", "ie", "igh", "ye", "uy"],
  "i:": ["e", "ee", "ea", "ie", "ei", "y"],
  ɪ: ["i", "y", "ui", "e"],
  ɛ: ["e", "ea", "ai", "a", "ie"],
  æ: ["a"],
  ʊ: ["oo", "u", "ou", "o"],
  u: ["oo", "u", "ue", "ew", "ou"],
  ʌ: ["u", "o", "ou", "oo"],
  ə: ["a", "e", "o", "u", "i", "ou"],
};

const VOWEL_PHONES = new Set([
  "i:",
  "ɪ",
  "eɪ",
  "ɛ",
  "æ",
  "ɑ",
  "ɔ",
  "əʊ",
  "ʊ",
  "u",
  "u:",
  "ʌ",
  "ə",
  "ɜ",
  "ɚ",
  "aɪ",
  "aʊ",
  "ɔɪ",
]);

const SOFT_CODA = new Set(["ce", "ge", "ve", "se", "ze"]);
const CONS_DIGRAPH = new Set(["sh", "ch", "th", "ng", "wh", "ph"]);
const DOUBLE_LIKE = new Set(["ck", "tch", "dge", "ff", "ll", "ss", "zz", "tt", "pp", "rr", "nn", "mm", "dd", "bb", "gg"]);

// Generator doubling rules (for permitted/not split)
const NEVER_DOUBLE = new Set(["v", "w", "x", "y", "q", "j", "dʒ", "h", "ŋ", "θ", "ð", "ʒ"]);
const FINAL_DOUBLING_ONLY = new Set(["f", "s", "l", "z", "k"]);
const NEVER_DOUBLE_FINAL = new Set(["b", "d", "g"]);
const LAX = new Set(["ɪ", "ɛ", "æ", "ʌ", "ʊ", "ɒ", "ə"]); // rough

function candidateForms(phoneme: string, position: Position) {
  const seen = new Set<string>();
  const out: { form: string; frequency: number; kind: UnitKind }[] = [];
  const push = (form: string, frequency: number, kind: UnitKind) => {
    const f = form.toLowerCase();
    if (!f || seen.has(f)) return;
    seen.add(f);
    out.push({ form: f, frequency, kind });
  };
  for (const p of [phoneme, ...(IPA_FALLBACKS[phoneme] ?? [])]) {
    for (const g of graphemeMaps[position].get(p) ?? []) push(g.form, g.frequency ?? 0, "grapheme");
  }
  for (const form of ORTHO_EXTRA[phoneme] ?? []) push(form, -1, "ortho-extra");
  if (VOWEL_PHONES.has(phoneme)) {
    for (const ch of ["a", "e", "i", "o", "u", "y"]) push(ch, -2, "single-letter-fallback");
  }
  out.sort((a, b) => {
    if (b.form.length !== a.form.length) return b.form.length - a.form.length;
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    return a.form < b.form ? -1 : a.form > b.form ? 1 : 0;
  });
  return out;
}

type PhonePos = { ipa: string; position: Position };
function phonesWithPositions(tokens: string[], onsetSet: ReadonlySet<string>): PhonePos[] | null {
  try {
    const syls = syllabify(tokens, onsetSet);
    const out: PhonePos[] = [];
    for (const s of syls) {
      for (const t of s.onset) {
        const ipa = toIpa(t);
        if (!ipa) return null;
        out.push({ ipa, position: "onset" });
      }
      for (const t of s.nucleus) {
        const ipa = toIpa(t);
        if (!ipa) return null;
        out.push({ ipa, position: "nucleus" });
      }
      for (const t of s.coda) {
        const ipa = toIpa(t);
        if (!ipa) return null;
        out.push({ ipa, position: "coda" });
      }
    }
    return out;
  } catch {
    return null;
  }
}

function alignWord(spelling: string, tokens: string[], onsetSet: ReadonlySet<string>) {
  const phones = phonesWithPositions(tokens, onsetSet);
  if (!phones) return { ok: false as const, reason: "syllabify", pattern: "syllabify_fail", spelling };
  type Frame = { phoneIndex: number; cursor: number; units: AlignUnit[] };
  const stack: Frame[] = [{ phoneIndex: 0, cursor: 0, units: [] }];
  let expansions = 0;
  while (stack.length) {
    const frame = stack.pop()!;
    if (++expansions > 50_000) break;
    const { phoneIndex, cursor, units } = frame;
    if (phoneIndex >= phones.length) {
      let c = cursor;
      const u = units.slice();
      let ok = true;
      while (c < spelling.length) {
        const rest = spelling.slice(c);
        if (rest === "e" || (rest[0] === "e" && rest.length === 1)) {
          u.push({ kind: "silent-final-e", form: "e", phoneme: null, position: "word", letters: 1 });
          c += 1;
        } else if (rest.startsWith("gh")) {
          u.push({ kind: "silent-gh", form: "gh", phoneme: null, position: "word", letters: 2 });
          c += 2;
        } else if (rest[0] === "h") {
          u.push({ kind: "silent-h", form: "h", phoneme: null, position: "word", letters: 1 });
          c += 1;
        } else {
          ok = false;
          break;
        }
      }
      if (ok && c === spelling.length) return { ok: true as const, units: u, spelling, phones };
      continue;
    }
    const phone = phones[phoneIndex];
    // silent prefixes
    if (phone.ipa === "n" && phone.position === "onset") {
      if (spelling.startsWith("kn", cursor))
        stack.push({
          phoneIndex,
          cursor: cursor + 1,
          units: [...units, { kind: "silent-k-in-kn", form: "k", phoneme: null, position: "onset", letters: 1 }],
        });
      if (spelling.startsWith("gn", cursor))
        stack.push({
          phoneIndex,
          cursor: cursor + 1,
          units: [...units, { kind: "silent-g-in-gn", form: "g", phoneme: null, position: "onset", letters: 1 }],
        });
    }
    if (phone.ipa === "r" && phone.position === "onset" && spelling.startsWith("wr", cursor))
      stack.push({
        phoneIndex,
        cursor: cursor + 1,
        units: [...units, { kind: "silent-w-in-wr", form: "w", phoneme: null, position: "onset", letters: 1 }],
      });
    if (spelling.startsWith("gh", cursor))
      stack.push({
        phoneIndex,
        cursor: cursor + 2,
        units: [...units, { kind: "silent-gh", form: "gh", phoneme: null, position: phone.position, letters: 2 }],
      });
    if (spelling[cursor] === "l")
      stack.push({
        phoneIndex,
        cursor: cursor + 1,
        units: [...units, { kind: "silent-l", form: "l", phoneme: null, position: phone.position, letters: 1 }],
      });
    if (spelling[cursor] === "e" && phone.position === "coda")
      stack.push({
        phoneIndex,
        cursor: cursor + 1,
        units: [
          ...units,
          { kind: "silent-e-before-coda", form: "e", phoneme: null, position: "coda", letters: 1 },
        ],
      });

    const forms = candidateForms(phone.ipa, phone.position).filter((c) =>
      spelling.startsWith(c.form, cursor),
    );
    for (let fi = forms.length - 1; fi >= 0; fi--) {
      const f = forms[fi];
      const nextUnits: AlignUnit[] = [
        ...units,
        { kind: f.kind, form: f.form, phoneme: phone.ipa, position: phone.position, letters: f.form.length },
      ];
      let nextCursor = cursor + f.form.length;
      if (phone.ipa === "m" && f.form === "m") {
        if (spelling[nextCursor] === "b" && (nextCursor + 1 === spelling.length || spelling[nextCursor + 1] === "e")) {
          nextUnits.push({ kind: "silent-b-in-mb", form: "b", phoneme: null, position: phone.position, letters: 1 });
          nextCursor += 1;
        } else if (
          spelling[nextCursor] === "n" &&
          (nextCursor + 1 === spelling.length || spelling[nextCursor + 1] === "e")
        ) {
          nextUnits.push({ kind: "silent-n-in-mn", form: "n", phoneme: null, position: phone.position, letters: 1 });
          nextCursor += 1;
        }
      }
      if (f.form.length === 1 && spelling[nextCursor] === f.form && /[bcdfgklmnprstz]/.test(f.form)) {
        stack.push({
          phoneIndex: phoneIndex + 1,
          cursor: nextCursor + 1,
          units: [
            ...nextUnits,
            { kind: "geminate-extra", form: f.form, phoneme: phone.ipa, position: phone.position, letters: 1 },
          ],
        });
      }
      stack.push({ phoneIndex: phoneIndex + 1, cursor: nextCursor, units: nextUnits });
    }
  }
  return { ok: false as const, reason: "search_fail", pattern: `fail:${spelling.slice(0, 6)}`, spelling };
}

type VowelStrategy = "single" | "digraph_trigraph" | "split_digraph" | "other";

/**
 * Classify vowel spelling strategy from alignment units for one nucleus phone.
 * Split digraph: nucleus is single vowel letter AND (silent-final-e OR soft coda ce/ge/ve/se
 * with trailing e function) — e.g. fame = f + a + m + e; ace = a + ce (ce encodes c+e).
 */
function classifyVowelStrategy(
  units: AlignUnit[],
  nucleusIndex: number,
): { strategy: VowelStrategy; extraLetters: number; form: string } {
  // Find nucleus unit at sequential phone-bearing index
  let phoneIdx = -1;
  let nucUnit: AlignUnit | null = null;
  let nucPos = -1;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.phoneme && (u.position === "onset" || u.position === "nucleus" || u.position === "coda")) {
      phoneIdx++;
      if (phoneIdx === nucleusIndex && u.position === "nucleus") {
        nucUnit = u;
        nucPos = i;
        break;
      }
    }
  }
  if (!nucUnit) return { strategy: "other", extraLetters: 0, form: "" };

  const form = nucUnit.form;
  // Look ahead for coda + silent e / soft coda
  let hasSilentE = false;
  let softCoda: string | null = null;
  let codaForm: string | null = null;
  for (let i = nucPos + 1; i < units.length; i++) {
    const u = units[i];
    if (u.kind === "silent-final-e" || u.kind === "silent-e-before-coda") hasSilentE = true;
    if (u.position === "coda" && u.phoneme) {
      codaForm = u.form;
      if (SOFT_CODA.has(u.form)) softCoda = u.form;
    }
  }

  if (form.length === 1 && (hasSilentE || softCoda)) {
    // split digraph: V + C + e (possibly fused as ce/ge/ve/se)
    const extra = (hasSilentE ? 1 : 0) + (softCoda ? softCoda.length - 1 : 0);
    return { strategy: "split_digraph", extraLetters: Math.max(1, extra), form: form + (codaForm ?? "") + (hasSilentE ? "e" : "") };
  }
  if (form.length === 1) return { strategy: "single", extraLetters: 0, form };
  if (form.length >= 2) return { strategy: "digraph_trigraph", extraLetters: form.length - 1, form };
  return { strategy: "other", extraLetters: 0, form };
}

const model = buildReference(text, "74790861f652b15e4ac49015a90074ad62a27690");
const onsetSet = new Set(model.initial_onsets);
const uninflected = JSON.parse(readFileSync(`${OUT}/uninflected-monos.json`, "utf8")) as {
  spelling: string;
  tokens: string[];
  phones: number;
  letters: number;
}[];

console.error(`aligning ${uninflected.length} uninflected real-word monos…`);
const aligned: { spelling: string; units: AlignUnit[]; phones: PhonePos[] }[] = [];
const failPatterns: Record<string, number> = {};
for (const e of uninflected) {
  const r = alignWord(e.spelling, e.tokens, onsetSet);
  if (!r.ok) {
    failPatterns[r.pattern] = (failPatterns[r.pattern] ?? 0) + 1;
    continue;
  }
  const concat = r.units.map((u) => u.form).join("");
  if (concat !== e.spelling) {
    failPatterns[`concat:${e.spelling}`] = (failPatterns[`concat:${e.spelling}`] ?? 0) + 1;
    continue;
  }
  aligned.push({ spelling: e.spelling, units: r.units, phones: r.phones! });
}
const coverage = aligned.length / uninflected.length;
console.error(`coverage ${(coverage * 100).toFixed(1)}% (${aligned.length}/${uninflected.length})`);

// Hand-check 100
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const HAND_SEED = 450_201;
const rng = mulberry32(HAND_SEED);
const idx = aligned.map((_, i) => i);
for (let i = idx.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [idx[i], idx[j]] = [idx[j], idx[i]];
}
const handSample = idx.slice(0, 100).map((i) => aligned[i]);

type Mech = {
  words: number;
  letters: number;
  phones: number;
  vowelSingleExtra: number;
  vowelDigraphExtra: number;
  vowelSplitExtra: number;
  vowelOtherExtra: number;
  finalENoVowel: number;
  doublingPermitted: number;
  doublingNotPermitted: number;
  consDigraphExtra: number;
  silentOther: number;
  otherExtra: number;
  vowelStrategy: Record<string, Record<VowelStrategy, number>>;
  vowelStrategyN: Record<string, number>;
  examples: Record<string, string[]>;
};

function emptyMech(): Mech {
  return {
    words: 0,
    letters: 0,
    phones: 0,
    vowelSingleExtra: 0,
    vowelDigraphExtra: 0,
    vowelSplitExtra: 0,
    vowelOtherExtra: 0,
    finalENoVowel: 0,
    doublingPermitted: 0,
    doublingNotPermitted: 0,
    consDigraphExtra: 0,
    silentOther: 0,
    otherExtra: 0,
    vowelStrategy: {},
    vowelStrategyN: {},
    examples: {
      vowelDigraph: [],
      vowelSplit: [],
      finalENoVowel: [],
      doublingPermitted: [],
      doublingNotPermitted: [],
      consDigraph: [],
      silentOther: [],
      other: [],
    },
  };
}
function pushEx(m: Mech, k: string, w: string) {
  const list = m.examples[k];
  if (list && list.length < 8 && !list.includes(w)) list.push(w);
}

function doublingPermittedFor(phoneme: string | null, form: string, prevVowel: string | null): boolean {
  if (!phoneme) return false;
  if (NEVER_DOUBLE.has(phoneme) || NEVER_DOUBLE.has(form[0])) return false;
  if (NEVER_DOUBLE_FINAL.has(phoneme) || NEVER_DOUBLE_FINAL.has(form[0])) return false;
  // ck/tch/dge are inventory forms after lax
  if (DOUBLE_LIKE.has(form) || form === "ck" || form === "tch" || form === "dge") {
    return !prevVowel || LAX.has(prevVowel) || true;
  }
  if (/([a-z])\1/.test(form) || form.length === 1) {
    // geminate of f,s,l,z,k preferred final
    return FINAL_DOUBLING_ONLY.has(form[0]) || FINAL_DOUBLING_ONLY.has(phoneme);
  }
  return false;
}

function observeCmu(m: Mech, spelling: string, units: AlignUnit[], phones: PhonePos[]) {
  m.words++;
  m.letters += spelling.length;
  m.phones += phones.length;

  // nucleus indices among phones
  const nucleusPhoneIndices: number[] = [];
  phones.forEach((p, i) => {
    if (p.position === "nucleus") nucleusPhoneIndices.push(i);
  });

  // Track which unit letters are already attributed to avoid double count
  const attributed = new Set<number>(); // unit indices

  // Vowel strategies
  for (const ni of nucleusPhoneIndices) {
    const vs = classifyVowelStrategy(units, ni);
    const phoneme = phones[ni].ipa;
    m.vowelStrategy[phoneme] ??= { single: 0, digraph_trigraph: 0, split_digraph: 0, other: 0 };
    m.vowelStrategy[phoneme][vs.strategy]++;
    m.vowelStrategyN[phoneme] = (m.vowelStrategyN[phoneme] ?? 0) + 1;
    if (vs.strategy === "digraph_trigraph") {
      m.vowelDigraphExtra += vs.extraLetters;
      pushEx(m, "vowelDigraph", spelling);
    } else if (vs.strategy === "split_digraph") {
      m.vowelSplitExtra += vs.extraLetters;
      pushEx(m, "vowelSplit", spelling);
    } else if (vs.strategy === "other") {
      m.vowelOtherExtra += vs.extraLetters;
    }
  }

  // Walk units for other mechanisms
  let prevVowel: string | null = null;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.position === "nucleus" && u.phoneme) prevVowel = u.phoneme;

    if (u.kind === "silent-final-e") {
      // If this e is part of split digraph, already counted in vowelSplitExtra —
      // detect: previous nucleus was single letter
      let nucSingle = false;
      for (let j = i - 1; j >= 0; j--) {
        if (units[j].position === "nucleus" && units[j].phoneme) {
          nucSingle = units[j].form.length === 1;
          break;
        }
        if (units[j].position === "coda" && SOFT_CODA.has(units[j].form)) {
          nucSingle = true;
          break;
        }
      }
      if (!nucSingle) {
        m.finalENoVowel += u.letters;
        pushEx(m, "finalENoVowel", spelling);
      }
      continue;
    }
    if (u.kind === "silent-e-before-coda") {
      // usually part of -es; treat as finalENoVowel if not split
      m.finalENoVowel += u.letters;
      pushEx(m, "finalENoVowel", spelling);
      continue;
    }
    if (u.kind.startsWith("silent") || u.kind === "geminate-extra") {
      if (u.kind === "geminate-extra") {
        const permitted = doublingPermittedFor(u.phoneme, u.form + u.form, prevVowel);
        if (permitted) {
          m.doublingPermitted += u.letters;
          pushEx(m, "doublingPermitted", spelling);
        } else {
          m.doublingNotPermitted += u.letters;
          pushEx(m, "doublingNotPermitted", spelling);
        }
      } else {
        m.silentOther += u.letters;
        pushEx(m, "silentOther", spelling);
      }
      continue;
    }

    if (u.position === "coda" && u.phoneme) {
      if (SOFT_CODA.has(u.form)) {
        // counted in split digraph when nucleus single; else other
        const nuc = [...units].reverse().find((x) => x.position === "nucleus" && x.phoneme);
        if (nuc && nuc.form.length === 1) {
          // already in vowelSplit
        } else {
          m.otherExtra += Math.max(0, u.letters - 1);
          pushEx(m, "other", spelling);
        }
      } else if (DOUBLE_LIKE.has(u.form) || /([a-z])\1/.test(u.form)) {
        const extra = Math.max(0, u.letters - 1);
        const permitted = doublingPermittedFor(u.phoneme, u.form, prevVowel);
        if (permitted) {
          m.doublingPermitted += extra;
          pushEx(m, "doublingPermitted", spelling);
        } else {
          m.doublingNotPermitted += extra;
          pushEx(m, "doublingNotPermitted", spelling);
        }
      } else if (CONS_DIGRAPH.has(u.form)) {
        m.consDigraphExtra += Math.max(0, u.letters - 1);
        pushEx(m, "consDigraph", spelling);
      } else if (u.letters >= 2 && u.position !== "nucleus") {
        m.otherExtra += u.letters - 1;
        pushEx(m, "other", spelling);
      }
    } else if (u.position === "onset" && u.phoneme) {
      if (CONS_DIGRAPH.has(u.form)) {
        m.consDigraphExtra += Math.max(0, u.letters - 1);
        pushEx(m, "consDigraph", spelling);
      } else if (u.letters >= 2) {
        m.otherExtra += u.letters - 1;
        pushEx(m, "other", spelling);
      }
    }
    // nucleus multi already in vowelDigraph
  }
}

const cmuMech = emptyMech();
for (const row of aligned) observeCmu(cmuMech, row.spelling, row.units, row.phones);

// Generator traces
function ungatedConfig(): LanguageConfig {
  return {
    ...englishConfig,
    syllableStructure: {
      ...englishConfig.syllableStructure,
      letterLengthTargets: undefined,
    },
  };
}

function observeGen(m: Mech, word: Word) {
  if (word.syllables.length !== 1) return false;
  const spelling = word.written.clean;
  const sels = word.trace?.graphemeSelections ?? [];
  if (!sels.length) return false;
  m.words++;
  m.letters += spelling.length;

  // Build pseudo-units from selections + trailing e
  const units: AlignUnit[] = [];
  const phones: PhonePos[] = [];
  for (const g of sels) {
    const form = (g.emitted || g.selected || "").toLowerCase();
    if (!form) continue;
    const pos =
      g.position === "onset" || g.position === "nucleus" || g.position === "coda" ? g.position : "coda";
    const phoneme = (g as any).phoneme as string | undefined;
    units.push({
      kind: g.doubled ? "geminate-extra" : "grapheme",
      form,
      phoneme: phoneme ?? null,
      position: pos,
      letters: form.length,
    });
    if (phoneme) {
      phones.push({ ipa: phoneme, position: pos });
      m.phones++;
    }
  }
  // trailing silent e not in selections
  const emitted = units.map((u) => u.form).join("");
  if (spelling.endsWith("e") && !emitted.endsWith("e") && spelling.length > emitted.length) {
    units.push({ kind: "silent-final-e", form: "e", phoneme: null, position: "word", letters: 1 });
  }

  // Reuse classify on synthetic units — need phoneme on nucleus selections
  // Fix phones array positions from word.syllables if selection phoneme missing
  if (phones.length === 0 || phones.length !== word.syllables[0].onset.length + word.syllables[0].nucleus.length + word.syllables[0].coda.length) {
    phones.length = 0;
    units.length = 0;
    const syl = word.syllables[0];
    let si = 0;
    for (const p of syl.onset) {
      const g = sels[si++];
      const form = (g?.emitted || g?.selected || p).toLowerCase();
      units.push({ kind: g?.doubled ? "geminate-extra" : "grapheme", form, phoneme: p, position: "onset", letters: form.length });
      phones.push({ ipa: p, position: "onset" });
      m.phones++;
    }
    for (const p of syl.nucleus) {
      const g = sels[si++];
      const form = (g?.emitted || g?.selected || p).toLowerCase();
      units.push({ kind: "grapheme", form, phoneme: p, position: "nucleus", letters: form.length });
      phones.push({ ipa: p, position: "nucleus" });
      m.phones++;
    }
    for (const p of syl.coda) {
      const g = sels[si++];
      const form = (g?.emitted || g?.selected || p).toLowerCase();
      const kind = g?.doubled || DOUBLE_LIKE.has(form) || /([a-z])\1/.test(form) ? "geminate-extra" : "grapheme";
      units.push({ kind: kind as UnitKind, form, phoneme: p, position: "coda", letters: form.length });
      phones.push({ ipa: p, position: "coda" });
      m.phones++;
    }
    if (spelling.endsWith("e") && !units.map((u) => u.form).join("").endsWith("e")) {
      units.push({ kind: "silent-final-e", form: "e", phoneme: null, position: "word", letters: 1 });
    }
  }

  // Deduplicate phone counting if we counted twice
  // Reset phones count for this word properly
  // (we may have double-counted — fix by setting absolute)
  // Simpler: just run observeCmu logic without incrementing words/letters/phones again
  const tmp = emptyMech();
  observeCmu(tmp, spelling, units, phones);
  // merge extras only (words/letters already counted)
  m.vowelDigraphExtra += tmp.vowelDigraphExtra;
  m.vowelSplitExtra += tmp.vowelSplitExtra;
  m.vowelOtherExtra += tmp.vowelOtherExtra;
  m.finalENoVowel += tmp.finalENoVowel;
  m.doublingPermitted += tmp.doublingPermitted;
  m.doublingNotPermitted += tmp.doublingNotPermitted;
  m.consDigraphExtra += tmp.consDigraphExtra;
  m.silentOther += tmp.silentOther;
  m.otherExtra += tmp.otherExtra;
  for (const [ph, st] of Object.entries(tmp.vowelStrategy)) {
    m.vowelStrategy[ph] ??= { single: 0, digraph_trigraph: 0, split_digraph: 0, other: 0 };
    for (const [k, v] of Object.entries(st)) {
      m.vowelStrategy[ph][k as VowelStrategy] += v;
    }
    m.vowelStrategyN[ph] = (m.vowelStrategyN[ph] ?? 0) + (tmp.vowelStrategyN[ph] ?? 0);
  }
  for (const [k, list] of Object.entries(tmp.examples)) {
    for (const w of list) pushEx(m, k, w);
  }
  return true;
}

const gen = createGenerator(ungatedConfig());
const genMech = emptyMech();
const SEEDS = [42, 43, 44] as const;
const TARGET = Number(process.env.TRACE_KEPT ?? 10_000);
// Also collect LGP for gap
const genLgp: Record<string, Record<string, number>> = {};
const genPhonesHist: Record<string, number> = {};
const genLettersHist: Record<string, number> = {};

for (const seed of SEEDS) {
  const rand = createSeededRng(seed);
  let kept = 0;
  let draws = 0;
  while (kept < TARGET && draws < TARGET * 25) {
    draws++;
    const word = gen.generateWord({ rand, mode: "lexicon", morphology: false, trace: true });
    if (word.syllables.length !== 1) continue;
    const L = word.written.clean.length;
    let P = 0;
    for (const s of word.syllables) P += s.onset.length + s.nucleus.length + s.coda.length;
    genLettersHist[L] = (genLettersHist[L] ?? 0) + 1;
    genPhonesHist[P] = (genPhonesHist[P] ?? 0) + 1;
    genLgp[P] ??= {};
    genLgp[P][L] = (genLgp[P][L] ?? 0) + 1;
    // fix phone counting: observeGen currently messy — call carefully
    const beforePhones = genMech.phones;
    if (observeGen(genMech, word)) {
      // correct phones to P for this word
      genMech.phones = beforePhones + P;
      kept++;
    }
  }
  console.error(`[gen] seed=${seed} kept=${kept}`);
}

function perWord(m: Mech) {
  const w = m.words || 1;
  return {
    words: m.words,
    letterMean: m.letters / w,
    phoneMean: m.phones / w,
    vowel_digraph_trigraph: m.vowelDigraphExtra / w,
    vowel_split_digraph: m.vowelSplitExtra / w,
    vowel_other: m.vowelOtherExtra / w,
    final_e_no_vowel: m.finalENoVowel / w,
    doubling_permitted: m.doublingPermitted / w,
    doubling_not_permitted: m.doublingNotPermitted / w,
    consonant_digraphs: m.consDigraphExtra / w,
    silent_other: m.silentOther / w,
    other: m.otherExtra / w,
    examples: m.examples,
  };
}

function strategyShares(m: Mech) {
  const out: Record<string, { n: number; shares: Record<VowelStrategy, number> }> = {};
  for (const [ph, counts] of Object.entries(m.vowelStrategy)) {
    const n = m.vowelStrategyN[ph] || Object.values(counts).reduce((a, b) => a + b, 0);
    out[ph] = {
      n,
      shares: {
        single: n ? counts.single / n : 0,
        digraph_trigraph: n ? counts.digraph_trigraph / n : 0,
        split_digraph: n ? counts.split_digraph / n : 0,
        other: n ? counts.other / n : 0,
      },
    };
  }
  return out;
}

const cmuPw = perWord(cmuMech);
const genPw = perWord(genMech);

const contributions = {
  vowel_digraph_trigraph: cmuPw.vowel_digraph_trigraph - genPw.vowel_digraph_trigraph,
  vowel_split_digraph: cmuPw.vowel_split_digraph - genPw.vowel_split_digraph,
  vowel_other: cmuPw.vowel_other - genPw.vowel_other,
  final_e_no_vowel: cmuPw.final_e_no_vowel - genPw.final_e_no_vowel,
  doubling_permitted: cmuPw.doubling_permitted - genPw.doubling_permitted,
  doubling_not_permitted: cmuPw.doubling_not_permitted - genPw.doubling_not_permitted,
  consonant_digraphs: cmuPw.consonant_digraphs - genPw.consonant_digraphs,
  silent_other: cmuPw.silent_other - genPw.silent_other,
  other: cmuPw.other - genPw.other,
};
const contribSum = Object.values(contributions).reduce((a, b) => a + b, 0);
const vowelStrategyGap =
  contributions.vowel_digraph_trigraph +
  contributions.vowel_split_digraph +
  contributions.vowel_other;

// Mass-weighted LGP gap vs uninflected comparator
const build = JSON.parse(readFileSync(`${OUT}/comparator-build.json`, "utf8"));
const cmuLgp = build.uninflectedStats.lettersGivenPhones as Record<string, { n: number; mean: number }>;
function meanHist(h: Record<string, number>) {
  let s = 0,
    n = 0;
  for (const [k, v] of Object.entries(h)) {
    s += Number(k) * v;
    n += v;
  }
  return n ? s / n : NaN;
}
const genKept = Object.values(genPhonesHist).reduce((a, b) => a + b, 0);
let massGap = 0;
const perP: Record<string, unknown> = {};
for (const p of new Set([...Object.keys(cmuLgp), ...Object.keys(genLgp)])) {
  const gMean = genLgp[p] ? meanHist(genLgp[p]) : null;
  const cMean = cmuLgp[p]?.mean ?? null;
  const n = Object.values(genLgp[p] ?? {}).reduce((a, b) => a + b, 0);
  const w = genKept ? n / genKept : 0;
  const d = gMean != null && cMean != null ? gMean - cMean : null;
  perP[p] = { genMean: gMean, cmuMean: cMean, delta: d, weight: w, n };
  if (d != null) massGap += w * d;
}

const packet = {
  meta: {
    comparator: "uninflected SCOWL≤60 ∩ ascii-first CMU monos",
    cmuSha: sha,
    uninflectedN: uninflected.length,
    alignedN: aligned.length,
    coverage,
    handSeed: HAND_SEED,
    genSeeds: [...SEEDS],
    genKeptPerSeed: TARGET,
  },
  alignment: {
    coverage,
    topFails: Object.entries(failPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([pattern, n]) => ({ pattern, n })),
    handSample: handSample.map((r) => ({
      spelling: r.spelling,
      units: r.units.map((u) => ({ kind: u.kind, form: u.form, phoneme: u.phoneme, position: u.position })),
    })),
  },
  ratesPerWord: { cmu: cmuPw, gen: genPw },
  contributions,
  contributionSum: contribSum,
  vowelStrategyGap,
  massWeightedLgpGap: massGap,
  letterMeanGap: genPw.letterMean - build.uninflectedStats.letterMean,
  residualVsMassGap: Math.abs(massGap) - contribSum,
  perPhoneLgp: perP,
  vowelStrategyShares: {
    cmu: strategyShares(cmuMech),
    gen: strategyShares(genMech),
  },
  genLetterMean: meanHist(genLettersHist),
  genPhoneMean: meanHist(genPhonesHist),
};

writeFileSync(`${OUT}/mechanisms.json`, JSON.stringify(packet, null, 2));
writeFileSync(
  `${OUT}/aligned-uninflected.json`,
  JSON.stringify(
    aligned.map((r) => ({
      spelling: r.spelling,
      units: r.units.map((u) => [u.kind, u.form, u.phoneme, u.position, u.letters]),
    })),
  ),
);

console.log(
  JSON.stringify(
    {
      coverage,
      cmuLetterMean: cmuPw.letterMean,
      genLetterMean: genPw.letterMean,
      massWeightedLgpGap: massGap,
      contributions,
      sum: contribSum,
      vowelStrategyGap,
      residual: Math.abs(massGap) - contribSum,
      topVowelCmu: Object.entries(strategyShares(cmuMech))
        .sort((a, b) => b[1].n - a[1].n)
        .slice(0, 8)
        .map(([ph, v]) => ({ ph, n: v.n, ...v.shares })),
      topVowelGen: Object.entries(strategyShares(genMech))
        .sort((a, b) => b[1].n - a[1].n)
        .slice(0, 8)
        .map(([ph, v]) => ({ ph, n: v.n, ...v.shares })),
    },
    null,
    2,
  ),
);
