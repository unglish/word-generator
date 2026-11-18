/**
 * Backtracking CMU grapheme aligner (step 3 probe). Deterministic: explores
 * candidates in tie-break order; first full cover wins.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseCmuRecords, selectCompatibleCmu } from "/agent/repos/word-generator/evaluation/corpus/cmu.ts";
import {
  buildReference,
  syllabify,
  CMU_SHA256,
} from "/agent/repos/word-generator/evaluation/review/wordlikeness/model.ts";
import { graphemeMaps } from "/agent/repos/word-generator/src/elements/graphemes/index.ts";

const OUT =
  process.env.OUT_DIR ??
  "/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/internal/issue-450/packets/spelling-shortfall";
mkdirSync(OUT, { recursive: true });

const EXPECTED = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
const text = readFileSync("/tmp/wordlikeness-cmudict.dict", "utf8");
const sha = createHash("sha256").update(text, "utf8").digest("hex");
if (sha !== EXPECTED || sha !== CMU_SHA256) throw new Error(`CMU SHA mismatch ${sha}`);

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
  g: ["ɡ"],
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

type PhonePos = { ipa: string; position: Position };

/** Orthographic extras beyond inventory (still explicit categories). */
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
  "ɔ": ["o", "a", "aw", "au", "ough", "oa"],
  "ɑ": ["a", "o", "ah"],
  "əʊ": ["o", "ow", "oa", "oe", "ough"],
  "eɪ": ["a", "ai", "ay", "ei", "ey", "eigh", "ae"],
  "aɪ": ["i", "y", "ie", "igh", "ye", "uy"],
  "i:": ["e", "ee", "ea", "ie", "ei", "y"],
  "ɪ": ["i", "y", "ui", "e"],
  "ɛ": ["e", "ea", "ai", "a", "ie"],
  æ: ["a"],
  ʊ: ["oo", "u", "ou", "o"],
  u: ["oo", "u", "ue", "ew", "ou"],
  "ʌ": ["u", "o", "ou", "oo"],
  ə: ["a", "e", "o", "u", "i", "ou"],
};

function candidateForms(phoneme: string, position: Position): { form: string; frequency: number; kind: UnitKind }[] {
  const seen = new Set<string>();
  const out: { form: string; frequency: number; kind: UnitKind }[] = [];
  const push = (form: string, frequency: number, kind: UnitKind) => {
    const f = form.toLowerCase();
    if (!f || seen.has(f)) return;
    seen.add(f);
    out.push({ form: f, frequency, kind });
  };
  for (const p of [phoneme, ...(IPA_FALLBACKS[phoneme] ?? [])]) {
    for (const g of graphemeMaps[position].get(p) ?? []) {
      push(g.form, g.frequency ?? 0, "grapheme");
    }
  }
  for (const form of ORTHO_EXTRA[phoneme] ?? []) push(form, -1, "ortho-extra");
  // vowel letter fallbacks
  const vowelPhones = new Set(Object.keys(ORTHO_EXTRA).filter((k) => /[æɑɔəɪɛʊui:ʌɜɚaɪaʊeɪɔɪəʊi]/.test(k) || k.length > 1));
  if ("i:ɪeɪɛæɑɔəʊʊuʌəɜɚaɪaʊɔɪ".includes(phoneme) || vowelPhones.has(phoneme)) {
    for (const ch of ["a", "e", "i", "o", "u", "y"]) push(ch, -2, "single-letter-fallback");
  }
  // sort by tie-break
  out.sort((a, b) => {
    if (b.form.length !== a.form.length) return b.form.length - a.form.length;
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    return a.form < b.form ? -1 : a.form > b.form ? 1 : 0;
  });
  return out;
}

function phonesWithPositions(tokens: string[], onsets: ReadonlySet<string>): PhonePos[] | null {
  try {
    const syls = syllabify(tokens, onsets);
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

type Frame = { phoneIndex: number; cursor: number; units: AlignUnit[] };

function alignWord(spelling: string, tokens: string[], onsets: ReadonlySet<string>) {
  const phones = phonesWithPositions(tokens, onsets);
  if (!phones) {
    return { ok: false as const, reason: "syllabify_or_ipa", pattern: "syllabify_fail", spelling, ipa: tokens.join(" ") };
  }
  const ipaStr = phones.map((p) => p.ipa).join(" ");
  const stack: Frame[] = [{ phoneIndex: 0, cursor: 0, units: [] }];
  let expansions = 0;
  const MAX = 50_000;

  while (stack.length) {
    const frame = stack.pop()!;
    expansions++;
    if (expansions > MAX) break;
    const { phoneIndex, cursor, units } = frame;

    if (phoneIndex >= phones.length) {
      // consume trailing silents
      let c = cursor;
      const u = units.slice();
      let ok = true;
      while (c < spelling.length) {
        const rest = spelling.slice(c);
        if (rest.startsWith("e") && (rest.length === 1 || rest === "e")) {
          u.push({ kind: "silent-final-e", form: "e", phoneme: null, position: "word", letters: 1 });
          c += 1;
        } else if (rest === "e" || (rest[0] === "e" && rest.length === 1)) {
          u.push({ kind: "silent-final-e", form: "e", phoneme: null, position: "word", letters: 1 });
          c += 1;
        } else if (rest[0] === "e" && rest.length > 1) {
          // leftover e + more — only accept bare final e
          ok = false;
          break;
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
      if (ok && c === spelling.length) return { ok: true as const, units: u, spelling };
      continue;
    }

    const phone = phones[phoneIndex];
    type Branch = { units: AlignUnit[]; cursor: number };
    const branches: Branch[] = [];

    const trySilent = (kind: UnitKind, form: string) => {
      if (!spelling.startsWith(form, cursor)) return;
      branches.push({
        units: [
          ...units,
          { kind, form, phoneme: null, position: phone.position, letters: form.length },
        ],
        cursor: cursor + form.length,
      });
    };

    // Silent prefixes that don't advance phoneIndex (applied then still need to match phone)
    // We encode as: add silent unit, keep same phoneIndex — handle by pushing frame with same index
    const silentPrefixFrames: Frame[] = [];
    if (phone.ipa === "n" && phone.position === "onset") {
      if (spelling.startsWith("kn", cursor)) {
        silentPrefixFrames.push({
          phoneIndex,
          cursor: cursor + 1,
          units: [...units, { kind: "silent-k-in-kn", form: "k", phoneme: null, position: "onset", letters: 1 }],
        });
      }
      if (spelling.startsWith("gn", cursor)) {
        silentPrefixFrames.push({
          phoneIndex,
          cursor: cursor + 1,
          units: [...units, { kind: "silent-g-in-gn", form: "g", phoneme: null, position: "onset", letters: 1 }],
        });
      }
    }
    if (phone.ipa === "r" && phone.position === "onset" && spelling.startsWith("wr", cursor)) {
      silentPrefixFrames.push({
        phoneIndex,
        cursor: cursor + 1,
        units: [...units, { kind: "silent-w-in-wr", form: "w", phoneme: null, position: "onset", letters: 1 }],
      });
    }
    if (spelling.startsWith("gh", cursor)) {
      silentPrefixFrames.push({
        phoneIndex,
        cursor: cursor + 2,
        units: [...units, { kind: "silent-gh", form: "gh", phoneme: null, position: phone.position, letters: 2 }],
      });
    }
    if (spelling[cursor] === "l") {
      silentPrefixFrames.push({
        phoneIndex,
        cursor: cursor + 1,
        units: [...units, { kind: "silent-l", form: "l", phoneme: null, position: phone.position, letters: 1 }],
      });
    }
    if (spelling[cursor] === "e" && phone.position === "coda") {
      silentPrefixFrames.push({
        phoneIndex,
        cursor: cursor + 1,
        units: [
          ...units,
          { kind: "silent-e-before-coda", form: "e", phoneme: null, position: "coda", letters: 1 },
        ],
      });
    }

    // Push silent-prefix options first (will be tried after grapheme branches because stack=LIFO;
    // we want grapheme-first, so push silents first then graphemes so graphemes pop first)
    for (const sp of silentPrefixFrames) stack.push(sp);

    const forms = candidateForms(phone.ipa, phone.position).filter((c) =>
      spelling.startsWith(c.form, cursor),
    );
    // Push in reverse so best (index 0) is tried first
    for (let fi = forms.length - 1; fi >= 0; fi--) {
      const f = forms[fi];
      const nextUnits: AlignUnit[] = [
        ...units,
        {
          kind: f.kind,
          form: f.form,
          phoneme: phone.ipa,
          position: phone.position,
          letters: f.form.length,
        },
      ];
      let nextCursor = cursor + f.form.length;
      // optional mb/mn after m
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
      // optional geminate extra
      if (
        f.form.length === 1 &&
        spelling[nextCursor] === f.form &&
        /[bcdfgklmnprstz]/.test(f.form)
      ) {
        // branch with geminate
        stack.push({
          phoneIndex: phoneIndex + 1,
          cursor: nextCursor + 1,
          units: [
            ...nextUnits,
            {
              kind: "geminate-extra",
              form: f.form,
              phoneme: phone.ipa,
              position: phone.position,
              letters: 1,
            },
          ],
        });
      }
      stack.push({ phoneIndex: phoneIndex + 1, cursor: nextCursor, units: nextUnits });
    }
  }

  // failure: characterize
  return {
    ok: false as const,
    reason: "search_fail",
    pattern: `fail:${spelling.slice(0, 6)}`,
    spelling,
    ipa: ipaStr,
  };
}

const { entries } = selectCompatibleCmu(parseCmuRecords(text));
const model = buildReference(text, "74790861f652b15e4ac49015a90074ad62a27690");
const onsets = new Set(model.initial_onsets);
const monos = entries.filter((e) => e.phones.filter((p) => p.kind === "vowel").length === 1);
const dis = entries.filter((e) => e.phones.filter((p) => p.kind === "vowel").length === 2);

function runPop(pop: typeof entries, label: string) {
  let ok = 0;
  const failPatterns: Record<string, number> = {};
  const silentCounts: Record<string, number> = {};
  const lettersByPos: Record<Position, { phones: number; letters: number; multi: number }> = {
    onset: { phones: 0, letters: 0, multi: 0 },
    nucleus: { phones: 0, letters: 0, multi: 0 },
    coda: { phones: 0, letters: 0, multi: 0 },
  };
  const mech: Record<string, number> = {
    silent_final_e: 0,
    silent_e_before_coda: 0,
    silent_other: 0,
    doubling_ck_tch_dge: 0,
    vowel_polygraph: 0,
    consonant_digraph: 0,
    other_multiletter: 0,
  };
  const DIGRAPHS = new Set(["sh", "ch", "th", "ng", "wh", "ph", "ck", "tch", "dge"]);
  const DOUBLE = new Set(["ck", "tch", "dge", "ff", "ll", "ss", "zz", "tt", "pp", "rr", "nn", "mm", "dd", "bb", "gg"]);
  const aligned: { spelling: string; units: AlignUnit[] }[] = [];
  const examplesBySilent: Record<string, string[]> = {};

  for (const e of pop) {
    const r = alignWord(e.spelling, e.tokens, onsets);
    if (!r.ok) {
      failPatterns[r.pattern] = (failPatterns[r.pattern] ?? 0) + 1;
      continue;
    }
    // reject alignments that used silent-prefix without progressing (detect loops already prevented)
    // validate concat
    const concat = r.units.map((u) => u.form).join("");
    if (concat !== e.spelling) {
      failPatterns[`concat:${e.spelling.slice(0, 6)}`] = (failPatterns[`concat:${e.spelling.slice(0, 6)}`] ?? 0) + 1;
      continue;
    }
    ok++;
    aligned.push({ spelling: e.spelling, units: r.units });
    for (const u of r.units) {
      if (u.kind.startsWith("silent") || u.kind === "geminate-extra") {
        silentCounts[u.kind] = (silentCounts[u.kind] ?? 0) + 1;
        examplesBySilent[u.kind] ??= [];
        if (examplesBySilent[u.kind].length < 6) examplesBySilent[u.kind].push(e.spelling);
      }
      if (u.kind === "silent-final-e") mech.silent_final_e += u.letters;
      else if (u.kind === "silent-e-before-coda") mech.silent_e_before_coda += u.letters;
      else if (u.kind.startsWith("silent")) mech.silent_other += u.letters;
      else if (u.kind === "geminate-extra") mech.doubling_ck_tch_dge += u.letters;
      else if (u.position === "onset" || u.position === "nucleus" || u.position === "coda") {
        lettersByPos[u.position].phones++;
        lettersByPos[u.position].letters += u.letters;
        if (u.letters > 1) lettersByPos[u.position].multi++;
        if (DOUBLE.has(u.form) || /([a-z])\1/.test(u.form)) mech.doubling_ck_tch_dge += Math.max(0, u.letters - 1);
        else if (u.position === "nucleus" && u.letters >= 2) mech.vowel_polygraph += u.letters - 1;
        else if (DIGRAPHS.has(u.form)) mech.consonant_digraph += u.letters - 1;
        else if (u.letters >= 2) mech.other_multiletter += u.letters - 1;
      }
    }
  }

  return {
    label,
    n: pop.length,
    aligned: ok,
    coverage: ok / pop.length,
    topFails: Object.entries(failPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([pattern, n]) => ({ pattern, n })),
    silentCounts,
    examplesBySilent,
    lettersByPos: Object.fromEntries(
      Object.entries(lettersByPos).map(([k, v]) => [
        k,
        {
          phones: v.phones,
          letters: v.letters,
          meanLettersPerPhone: v.phones ? v.letters / v.phones : null,
          multiShare: v.phones ? v.multi / v.phones : null,
        },
      ]),
    ),
    mechanismExtraLettersPerWord: Object.fromEntries(
      Object.entries(mech).map(([k, v]) => [k, ok ? v / ok : null]),
    ),
    _aligned: label === "mono" ? aligned : undefined,
  };
}

console.error("BT align mono…");
const mono = runPop(monos, "mono");
console.error(`mono ${(mono.coverage * 100).toFixed(1)}%`);
console.error("BT align di…");
const di = runPop(dis, "di");
console.error(`di ${(di.coverage * 100).toFixed(1)}%`);

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const HAND_SEED = 450_003;
const rng = mulberry32(HAND_SEED);
const alignedMono = mono._aligned!;
const idx = alignedMono.map((_, i) => i);
for (let i = idx.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [idx[i], idx[j]] = [idx[j], idx[i]];
}
const handSample = idx.slice(0, 100).map((i) => alignedMono[i]);

const packet = {
  meta: {
    sha,
    algorithm: "DFS backtracking; first full cover; candidates longest→freq→lex; silent prefixes optional",
    tieBreak: "longest form, then highest frequency, then lexicographically smallest",
    silentRules: [
      "silent-k-in-kn / silent-g-in-gn / silent-w-in-wr",
      "silent-gh",
      "silent-l before unmatched phone",
      "silent-e-before-coda",
      "silent-b-in-mb / silent-n-in-mn",
      "silent-final-e / silent-h trailing",
      "geminate-extra for doubled consonant letters",
    ],
    handSeed: HAND_SEED,
  },
  mono: { ...mono, _aligned: undefined },
  di: { ...di, _aligned: undefined },
  handCheck: {
    n: handSample.length,
    seed: HAND_SEED,
    sample: handSample.map((r) => ({
      spelling: r.spelling,
      units: r.units.map((u) => ({ kind: u.kind, form: u.form, phoneme: u.phoneme, position: u.position })),
    })),
  },
};

writeFileSync(`${OUT}/step3-align.json`, JSON.stringify(packet, null, 2));
writeFileSync(
  `${OUT}/step3-mono-aligned.json`,
  JSON.stringify(
    alignedMono.map((r) => ({
      spelling: r.spelling,
      units: r.units.map((u) => [u.kind, u.form, u.phoneme, u.position, u.letters]),
    })),
  ),
);
console.log(
  JSON.stringify(
    {
      monoCoverage: mono.coverage,
      diCoverage: di.coverage,
      topFails: mono.topFails.slice(0, 12),
      silentPerWord: mono.mechanismExtraLettersPerWord,
      lettersByPos: mono.lettersByPos,
    },
    null,
    2,
  ),
);
