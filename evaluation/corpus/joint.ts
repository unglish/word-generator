import { isDeepStrictEqual } from "node:util";
import { CMU_COMPATIBILITY_DEFINITION, CMU_PARSER_VERSION, parseCmuPhone, parseCmuRecords, selectCompatibleCmu } from "./cmu.js";
import { buildReference, CMU_REVISION, CMU_SHA256, sha256, type Counts, type ReferenceModel } from "../review/wordlikeness/model.js";
import { jsonDigest } from "./identity.js";

export const JOINT_VERSION = "cmu-joint-ascii-first-v1";
export const JOINT_ENTRY_DIGEST = "d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29";
// Independently reconstructed from the pinned bytes by verify-joint.py.
export const JOINT_REFERENCE_DIGEST = "3a0e0c9c3eb0ba4990f6607e22946dd2971474d405c10b1246779ee13be534f6";
export const JOINT_DEFINITION = {
  id: JOINT_VERSION,
  population: CMU_COMPATIBILITY_DEFINITION,
  units: "integer-occurrence-counts",
  traversal: "one-traversal-per-selected-spelling; longer-entries-contribute-more-events",
  writtenLength: "ascii-letter-count",
  phoneLength: "validated-cmu-token-count",
  syllableCount: "explicitly-stress-marked-vowel-token-count",
  characterBoundaries: "word-internal; no-boundary-markers",
  labels: "no-POS-familiarity-name-root-dialect-or-token-frequency-annotations",
} as const;
export const PHONE_PROJECTIONS = {
  native: { id: "cmu-original-stress-tokens-v1", loss: "none" },
  base: { id: "cmu-arpabet-base-v1", loss: "vowel-stress-0-1-2-merged" },
} as const;
export type Histogram = Counts;
export interface JointLengths {
  written: Histogram;
  phones: Histogram;
  syllables: Histogram;
  bySyllables: Record<string, { written: Histogram; phones: Histogram }>;
}
export interface JointReference {
  version: typeof JOINT_VERSION;
  source: { revision: string; sha256: string; bytes: number };
  parser: typeof CMU_PARSER_VERSION;
  population: { definition: typeof JOINT_DEFINITION; entryDigest: string; accepted: number; excluded: Record<string, number> };
  projections: typeof PHONE_PROJECTIONS;
  characters: { letters: Histogram; bigrams: Histogram; trigrams: Histogram };
  lengths: JointLengths;
  phones: { native: Histogram; base: Histogram; vowelStress: Histogram; stressPatterns: Histogram };
  /** CMU does not annotate these boundaries: this is the unchanged #304 analysis. */
  derived: ReferenceModel;
}

export const histogram = (): Histogram => ({ total: 0, counts: {} });
export function addCount(table: Histogram, key: string, count = 1): void {
  table.total += count;
  table.counts[key] = (table.counts[key] ?? 0) + count;
}
export function addSpelling(tables: JointReference["characters"], spelling: string): void {
  for (const [width, table] of [[1, tables.letters], [2, tables.bigrams], [3, tables.trigrams]] as const) {
    for (let i = 0; i + width <= spelling.length; i++) addCount(table, spelling.slice(i, i + width));
  }
}

/** Aggregation consumes precisely one shared selected-entry sequence. */
export function buildJointReference(text: string): JointReference {
  if (sha256(text) !== CMU_SHA256) throw new Error("Joint reference requires the pinned CMU source bytes.");
  const { entries, excluded } = selectCompatibleCmu(parseCmuRecords(text));
  const entryDigest = sha256(JSON.stringify(entries.map(({ line, label, spelling, tokens }) => ({ line, label, spelling, tokens }))));
  const result: JointReference = {
    version: JOINT_VERSION,
    source: { revision: CMU_REVISION, sha256: CMU_SHA256, bytes: Buffer.byteLength(text) },
    parser: CMU_PARSER_VERSION,
    population: { definition: structuredClone(JOINT_DEFINITION), entryDigest, accepted: entries.length, excluded },
    projections: structuredClone(PHONE_PROJECTIONS),
    characters: { letters: histogram(), bigrams: histogram(), trigrams: histogram() },
    lengths: { written: histogram(), phones: histogram(), syllables: histogram(), bySyllables: {} },
    phones: { native: histogram(), base: histogram(), vowelStress: histogram(), stressPatterns: histogram() },
    derived: buildReference(text, CMU_REVISION),
  };
  for (const entry of entries) {
    const stress = entry.phones.flatMap(phone => phone.kind === "vowel" ? [String(phone.stress)] : []);
    const count = String(stress.length);
    const conditional = result.lengths.bySyllables[count] ??= { written: histogram(), phones: histogram() };
    addSpelling(result.characters, entry.spelling);
    for (const lengths of [result.lengths, conditional]) {
      addCount(lengths.written, String(entry.spelling.length));
      addCount(lengths.phones, String(entry.phones.length));
    }
    addCount(result.lengths.syllables, count);
    addCount(result.phones.stressPatterns, stress.join(" "));
    for (const phone of entry.phones) {
      addCount(result.phones.native, phone.raw);
      addCount(result.phones.base, phone.base);
      if (phone.kind === "vowel") addCount(result.phones.vowelStress, String(phone.stress));
    }
  }
  validateJointReference(result);
  return result;
}

function same(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Joint reference ${label} mismatch.`);
}
function positiveInteger(value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new Error("Expected a positive integer occurrence count.");
}
function keys(value: object, names: string[], label: string): void {
  same(Object.keys(value).sort(), names.sort(), `${label} fields`);
}
function validateHistogram(table: Histogram, token: RegExp, label: string): void {
  keys(table, ["total", "counts"], label);
  positiveInteger(table.total);
  for (const [key, count] of Object.entries(table.counts)) {
    if (!token.test(key)) throw new Error(`Invalid ${label} category: ${key}`);
    positiveInteger(count);
  }
  same(Object.values(table.counts).reduce((a, b) => a + b, 0), table.total, `${label} denominator`);
}
const weightedTotal = (table: Histogram): number => Object.entries(table.counts).reduce((sum, [key, count]) => sum + Number(key) * count, 0);

/** Rejects unit/projection/schema drift and reconciles every joint marginal. */
export function validateJointReference(reference: JointReference): void {
  keys(reference, ["version", "source", "parser", "population", "projections", "characters", "lengths", "phones", "derived"], "root");
  same(reference.version, JOINT_VERSION, "version");
  same(reference.parser, CMU_PARSER_VERSION, "parser");
  same(reference.source, { revision: CMU_REVISION, sha256: CMU_SHA256, bytes: 3618488 }, "source");
  same(reference.population, {
    definition: JOINT_DEFINITION, entryDigest: JOINT_ENTRY_DIGEST, accepted: 117485,
    excluded: { non_ascii_spelling: 8559, alternate_pronunciation: 9114, no_vowel: 8 },
  }, "population and units");
  same(reference.projections, PHONE_PROJECTIONS, "projections");
  keys(reference.characters, ["letters", "bigrams", "trigrams"], "characters");
  for (const [name, width, total] of [["letters", 1, 869802], ["bigrams", 2, 752317], ["trigrams", 3, 634858]] as const) {
    validateHistogram(reference.characters[name], new RegExp(`^[a-z]{${width}}$`), name);
    same(reference.characters[name].total, total, name);
  }
  keys(reference.lengths, ["written", "phones", "syllables", "bySyllables"], "lengths");
  for (const name of ["written", "phones", "syllables"] as const) {
    validateHistogram(reference.lengths[name], /^[1-9]\d*$/, name);
    same(reference.lengths[name].total, reference.population.accepted, `${name} entries`);
  }
  same(Object.keys(reference.lengths.bySyllables).sort(), Object.keys(reference.lengths.syllables.counts).sort(), "conditional syllable categories");
  const marginals = { written: histogram(), phones: histogram() };
  for (const [syllables, conditional] of Object.entries(reference.lengths.bySyllables)) {
    keys(conditional, ["written", "phones"], "conditional lengths");
    for (const name of ["written", "phones"] as const) {
      validateHistogram(conditional[name], /^[1-9]\d*$/, `conditional ${name}`);
      same(conditional[name].total, reference.lengths.syllables.counts[syllables], "conditional denominator");
      for (const [length, count] of Object.entries(conditional[name].counts)) addCount(marginals[name], length, count);
    }
  }
  same(marginals.written, reference.lengths.written, "written marginal");
  same(marginals.phones, reference.lengths.phones, "phone marginal");
  same(weightedTotal(reference.lengths.written), reference.characters.letters.total, "letter events");
  for (const [width, name] of [[2, "bigrams"], [3, "trigrams"]] as const) {
    const events = Object.entries(reference.lengths.written.counts).reduce((sum, [len, count]) => sum + Math.max(0, Number(len) - width + 1) * count, 0);
    same(events, reference.characters[name].total, `${name} events`);
  }
  keys(reference.phones, ["native", "base", "vowelStress", "stressPatterns"], "phones");
  validateHistogram(reference.phones.native, /^[A-Z]+[012]?$/, "native phones");
  validateHistogram(reference.phones.base, /^[A-Z]+$/, "base phones");
  validateHistogram(reference.phones.vowelStress, /^[012]$/, "stress marks");
  validateHistogram(reference.phones.stressPatterns, /^[012]( [012])*$/, "stress patterns");
  const base = histogram(), vowelStress = histogram(), syllables = histogram(), patternStress = histogram();
  for (const [token, count] of Object.entries(reference.phones.native.counts)) {
    if (!parseCmuPhone(token)) throw new Error(`Unsupported native phone: ${token}`);
    addCount(base, token.replace(/[012]$/, ""), count);
    if (/[012]$/.test(token)) addCount(vowelStress, token.at(-1)!, count);
  }
  same(base, reference.phones.base, "stressless phone projection");
  same(vowelStress, reference.phones.vowelStress, "native stress projection");
  same(reference.phones.native.total, 742333, "native phone denominator");
  same(reference.phones.native.total, weightedTotal(reference.lengths.phones), "phone length events");
  same(reference.phones.vowelStress.total, weightedTotal(reference.lengths.syllables), "syllable events");
  for (const [pattern, count] of Object.entries(reference.phones.stressPatterns.counts)) {
    const marks = pattern.split(" ");
    addCount(syllables, String(marks.length), count);
    for (const mark of marks) addCount(patternStress, mark, count);
  }
  same(syllables, reference.lengths.syllables, "stress pattern lengths");
  same(patternStress, vowelStress, "stress pattern events");
  same(reference.derived.corpus, { name: "CMU Pronouncing Dictionary", revision: CMU_REVISION, sha256: CMU_SHA256,
    accepted: reference.population.accepted, excluded: reference.population.excluded }, "derived population");
  same(jsonDigest(reference.derived), "98d71552d9419d465977520c1101480a1f1ebfa968fb7e3b89eefea30e031878", "unchanged #304 derived analysis");
  same(jsonDigest(reference), JOINT_REFERENCE_DIGEST, "independently verified joint tables");
}
