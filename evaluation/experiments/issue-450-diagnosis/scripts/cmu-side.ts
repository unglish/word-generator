/**
 * Issue #450 diagnosis — CMU side (local probe; not for main).
 * Uses pinned cmudict + shared ascii-first selection.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseCmuRecords, selectCompatibleCmu } from "../../evaluation/corpus/cmu.js";
import { CMU_REVISION, CMU_SHA256 } from "../../evaluation/review/wordlikeness/model.js";

const CMU_PATH = "/tmp/wordlikeness-cmudict.dict";
const OUT_DIR = "/tmp/issue-450-diagnosis/packets";
mkdirSync(OUT_DIR, { recursive: true });

const EXPECTED_SHA =
  "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";

const text = readFileSync(CMU_PATH, "utf8");
const sha = createHash("sha256").update(text, "utf8").digest("hex");
if (sha !== EXPECTED_SHA || sha !== CMU_SHA256) {
  throw new Error(`CMU SHA mismatch: got ${sha}`);
}

const { entries, excluded } = selectCompatibleCmu(parseCmuRecords(text));
const bySpelling = new Map(entries.map((e) => [e.spelling, e]));

function syllableCount(entry: (typeof entries)[number]): number {
  return entry.phones.filter((p) => p.kind === "vowel").length;
}

function phoneCount(entry: (typeof entries)[number]): number {
  return entry.phones.length;
}

type Hist = Record<string, number>;
const add = (h: Hist, k: string | number, n = 1) => {
  const key = String(k);
  h[key] = (h[key] ?? 0) + n;
};

const monos = entries.filter((e) => syllableCount(e) === 1);
const disyllables = entries.filter((e) => syllableCount(e) === 2);

/** Heuristic regular-inflection classifiers with stem-in-lexicon checks. */
type InflectionKind = "plural_s" | "past_ed" | "none" | "ambiguous";

function classifyInflection(spelling: string): {
  kind: InflectionKind;
  stem: string | null;
  stemPresent: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  // Possessive 's cannot appear under ascii-letter-only selection.
  if (spelling.includes("'")) {
    return { kind: "ambiguous", stem: null, stemPresent: false, notes: ["apostrophe"] };
  }

  // -ed / -d past (orthographic regular-ish)
  if (spelling.endsWith("ed") && spelling.length >= 4) {
    const candidates = [
      spelling.slice(0, -2), // walk+ed
      spelling.slice(0, -1), // bake+d → baked (stem bake)
    ];
    // doubled consonant: stopped → stop
    if (/([b-df-hj-np-tv-z])\1ed$/.test(spelling)) {
      candidates.push(spelling.slice(0, -3));
    }
    const present = candidates.find((s) => s.length >= 2 && bySpelling.has(s));
    if (present) {
      return { kind: "past_ed", stem: present, stemPresent: true, notes };
    }
    notes.push("ed_no_stem");
  }

  // plural / 3sg -s / -es
  if (spelling.endsWith("s") && !spelling.endsWith("ss") && spelling.length >= 3) {
    const candidates: string[] = [];
    if (spelling.endsWith("ies") && spelling.length >= 4) {
      candidates.push(spelling.slice(0, -3) + "y");
    }
    if (spelling.endsWith("es") && spelling.length >= 4) {
      candidates.push(spelling.slice(0, -2)); // boxes → box
      candidates.push(spelling.slice(0, -1)); // sometimes -s only
    }
    candidates.push(spelling.slice(0, -1));
    const present = candidates.find((s) => s.length >= 2 && bySpelling.has(s));
    if (present) {
      // words like "this", "as", "us" false positives if stem exists oddly
      if (["this", "thus", "as", "is", "us", "yes", "his"].includes(spelling)) {
        return { kind: "none", stem: null, stemPresent: false, notes: ["closed_class_s"] };
      }
      return { kind: "plural_s", stem: present, stemPresent: true, notes };
    }
    notes.push("s_no_stem");
  }

  return { kind: "none", stem: null, stemPresent: false, notes };
}

function jointFor(population: typeof entries) {
  const letters: Hist = {};
  const phones: Hist = {};
  const joint: Hist = {}; // `${phones}|${letters}`
  const lettersGivenPhones: Record<string, Hist> = {};
  for (const e of population) {
    const L = e.spelling.length;
    const P = phoneCount(e);
    add(letters, L);
    add(phones, P);
    add(joint, `${P}|${L}`);
    lettersGivenPhones[P] ??= {};
    add(lettersGivenPhones[P], L);
  }
  return { n: population.length, letters, phones, joint, lettersGivenPhones };
}

function pctHist(h: Hist, n: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(h)) out[k] = (100 * v) / n;
  return out;
}

function meanFromHist(h: Hist): number {
  let sum = 0;
  let n = 0;
  for (const [k, v] of Object.entries(h)) {
    sum += Number(k) * v;
    n += v;
  }
  return n ? sum / n : NaN;
}

const monoInflection = {
  plural_s: 0,
  past_ed: 0,
  none: 0,
  ambiguous: 0,
  ed_no_stem: 0,
  s_no_stem: 0,
};
const monoInflectionExamples: Record<string, string[]> = {
  plural_s: [],
  past_ed: [],
};

for (const e of monos) {
  const c = classifyInflection(e.spelling);
  monoInflection[c.kind]++;
  if (c.notes.includes("ed_no_stem")) monoInflection.ed_no_stem++;
  if (c.notes.includes("s_no_stem")) monoInflection.s_no_stem++;
  if (c.kind === "plural_s" && monoInflectionExamples.plural_s.length < 12) {
    monoInflectionExamples.plural_s.push(`${e.spelling}←${c.stem}`);
  }
  if (c.kind === "past_ed" && monoInflectionExamples.past_ed.length < 12) {
    monoInflectionExamples.past_ed.push(`${e.spelling}←${c.stem}`);
  }
}

const monoJoint = jointFor(monos);
const diJoint = jointFor(disyllables);

// Legacy baseline comparison (issue text population)
const legacy = JSON.parse(
  readFileSync(
    new URL("../../data/cmu/cmu-length-baseline.json", import.meta.url),
    "utf8",
  ),
);

const packet = {
  source: {
    path: CMU_PATH,
    revision: CMU_REVISION,
    sha256: sha,
    bytes: Buffer.byteLength(text),
    policy: "cmu-ascii-first-v1",
    accepted: entries.length,
    excluded,
  },
  mono: {
    n: monos.length,
    letterPct: pctHist(monoJoint.letters, monos.length),
    phonePct: pctHist(monoJoint.phones, monos.length),
    letterMean: meanFromHist(monoJoint.letters),
    phoneMean: meanFromHist(monoJoint.phones),
    letters: monoJoint.letters,
    phones: monoJoint.phones,
    joint: monoJoint.joint,
    lettersGivenPhones: Object.fromEntries(
      Object.entries(monoJoint.lettersGivenPhones).map(([p, h]) => [
        p,
        { counts: h, pct: pctHist(h, Object.values(h).reduce((a, b) => a + b, 0)), n: Object.values(h).reduce((a, b) => a + b, 0) },
      ]),
    ),
    inflection: {
      method:
        "Orthographic heuristic on ascii-first selected monos: classify as regular-ish plural -s/-es or past -ed/-d when a plausible stem spelling exists as another selected entry. Possessive -'s impossible under ascii-letter selection. False positives: lexical words ending in s/ed with unrelated stem present; false negatives: stem absent/spelling-changing irregulars; no POS or frequency. Error roughly on order of closed-class and coincidental-stem rate (spot-checked; not gold morphology).",
      counts: monoInflection,
      shareOfMonos: {
        plural_s: monoInflection.plural_s / monos.length,
        past_ed: monoInflection.past_ed / monos.length,
        either: (monoInflection.plural_s + monoInflection.past_ed) / monos.length,
        none: monoInflection.none / monos.length,
      },
      examples: monoInflectionExamples,
      possessiveExcludedByPolicy: true,
    },
  },
  disyllable: {
    n: disyllables.length,
    letterPct: pctHist(diJoint.letters, disyllables.length),
    phonePct: pctHist(diJoint.phones, disyllables.length),
    letterMean: meanFromHist(diJoint.letters),
    phoneMean: meanFromHist(diJoint.phones),
    letters: diJoint.letters,
    phones: diJoint.phones,
    joint: diJoint.joint,
    lettersGivenPhones: Object.fromEntries(
      Object.entries(diJoint.lettersGivenPhones).map(([p, h]) => [
        p,
        { counts: h, pct: pctHist(h, Object.values(h).reduce((a, b) => a + b, 0)), n: Object.values(h).reduce((a, b) => a + b, 0) },
      ]),
    ),
  },
  legacyBaselineMono: {
    n: legacy.bySylLen["1"].count,
    byLen: legacy.bySylLen["1"].byLen,
    stats: legacy.bySylLen["1"].stats,
    note: "Historic 135158-line population; not ascii-first 117485.",
  },
};

writeFileSync(`${OUT_DIR}/cmu-side.json`, JSON.stringify(packet, null, 2));
console.log(JSON.stringify({
  sha_ok: sha === EXPECTED_SHA,
  accepted: entries.length,
  mono_n: monos.length,
  di_n: disyllables.length,
  mono_letter_mean: packet.mono.letterMean,
  mono_phone_mean: packet.mono.phoneMean,
  inflection_share: packet.mono.inflection.shareOfMonos,
  mono_letter_pct_2_7: Object.fromEntries(
    [2, 3, 4, 5, 6, 7].map((L) => [L, packet.mono.letterPct[String(L)] ?? 0]),
  ),
  mono_phone_pct: packet.mono.phonePct,
}, null, 2));
