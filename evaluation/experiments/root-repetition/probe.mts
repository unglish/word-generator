import fs from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = process.cwd();
const load = (path: string) => import(resolve(root, path));
const read = (path: string) => JSON.parse(fs.readFileSync(path, "utf8"));
const { generateWord, createGenerator, englishConfig } = await load("src/index.ts");
const { syllabify } = await load("evaluation/review/wordlikeness/model.ts");
const { scoreSpelling } = await load("evaluation/review/wordlikeness/score.ts");
const { computePhonemeQualityMetrics } = await load("src/core/phoneme-quality.ts");
const { distributionDistance } = await load("evaluation/quality/distribution.ts");
const normalization = read("data/cmu/phoneme-normalization.json");
const reference = read("evaluation/review/wordlikeness/artifacts/reference-v1.json").model;
const initialOnsets = new Set(reference.initial_onsets);
const corpus = read(process.env.ROOT_JSON ?? "/private/tmp/unglish-491/root.json");
assert.equal(corpus.digest, "2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467");
const count = Number(process.env.COUNT ?? 20000);
const startSeed = Number(process.env.START_SEED ?? 5000000);
const config = process.env.REPETITION_CONFIG ? JSON.parse(process.env.REPETITION_CONFIG) : undefined;
const generate = config ? createGenerator({ ...englishConfig, rootRepetition: config }).generateWord : generateWord;

type Shape = { onset: string[]; nucleus: string[]; coda: string[] };
type Counts = Record<string, number>;
type Sample = Record<string, Counts>;
const withCounts = (sample: Sample, length: number) => sample[length] ??= {};
const add = (counts: Counts, key: string, n = 1) => counts[key] = (counts[key] ?? 0) + n;
const aspirated = (sound: string) => sound.replace(/ʰ$/, "");
const phoneForDistance = (sound: string) => normalization.generatedAliases[sound] ?? sound;
function collect(syllables: Shape[], counts: Counts) {
  const events = new Set<string>();
  add(counts, "words");
  add(counts, "syllables", syllables.length);
  let previous = "";
  let run = 0;
  for (const { onset, nucleus, coda } of syllables) {
    const vowel = nucleus[0];
    if (vowel && vowel === previous) {
      run++;
      events.add("pair");
      if (run === 3) {
        events.add("triple");
        events.add("triple:" + vowel);
      }
    } else {
      run = 1;
    }
    previous = vowel;
    const finalOnset = onset.at(-1);
    if (finalOnset && finalOnset === coda[0]) {
      events.add("mirror");
      events.add("mirror:" + finalOnset);
      add(counts, "mirrorSyllables:" + finalOnset);
    }
    if (finalOnset === "r" && (["ɚ", "ɝ"].includes(vowel) || coda.includes("r"))) events.add("rhoticOnset");
    if (coda[0] === "r" && ["i:", "u", "eɪ", "əʊ", "aɪ", "aʊ", "ɔɪ"].includes(vowel)) events.add("tenseR");
    if (coda[0] === "r" && ["ə", "ʌ"].includes(vowel)) events.add("reducedR");
    if (["ɚ", "ɝ"].includes(vowel) && coda === syllables.at(-1)?.coda && coda[0] === "l") events.add("finalRhoticL");
  }
  for (const event of events) add(counts, event);
  return events;
}

const cmu: Sample = {};
const cmuPhones: Counts = {};
const cmuPhonesByLength: Sample = {};
const arpabetToIpa = (phone: string) => normalization.arpabetToIpa[phone];
for (const entry of corpus.artifact.roots) {
  const shape = syllabify(entry.tokens, initialOnsets).map(({onset, nucleus, coda}, index) => ({
    onset: onset.map(arpabetToIpa), coda: coda.map(arpabetToIpa),
    nucleus: [entry.tokens.filter((phone: string) => /[012]$/.test(phone))[index] === "AH0" ? "ə"
      : nucleus[0] === "AH" ? "ʌ" : nucleus[0] === "ER" ? "ɚ" : arpabetToIpa(nucleus[0])],
  }));
  collect(shape, withCounts(cmu, shape.length));
  for (const phone of shape.flatMap(s => [...s.onset, ...s.nucleus, ...s.coda])) {
    add(cmuPhones, phoneForDistance(phone));
    add(withCounts(cmuPhonesByLength, shape.length), phoneForDistance(phone));
  }
}

const generated: Sample = {};
const lexical: Sample = {};
const surface: Sample = {};
const bare: Sample = {};
const fullPhones: Counts = {};
const rootPhones: Counts = {};
const trigrams: Counts = {};
const stats: Counts = {};
const structure: Counts = {};
const attribution: Counts = {};
const examples: Record<string, unknown[]> = {};
const snapshot = (syllables: { onset: {sound: string}[]; nucleus: {sound: string}[]; coda: {sound: string}[] }[]): Shape[] =>
  syllables.map(({onset, nucleus, coda}) => ({
    onset: onset.map(p => aspirated(p.sound)), nucleus: nucleus.map(p => p.sound), coda: coda.map(p => aspirated(p.sound)),
  }));
for (let seed = startSeed; seed < startSeed + count; seed++) {
  const word = generate({ seed, trace: true, mode: process.env.MODE ?? "lexicon", ...(process.env.BARE === "1" ? { morphology: false } : {}) });
  const {trace, lexical: form} = word;
  const stage = (name: string) => trace.stages.find((s: {name: string}) => s.name === name);
  const initial = stage("generateSyllables").after;
  const base = snapshot(form.root);
  const final = snapshot(word.syllables.slice(form.rootSyllableStart, form.rootSyllableStart + base.length));
  const pre = collect(initial, withCounts(generated, initial.length));
  const mid = collect(base, withCounts(lexical, base.length));
  const post = collect(final, withCounts(surface, final.length));
  if (word.syllables.length === base.length && trace.morphology?.template === "bare") collect(final, withCounts(bare, final.length));
  for (const type of ["triple", "mirror"]) {
    add(attribution, type + ":" + [pre, mid, post].map(s => Number(s.has(type))).join(""));
    if (post.has(type)) {
      const key = type + ":" + (pre.has(type) ? "generation" : mid.has(type) ? "lexical" : "pronunciation");
      const witnesses = examples[key] ??= [];
      if (witnesses.length < 3) witnesses.push({
        seed, word: word.written.clean, pronunciation: word.pronunciation, initial, base, final,
        repairs: trace.repairs.filter((r: any) => r.nucleusReplacement),
        stress: stage("applyStress").after.map((s: any) => s.stress ?? null),
      });
    }
  }
  for (const phone of snapshot(word.syllables).flatMap(s => [...s.onset, ...s.nucleus, ...s.coda])) add(fullPhones, phoneForDistance(phone));
  for (const phone of final.flatMap(s => [...s.onset, ...s.nucleus, ...s.coda])) add(rootPhones, phoneForDistance(phone));
  const spelling = word.written.clean;
  for (let i = 0; i + 3 <= spelling.length; i++) add(trigrams, spelling.slice(i, i + 3));
  add(stats, "letters", spelling.length);
  add(stats, "phones", word.syllables.flatMap((s: any) => [...s.onset, ...s.nucleus, ...s.coda]).length);
  add(stats, "syllables", word.syllables.length);
  add(stats, "wordlikeness", scoreSpelling(spelling, reference).normalized);
  for (const event of trace.structural) add(structure, event.event);
}
const matchedRootPhones: Counts = {};
const cmuMatched: Counts = {};
const totals: Counts = {};
for (const [length, counts] of Object.entries(surface)) {
  const source = cmu[length];
  if (!source) continue;
  for (const [key, value] of Object.entries(source)) add(cmuMatched, key, value * counts.words / source.words);
  for (const [phone, value] of Object.entries(cmuPhonesByLength[length])) add(matchedRootPhones, phone, value * counts.words / source.words);
  for (const [key, value] of Object.entries(counts)) add(totals, key, value);
}
const distance = (generated: Counts, ref: Counts) => {
  const { totalVariationPct } = computePhonemeQualityMetrics(generated, ref, 0.5);
  return { ...distributionDistance(generated, ref), totalVariationPct };
};
console.log(JSON.stringify({
  count, startSeed, mode: process.env.MODE ?? "lexicon", config, corpusDigest: corpus.digest,
  cmu, cmuMatched, generated, lexical, surface, bare, totals, attribution, examples, structure,
  fullDistance: distance(fullPhones, read("data/cmu/cmu-lexicon-phonemes.json")),
  rootDistance: distance(rootPhones, matchedRootPhones),
  trigramDistance: distributionDistance(trigrams, read("data/cmu/cmu-lexicon-trigrams.json")),
  means: Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, value / count])),
}, null, 2));
