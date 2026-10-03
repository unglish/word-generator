import { createHash } from "node:crypto";
import { CONSONANTS, parseCmuPhone, VOWELS, type CmuPhone, type SelectedCmuEntry } from "./cmu.js";
import type { FrequencyEntry } from "./frequency-source.js";

export interface FrequencyObservation {
  spelling: string;
  count: number;
  phones: CmuPhone[];
  syllableCount: number;
}
export interface FrequencyCounts {
  version: "frequency-citation-counts-v1";
  weighting: "types" | "tokens";
  types: number;
  wordMass: number;
  phoneMass: number;
  phones: Record<string, number>;
  lengths: Record<number, number>;
  syllablesByLength: Record<number, Record<number, number>>;
}
export const FREQUENCY_PHONE_ALPHABET: readonly string[] = Object.freeze([...CONSONANTS,
  ...[...VOWELS].flatMap(base => [0, 1, 2].map(stress => `${base}${stress}`))].sort());

function addCount(table: Record<string, number>, key: string | number, count: number): void {
  const total = (table[key] ?? 0) + count;
  if (!Number.isSafeInteger(total)) throw new Error("Unsafe frequency count total.");
  table[key] = total;
}
function validateObservations(entries: readonly FrequencyObservation[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!/^[a-z]+$/.test(entry.spelling) || seen.has(entry.spelling)
      || !Number.isSafeInteger(entry.count) || entry.count <= 0 || !entry.phones.length) {
      throw new Error("Invalid or repeated frequency observation.");
    }
    seen.add(entry.spelling);
    for (const phone of entry.phones) {
      const parsed = parseCmuPhone(phone.raw);
      if (!parsed || parsed.kind !== phone.kind || parsed.base !== phone.base
        || (parsed.kind === "vowel" && (phone.kind !== "vowel" || parsed.stress !== phone.stress))) {
        throw new Error("Frequency observation must preserve canonical CMU phone identity.");
      }
    }
    const vowels = entry.phones.filter(phone => phone.kind === "vowel").length;
    if (!vowels || vowels !== entry.syllableCount) throw new Error("Citation syllable count must equal explicit CMU vowels.");
  }
}

export function frequencyObservations(joined: readonly { frequency: FrequencyEntry; pronunciation: SelectedCmuEntry }[]): FrequencyObservation[] {
  const result = joined.map(({ frequency, pronunciation }) => {
    if (frequency.spelling !== pronunciation.spelling) throw new Error("Frequency/pronunciation spelling mismatch.");
    return { spelling: frequency.spelling, count: frequency.count,
      phones: pronunciation.phones.map(phone => ({ ...phone })),
      syllableCount: pronunciation.phones.filter(phone => phone.kind === "vowel").length };
  });
  validateObservations(result);
  return result;
}

export function splitFrequencySpellings<T extends { spelling: string }>(entries: readonly T[], seed: string) {
  if (!seed) throw new Error("Frequency split requires an explicit seed.");
  const result: { training: T[]; development: T[]; heldOut: T[] } = {
    training: [], development: [], heldOut: [],
  };
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!/^[a-z]+$/.test(entry.spelling) || seen.has(entry.spelling)) throw new Error("Split requires unique normalized spellings.");
    seen.add(entry.spelling);
    const bucket = createHash("sha256").update(JSON.stringify([seed, entry.spelling])).digest().readUInt32BE() % 10000;
    if (bucket < 8000) result.training.push(entry);
    else if (bucket < 9000) result.development.push(entry);
    else result.heldOut.push(entry);
  }
  return result;
}

export function splitFrequencyObservations(entries: readonly FrequencyObservation[], seed: string) {
  validateObservations(entries);
  return splitFrequencySpellings(entries, seed);
}

export function fitFrequencyCounts(entries: readonly FrequencyObservation[], weighting: FrequencyCounts["weighting"]): FrequencyCounts {
  validateObservations(entries);
  if (!entries.length || (weighting !== "types" && weighting !== "tokens")) throw new Error("Frequency fit needs entries and a supported weighting.");
  const counts: FrequencyCounts = { version: "frequency-citation-counts-v1", weighting, types: entries.length,
    wordMass: 0, phoneMass: 0, phones: {}, lengths: {}, syllablesByLength: {} };
  const totals: Record<string, number> = {};
  for (const entry of entries) {
    const mass = weighting === "types" ? 1 : entry.count;
    const length = entry.phones.length;
    addCount(totals, "words", mass);
    addCount(totals, "phones", mass * length);
    addCount(counts.lengths, length, mass);
    const syllables = counts.syllablesByLength[length] ??= {};
    addCount(syllables, entry.syllableCount, mass);
    for (const phone of entry.phones) addCount(counts.phones, phone.raw, mass);
  }
  counts.wordMass = totals.words;
  counts.phoneMass = totals.phones;
  return counts;
}

function logAdd(a: number, b: number): number {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const maximum = Math.max(a, b);
  return maximum + Math.log1p(Math.exp(Math.min(a, b) - maximum));
}
function logSmoothed(count: number, total: number, alpha: number, logBase: number): number {
  return logAdd(count ? Math.log(count) : -Infinity, Math.log(alpha) + logBase) - Math.log(total + alpha);
}
function requireAlpha(alpha: number): void {
  if (!Number.isFinite(alpha) || alpha <= 0) throw new Error("Frequency smoothing must be finite and positive.");
}

export function validateFrequencyCounts(model: FrequencyCounts): void {
  const positiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;
  if (model.version !== "frequency-citation-counts-v1" || !["types", "tokens"].includes(model.weighting)
    || ![model.types, model.wordMass, model.phoneMass].every(positiveInteger)
    || model.types > model.wordMass || (model.weighting === "types" && model.types !== model.wordMass)) {
    throw new Error("Invalid frequency model identity or mass.");
  }
  const totals: Record<string, number> = {};
  for (const [phone, count] of Object.entries(model.phones)) {
    if (!FREQUENCY_PHONE_ALPHABET.includes(phone) || !positiveInteger(count)) throw new Error("Invalid frequency phone count.");
    addCount(totals, "phones", count);
    if (parseCmuPhone(phone)?.kind === "vowel") addCount(totals, "vowels", count);
  }
  for (const [key, count] of Object.entries(model.lengths)) {
    const length = Number(key);
    if (String(length) !== key || !positiveInteger(length) || !positiveInteger(count)) throw new Error("Invalid frequency length count.");
    addCount(totals, "words", count);
    addCount(totals, "lengthPhones", length * count);
    const row = model.syllablesByLength[length];
    if (!row) throw new Error("Missing frequency conditional syllable row.");
    const rowTotal: Record<string, number> = {};
    for (const [syllableKey, mass] of Object.entries(row)) {
      const syllables = Number(syllableKey);
      if (String(syllables) !== syllableKey || !positiveInteger(syllables) || syllables > length || !positiveInteger(mass)) {
        throw new Error("Invalid frequency conditional syllable count.");
      }
      addCount(rowTotal, "words", mass);
      addCount(totals, "syllableVowels", syllables * mass);
    }
    if (rowTotal.words !== count) throw new Error("Frequency conditional row mass differs from length count.");
  }
  if (Object.keys(model.syllablesByLength).some(key => !(key in model.lengths))
    || totals.words !== model.wordMass || totals.phones !== model.phoneMass || totals.lengthPhones !== model.phoneMass
    || totals.vowels !== totals.syllableVowels) {
    throw new Error("Frequency model counts do not reconcile.");
  }
}

export interface FrequencyWordScore {
  spelling: string;
  count: number;
  phoneCount: number;
  syllableCount: number;
  jointLengthSyllableNll: number;
  phoneNllSum: number;
  objective: number;
}
function scoreValidatedWord(model: FrequencyCounts, entry: FrequencyObservation, alpha: number): FrequencyWordScore {
  const length = entry.phones.length;
  const lengthCount = model.lengths[length] ?? 0;
  const logLength = logSmoothed(lengthCount, model.wordMass, alpha, -length * Math.LN2);
  const logSyllables = logSmoothed(model.syllablesByLength[length]?.[entry.syllableCount] ?? 0,
    lengthCount, alpha, -Math.log(length));
  const phoneNllSum = -entry.phones.reduce((total, phone) => total + logSmoothed(model.phones[phone.raw] ?? 0,
    model.phoneMass, alpha, -Math.log(FREQUENCY_PHONE_ALPHABET.length)), 0);
  const jointLengthSyllableNll = -logLength - logSyllables;
  return { spelling: entry.spelling, count: entry.count, phoneCount: length, syllableCount: entry.syllableCount,
    jointLengthSyllableNll, phoneNllSum, objective: jointLengthSyllableNll + phoneNllSum / length };
}
export function scoreFrequencyWord(model: FrequencyCounts, entry: FrequencyObservation, alpha: number): FrequencyWordScore {
  requireAlpha(alpha);
  validateFrequencyCounts(model);
  validateObservations([entry]);
  return scoreValidatedWord(model, entry, alpha);
}

export function scoreFrequencyPopulation(model: FrequencyCounts, entries: readonly FrequencyObservation[], alpha: number) {
  requireAlpha(alpha);
  validateFrequencyCounts(model);
  validateObservations(entries);
  if (!entries.length) throw new Error("Frequency evaluation population must be nonempty.");
  const words = entries.map(entry => scoreValidatedWord(model, entry, alpha));
  const counts: Record<string, number> = {};
  let objectiveSum = 0;
  let jointNllSum = 0;
  let phoneNllSum = 0;
  for (const word of words) {
    addCount(counts, "tokens", word.count);
    addCount(counts, "phones", word.count * word.phoneCount);
    objectiveSum += word.count * word.objective;
    jointNllSum += word.count * word.jointLengthSyllableNll;
    phoneNllSum += word.count * word.phoneNllSum;
  }
  return { words, summary: { types: words.length, tokens: counts.tokens, phones: counts.phones,
    objectiveSum, meanObjective: objectiveSum / counts.tokens,
    jointLengthSyllableNllSum: jointNllSum, meanJointLengthSyllableNll: jointNllSum / counts.tokens,
    phoneNllSum, meanPhoneNll: phoneNllSum / counts.phones,
    units: "natural logarithms; joint length/syllable per word token; marginal phone per phone token" } };
}

export function selectFrequencySmoothing(model: FrequencyCounts, development: readonly FrequencyObservation[], grid: readonly number[]) {
  if (!grid.length || new Set(grid).size !== grid.length) throw new Error("Smoothing grid must be nonempty and unique.");
  grid.forEach(requireAlpha);
  const trials = [...grid].sort((a, b) => a - b).map(alpha =>
    ({ alpha, ...scoreFrequencyPopulation(model, development, alpha).summary }));
  const selected = trials.reduce((best, trial) => trial.meanObjective < best.meanObjective ? trial : best);
  return { alpha: selected.alpha, trials };
}
