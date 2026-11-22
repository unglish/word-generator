// Probe for #497. Usage: node --import tsx probe.mjs <generator-root> <harness-root> <cmudict> [start] [count]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const [genRoot, harnessRoot, cmuPath, startArg, countArg] = process.argv.slice(2);
const START = Number(startArg ?? 3000000), COUNT = Number(countArg ?? 20000);
const { generateWord } = await import(pathToFileURL(join(genRoot, "src/index.ts")));
const { buildReference, syllabify } = await import(pathToFileURL(join(harnessRoot, "evaluation/review/wordlikeness/model.ts")));
const { scoreSpelling } = await import(pathToFileURL(join(harnessRoot, "evaluation/review/wordlikeness/score.ts")));
const { parseCmuRecords, selectCompatibleCmu } = await import(pathToFileURL(join(harnessRoot, "evaluation/corpus/cmu.ts")));

const IPA = { rhotic: new Set(["ɚ", "ɝ"]), tense: new Set(["i:", "eɪ", "aɪ", "əʊ", "u", "aʊ", "ɔɪ"]), lax: new Set(["ə", "ʌ"]), r: "r", l: "l", m: "m", n: "n" };
const ARPA = { rhotic: new Set(["ER"]), tense: new Set(["IY", "EY", "AY", "OW", "UW", "AW", "OY"]), lax: new Set(["AH"]), r: "R", l: "L", m: "M", n: "N" };
const IPA_NAME = { "i:": "IY", "eɪ": "EY", "aɪ": "AY", "əʊ": "OW", u: "UW", "aʊ": "AW", "ɔɪ": "OY", "ə": "AH", "ʌ": "AH" };

/** syllables: {onset: string[], nucleus: string[], coda: string[]}[] */
function patterns(syls, S) {
  const out = new Set();
  syls.forEach((s, i) => {
    const nuc = s.nucleus.at(-1), final = i === syls.length - 1;
    const onsetR = s.onset.at(-1) === S.r;
    if (onsetR && S.rhotic.has(nuc)) { out.add("A"); out.add("A:rER"); out.add(final ? "A:final" : "A:internal"); }
    if (onsetR && s.coda[0] === S.r) { out.add("A"); out.add("A:rVr"); out.add(final ? "A:final" : "A:internal"); }
    if (S.tense.has(nuc) && s.coda[0] === S.r) { out.add("B"); out.add(`B:${IPA_NAME[nuc] ?? nuc}`); }
    if (S.lax.has(nuc) && s.coda[0] === S.r) out.add("C");
    if (final && S.rhotic.has(nuc) && s.coda[0] === S.l) out.add("D");
    if (final && S.rhotic.has(nuc) && s.coda[0] === S.m) out.add("D:ERm");
    if (final && S.rhotic.has(nuc) && s.coda[0] === S.n && s.coda.length > 1) out.add("D:ERnC");
    if (final && S.rhotic.has(nuc) && s.coda[0] === S.n) out.add("D:ERn");
  });
  return out;
}

// ---- CMU reference ----
const cmuText = readFileSync(cmuPath, "utf8");
const model = buildReference(cmuText, "pinned");
const initialOnsets = new Set(model.initial_onsets);
const { entries } = selectCompatibleCmu(parseCmuRecords(cmuText));
const cmuBySyl = new Map(); // k -> {n, counts}
let cmuPhones = 0, cmuR = 0, cmuER = 0;
for (const entry of entries) {
  const syls = syllabify(entry.tokens, initialOnsets);
  const k = Math.min(syls.length, 6);
  const bucket = cmuBySyl.get(k) ?? { n: 0, counts: {} };
  bucket.n++;
  for (const p of patterns(syls, ARPA)) bucket.counts[p] = (bucket.counts[p] ?? 0) + 1;
  cmuBySyl.set(k, bucket);
  for (const t of entry.tokens) { cmuPhones++; if (t === "R") cmuR++; if (t.startsWith("ER")) cmuER++; }
}

// ---- generated ----
const genBySyl = new Map();
const counts = {}, examples = {}, sources = {};
let phones = 0, rs = 0, rhotics = 0, letters = 0, attempts = 0, attemptN = 0;
const scores = [], flags = [];
const t0 = performance.now();
for (let seed = START; seed < START + COUNT; seed++) {
  const word = generateWord({ mode: "lexicon", seed, trace: true });
  const syls = word.syllables.map(s => ({ onset: s.onset.map(p => p.sound), nucleus: s.nucleus.map(p => p.sound), coda: s.coda.map(p => p.sound) }));
  const k = Math.min(syls.length, 6);
  genBySyl.set(k, (genBySyl.get(k) ?? 0) + 1);
  const found = patterns(syls, IPA);
  for (const p of found) {
    counts[p] = (counts[p] ?? 0) + 1;
    (examples[p] ??= []).length < 6 && examples[p].push(`${seed} ${word.written.clean} /${word.pronunciation}/`);
  }
  if (found.has("A")) {
    // Attribute: first trace stage whose output has the pattern in the root.
    const stage = word.trace.stages.find(st => patterns(st.after, IPA).has("A"));
    const name = stage?.name ?? "morphology-join";
    sources[name] = (sources[name] ?? 0) + 1;
  }
  for (const s of word.syllables) for (const p of [...s.onset, ...s.nucleus, ...s.coda]) { phones++; if (p.sound === "r") rs++; if (IPA.rhotic.has(p.sound)) rhotics++; }
  letters += word.written.clean.length;
  if (word.trace.selection) { attempts += word.trace.selection.attemptsExecuted; attemptN++; }
  scores.push(scoreSpelling(word.written.clean, model).normalized);
  flags.push(found);
}
const elapsed = performance.now() - t0;

// CMU expected count stratified by syllable count
const expected = {};
for (const [k, n] of genBySyl) {
  const b = cmuBySyl.get(k);
  for (const [p, c] of Object.entries(b.counts)) expected[p] = (expected[p] ?? 0) + n * c / b.n;
}
const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length);
const cutoff = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 10)];
const byPattern = {};
for (const p of ["A", "B", "C", "D"]) {
  const idx = flags.map((f, i) => f.has(p) ? i : -1).filter(i => i >= 0);
  if (!idx.length) { byPattern[p] = null; continue; }
  const m = idx.reduce((a, i) => a + scores[i], 0) / idx.length;
  byPattern[p] = { z: +((m - mean) / sd).toFixed(3), bottomDecileShare: +(idx.filter(i => scores[i] < cutoff).length / (scores.length / 10)).toFixed(4) };
}
const keys = [...new Set([...Object.keys(counts), ...Object.keys(expected)])].sort();
const table = Object.fromEntries(keys.map(p => [p, { gen: counts[p] ?? 0, cmuExpected: +(expected[p] ?? 0).toFixed(1), ratio: expected[p] ? +((counts[p] ?? 0) / expected[p]).toFixed(2) : null }]));
console.log(JSON.stringify({
  root: genRoot, seeds: [START, START + COUNT - 1], table, sourcesA: sources,
  scorer: { mean: +mean.toFixed(4), sd: +sd.toFixed(4), byPattern },
  shares: { r: +(rs / phones).toFixed(5), cmuR: +(cmuR / cmuPhones).toFixed(5), rhotic: +(rhotics / phones).toFixed(5), cmuER: +(cmuER / cmuPhones).toFixed(5) },
  syllables: Object.fromEntries([...genBySyl].sort()), meanLetters: +(letters / COUNT).toFixed(3), meanAttempts: +(attempts / attemptN).toFixed(3),
  msPerWord: +(elapsed / COUNT).toFixed(3), examples,
}, null, 1));
