/**
 * Temporary measurement probe for #454 (aue respell vs trace). Not for main:
 * it lives on the measurement branch and is archived in `archive/pr-<n>`.
 *
 *   node --import tsx scripts/probes/issue-454.ts seeds
 *   node --import tsx scripts/probes/issue-454.ts stream --mode lexicon --seed 42 --count 50000
 *   node --import tsx scripts/probes/issue-454.ts golden --chunk 0
 *   node --import tsx scripts/probes/issue-454.ts quality-summary <comparison.json>
 *
 * Every subcommand ends with one compact JSON line (cloud runs return only the
 * last ~1.2 KB of output). Full results go to the OS temp directory.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { generateWord, generateWords } from "../../src/index.js";
import type { Word } from "../../src/types.js";
import { isVowelChar } from "../../src/utils/letters.js";
import { captureGoldenOutput, serializeGoldenOutput } from "../../src/test-support/golden-output.js";

type Counts = Record<string, number>;

const bump = (counts: Counts, key: string, by = 1) => { counts[key] = (counts[key] ?? 0) + by; };
const top = (counts: Counts, n: number) =>
  Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n));

function maxVowelRun(surface: string): number {
  let run = 0;
  let max = 0;
  for (let i = 0; i < surface.length; i++) {
    run = isVowelChar(surface[i], i, surface) ? run + 1 : 0;
    max = Math.max(max, run);
  }
  return max;
}

interface Tally {
  words: number;
  aueSel: number;
  aueSurf: number;
  aueRespelled: number;
  aueAfter: Counts;
  respellWords: { aue: number; other: number };
  divergent: { aue: number; other: number };
  coll: Counts;
  otherPairs: Counts;
  finalS: { eligible: number; divergent: number; seeds: number[] };
  budget: Counts;
  vowelInfeasible: number;
  v3: number;
  ah: Counts;
  joinErr: number;
  untraced: number;
  marked: number;
}

function newTally(): Tally {
  return {
    words: 0, aueSel: 0, aueSurf: 0, aueRespelled: 0, aueAfter: {},
    respellWords: { aue: 0, other: 0 }, divergent: { aue: 0, other: 0 },
    coll: {}, otherPairs: {}, finalS: { eligible: 0, divergent: 0, seeds: [] },
    budget: {}, vowelInfeasible: 0, v3: 0, ah: {}, joinErr: 0, untraced: 0, marked: 0,
  };
}

function observe(t: Tally, word: Word, seed?: number): void {
  const trace = word.trace!;
  const selections = trace.graphemeSelections;
  const clean = word.written.clean;
  t.words++;
  if (clean.includes("aue")) t.aueSurf++;
  if (maxVowelRun(clean) >= 3) t.v3++;

  for (const outcome of trace.spellingBudgets ?? []) {
    bump(t.budget, outcome.status === "infeasible" ? `inf:${outcome.reason}` : outcome.status);
    if (outcome.status === "infeasible" && outcome.before.exceeded.includes("vowelLetters")) t.vowelInfeasible++;
  }

  const base = trace.baseSpelling;
  // Final form per selection index, after any certificate replacement.
  const replacedBy = new Map<number, string>();
  for (const certificate of base?.certificates ?? []) {
    for (const replacement of certificate.replacements) {
      const unit = base!.units[replacement.unitId];
      const selection = unit && [...selections].reverse().find(s => s.index === unit.choiceId);
      if (!unit || !selection || selection.selected !== unit.selected) { t.joinErr++; continue; }
      replacedBy.set(selection.index, replacement.after);
    }
  }

  const aueIndexes = new Set(selections.filter(s => s.selected === "aue").map(s => s.index));
  t.aueSel += aueIndexes.size;
  const aueWord = aueIndexes.size > 0;
  if ((base?.certificates?.length ?? 0) > 0) t.respellWords[aueWord ? "aue" : "other"]++;

  // `respelled` (added by the trace fix) must match the certificate exactly; absent on main.
  for (const selection of selections) {
    const respelled = (selection as { respelled?: { form: string } }).respelled;
    if (respelled) t.marked++;
    if (respelled?.form !== replacedBy.get(selection.index)) t.untraced++;
  }

  for (const [index, after] of replacedBy) {
    const selection = [...selections].reverse().find(s => s.index === index)!;
    t.divergent[aueWord ? "aue" : "other"]++;
    const pair = `${selection.selected}>${after}`;
    if (aueIndexes.has(index)) { t.aueRespelled++; bump(t.aueAfter, after); }
    else if (aueWord) bump(t.coll, pair);
    else bump(t.otherPairs, pair);
  }

  for (const selection of selections) {
    if (selection.phoneme !== "ɑ") continue;
    bump(t.ah, replacedBy.get(selection.index) ?? selection.emitted);
  }

  const last = selections.at(-1);
  if (last?.phoneme === "s" && last.position === "coda" && (last.selected === "ce" || last.selected === "se")) {
    t.finalS.eligible++;
    if (replacedBy.has(last.index)) {
      t.finalS.divergent++;
      if (seed !== undefined && t.finalS.seeds.length < 6) t.finalS.seeds.push(seed);
    }
  }
}

function compact(t: Tally) {
  const ahTotal = Object.values(t.ah).reduce((a, b) => a + b, 0) || 1;
  const ah = Object.fromEntries(Object.entries(top(t.ah, 6)).map(([k, v]) => [k, +(v / ahTotal).toFixed(4)]));
  return {
    words: t.words, aueSel: t.aueSel, aueSurf: t.aueSurf, aueRespelled: t.aueRespelled,
    aueAfter: top(t.aueAfter, 3), respellWords: t.respellWords, divergent: t.divergent,
    coll: top(t.coll, 5), other: top(t.otherPairs, 4), finalS: t.finalS,
    budget: top(t.budget, 6), vInf: t.vowelInfeasible, v3: t.v3, ah, joinErr: t.joinErr, untraced: t.untraced, marked: t.marked,
  };
}

function emit(name: string, t: Tally): void {
  const full = { ...t, head: process.env.GIT_COMMIT ?? null };
  const path = join(tmpdir(), `issue-454-${name}.json`);
  writeFileSync(path, `${JSON.stringify(full, null, 2)}\n`);
  console.log(`full: ${path}`);
  console.log(JSON.stringify({ cohort: name, ...compact(t) }));
}

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const value = i >= 0 ? process.argv[i + 1] : fallback;
  if (value === undefined) throw new Error(`Missing --${name}`);
  return value;
}

const command = process.argv[2];
if (command === "seeds") {
  const t = newTally();
  for (let seed = 0; seed < 40000; seed++) {
    observe(t, generateWord({ seed, morphology: false, trace: true }), seed);
  }
  // Seeds named in #454.
  const named = [5072, 12373, 13023, 21418].map(seed => {
    const word = generateWord({ seed, morphology: false, trace: true });
    return `${seed}:${word.trace!.graphemeSelections.map(s => s.selected).join("·")}=${word.written.clean}`;
  });
  emit("seeds", t);
  console.log(JSON.stringify({ named }));
} else if (command === "stream") {
  const mode = arg("mode") as "lexicon" | "text";
  const seed = Number(arg("seed"));
  const count = Number(arg("count"));
  const t = newTally();
  for (const word of generateWords(count, { seed, mode, trace: true })) observe(t, word);
  emit(`${mode}-${seed}`, t);
} else if (command === "golden") {
  const chunk = Number(arg("chunk"));
  const size = 900;
  const text = serializeGoldenOutput(captureGoldenOutput());
  const sha256 = createHash("sha256").update(text).digest("hex");
  const data = gzipSync(Buffer.from(text), { level: 9 }).toString("base64");
  const chunks = Math.ceil(data.length / size);
  console.log(JSON.stringify({ sha256, bytes: text.length, b64: data.length, chunks, k: chunk, data: data.slice(chunk * size, (chunk + 1) * size) }));
} else if (command === "quality-summary") {
  const report = JSON.parse(readFileSync(process.argv[3], "utf8"));
  const r = (x: number | null | undefined, d = 4) => (x == null ? null : +x.toFixed(d));
  const lines = report.profiles.map((p: any) => ({
    id: p.id,
    mL: r(p.meanLetters.delta),
    uniq: r(p.uniqueSpellings.delta, 0),
    uniqB: p.uniqueSpellings.baseline,
    phJS: r(p.distributions.phonemes.jensenShannonBits?.delta, 5),
    triJS: r(p.distributions.trigrams.jensenShannonBits?.delta, 5),
    moved: p.metrics
      .filter((m: any) => m.deltaPercentagePoints != null)
      .sort((a: any, b: any) => Math.abs(b.deltaPercentagePoints) - Math.abs(a.deltaPercentagePoints))
      .slice(0, 4)
      .map((m: any) => `${m.id}:${r(m.deltaPercentagePoints, 3)}`),
  }));
  console.log(JSON.stringify(report.generatorProvenance?.map((g: any) => `${g.role}:${String(g.commit).slice(0, 8)}${g.dirty ? "*" : ""}`)));
  for (const line of lines) console.log(JSON.stringify(line));
} else {
  throw new Error("Use seeds, stream, golden or quality-summary.");
}
