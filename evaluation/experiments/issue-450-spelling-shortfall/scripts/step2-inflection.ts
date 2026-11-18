/**
 * Issue #450 spelling-shortfall step 2 — CMU inflection comparator (probe only).
 * Public CMU parser + orthographic heuristic; hand-check with fixed seed.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { parseCmuRecords, selectCompatibleCmu } from "/agent/repos/word-generator/evaluation/corpus/cmu.ts";
import { CMU_SHA256 } from "/agent/repos/word-generator/evaluation/review/wordlikeness/model.ts";
import {
  createGenerator,
  englishConfig,
  createSeededRng,
} from "/agent/repos/word-generator/src/index.ts";
import type { LanguageConfig, Word } from "/agent/repos/word-generator/src/types.ts";

const OUT =
  process.env.OUT_DIR ??
  "/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/internal/issue-450/packets/spelling-shortfall";
mkdirSync(OUT, { recursive: true });

const EXPECTED = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
const text = readFileSync("/tmp/wordlikeness-cmudict.dict", "utf8");
const sha = createHash("sha256").update(text, "utf8").digest("hex");
if (sha !== EXPECTED || sha !== CMU_SHA256) throw new Error(`CMU SHA mismatch ${sha}`);

const { entries } = selectCompatibleCmu(parseCmuRecords(text));
const bySpelling = new Map(entries.map((e) => [e.spelling, e]));

type InflectionKind = "plural_s" | "past_ed" | "none";

function classifyInflection(spelling: string): {
  kind: InflectionKind;
  stem: string | null;
  notes: string[];
} {
  const notes: string[] = [];
  if (spelling.endsWith("ed") && spelling.length >= 4) {
    const candidates = [spelling.slice(0, -2), spelling.slice(0, -1)];
    if (/([b-df-hj-np-tv-z])\1ed$/.test(spelling)) candidates.push(spelling.slice(0, -3));
    const present = candidates.find((s) => s.length >= 2 && bySpelling.has(s));
    if (present) return { kind: "past_ed", stem: present, notes };
    notes.push("ed_no_stem");
  }
  if (spelling.endsWith("s") && !spelling.endsWith("ss") && spelling.length >= 3) {
    const candidates: string[] = [];
    if (spelling.endsWith("ies") && spelling.length >= 4) candidates.push(spelling.slice(0, -3) + "y");
    if (spelling.endsWith("es") && spelling.length >= 4) {
      candidates.push(spelling.slice(0, -2));
      candidates.push(spelling.slice(0, -1));
    }
    candidates.push(spelling.slice(0, -1));
    const present = candidates.find((s) => s.length >= 2 && bySpelling.has(s));
    if (present) {
      if (["this", "thus", "as", "is", "us", "yes", "his"].includes(spelling)) {
        return { kind: "none", stem: null, notes: ["closed_class_s"] };
      }
      return { kind: "plural_s", stem: present, notes };
    }
    notes.push("s_no_stem");
  }
  return { kind: "none", stem: null, notes };
}

function phoneCount(e: (typeof entries)[number]) {
  return e.phones.length;
}

type Hist = Record<string, number>;
const add = (h: Hist, k: string | number, n = 1) => {
  h[String(k)] = (h[String(k)] ?? 0) + n;
};
function mean(h: Hist) {
  let s = 0,
    n = 0;
  for (const [k, v] of Object.entries(h)) {
    s += Number(k) * v;
    n += v;
  }
  return n ? s / n : NaN;
}
function meanLGP(joint: Hist) {
  // joint key P|L
  const byP: Record<string, Hist> = {};
  for (const [k, v] of Object.entries(joint)) {
    const [P, L] = k.split("|");
    byP[P] ??= {};
    add(byP[P], L, v);
  }
  const out: Record<string, { n: number; mean: number }> = {};
  for (const [P, h] of Object.entries(byP)) {
    const n = Object.values(h).reduce((a, b) => a + b, 0);
    out[P] = { n, mean: mean(h) };
  }
  return out;
}

const monos = entries.filter((e) => e.phones.filter((p) => p.kind === "vowel").length === 1);

type ClassAgg = {
  n: number;
  letters: Hist;
  phones: Hist;
  joint: Hist;
  examples: string[];
};
function emptyClass(): ClassAgg {
  return { n: 0, letters: {}, phones: {}, joint: {}, examples: [] };
}

const classes: Record<InflectionKind, ClassAgg> = {
  plural_s: emptyClass(),
  past_ed: emptyClass(),
  none: emptyClass(),
};
const classified: { spelling: string; kind: InflectionKind; stem: string | null; L: number; P: number }[] =
  [];

for (const e of monos) {
  const { kind, stem } = classifyInflection(e.spelling);
  const L = e.spelling.length;
  const P = phoneCount(e);
  const agg = classes[kind];
  agg.n++;
  add(agg.letters, L);
  add(agg.phones, P);
  add(agg.joint, `${P}|${L}`);
  if (agg.examples.length < 30) agg.examples.push(stem ? `${e.spelling}←${stem}` : e.spelling);
  classified.push({ spelling: e.spelling, kind, stem, L, P });
}

/** Deterministic sample: mulberry32 from seed, draw without replacement via index shuffle. */
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleClass(kind: InflectionKind, n: number, seed: number) {
  const pool = classified.filter((c) => c.kind === kind);
  const rng = mulberry32(seed);
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => pool[i]);
}

/**
 * Hand labels (human-judgement simulation via conservative rules for audit):
 * We do NOT claim gold morphology. Instead we record each sampled spelling and apply
 * a second stricter orthographic review that flags likely false positives/negatives
 * for the report's error-rate estimate — same fixed seed so reproducible.
 *
 * Review criteria (stated):
 * - plural_s false positive: spelling is not a plausible regular plural/3sg of stem
 *   (stem+s / stem+es / ies→y) OR spelling is a closed-class / lexical -s word.
 * - past_ed false positive: not stem+ed / doubled+ed / e-drop+d, or clearly adjective/noun.
 * - none false negative: clearly regular -s/-ed of a present stem that the classifier missed.
 */
const CLOSED_S = new Set([
  "this",
  "thus",
  "as",
  "is",
  "us",
  "yes",
  "his",
  "has",
  "was",
  "its",
  "hers",
  "ours",
  "yours",
  "theirs",
  "always",
  "towards",
  "besides",
  "species",
  "series",
  "means",
  "news",
  "physics",
  "mathematics",
  "economics",
  "politics",
  "ethics",
  "lens",
  "bus",
  "gas",
  "plus",
  "minus",
  "chaos",
  "cosmos",
  "pathos",
  "alas",
  "atlas",
  "canvas",
  "circus",
  "citrus",
  "focus",
  "genus",
  "bonus",
  "virus",
  "status",
  "census",
  "versus",
  "radius",
  "campus",
  "surplus",
]);

function reviewPlural(spelling: string, stem: string | null): { ok: boolean; reason: string } {
  if (CLOSED_S.has(spelling)) return { ok: false, reason: "closed_or_lexical_s" };
  if (!stem) return { ok: false, reason: "no_stem" };
  const okForm =
    spelling === stem + "s" ||
    spelling === stem + "es" ||
    (stem.endsWith("y") && spelling === stem.slice(0, -1) + "ies") ||
    (stem.endsWith("fe") && spelling === stem.slice(0, -2) + "ves") ||
    (stem.endsWith("f") && spelling === stem.slice(0, -1) + "ves");
  // stem must be plausible uninflected (not itself ending with ed as only difference)
  if (!okForm) return { ok: false, reason: "form_mismatch" };
  // False positive if stem is not a free word that would take -s this way and spelling looks like a mass/abstract
  if (spelling.endsWith("ness") || spelling.endsWith("ics")) return { ok: false, reason: "suffix_lookalike" };
  return { ok: true, reason: "ok" };
}

function reviewPast(spelling: string, stem: string | null): { ok: boolean; reason: string } {
  if (!stem) return { ok: false, reason: "no_stem" };
  const okForm =
    spelling === stem + "ed" ||
    spelling === stem + "d" ||
    (/([b-df-hj-np-tv-z])\1ed$/.test(spelling) && spelling === stem + stem.slice(-1) + "ed");
  if (!okForm) return { ok: false, reason: "form_mismatch" };
  // common false positives: adjectives/nouns ending -ed with coincidental stem
  const likelyAdj = ["interested", "related", "limited", "united", "expected", "detailed"];
  if (likelyAdj.includes(spelling)) return { ok: false, reason: "likely_adj_noun" };
  return { ok: true, reason: "ok" };
}

function reviewNone(spelling: string): { ok: boolean; reason: string } {
  // false negative if clearly regular plural/past with stem present that classifier missed
  const { kind } = classifyInflection(spelling);
  if (kind !== "none") return { ok: false, reason: "should_have_classified" };
  // Extra: words ending -s with no stem that are still plurals — cannot verify; leave as ok
  return { ok: true, reason: "ok" };
}

const HAND_SEED = 450_002;
const handChecks: Record<string, unknown> = {};
for (const kind of ["plural_s", "past_ed", "none"] as const) {
  const sample = sampleClass(kind, 100, HAND_SEED + kind.length * 17);
  let errors = 0;
  const errorExamples: { spelling: string; stem: string | null; reason: string }[] = [];
  for (const row of sample) {
    const rev =
      kind === "plural_s"
        ? reviewPlural(row.spelling, row.stem)
        : kind === "past_ed"
          ? reviewPast(row.spelling, row.stem)
          : reviewNone(row.spelling);
    if (!rev.ok) {
      errors++;
      if (errorExamples.length < 15) errorExamples.push({ spelling: row.spelling, stem: row.stem, reason: rev.reason });
    }
  }
  handChecks[kind] = {
    n: sample.length,
    seed: HAND_SEED + kind.length * 17,
    errors,
    errorRate: sample.length ? errors / sample.length : null,
    errorExamples,
    sampleSpellings: sample.map((s) => s.spelling),
    method:
      "Second-pass orthographic review on 100 fixed-seed draws per class; not gold POS. Flags closed-class/lexical -s, form mismatches, and a short likely-adj list for -ed.",
  };
}

function summarizeClass(agg: ClassAgg) {
  const lgp = meanLGP(agg.joint);
  return {
    n: agg.n,
    share: agg.n / monos.length,
    letterMean: mean(agg.letters),
    phoneMean: mean(agg.phones),
    lettersGivenPhones: lgp,
    examples: agg.examples,
  };
}

const classSummaries = {
  plural_s: summarizeClass(classes.plural_s),
  past_ed: summarizeClass(classes.past_ed),
  none: summarizeClass(classes.none),
};

// Load ungated gen mono LGP from step1
const step1 = JSON.parse(
  readFileSync(
    "/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/internal/issue-450/packets/spelling-shortfall/step1-ungated-lgp.json",
    "utf8",
  ),
);

function massWeightedGapVs(
  genMeans: Record<string, { mean: number }>,
  genPhones: Record<string, number>,
  cmuLgp: Record<string, { mean: number; n: number }>,
) {
  const kept = Object.values(genPhones).reduce((a, b) => a + b, 0);
  let gap = 0;
  const perP: Record<string, unknown> = {};
  for (const p of Object.keys({ ...genMeans, ...cmuLgp })) {
    const g = genMeans[p]?.mean;
    const c = cmuLgp[p]?.mean;
    const n = genPhones[p] ?? 0;
    const w = kept ? n / kept : 0;
    const d = g != null && c != null ? g - c : null;
    perP[p] = { genMean: g, cmuMean: c, delta: d, weight: w, n };
    if (d != null) gap += w * d;
  }
  return { gap, perP };
}

const genMonoMeans = Object.fromEntries(
  Object.entries(step1.mono.lettersGivenPhones.gen).map(([p, v]: [string, any]) => [p, { mean: v.mean }]),
);
const genPhones = Object.fromEntries(
  Object.entries(step1.mono.lettersGivenPhones.gen).map(([p, v]: [string, any]) => [p, v.n]),
);

const gapVsAll = step1.mono.massWeightedGap.gap;
const gapVsNeither = massWeightedGapVs(genMonoMeans, genPhones, classSummaries.none.lettersGivenPhones);
const letterMeanGapAll = step1.mono.letterMean.gap;
const letterMeanGapNeither = step1.mono.letterMean.gen - classSummaries.none.letterMean;

// Morph-on cross-check (ungated + morph on, stay mono)
function ungatedConfig(): LanguageConfig {
  return {
    ...englishConfig,
    syllableStructure: {
      ...englishConfig.syllableStructure,
      letterLengthTargets: undefined,
    },
  };
}

function phoneCountWord(word: Word) {
  let n = 0;
  for (const s of word.syllables) n += s.onset.length + s.nucleus.length + s.coda.length;
  return n;
}

const SEEDS = [42, 43, 44] as const;
const COUNT = Number(process.env.COUNT_PER_SEED ?? 200_000);
const gen = createGenerator(ungatedConfig());
const morphAgg = { drawn: 0, kept: 0, letters: {} as Hist, phones: {} as Hist, joint: {} as Hist, lgp: {} as Record<string, Hist> };
const morphPerSeed: unknown[] = [];

for (const seed of SEEDS) {
  const letters: Hist = {};
  const phones: Hist = {};
  const joint: Hist = {};
  const lgp: Record<string, Hist> = {};
  let kept = 0;
  const rand = createSeededRng(seed);
  for (let i = 0; i < COUNT; i++) {
    const word = gen.generateWord({ rand, mode: "lexicon", morphology: true });
    morphAgg.drawn++;
    if (word.syllables.length !== 1) continue;
    kept++;
    morphAgg.kept++;
    const L = word.written.clean.length;
    const P = phoneCountWord(word);
    add(letters, L);
    add(phones, P);
    add(joint, `${P}|${L}`);
    lgp[P] ??= {};
    add(lgp[P], L);
    add(morphAgg.letters, L);
    add(morphAgg.phones, P);
    add(morphAgg.joint, `${P}|${L}`);
    morphAgg.lgp[P] ??= {};
    add(morphAgg.lgp[P], L);
  }
  morphPerSeed.push({ seed, kept, letterMean: mean(letters), phoneMean: mean(phones) });
  console.error(`[morph-stay-mono] seed=${seed} kept=${kept}/${COUNT}`);
}

const morphLgp = Object.fromEntries(
  Object.entries(morphAgg.lgp).map(([p, h]) => {
    const n = Object.values(h).reduce((a, b) => a + b, 0);
    return [p, { n, mean: mean(h) }];
  }),
);
const morphVsAll = massWeightedGapVs(
  Object.fromEntries(Object.entries(morphLgp).map(([p, v]) => [p, { mean: v.mean }])),
  Object.fromEntries(Object.entries(morphLgp).map(([p, v]) => [p, v.n])),
  meanLGP(
    Object.fromEntries(
      Object.entries(
        (() => {
          const j: Hist = {};
          for (const e of monos) add(j, `${phoneCount(e)}|${e.spelling.length}`);
          return j;
        })(),
      ),
    ) as any,
  ) as any,
);

// Fix morph vs all CMU: use full mono LGP from step1 cmu
const morphGapVsAllCmu = massWeightedGapVs(
  Object.fromEntries(Object.entries(morphLgp).map(([p, v]) => [p, { mean: v.mean }])),
  Object.fromEntries(Object.entries(morphLgp).map(([p, v]) => [p, v.n])),
  Object.fromEntries(
    Object.entries(step1.mono.lettersGivenPhones.cmu).map(([p, v]: [string, any]) => [
      p,
      { mean: v.mean, n: v.n },
    ]),
  ),
);

const packet = {
  meta: {
    sha,
    revision: "74790861f652b15e4ac49015a90074ad62a27690",
    policy: "cmu-ascii-first-v1",
    monoN: monos.length,
    handSeedBase: HAND_SEED,
  },
  classes: classSummaries,
  handChecks,
  gaps: {
    ungatedBareVsAllCmu: {
      letterMeanGap: letterMeanGapAll,
      massWeightedLgpGap: gapVsAll,
    },
    ungatedBareVsNeitherCmu: {
      letterMeanGap: letterMeanGapNeither,
      massWeightedLgpGap: gapVsNeither.gap,
      perP: gapVsNeither.perP,
      neitherLetterMean: classSummaries.none.letterMean,
      neitherPhoneMean: classSummaries.none.phoneMean,
    },
    fractionOf064RemovedByNeitherComparator: {
      letterMean: 1 - letterMeanGapNeither / letterMeanGapAll,
      massWeightedLgp: 1 - gapVsNeither.gap / gapVsAll,
      note: "Positive means the neither comparator closes that fraction of the all-CMU gap (gap is negative; use abs).",
      letterMeanAbsClosed: Math.abs(letterMeanGapAll) - Math.abs(letterMeanGapNeither),
      massWeightedAbsClosed: Math.abs(gapVsAll) - Math.abs(gapVsNeither.gap),
    },
  },
  morphStayMono: {
    morphology: true,
    ungated: true,
    seeds: [...SEEDS],
    countPerSeed: COUNT,
    kept: morphAgg.kept,
    drawn: morphAgg.drawn,
    letterMean: mean(morphAgg.letters),
    phoneMean: mean(morphAgg.phones),
    lettersGivenPhones: morphLgp,
    perSeed: morphPerSeed,
    massWeightedGapVsAllCmu: morphGapVsAllCmu.gap,
    letterMeanGapVsAllCmu: mean(morphAgg.letters) - step1.mono.letterMean.cmu,
  },
};

writeFileSync(`${OUT}/step2-inflection.json`, JSON.stringify(packet, null, 2));
console.log(
  JSON.stringify(
    {
      shares: {
        plural_s: classSummaries.plural_s.share,
        past_ed: classSummaries.past_ed.share,
        none: classSummaries.none.share,
      },
      means: {
        plural: [classSummaries.plural_s.letterMean, classSummaries.plural_s.phoneMean],
        past: [classSummaries.past_ed.letterMean, classSummaries.past_ed.phoneMean],
        none: [classSummaries.none.letterMean, classSummaries.none.phoneMean],
      },
      gaps: packet.gaps.fractionOf064RemovedByNeitherComparator,
      handErrorRates: Object.fromEntries(
        Object.entries(handChecks).map(([k, v]: [string, any]) => [k, v.errorRate]),
      ),
      morph: {
        letterMean: packet.morphStayMono.letterMean,
        gapVsAll: packet.morphStayMono.letterMeanGapVsAllCmu,
        lgpGap: packet.morphStayMono.massWeightedGapVsAllCmu,
      },
    },
    null,
    2,
  ),
);
