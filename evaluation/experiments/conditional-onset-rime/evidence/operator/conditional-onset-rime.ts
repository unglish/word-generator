import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { CONSONANTS, normalizeSpelling, parseCmuPhone, type SelectedCmuEntry } from "./cmu.js";
import { keyOf, syllabify } from "../review/wordlikeness/model.js";

export const NUCLEUS_CLASSES = [
  { id: "diphthong", vowels: ["AW", "AY", "EY", "OW", "OY"] },
  { id: "rhotic", vowels: ["ER"] },
  { id: "monophthong", vowels: ["AA", "AE", "AH", "AO", "EH", "IH", "IY", "UH", "UW"] },
] as const;
export type NucleusClassId = typeof NUCLEUS_CLASSES[number]["id"];
export interface ConstituentContext {
  constituent: "onset" | "rime";
  wordInitial: boolean;
  wordFinal: boolean;
  stress: 0 | 1 | 2;
  nucleusClass: NucleusClassId;
}
export interface ConstituentObservation {
  spelling: string;
  syllable: number;
  context: ConstituentContext;
  tokens: string[];
}
export interface CountRow { total: number; counts: Record<string, number> }
export interface LengthCounts { events: number; phones: number }
export interface ConditionalModel {
  version: "conditional-onset-rime-v1";
  initialOnsets: string[];
  trainingEntries: number;
  base: {
    consonants: Record<string, number>;
    vowels: Record<string, number>;
    lengths: { onset: LengthCounts; coda: LengthCounts };
  };
  levels: Record<"class" | "stress" | "full", Record<string, CountRow>>;
}
type Level = keyof ConditionalModel["levels"];
const LEVELS: readonly Level[] = ["class", "stress", "full"];
const vowelClasses = new Map<string, NucleusClassId>(NUCLEUS_CLASSES.flatMap(group =>
  group.vowels.map(vowel => [vowel, group.id] as [string, NucleusClassId])));

export function splitEntries(entries: readonly SelectedCmuEntry[], seed: string): Record<"training" | "development" | "heldOut", SelectedCmuEntry[]> {
  if (!seed) throw new Error("A named split seed is required.");
  const result = { training: [] as SelectedCmuEntry[], development: [] as SelectedCmuEntry[], heldOut: [] as SelectedCmuEntry[] };
  const spellings = new Set<string>();
  for (const entry of entries) {
    if (normalizeSpelling(entry.spelling) !== entry.spelling) throw new Error("Split spellings must be normalized ASCII types.");
    if (spellings.has(entry.spelling)) throw new Error("Split entries must have unique normalized spellings.");
    spellings.add(entry.spelling);
    const bucket = createHash("sha256").update(JSON.stringify([seed, entry.spelling])).digest().readUInt32BE(0) % 10000;
    if (bucket < 8000) result.training.push(entry);
    else if (bucket < 9000) result.development.push(entry);
    else result.heldOut.push(entry);
  }
  return result;
}

export function trainingInitialOnsets(entries: readonly SelectedCmuEntry[]): Set<string> {
  if (!entries.length) throw new Error("Training entries are required.");
  const onsets = new Set([""]);
  for (const entry of entries) {
    const vowel = entry.tokens.findIndex(token => /[012]$/.test(token));
    if (vowel < 0) throw new Error("Training pronunciation has no vowel.");
    onsets.add(keyOf(entry.tokens.slice(0, vowel)));
  }
  return onsets;
}

export function constituentObservations(entries: readonly SelectedCmuEntry[], initialOnsets: ReadonlySet<string>): ConstituentObservation[] {
  const observations: ConstituentObservation[] = [];
  for (const entry of entries) {
    const parsed = entry.tokens.map(parseCmuPhone);
    if (parsed.some(phone => phone === null) || !isDeepStrictEqual(parsed, entry.phones)) throw new Error("Source tokens and typed phones disagree.");
    const syllables = syllabify(entry.tokens, initialOnsets);
    const stresses = entry.phones.flatMap(phone => phone.kind === "vowel" ? [phone.stress] : []);
    if (stresses.length !== syllables.length) throw new Error("Source stress and inferred syllables disagree.");
    syllables.forEach((syllable, index) => {
      const nucleusClass = vowelClasses.get(syllable.nucleus[0]);
      if (!nucleusClass) throw new Error("Unclassified source nucleus.");
      const context = { wordInitial: index === 0, wordFinal: index === syllables.length - 1,
        stress: stresses[index], nucleusClass };
      observations.push({ spelling: entry.spelling, syllable: index, context: { ...context, constituent: "onset" }, tokens: [...syllable.onset] });
      observations.push({ spelling: entry.spelling, syllable: index, context: { ...context, constituent: "rime" }, tokens: [...syllable.nucleus, ...syllable.coda] });
    });
  }
  return observations;
}

export function conditionalContextKey(context: ConstituentContext, level: Level): string {
  return JSON.stringify({ constituent: context.constituent, nucleusClass: context.nucleusClass,
    ...(level !== "class" ? { stress: context.stress } : {}),
    ...(level === "full" ? { wordInitial: context.wordInitial, wordFinal: context.wordFinal } : {}) });
}
function increment(counts: Record<string, number>, token: string): void {
  counts[token] = (counts[token] ?? 0) + 1;
}
function consonantTokens(observation: ConstituentObservation): string[] {
  const { context, tokens } = observation;
  if (!NUCLEUS_CLASSES.some(group => group.id === context.nucleusClass) || ![0, 1, 2].includes(context.stress)
    || typeof context.wordInitial !== "boolean" || typeof context.wordFinal !== "boolean") throw new Error("Invalid constituent context.");
  if (context.constituent === "rime") {
    if (!tokens.length || vowelClasses.get(tokens[0]) !== context.nucleusClass) throw new Error("Rime nucleus does not match its class.");
  } else if (context.constituent !== "onset") throw new Error("Unsupported constituent.");
  const consonants = context.constituent === "onset" ? tokens : tokens.slice(1);
  if (consonants.some(token => !CONSONANTS.has(token))) throw new Error("Unsupported constituent consonant.");
  return consonants;
}

export function fitConditionalModel(entries: readonly SelectedCmuEntry[]): ConditionalModel {
  if (new Set(entries.map(entry => entry.spelling)).size !== entries.length) throw new Error("Training entries must have unique spellings.");
  const initialOnsets = trainingInitialOnsets(entries);
  const model: ConditionalModel = { version: "conditional-onset-rime-v1", initialOnsets: [...initialOnsets].sort(), trainingEntries: entries.length,
    base: { consonants: {}, vowels: {}, lengths: { onset: { events: 0, phones: 0 }, coda: { events: 0, phones: 0 } } },
    levels: { class: {}, stress: {}, full: {} } };
  for (const observation of constituentObservations(entries, initialOnsets)) {
    const consonants = consonantTokens(observation);
    for (const token of consonants) increment(model.base.consonants, token);
    const length = model.base.lengths[observation.context.constituent === "onset" ? "onset" : "coda"];
    length.events++; length.phones += consonants.length;
    if (observation.context.constituent === "rime") increment(model.base.vowels, observation.tokens[0]);
    for (const level of LEVELS) {
      const key = conditionalContextKey(observation.context, level);
      const row = model.levels[level][key] ??= { total: 0, counts: {} };
      row.total++; increment(row.counts, keyOf(observation.tokens));
    }
  }
  return model;
}

/** Log-space evaluation retains positive mathematical support without probability floors. */
export function baseLogProbability(model: ConditionalModel, observation: ConstituentObservation): number {
  const consonants = consonantTokens(observation);
  const length = model.base.lengths[observation.context.constituent === "onset" ? "onset" : "coda"];
  const stop = (length.events + 1) / (length.events + length.phones + 2);
  let logProbability = Math.log(stop) + consonants.length * Math.log1p(-stop);
  const totalConsonants = Object.values(model.base.consonants).reduce((sum, count) => sum + count, 0);
  const denominator = totalConsonants + 0.5 * CONSONANTS.size;
  for (const token of consonants) logProbability += Math.log(((model.base.consonants[token] ?? 0) + 0.5) / denominator);
  if (observation.context.constituent === "rime") {
    const group = NUCLEUS_CLASSES.find(group => group.id === observation.context.nucleusClass)!;
    const vowels: readonly string[] = group.vowels;
    const total = vowels.reduce((sum, vowel) => sum + (model.base.vowels[vowel] ?? 0), 0);
    logProbability += Math.log(((model.base.vowels[observation.tokens[0]] ?? 0) + 0.5) / (total + 0.5 * vowels.length));
  }
  return logProbability;
}
function logAdd(left: number, right: number): number {
  const maximum = Math.max(left, right);
  return maximum + Math.log(Math.exp(left - maximum) + Math.exp(right - maximum));
}
export function constituentLogProbability(model: ConditionalModel, observation: ConstituentObservation, alpha: number, kind: "baseline" | "candidate"): number {
  if (!(alpha > 0 && Number.isFinite(alpha))) throw new Error("Smoothing strength must be finite and positive.");
  if (kind !== "baseline" && kind !== "candidate") throw new Error("Unknown model kind.");
  let logProbability = baseLogProbability(model, observation);
  for (const level of kind === "baseline" ? ["class"] as const : LEVELS) {
    const row = model.levels[level][conditionalContextKey(observation.context, level)];
    const count = row?.counts[keyOf(observation.tokens)] ?? 0;
    logProbability = logAdd(count ? Math.log(count) : -Infinity, Math.log(alpha) + logProbability) - Math.log((row?.total ?? 0) + alpha);
  }
  if (!Number.isFinite(logProbability) || logProbability > 1e-12) throw new Error("Invalid conditional log probability.");
  return logProbability;
}
