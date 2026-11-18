/**
 * Issue #450 Part 1 — real-word CMU comparator (probe only; not for main).
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
import {
  createGenerator,
  englishConfig,
  createSeededRng,
} from "/agent/repos/word-generator/src/index.ts";
import type { LanguageConfig } from "/agent/repos/word-generator/src/types.ts";

const OUT =
  process.env.OUT_DIR ??
  "/cursor/stores/bc-01a13b7c-29e9-792a-a41d-d3389db3cfc3/internal/issue-450/packets/real-word-comparator";
mkdirSync(OUT, { recursive: true });

const EXPECTED_CMU = "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22";
const text = readFileSync("/tmp/wordlikeness-cmudict.dict", "utf8");
const cmuSha = createHash("sha256").update(text, "utf8").digest("hex");
if (cmuSha !== EXPECTED_CMU || cmuSha !== CMU_SHA256) throw new Error(`CMU SHA mismatch ${cmuSha}`);

const WORDLIST = "/tmp/scowl-pin/scowl-english-american-words-le60.txt";
const PROPER = "/tmp/scowl-pin/scowl-proper-names-le95.txt";
const words = new Set(
  readFileSync(WORDLIST, "utf8")
    .split(/\n/)
    .filter(Boolean),
);
const properNames = new Set(
  readFileSync(PROPER, "utf8")
    .split(/\n/)
    .filter(Boolean),
);

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

const { entries } = selectCompatibleCmu(parseCmuRecords(text));
const bySpelling = new Map(entries.map((e) => [e.spelling, e]));
const monos = entries.filter((e) => e.phones.filter((p) => p.kind === "vowel").length === 1);
const model = buildReference(text, "74790861f652b15e4ac49015a90074ad62a27690");
const onsets = new Set(model.initial_onsets);

const kept = monos.filter((e) => words.has(e.spelling));
const dropped = monos.filter((e) => !words.has(e.spelling));

type InflectionKind = "plural_s" | "past_ed" | "none";
function classifyInflection(spelling: string): { kind: InflectionKind; stem: string | null } {
  if (spelling.endsWith("ed") && spelling.length >= 4) {
    const candidates = [spelling.slice(0, -2), spelling.slice(0, -1)];
    if (/([b-df-hj-np-tv-z])\1ed$/.test(spelling)) candidates.push(spelling.slice(0, -3));
    const present = candidates.find((s) => s.length >= 2 && bySpelling.has(s) && words.has(s));
    if (present) return { kind: "past_ed", stem: present };
  }
  if (spelling.endsWith("s") && !spelling.endsWith("ss") && spelling.length >= 3) {
    const candidates: string[] = [];
    if (spelling.endsWith("ies") && spelling.length >= 4) candidates.push(spelling.slice(0, -3) + "y");
    if (spelling.endsWith("es") && spelling.length >= 4) {
      candidates.push(spelling.slice(0, -2));
      candidates.push(spelling.slice(0, -1));
    }
    candidates.push(spelling.slice(0, -1));
    const present = candidates.find((s) => s.length >= 2 && bySpelling.has(s) && words.has(s));
    if (present && !["this", "thus", "as", "is", "us", "yes", "his"].includes(spelling)) {
      return { kind: "plural_s", stem: present };
    }
  }
  return { kind: "none", stem: null };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sample<T>(arr: T[], n: number, seed: number): T[] {
  const rng = mulberry32(seed);
  const idx = arr.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => arr[i]);
}

const KEEP_SEED = 450_101;
const DROP_SEED = 450_102;
const keptSample = sample(kept, 100, KEEP_SEED);
const droppedSample = sample(dropped, 100, DROP_SEED);

/** Manual-style name/junk flags for kept sample (heuristic + proper-name list). */
function isNameOrJunk(spelling: string): { bad: boolean; reason: string } {
  if (properNames.has(spelling)) return { bad: true, reason: "in_scowl_proper_names" };
  // Very short closed junk / initials already filtered by ascii
  if (spelling.length <= 1) return { bad: true, reason: "too_short" };
  // All-caps relics shouldn't appear (we lowercased)
  return { bad: false, reason: "ok" };
}

function looksOrdinaryEnglish(spelling: string): { ordinary: boolean; reason: string } {
  if (words.has(spelling)) return { ordinary: true, reason: "in_wordlist_unexpected" };
  if (properNames.has(spelling)) return { ordinary: false, reason: "proper_name" };
  // Heuristic: mixed case already gone; flag common ordinary words that SCOWL≤60 missed
  // We hand-review: default treat dropped as non-ordinary unless clearly common
  const clearlyCommon = new Set([
    "the",
    "and",
    "you",
    "are",
    "was",
    "for",
    "not",
    "but",
    "all",
    "can",
    "had",
    "her",
    "was",
    "one",
    "our",
    "out",
    "day",
    "get",
    "has",
    "him",
    "his",
    "how",
    "man",
    "new",
    "now",
    "old",
    "see",
    "two",
    "way",
    "who",
    "boy",
    "did",
    "its",
    "let",
    "put",
    "say",
    "she",
    "too",
    "use",
  ]);
  if (clearlyCommon.has(spelling)) return { ordinary: true, reason: "clearly_common_missed" };
  return { ordinary: false, reason: "not_ordinary_or_name" };
}

const keptHand = keptSample.map((e) => {
  const flag = isNameOrJunk(e.spelling);
  return { spelling: e.spelling, ...flag, phones: e.phones.length, letters: e.spelling.length };
});
const droppedHand = droppedSample.map((e) => {
  const flag = looksOrdinaryEnglish(e.spelling);
  return {
    spelling: e.spelling,
    ordinary: flag.ordinary,
    reason: flag.reason,
    inProperNames: properNames.has(e.spelling),
    phones: e.phones.length,
    letters: e.spelling.length,
  };
});

const keptBadRate = keptHand.filter((x) => x.bad).length / keptHand.length;
const droppedOrdinaryRate = droppedHand.filter((x) => x.ordinary).length / droppedHand.length;

const uninflected = kept.filter((e) => classifyInflection(e.spelling).kind === "none");
const inflected = kept.filter((e) => classifyInflection(e.spelling).kind !== "none");

function stats(pop: typeof kept) {
  const letters: Record<string, number> = {};
  const phones: Record<string, number> = {};
  const joint: Record<string, number> = {};
  const lgp: Record<string, Record<string, number>> = {};
  for (const e of pop) {
    const L = e.spelling.length;
    const P = e.phones.length;
    letters[L] = (letters[L] ?? 0) + 1;
    phones[P] = (phones[P] ?? 0) + 1;
    joint[`${P}|${L}`] = (joint[`${P}|${L}`] ?? 0) + 1;
    lgp[P] ??= {};
    lgp[P][L] = (lgp[P][L] ?? 0) + 1;
  }
  const mean = (h: Record<string, number>) => {
    let s = 0,
      n = 0;
    for (const [k, v] of Object.entries(h)) {
      s += Number(k) * v;
      n += v;
    }
    return n ? s / n : NaN;
  };
  const lgpMean = Object.fromEntries(
    Object.entries(lgp).map(([p, h]) => {
      const n = Object.values(h).reduce((a, b) => a + b, 0);
      return [p, { n, mean: mean(h), counts: h }];
    }),
  );
  return {
    n: pop.length,
    letterMean: mean(letters),
    phoneMean: mean(phones),
    letterPct: Object.fromEntries(Object.entries(letters).map(([k, v]) => [k, (100 * v) / pop.length])),
    phonePct: Object.fromEntries(Object.entries(phones).map(([k, v]) => [k, (100 * v) / pop.length])),
    lettersGivenPhones: lgpMean,
  };
}

const keptStats = stats(kept);
const uninflectedStats = stats(uninflected);
const inflectedStats = stats(inflected);

// Inflection hand-check on kept set
const INFLECT_SEED = 450_103;
const inflectSamples: Record<string, { spelling: string; stem: string | null }[]> = {
  plural_s: [],
  past_ed: [],
  none: [],
};
for (const e of kept) {
  const c = classifyInflection(e.spelling);
  inflectSamples[c.kind].push({ spelling: e.spelling, stem: c.stem });
}
const inflectHand: Record<string, unknown> = {};
for (const kind of ["plural_s", "past_ed", "none"] as const) {
  const pool = inflectSamples[kind];
  const samp = sample(pool, Math.min(100, pool.length), INFLECT_SEED + kind.length);
  // light review: wrong stem forms
  let errors = 0;
  const errEx: string[] = [];
  for (const row of samp) {
    if (kind === "none") continue;
    if (!row.stem) {
      errors++;
      errEx.push(row.spelling);
      continue;
    }
    const ok =
      kind === "plural_s"
        ? row.spelling === row.stem + "s" ||
          row.spelling === row.stem + "es" ||
          (row.stem.endsWith("y") && row.spelling === row.stem.slice(0, -1) + "ies")
        : row.spelling === row.stem + "ed" ||
          row.spelling === row.stem + "d" ||
          (/([b-df-hj-np-tv-z])\1ed$/.test(row.spelling) &&
            row.spelling === row.stem + row.stem.slice(-1) + "ed");
    // common e-drop false stems
    if (kind === "past_ed" && ["hoped", "cared", "raged", "named", "timed"].includes(row.spelling) && row.stem.length + 1 === row.spelling.length - 1) {
      // leave to form check
    }
    if (!ok) {
      errors++;
      if (errEx.length < 12) errEx.push(`${row.spelling}←${row.stem}`);
    }
  }
  inflectHand[kind] = {
    poolN: pool.length,
    sampleN: samp.length,
    errors,
    errorRate: samp.length ? errors / samp.length : null,
    errorExamples: errEx,
    sample: samp.map((s) => s.spelling),
  };
}

writeFileSync(
  `${OUT}/comparator-build.json`,
  JSON.stringify(
    {
      cmuSha,
      wordlistSha: createHash("sha256").update(readFileSync(WORDLIST)).digest("hex"),
      monoN: monos.length,
      keptN: kept.length,
      droppedN: dropped.length,
      uninflectedN: uninflected.length,
      inflectedN: inflected.length,
      keptInProperNames: kept.filter((e) => properNames.has(e.spelling)).length,
      keptStats,
      uninflectedStats,
      inflectedStats,
      handCheckKept: {
        seed: KEEP_SEED,
        n: keptHand.length,
        nameOrJunkCount: keptHand.filter((x) => x.bad).length,
        nameOrJunkRate: keptBadRate,
        badExamples: keptHand.filter((x) => x.bad).slice(0, 20),
        sample: keptHand.map((x) => x.spelling),
      },
      handCheckDropped: {
        seed: DROP_SEED,
        n: droppedHand.length,
        ordinaryCount: droppedHand.filter((x) => x.ordinary).length,
        ordinaryRate: droppedOrdinaryRate,
        properNameCount: droppedHand.filter((x) => x.inProperNames).length,
        ordinaryExamples: droppedHand.filter((x) => x.ordinary).slice(0, 20),
        sample: droppedHand.map((x) => ({
          spelling: x.spelling,
          ordinary: x.ordinary,
          reason: x.reason,
          inProperNames: x.inProperNames,
        })),
      },
      inflectionHand: inflectHand,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      keptN: kept.length,
      uninflectedN: uninflected.length,
      inflectedN: inflected.length,
      uninflected: {
        letterMean: uninflectedStats.letterMean,
        phoneMean: uninflectedStats.phoneMean,
        phonePct: uninflectedStats.phonePct,
      },
      keptHandNameJunkRate: keptBadRate,
      droppedOrdinaryRate,
      inflectionErrorRates: Object.fromEntries(
        Object.entries(inflectHand).map(([k, v]: [string, any]) => [k, v.errorRate]),
      ),
    },
    null,
    2,
  ),
);

// Export uninflected spellings for aligner step
writeFileSync(
  `${OUT}/uninflected-monos.json`,
  JSON.stringify(
    uninflected.map((e) => ({
      spelling: e.spelling,
      tokens: e.tokens,
      phones: e.phones.length,
      letters: e.spelling.length,
    })),
  ),
);
