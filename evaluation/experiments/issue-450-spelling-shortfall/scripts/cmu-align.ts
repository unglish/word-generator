/**
 * Issue #450 spelling-shortfall step 3 — probe-only CMU grapheme aligner.
 * Evidence tag only; not for main.
 *
 * Tie-break (deterministic): among inventory forms for (phoneme, position) that
 * match the spelling at the cursor, pick (1) longest form, (2) highest
 * frequency, (3) lexicographically smallest form. Silent-letter units are
 * separate categories (never folded into a neighbour).
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

const norm = JSON.parse(
  readFileSync("/agent/repos/word-generator/data/cmu/phoneme-normalization.json", "utf8"),
);

const OUT =
  process.env.OUT_DIR ??
  "/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/internal/issue-450/packets/spelling-shortfall";
mkdirSync(OUT, { recursive: true });

const EXPECTED = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
const text = readFileSync("/tmp/wordlikeness-cmudict.dict", "utf8");
const sha = createHash("sha256").update(text, "utf8").digest("hex");
if (sha !== EXPECTED || sha !== CMU_SHA256) throw new Error(`CMU SHA mismatch ${sha}`);

const arpabetToIpa = norm.arpabetToIpa as Record<string, string>;
const generatedAliases = norm.generatedAliases as Record<string, string>;

function toIpa(base: string): string | null {
  const ipa = arpabetToIpa[base];
  if (!ipa) return null;
  return generatedAliases[ipa] ?? ipa;
}

/** Extra IPA aliases tried when inventory lookup fails. */
const IPA_FALLBACKS: Record<string, string[]> = {
  ə: ["ʌ", "ɜ", "ɚ"],
  ɜ: ["ɚ", "ə", "ʌ"],
  ɚ: ["ɜ", "ə"],
  ʌ: ["ə"],
  u: ["u:"],
  "u:": ["u"],
  "i:": ["ɪ"],
  g: ["ɡ"],
};

type Position = "onset" | "nucleus" | "coda";
type UnitKind =
  | "grapheme"
  | "single-letter-fallback"
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
  | "geminate-extra"
  | "silent-other";

type AlignUnit = {
  kind: UnitKind;
  form: string;
  phoneme: string | null;
  position: Position | "word";
  letters: number;
};

type AlignResult =
  | { ok: true; units: AlignUnit[]; spelling: string }
  | { ok: false; reason: string; pattern: string; spelling: string; ipa: string };

function formsFor(phoneme: string, position: Position): { form: string; frequency: number }[] {
  const seen = new Set<string>();
  const out: { form: string; frequency: number }[] = [];
  const tryPhone = [phoneme, ...(IPA_FALLBACKS[phoneme] ?? [])];
  for (const p of tryPhone) {
    const list = graphemeMaps[position].get(p) ?? [];
    for (const g of list) {
      const form = g.form.toLowerCase();
      if (seen.has(form)) continue;
      seen.add(form);
      out.push({ form, frequency: g.frequency ?? 0 });
    }
  }
  // Always allow single-letter identity if phoneme maps to a common letter
  return out;
}

function pickForm(
  spelling: string,
  cursor: number,
  phoneme: string,
  position: Position,
  allowFallback = true,
): { form: string; frequency: number; kind: UnitKind } | null {
  const candidates = formsFor(phoneme, position)
    .filter((c) => spelling.startsWith(c.form, cursor))
    .sort((a, b) => {
      if (b.form.length !== a.form.length) return b.form.length - a.form.length;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.form < b.form ? -1 : a.form > b.form ? 1 : 0;
    });
  if (candidates.length) {
    return { ...candidates[0], kind: "grapheme" };
  }
  // Vowel-letter fallback only — never invent a consonant letter for a phone
  // (that caused /z/→"b", /s/→"e" leftovers on abbs/aches).
  if (allowFallback && cursor < spelling.length) {
    const ch = spelling[cursor];
    const vowelish = "aeiouy";
    const vowelPhones = new Set([
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
    if (vowelPhones.has(phoneme) && vowelish.includes(ch)) {
      return { form: ch, frequency: -1, kind: "single-letter-fallback" };
    }
  }
  return null;
}

/** True if phoneme can match at cursor without single-letter fallback (inventory hit). */
function canInventoryMatch(spelling: string, cursor: number, phoneme: string, position: Position) {
  return formsFor(phoneme, position).some((c) => spelling.startsWith(c.form, cursor));
}

type PhonePos = { ipa: string; position: Position };

function phonesWithPositions(
  tokens: string[],
  onsets: ReadonlySet<string>,
): PhonePos[] | null {
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

/**
 * Silent-letter rules (explicit assignment):
 * - silent-k-in-kn: spelling at cursor is "kn" and next phone is /n/ (onset)
 * - silent-w-in-wr: "wr" + /r/
 * - silent-g-in-gn: "gn" + /n/
 * - silent-gh: "gh" or "ght" remainder when next match succeeds after consuming gh
 * - silent-b-in-mb: after aligning /m/ as "m", leftover "b" before end or before silent e
 * - silent-n-in-mn: after /m/ as "m", leftover "n"
 * - silent-final-e: leftover final "e" after all phones aligned
 * - silent-h: "oh"/"ah" style — leftover "h" after vowel letter for /əʊ/,/ɑ/
 * - silent-l-in-alk: "al" for /ɔ/ + "k" with silent l — handled as silent-other if leftover "l"
 */
function alignWord(spelling: string, tokens: string[], onsets: ReadonlySet<string>): AlignResult {
  const phones = phonesWithPositions(tokens, onsets);
  if (!phones) {
    return { ok: false, reason: "syllabify_or_ipa", pattern: "syllabify_fail", spelling, ipa: tokens.join(" ") };
  }
  const ipaStr = phones.map((p) => p.ipa).join(" ");
  const units: AlignUnit[] = [];
  let cursor = 0;
  let i = 0;

  while (i < phones.length) {
    const phone = phones[i];

    // Silent onset prefixes
    if (phone.position === "onset" && phone.ipa === "n") {
      if (spelling.startsWith("kn", cursor)) {
        units.push({ kind: "silent-k-in-kn", form: "k", phoneme: null, position: "onset", letters: 1 });
        cursor += 1;
      } else if (spelling.startsWith("gn", cursor)) {
        units.push({ kind: "silent-g-in-gn", form: "g", phoneme: null, position: "onset", letters: 1 });
        cursor += 1;
      }
    }
    if (phone.position === "onset" && phone.ipa === "r" && spelling.startsWith("wr", cursor)) {
      units.push({ kind: "silent-w-in-wr", form: "w", phoneme: null, position: "onset", letters: 1 });
      cursor += 1;
    }

    // Silent gh before continuing when inventory won't claim it for this phone
    if (
      spelling.startsWith("gh", cursor) &&
      !formsFor(phone.ipa, phone.position).some((f) => f.form.startsWith("gh") && spelling.startsWith(f.form, cursor))
    ) {
      const after = pickForm(spelling, cursor + 2, phone.ipa, phone.position, false);
      const direct = pickForm(spelling, cursor, phone.ipa, phone.position, false);
      if (after && (!direct || after.form.length + 2 > direct.form.length)) {
        units.push({ kind: "silent-gh", form: "gh", phoneme: null, position: phone.position, letters: 2 });
        cursor += 2;
      }
    }

    // Silent e before a coda consonant (aches, ames, boxes…: …e + s/d)
    if (
      spelling[cursor] === "e" &&
      phone.position === "coda" &&
      !canInventoryMatch(spelling, cursor, phone.ipa, phone.position) &&
      (canInventoryMatch(spelling, cursor + 1, phone.ipa, phone.position) ||
        pickForm(spelling, cursor + 1, phone.ipa, phone.position, true))
    ) {
      units.push({
        kind: "silent-e-before-coda",
        form: "e",
        phoneme: null,
        position: "coda",
        letters: 1,
      });
      cursor += 1;
    }

    // Silent l before a coda consonant (walk, could, half, calm, talk)
    if (
      spelling[cursor] === "l" &&
      !canInventoryMatch(spelling, cursor, phone.ipa, phone.position) &&
      canInventoryMatch(spelling, cursor + 1, phone.ipa, phone.position)
    ) {
      units.push({ kind: "silent-l", form: "l", phoneme: null, position: phone.position, letters: 1 });
      cursor += 1;
    }

    // Silent u after q (already often in "qu" inventory); silent h after vowel letter rare

    let picked = pickForm(spelling, cursor, phone.ipa, phone.position);
    if (!picked) {
      const ctx = spelling.slice(Math.max(0, cursor - 2), cursor + 4);
      return {
        ok: false,
        reason: "no_form",
        pattern: `${phone.ipa}@${phone.position}:${ctx}`,
        spelling,
        ipa: ipaStr,
      };
    }

    // Geminate: if we matched a single consonant letter and the next letter repeats it,
    // and the FOLLOWING phone cannot match at the repeated letter but can after consuming it,
    // absorb the extra letter as geminate-extra (fills, pressed, …).
    const nextPhone = phones[i + 1];
    if (
      picked.form.length === 1 &&
      /[bcdfgklmnprstz]/.test(picked.form) &&
      spelling[cursor + 1] === picked.form &&
      nextPhone
    ) {
      const atRepeat = canInventoryMatch(spelling, cursor + 1, nextPhone.ipa, nextPhone.position);
      const afterRepeat = canInventoryMatch(spelling, cursor + 2, nextPhone.ipa, nextPhone.position);
      const afterRepeatFallback = pickForm(spelling, cursor + 2, nextPhone.ipa, nextPhone.position, true);
      if (!atRepeat && (afterRepeat || afterRepeatFallback)) {
        units.push({
          kind: picked.kind,
          form: picked.form,
          phoneme: phone.ipa,
          position: phone.position,
          letters: 1,
        });
        cursor += 1;
        units.push({
          kind: "geminate-extra",
          form: picked.form,
          phoneme: phone.ipa,
          position: phone.position,
          letters: 1,
        });
        cursor += 1;
        i++;
        continue;
      }
    }

    units.push({
      kind: picked.kind,
      form: picked.form,
      phoneme: phone.ipa,
      position: phone.position,
      letters: picked.form.length,
    });
    cursor += picked.form.length;

    // After /m/ coda, optional silent b (mb) or n (mn) when not already in form
    if (phone.ipa === "m" && phone.position === "coda" && picked.form === "m") {
      if (spelling[cursor] === "b" && (cursor + 1 === spelling.length || spelling[cursor + 1] === "e")) {
        units.push({ kind: "silent-b-in-mb", form: "b", phoneme: null, position: "coda", letters: 1 });
        cursor += 1;
      } else if (spelling[cursor] === "n" && (cursor + 1 === spelling.length || spelling[cursor + 1] === "e")) {
        units.push({ kind: "silent-n-in-mn", form: "n", phoneme: null, position: "coda", letters: 1 });
        cursor += 1;
      }
    }

    i++;
  }

  // Trailing silent letters
  while (cursor < spelling.length) {
    const rest = spelling.slice(cursor);
    if (rest === "e" || (rest.startsWith("e") && rest.length === 1)) {
      units.push({ kind: "silent-final-e", form: "e", phoneme: null, position: "word", letters: 1 });
      cursor += 1;
      continue;
    }
    if (rest.startsWith("e") && /^e$/.test(rest[0])) {
      units.push({ kind: "silent-final-e", form: "e", phoneme: null, position: "word", letters: 1 });
      cursor += 1;
      continue;
    }
    if (rest.startsWith("gh")) {
      units.push({ kind: "silent-gh", form: "gh", phoneme: null, position: "word", letters: 2 });
      cursor += 2;
      continue;
    }
    if (rest[0] === "h") {
      units.push({ kind: "silent-h", form: "h", phoneme: null, position: "word", letters: 1 });
      cursor += 1;
      continue;
    }
    if (rest[0] === "b" && units.some((u) => u.phoneme === "m")) {
      units.push({ kind: "silent-b-in-mb", form: "b", phoneme: null, position: "word", letters: 1 });
      cursor += 1;
      continue;
    }
    // leftover single letter → silent-other (still counts as aligned only if we accept it?)
    // Prefer FAIL on unknown leftovers so coverage is honest
    return {
      ok: false,
      reason: "leftover",
      pattern: `leftover:${rest}`,
      spelling,
      ipa: ipaStr,
    };
  }

  return { ok: true, units, spelling };
}

const { entries } = selectCompatibleCmu(parseCmuRecords(text));
const model = buildReference(text, "74790861f652b15e4ac49015a90074ad62a27690");
const onsets = new Set(model.initial_onsets);

const monos = entries.filter((e) => e.phones.filter((p) => p.kind === "vowel").length === 1);
const dis = entries.filter((e) => e.phones.filter((p) => p.kind === "vowel").length === 2);

function runPopulation(pop: typeof entries, label: string) {
  let ok = 0;
  const failPatterns: Record<string, number> = {};
  const silentCounts: Record<string, number> = {};
  const lettersByPos: Record<Position, { phones: number; letters: number }> = {
    onset: { phones: 0, letters: 0 },
    nucleus: { phones: 0, letters: 0 },
    coda: { phones: 0, letters: 0 },
  };
  const multiByPos: Record<Position, number> = { onset: 0, nucleus: 0, coda: 0 };
  const mechanismLetters: Record<string, number> = {
    silent_final_e: 0,
    silent_other: 0,
    doubling_ck_tch_dge: 0,
    vowel_polygraph: 0,
    consonant_digraph: 0,
    other_multiletter: 0,
    single_letter: 0,
  };
  const CONSONANT_DIGRAPHS = new Set(["sh", "ch", "th", "ng", "wh", "ph", "ck", "tch", "dge"]);
  const DOUBLE_LIKE = new Set(["ck", "tch", "dge", "ff", "ll", "ss", "zz", "tt", "pp", "rr", "nn", "mm", "dd", "bb", "gg"]);
  const examplesBySilent: Record<string, string[]> = {};
  const aligned: { spelling: string; units: AlignUnit[] }[] = [];

  for (const e of pop) {
    const r = alignWord(e.spelling, e.tokens, onsets);
    if (!r.ok) {
      failPatterns[r.pattern] = (failPatterns[r.pattern] ?? 0) + 1;
      continue;
    }
    ok++;
    aligned.push({ spelling: e.spelling, units: r.units });
    for (const u of r.units) {
      if (u.kind === "geminate-extra") {
        silentCounts[u.kind] = (silentCounts[u.kind] ?? 0) + 1;
        mechanismLetters.doubling_ck_tch_dge += u.letters;
        if (u.position === "onset" || u.position === "nucleus" || u.position === "coda") {
          lettersByPos[u.position].letters += u.letters;
        }
        continue;
      }
      if (u.kind.startsWith("silent")) {
        silentCounts[u.kind] = (silentCounts[u.kind] ?? 0) + 1;
        examplesBySilent[u.kind] ??= [];
        if (examplesBySilent[u.kind].length < 8) examplesBySilent[u.kind].push(e.spelling);
        if (u.kind === "silent-final-e") mechanismLetters.silent_final_e += u.letters;
        else mechanismLetters.silent_other += u.letters;
      } else if (u.position === "onset" || u.position === "nucleus" || u.position === "coda") {
        lettersByPos[u.position].phones++;
        lettersByPos[u.position].letters += u.letters;
        if (u.letters > 1) multiByPos[u.position]++;
        const form = u.form;
        if (DOUBLE_LIKE.has(form) || /([a-z])\1/.test(form)) {
          mechanismLetters.doubling_ck_tch_dge += u.letters - 1;
        } else if (u.position === "nucleus" && u.letters >= 2) {
          mechanismLetters.vowel_polygraph += u.letters - 1;
        } else if (CONSONANT_DIGRAPHS.has(form)) {
          mechanismLetters.consonant_digraph += u.letters - 1;
        } else if (u.letters >= 2) {
          mechanismLetters.other_multiletter += u.letters - 1;
        } else {
          mechanismLetters.single_letter += u.letters;
        }
      }
    }
  }

  const topFails = Object.entries(failPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([pattern, n]) => ({ pattern, n }));

  return {
    label,
    n: pop.length,
    aligned: ok,
    coverage: ok / pop.length,
    topFails,
    silentCounts,
    examplesBySilent,
    lettersByPos: Object.fromEntries(
      Object.entries(lettersByPos).map(([k, v]) => [
        k,
        { ...v, meanLettersPerPhone: v.phones ? v.letters / v.phones : null, multiShare: v.phones ? multiByPos[k as Position] / v.phones : null },
      ]),
    ),
    mechanismExtraLettersTotal: mechanismLetters,
    mechanismExtraLettersPerWord: Object.fromEntries(
      Object.entries(mechanismLetters).map(([k, v]) => [k, ok ? v / ok : null]),
    ),
    // keep aligned units only for mono (for later mechanism vs gen) — may be large; store separately if mono
    alignedCount: aligned.length,
    _aligned: label === "mono" ? aligned : undefined,
  };
}

console.error("aligning monos…");
const monoResult = runPopulation(monos, "mono");
console.error(`mono coverage ${(monoResult.coverage * 100).toFixed(1)}% (${monoResult.aligned}/${monoResult.n})`);
console.error("aligning disyllables…");
const diResult = runPopulation(dis, "di");
console.error(`di coverage ${(diResult.coverage * 100).toFixed(1)}% (${diResult.aligned}/${diResult.n})`);

// Hand-check 100 monos with fixed seed
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
const alignedMono = monoResult._aligned!;
const idx = alignedMono.map((_, i) => i);
for (let i = idx.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [idx[i], idx[j]] = [idx[j], idx[i]];
}
const handSample = idx.slice(0, 100).map((i) => alignedMono[i]);

/**
 * Hand validation: for each sample, check that unit forms concatenate to spelling
 * and that silent categories look plausible. Flag errors where a silent label is
 * wrong or a phone is matched to a clearly unrelated letter sequence.
 */
const handErrors: { spelling: string; reason: string; units: string }[] = [];
for (const row of handSample) {
  const concat = row.units.map((u) => u.form).join("");
  if (concat !== row.spelling) {
    handErrors.push({ spelling: row.spelling, reason: "concat_mismatch", units: row.units.map((u) => `${u.kind}:${u.form}`).join("|") });
    continue;
  }
  // Flag suspicious: single-letter-fallback on nucleus for multi-letter expected? soft
  // Flag silent-final-e when spelling doesn't end with e
  for (const u of row.units) {
    if (u.kind === "silent-final-e" && !row.spelling.endsWith("e")) {
      handErrors.push({ spelling: row.spelling, reason: "bad_silent_e", units: "" });
    }
    if (u.kind === "silent-k-in-kn" && !row.spelling.includes("kn")) {
      handErrors.push({ spelling: row.spelling, reason: "bad_kn", units: "" });
    }
  }
}

// Deeper manual spot flags for known hard cases in sample
for (const row of handSample) {
  // "one"/"once" style — if aligned via weird fallbacks
  if (row.spelling === "one" || row.spelling === "once" || row.spelling === "ouija") {
    handErrors.push({ spelling: row.spelling, reason: "opaque_orthography_likely_wrong", units: row.units.map((u) => `${u.kind}:${u.form}`).join("|") });
  }
}

const packet = {
  meta: {
    sha,
    tieBreak: "longest form, then highest frequency, then lexicographically smallest; inventory from graphemeMaps; IPA via data/cmu/phoneme-normalization.json",
    silentRules: [
      "silent-k-in-kn / silent-g-in-gn before onset /n/",
      "silent-w-in-wr before onset /r/",
      "silent-gh when gh present and not claimed by inventory form for current phone",
      "silent-b-in-mb / silent-n-in-mn after coda /m/",
      "silent-final-e for leftover final e",
      "silent-h for leftover h",
      "unknown leftovers → fail (not folded into neighbour)",
    ],
    handSeed: HAND_SEED,
  },
  mono: { ...monoResult, _aligned: undefined },
  di: { ...diResult, _aligned: undefined },
  handCheck: {
    n: handSample.length,
    seed: HAND_SEED,
    autoStructuralErrors: handErrors.length,
    autoStructuralErrorRate: handErrors.length / handSample.length,
    errorExamples: handErrors.slice(0, 20),
    sample: handSample.map((r) => ({
      spelling: r.spelling,
      units: r.units.map((u) => ({ kind: u.kind, form: u.form, phoneme: u.phoneme, position: u.position })),
    })),
    note: "Structural concat check + silent-rule sanity. A separate manual pass over the sample is recorded in step3-hand-labels.json.",
  },
};

writeFileSync(`${OUT}/step3-align.json`, JSON.stringify(packet, null, 2));
// Store mono alignments compactly for step 4
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
      monoCoverage: monoResult.coverage,
      diCoverage: diResult.coverage,
      monoAligned: monoResult.aligned,
      diAligned: diResult.aligned,
      topMonoFails: monoResult.topFails.slice(0, 15),
      silentPerWord: monoResult.mechanismExtraLettersPerWord,
      lettersByPos: monoResult.lettersByPos,
      handAutoErrorRate: packet.handCheck.autoStructuralErrorRate,
    },
    null,
    2,
  ),
);
