/**
 * Issue #450 diagnosis — generation probes (local; not for main).
 * Public API only: createGenerator / generateWord via shared RNG stream.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import {
  createGenerator,
  englishConfig,
  createSeededRng,
} from "../../src/index.js";
import type { LanguageConfig, Word } from "../../src/types.js";

const OUT_DIR = process.env.OUT_DIR ?? "/tmp/issue-450-diagnosis/packets";
mkdirSync(OUT_DIR, { recursive: true });

const SEEDS = [42, 43, 44] as const;
const COUNT_PER_SEED = Number(process.env.COUNT_PER_SEED ?? 200_000);
const TRACE_SAMPLE = Number(process.env.TRACE_SAMPLE ?? 5_000);

type Hist = Record<string, number>;
const add = (h: Hist, k: string | number, n = 1) => {
  const key = String(k);
  h[key] = (h[key] ?? 0) + n;
};

function phoneCount(word: Word): number {
  let n = 0;
  for (const s of word.syllables) n += s.onset.length + s.nucleus.length + s.coda.length;
  return n;
}

function letterCount(word: Word): number {
  return word.written.clean.length;
}

function pct(h: Hist, n: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(h)) out[k] = n ? (100 * v) / n : 0;
  return out;
}

function mean(h: Hist): number {
  let sum = 0;
  let n = 0;
  for (const [k, v] of Object.entries(h)) {
    sum += Number(k) * v;
    n += v;
  }
  return n ? sum / n : NaN;
}

function emptyAgg() {
  return {
    drawn: 0,
    kept: 0,
    letters: {} as Hist,
    phones: {} as Hist,
    joint: {} as Hist,
    lettersGivenPhones: {} as Record<string, Hist>,
    onsetLen: {} as Hist,
    nucleusLen: {} as Hist,
    codaLen: {} as Hist,
    shapes: {} as Hist,
  };
}

type Agg = ReturnType<typeof emptyAgg>;

function observeStructure(agg: Agg, word: Word) {
  for (const s of word.syllables) {
    add(agg.onsetLen, s.onset.length);
    add(agg.nucleusLen, s.nucleus.length);
    add(agg.codaLen, s.coda.length);
    add(agg.shapes, `${s.onset.length}-${s.nucleus.length}-${s.coda.length}`);
  }
}

function observe(agg: Agg, word: Word) {
  agg.kept++;
  const L = letterCount(word);
  const P = phoneCount(word);
  add(agg.letters, L);
  add(agg.phones, P);
  add(agg.joint, `${P}|${L}`);
  agg.lettersGivenPhones[P] ??= {};
  add(agg.lettersGivenPhones[P], L);
  observeStructure(agg, word);
}

function summarize(agg: Agg, seed: number) {
  const lettersGivenPhones = Object.fromEntries(
    Object.entries(agg.lettersGivenPhones).map(([p, h]) => {
      const n = Object.values(h).reduce((a, b) => a + b, 0);
      return [p, { n, counts: h, pct: pct(h, n) }];
    }),
  );
  return {
    seed,
    drawn: agg.drawn,
    kept: agg.kept,
    letterPct: pct(agg.letters, agg.kept),
    phonePct: pct(agg.phones, agg.kept),
    letterMean: mean(agg.letters),
    phoneMean: mean(agg.phones),
    letters: agg.letters,
    phones: agg.phones,
    joint: agg.joint,
    lettersGivenPhones,
    onsetLenPct: pct(agg.onsetLen, Object.values(agg.onsetLen).reduce((a, b) => a + b, 0)),
    codaLenPct: pct(agg.codaLen, Object.values(agg.codaLen).reduce((a, b) => a + b, 0)),
    shapes: agg.shapes,
  };
}

function poolSummaries(perSeed: ReturnType<typeof summarize>[]) {
  const pooled = emptyAgg();
  for (const s of perSeed) {
    pooled.drawn += s.drawn;
    pooled.kept += s.kept;
    for (const [k, v] of Object.entries(s.letters)) add(pooled.letters, k, v);
    for (const [k, v] of Object.entries(s.phones)) add(pooled.phones, k, v);
    for (const [k, v] of Object.entries(s.joint)) add(pooled.joint, k, v);
    for (const [p, info] of Object.entries(s.lettersGivenPhones)) {
      pooled.lettersGivenPhones[p] ??= {};
      for (const [L, c] of Object.entries(info.counts)) add(pooled.lettersGivenPhones[p], L, c);
    }
  }
  return { perSeed, pooled: summarize(pooled, -1) };
}

function ungatedConfig(): LanguageConfig {
  return {
    ...englishConfig,
    syllableStructure: {
      ...englishConfig.syllableStructure,
      letterLengthTargets: undefined,
    },
  };
}

type Condition = {
  id: string;
  generator: ReturnType<typeof createGenerator>;
  morphology: boolean;
  keepSyllables: number;
};

function runCondition(cond: Condition) {
  const perSeed = [];
  for (const seed of SEEDS) {
    const agg = emptyAgg();
    const rand = createSeededRng(seed);
    for (let i = 0; i < COUNT_PER_SEED; i++) {
      const word = cond.generator.generateWord({
        rand,
        mode: "lexicon",
        morphology: cond.morphology,
      });
      agg.drawn++;
      if (word.syllables.length === cond.keepSyllables) observe(agg, word);
    }
    perSeed.push(summarize(agg, seed));
    console.error(
      `[${cond.id}] seed=${seed} kept=${agg.kept}/${agg.drawn} letterMean=${mean(agg.letters).toFixed(3)}`,
    );
  }
  return { id: cond.id, morphology: cond.morphology, keepSyllables: cond.keepSyllables, countPerSeed: COUNT_PER_SEED, ...poolSummaries(perSeed) };
}

/** Trace sample for multi-letter grapheme shares (Q4). */
function runTraceSample(cond: Condition, seed: number, n: number) {
  const rand = createSeededRng(seed);
  let kept = 0;
  let phonesObserved = 0;
  let multiLetterUnits = 0;
  let singleLetterUnits = 0;
  const byPosition: Record<string, { phones: number; letters: number; multi: number }> = {
    onset: { phones: 0, letters: 0, multi: 0 },
    nucleus: { phones: 0, letters: 0, multi: 0 },
    coda: { phones: 0, letters: 0, multi: 0 },
  };
  const graphemeLen: Hist = {};
  while (kept < n) {
    const word = cond.generator.generateWord({
      rand,
      mode: "lexicon",
      morphology: cond.morphology,
      trace: true,
    });
    if (word.syllables.length !== cond.keepSyllables) continue;
    kept++;
    const selections = word.trace?.graphemeSelections ?? [];
    for (const g of selections) {
      const form = g.emitted || g.selected || "";
      const len = form.length;
      if (!len) continue;
      phonesObserved++;
      add(graphemeLen, len);
      if (len > 1) multiLetterUnits++;
      else singleLetterUnits++;
      const bucket =
        g.position === "onset" || g.position === "nucleus" || g.position === "coda"
          ? g.position
          : null;
      if (bucket) {
        byPosition[bucket].phones++;
        byPosition[bucket].letters += len;
        if (len > 1) byPosition[bucket].multi++;
      }
    }
  }
  return {
    condition: cond.id,
    seed,
    n: kept,
    phonesObserved,
    multiLetterShare: phonesObserved ? multiLetterUnits / phonesObserved : null,
    singleLetterShare: phonesObserved ? singleLetterUnits / phonesObserved : null,
    graphemeLenPct: pct(graphemeLen, Object.values(graphemeLen).reduce((a, b) => a + b, 0)),
    byPosition,
    note: "Uses trace.graphemeSelections; positions filled when segment metadata present.",
  };
}

const gated = createGenerator(englishConfig);
const ungated = createGenerator(ungatedConfig());

const conditions: Condition[] = [
  { id: "bare-gated-mono", generator: gated, morphology: false, keepSyllables: 1 },
  { id: "morph-stay-mono", generator: gated, morphology: true, keepSyllables: 1 },
  { id: "bare-ungated-mono", generator: ungated, morphology: false, keepSyllables: 1 },
  { id: "bare-gated-di", generator: gated, morphology: false, keepSyllables: 2 },
  { id: "bare-ungated-di", generator: ungated, morphology: false, keepSyllables: 2 },
];

const only = process.env.ONLY?.split(",").filter(Boolean);
const selected = only ? conditions.filter((c) => only.includes(c.id)) : conditions;

const results: Record<string, unknown> = {
  meta: {
    seeds: SEEDS,
    countPerSeed: COUNT_PER_SEED,
    mainHead: "origin/main",
    api: "createGenerator + generateWord({rand, mode:'lexicon', morphology})",
  },
  conditions: {} as Record<string, unknown>,
};

for (const cond of selected) {
  const t0 = Date.now();
  results.conditions[cond.id] = runCondition(cond);
  console.error(`finished ${cond.id} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

writeFileSync(`${OUT_DIR}/gen-probe.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ wrote: `${OUT_DIR}/gen-probe.json`, conditions: Object.keys(results.conditions as object) }, null, 2));

// Optional trace pass for primary bare gated mono
if (!only || only.includes("bare-gated-mono")) {
  const trace = runTraceSample(
    { id: "bare-gated-mono", generator: gated, morphology: false, keepSyllables: 1 },
    42,
    TRACE_SAMPLE,
  );
  writeFileSync(`${OUT_DIR}/trace-graphemes.json`, JSON.stringify(trace, null, 2));
  console.error("trace sample", trace);
}
