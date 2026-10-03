import type { SelectedCmuEntry } from "./cmu.js";

export const FREQUENCY_COLUMNS = ["Word", "FREQcount", "CDcount", "FREQlow", "Cdlow",
  "SUBTLWF", "Lg10WF", "SUBTLCD", "Lg10CD"] as const;

export interface FrequencyEntry {
  line: number;
  label: string;
  spelling: string;
  count: number;
  lowercaseCount: number;
}
export interface PosCount { tag: string; count: number }
export interface PosCategory { id: string; tags: readonly string[] }
export const POS_CATEGORIES: readonly PosCategory[] = [
  { id: "content", tags: ["Adjective", "Adverb", "Noun", "Verb"] },
  { id: "function", tags: ["Article", "Conjunction", "Determiner", "Ex", "Not", "Preposition", "Pronoun", "To"] },
  { id: "other", tags: ["Interjection", "Letter", "Name", "Number", "Unclassified"] },
];
export interface RationalMass { numerator: string; denominator: string }
export interface TokenAllocation {
  interpretation: "modeled-within-row-pos-allocation";
  wordCount: number;
  taggedCount: number | null;
  wordMinusTaggedCount: number | null;
  masses: Record<string, RationalMass>;
}

function integer(value: string, label: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`Invalid integer ${label}.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`Unsafe integer ${label}.`);
  return number;
}
function checkedSum(values: readonly number[]): number {
  const sum = values.reduce((total, value) => total + value, 0);
  if (!Number.isSafeInteger(sum)) throw new Error("Unsafe count total.");
  return sum;
}

/** Parse raw word-form counts; rounded/log/contextual-diversity columns are never weights. */
export function parseFrequencyTable(text: string): FrequencyEntry[] {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  if (lines.shift() !== FREQUENCY_COLUMNS.join("\t")) throw new Error("Unsupported frequency columns.");
  const seen = new Set<string>();
  return lines.map((line, index) => {
    const columns = line.split("\t");
    if (columns.length !== FREQUENCY_COLUMNS.length) throw new Error("Malformed frequency row.");
    const [label, rawCount, rawFilms, rawLower, rawLowerFilms] = columns;
    if (!/^[a-z]+$/i.test(label)) throw new Error("Frequency word-form population requires ASCII letters.");
    const spelling = label.toLowerCase();
    if (seen.has(spelling)) throw new Error("Duplicate normalized frequency spelling.");
    seen.add(spelling);
    const count = integer(rawCount, "FREQcount");
    const lowercaseCount = integer(rawLower, "FREQlow");
    const films = integer(rawFilms, "CDcount");
    const lowerFilms = integer(rawLowerFilms, "Cdlow");
    if (!count || lowercaseCount > count || films > 8388 || lowerFilms > films || films > count
      || lowerFilms > lowercaseCount) throw new Error("Contradictory source frequency counts.");
    return { line: index + 2, label, spelling, count, lowercaseCount };
  });
}

export function joinFrequencyPronunciations(frequencies: readonly FrequencyEntry[], pronunciations: readonly SelectedCmuEntry[]) {
  const dictionary = new Map<string, SelectedCmuEntry>();
  for (const entry of pronunciations) {
    if (dictionary.has(entry.spelling)) throw new Error("Pronunciation population must contain unique spellings.");
    dictionary.set(entry.spelling, entry);
  }
  const joined: Array<{ frequency: FrequencyEntry; pronunciation: SelectedCmuEntry }> = [];
  const missing: FrequencyEntry[] = [];
  const seen = new Set<string>();
  for (const frequency of frequencies) {
    if (!Number.isSafeInteger(frequency.count) || frequency.count <= 0) throw new Error("Invalid token mass.");
    if (seen.has(frequency.spelling)) throw new Error("Duplicate normalized frequency spelling.");
    seen.add(frequency.spelling);
    const pronunciation = dictionary.get(frequency.spelling);
    if (pronunciation) joined.push({ frequency, pronunciation });
    else missing.push(frequency);
  }
  return { joined, missing, coverage: {
    types: frequencies.length, tokens: checkedSum(frequencies.map(entry => entry.count)),
    joinedTypes: joined.length, joinedTokens: checkedSum(joined.map(entry => entry.frequency.count)),
    missingTypes: missing.length, missingTokens: checkedSum(missing.map(entry => entry.count)),
  } };
}

function fraction(numerator: bigint, denominator: bigint): RationalMass {
  let a = numerator;
  let b = denominator;
  while (b) [a, b] = [b, a % b];
  return { numerator: String(numerator / a), denominator: String(denominator / a) };
}

/** Tagged counts are a distinct source measure, not an observed partition of FREQcount. */
export function allocatePosTokenMass(wordCount: number, pos: readonly PosCount[] | null): TokenAllocation {
  if (!Number.isSafeInteger(wordCount) || wordCount <= 0) throw new Error("Invalid word token mass.");
  const categoryByTag = new Map(POS_CATEGORIES.flatMap(category => category.tags.map(tag => [tag, category.id] as const)));
  const counts = new Map(POS_CATEGORIES.map(category => [category.id, 0]));
  const seen = new Set<string>();
  for (const entry of pos ?? []) {
    const category = categoryByTag.get(entry.tag);
    if (!category || seen.has(entry.tag) || !Number.isSafeInteger(entry.count) || entry.count < 0) {
      throw new Error("Invalid, repeated or unregistered POS count.");
    }
    seen.add(entry.tag);
    counts.set(category, checkedSum([counts.get(category)!, entry.count]));
  }
  const taggedCount = pos === null ? null : checkedSum([...counts.values()]);
  const mass = (count: number) => fraction(BigInt(wordCount) * BigInt(count), BigInt(taggedCount!));
  const masses = Object.fromEntries([...counts].map(([id, count]) =>
    [id, taggedCount ? mass(count) : { numerator: "0", denominator: "1" }]));
  masses.unknown = { numerator: taggedCount ? "0" : String(wordCount), denominator: "1" };
  return { interpretation: "modeled-within-row-pos-allocation", wordCount, taggedCount,
    wordMinusTaggedCount: taggedCount === null ? null : wordCount - taggedCount, masses };
}
