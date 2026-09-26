/** Offline paired count-table sensitivity. No generator or active scorer configuration changes. */
import { isDeepStrictEqual } from "node:util";
import type { Word } from "../../src/types.js";
import { scoreArpabetWords } from "../../src/phonotactic/score.js";
import { wordToArpabet } from "../../src/phonotactic/ipa-to-arpabet.js";
import type { TransitionTable } from "./phone-transitions.js";
import { CONSONANTS, VOWELS } from "./cmu.js";

export type Counts = Record<string, number>;
export const VOCABULARY = ["#", ...CONSONANTS, ...VOWELS].sort();
export const NEAR_ZERO = 1e-10;
export const DECOMPOSITION_ARITHMETIC = Object.freeze({
  version: "compensated-signed-terms-v2",
  terms: "binary64 occurrence*transition-delta and per-word B-A",
  accumulation: "TS floating expansion; independent Python math.fsum",
  residual: "compensated sum(weighted terms, negated row terms); not subtraction of rounded totals",
});
export function same(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(`Model sensitivity ${label} mismatch.`);
}
export function add(counts: Counts, key: string, n = 1): void { counts[key] = (counts[key] ?? 0) + n; }
export function close(actual: number, expected: number, label: string): void {
  if (!Number.isFinite(actual) || !Number.isFinite(expected) || Math.abs(actual - expected) > 1e-10 + 1e-12 * Math.abs(expected)) {
    throw new Error(`Model sensitivity numerical mismatch: ${label}`);
  }
}
/** Preserve low-order addition errors in a nonoverlapping expansion until final rounding. */
export function expansionSum(values: Iterable<number>): number {
  const partials: number[] = [];
  for (let value of values) {
    if (!Number.isFinite(value)) throw new Error("Nonfinite decomposition term.");
    let retained = 0;
    for (let partial of partials) {
      if (Math.abs(value) < Math.abs(partial)) [value, partial] = [partial, value];
      const high = value + partial;
      if (!Number.isFinite(high)) throw new Error("Decomposition accumulation overflow.");
      const low = partial - (high - value);
      if (low !== 0) partials[retained++] = low;
      value = high;
    }
    partials.length = retained;
    if (value !== 0) partials.push(value);
  }
  let remaining = partials.length;
  if (!remaining) return 0;
  let high = partials[--remaining], low = 0;
  while (remaining) {
    const previous = high, next = partials[--remaining];
    high = previous + next;
    low = next - (high - previous);
    if (low !== 0) break;
  }
  // Lower partials can move an exact halfway remainder past the rounding tie.
  if (remaining && ((low < 0 && partials[remaining - 1] < 0) || (low > 0 && partials[remaining - 1] > 0))) {
    const correction = low * 2, rounded = high + correction;
    if (rounded - high === correction) high = rounded;
  }
  return high;
}
export function decomposition(weightedTerms: readonly number[], rowTerms: readonly number[]) {
  function* signedTerms(): Generator<number> {
    for (const term of weightedTerms) yield term;
    for (const term of rowTerms) yield -term;
  }
  return { arithmetic: DECOMPOSITION_ARITHMETIC.version,
    weightedDelta: expansionSum(weightedTerms), rowDelta: expansionSum(rowTerms), residual: expansionSum(signedTerms()) };
}
export function validateTable(table: TransitionTable, expected?: TransitionTable): void {
  same(table.vocabulary, VOCABULARY, "common base vocabulary");
  same(Object.keys(table).sort(), ["counts", "rowTotals", "total", "vocabulary"], "table fields");
  same(Object.keys(table.counts).sort(), VOCABULARY, "table rows");
  same(Object.keys(table.rowTotals).sort(), VOCABULARY, "row-total labels");
  let total = 0;
  for (const first of VOCABULARY) {
    const row = table.counts[first];
    if (!Object.keys(row).length) throw new Error("Empty count-table row.");
    let rowTotal = 0;
    for (const [second, n] of Object.entries(row)) {
      if (!VOCABULARY.includes(second) || first === "#" && second === "#" || !Number.isSafeInteger(n) || n <= 0) {
        throw new Error("Invalid count-table event.");
      }
      rowTotal += n;
    }
    if (!Number.isSafeInteger(rowTotal)) throw new Error("Unsafe row total.");
    same(table.rowTotals[first], rowTotal, "row total"); total += rowTotal;
  }
  if (!Number.isSafeInteger(total)) throw new Error("Unsafe table total.");
  same(table.total, total, "table total");
  if (expected) same(table, expected, "externally expected complete table");
}
export interface Model {
  readonly table: TransitionTable;
  log(first: string, second: string): number;
}
export function model(input: TransitionTable): Model {
  validateTable(input);
  const table = structuredClone(input);
  for (const row of Object.values(table.counts)) Object.freeze(row);
  Object.freeze(table.counts); Object.freeze(table.rowTotals); Object.freeze(table.vocabulary); Object.freeze(table);
  return Object.freeze({ table, log: (first: string, second: string): number => {
    if (!VOCABULARY.includes(first) || !VOCABULARY.includes(second)) throw new Error("Unsupported transition label.");
    return Math.log2(((table.counts[first][second] ?? 0) + 1) / (table.rowTotals[first] + 40));
  } });
}
export interface Score { total: number; perTransition: number }
export interface PairedScores { A: Score; B: Score; delta: Score }
export function score(tokens: readonly string[], table: Model): Score {
  if (!tokens.length || tokens.some(token => token === "#" || !VOCABULARY.includes(token))) throw new Error("A score requires a nonempty complete base-phone vector.");
  const seq = ["#", ...tokens, "#"];
  let total = 0;
  for (let index = 1; index < seq.length; index++) total += table.log(seq[index - 1], seq[index]);
  return { total, perTransition: total / (tokens.length + 1) };
}
export function pairedScores(tokens: readonly string[], A: Model, B: Model): PairedScores {
  const a = score(tokens, A), b = score(tokens, B);
  const legacy = scoreArpabetWords([tokens.join(" ")]).words[0];
  same(a, { total: legacy.score, perTransition: legacy.perBigram }, "actual unchanged scorer per-row parity");
  return { A: a, B: b, delta: { total: b.total - a.total, perTransition: b.perTransition - a.perTransition } };
}
export interface Recorded { status: "unknown" | "recorded"; value?: boolean }
export interface Segment {
  coordinates: { syllable: number; slot: "onset" | "nucleus" | "coda"; index: number };
  rawSound: string; baseSound: string; notationAlias: boolean; symbolAspiration: boolean;
  identity: { status: "resolved" | "ambiguous" | "unknown"; id: string | null; kind: "vowel" | "consonant" | null };
  stress: { mark: "primary" | "secondary" | "unmarked" | "invalid"; raw: string | null };
  slotCompatible: boolean;
  recorded: { aspiration: Recorded; reduction: Recorded; legacyTense: Recorded };
  underlyingIdentity: { status: "unknown" };
}
export interface Observation {
  contractVersion: string; sourceProfile: string; layer: string;
  syllables: { stress: Segment["stress"]; nucleusSize: number }[]; segments: Segment[];
}
export interface Projection {
  projection: "legacy-arpabet-v1"; complete: boolean; boundaries: "erased";
  items: { sourceIndex: number; token: string | null; losses: { aspiration: boolean; stress: boolean; mergedIdentity: boolean; unresolvedIdentity: boolean } }[];
}
/** Structural adapter only. Mapping and source taxonomy live exclusively in the externally pinned #318 module. */
export interface IdentityModule {
  PHONEME_IDENTITY_CONTRACT: { version: string; inventory: string };
  observeWordIdentity(word: Word, options: { sourceProfile: "english-legacy-v1"; layer: "surface" }): Observation;
  projectLegacyArpabet(observation: Observation): Projection;
}
export interface GeneratedProjection {
  observation: Observation; projection: Projection; tokens: (string | null)[];
  identityComplete: boolean; reason: "empty" | "missing" | "outside-vocabulary" | null;
}
export function project(word: Word, identity: IdentityModule): GeneratedProjection {
  const observation = identity.observeWordIdentity(word, { sourceProfile: "english-legacy-v1", layer: "surface" });
  same([observation.contractVersion, observation.sourceProfile, observation.layer], ["phoneme-identity-v1", "english-legacy-v1", "surface"], "observation domain");
  const projection = identity.projectLegacyArpabet(observation), tokens = projection.items.map(item => item.token);
  same(projection.items.map(item => item.sourceIndex), observation.segments.map((_, index) => index), "aligned projection coordinates");
  same(projection.complete, tokens.every(token => token !== null), "projection completeness");
  const reason = !tokens.length ? "empty" : tokens.includes(null) ? "missing"
    : tokens.some(token => token === "#" || !VOCABULARY.includes(token!)) ? "outside-vocabulary" : null;
  if (reason === null) same(tokens.join(" "), wordToArpabet(word), "unchanged legacy mapper complete-vector parity");
  return { observation, projection, tokens, identityComplete: observation.segments.every(segment => segment.identity.status === "resolved"), reason };
}
export type RowIdentity = { kind: "english"; ordinal: number; line: number; spelling: string }
  | { kind: "generated"; profile: string; seed: number; drawIndex: number };
export interface StudyRow {
  identity: RowIdentity; tokens: (string | null)[]; phoneCount: number; transitionCount: number | null;
  identityComplete: boolean | null; unavailable: GeneratedProjection["reason"];
  source: { native: string[] } | { archiveSha256: string; written: string; observation: Observation; projection: Projection };
  scores: PairedScores | null;
}
export interface Stats { mean: number; median: number; min: number; max: number }
export function stats(values: readonly number[]): Stats | null {
  if (!values.length) return null;
  if (!values.every(Number.isFinite)) throw new Error("Nonfinite aggregate input.");
  const ordered = [...values].sort((a, b) => a - b);
  return { mean: ordered.reduce((a, b) => a + b, 0) / ordered.length,
    median: ordered[Math.floor(ordered.length / 2)], min: ordered[0], max: ordered[ordered.length - 1] };
}
export function signed(values: readonly number[]) {
  return { negative: values.filter(value => value < 0).length, zero: values.filter(value => value === 0).length,
    positive: values.filter(value => value > 0).length, nearZero: values.filter(value => Math.abs(value) <= NEAR_ZERO).length };
}
export function contribution(first: string, second: string, A: Model, B: Model) {
  const a = A.table.counts[first][second] ?? 0, b = B.table.counts[first][second] ?? 0;
  const denominatorA = A.table.rowTotals[first] + 40, denominatorB = B.table.rowTotals[first] + 40;
  const logA = A.log(first, second), logB = B.log(first, second);
  const numeratorDelta = Math.log2(b + 1) - Math.log2(a + 1);
  const denominatorDelta = Math.log2(denominatorA) - Math.log2(denominatorB);
  close(numeratorDelta + denominatorDelta, logB - logA, "transition decomposition");
  return { first, second, countA: a, countB: b, denominatorA, denominatorB,
    support: `${a ? "seen" : "unseen"}-${b ? "seen" : "unseen"}`,
    logA, logB, delta: logB - logA, numeratorDelta, denominatorDelta };
}
export function newLossCounts() {
  return { segments: 0, identities: { resolved: 0, ambiguous: 0, unknown: 0 }, mapped: 0, missing: 0,
    sourceCounts: {} as Counts, coarsePreimages: {} as Record<string, Counts>, stressByNucleus: {} as Record<string, Counts>,
    recordedAspiration: {} as Counts, recordedReduction: {} as Counts, reductionByNucleus: { true: 0, false: 0, unknown: 0 },
    symbolAspiration: 0, notationAliases: 0, potentialMergerSegments: 0, aspirationLoss: 0,
    wordsAffected: {} as Counts, overlappingLossMaskWords: {} as Counts };
}
export type LossCounts = ReturnType<typeof newLossCounts>;
export function countLoss(target: LossCounts, row: StudyRow): void {
  if (!("observation" in row.source)) return;
  const flags = new Set<string>();
  const { observation, projection } = row.source;
  for (const [index, segment] of observation.segments.entries()) {
    const item = projection.items[index]; target.segments++; target.identities[segment.identity.status]++;
    add(target.sourceCounts, segment.rawSound);
    if (item.token === null) { target.missing++; flags.add("missing"); }
    else { target.mapped++; add(target.coarsePreimages[item.token] ??= {}, segment.rawSound); }
    if (segment.identity.status !== "resolved") flags.add(segment.identity.status);
    if (segment.symbolAspiration) target.symbolAspiration++;
    if (segment.notationAlias) { target.notationAliases++; flags.add("notationAlias"); }
    if (item.losses.mergedIdentity) { target.potentialMergerSegments++; flags.add("potentialMerger"); }
    if (item.losses.aspiration) { target.aspirationLoss++; flags.add("aspiration"); }
    for (const [field, destination] of [["aspiration", target.recordedAspiration], ["reduction", target.recordedReduction]] as const) {
      const flag = segment.recorded[field]; add(destination, flag.status === "unknown" ? "unknown" : String(flag.value));
    }
    if (segment.recorded.reduction.status === "recorded" && segment.recorded.reduction.value) flags.add("recordedReduction");
    if (segment.coordinates.slot === "nucleus") {
      add(target.stressByNucleus[segment.rawSound] ??= {}, segment.stress.mark);
      flags.add(`nucleusStress:${segment.stress.mark}`);
      const r = segment.recorded.reduction;
      target.reductionByNucleus[r.status === "unknown" ? "unknown" : r.value ? "true" : "false"]++;
    }
  }
  for (const flag of flags) add(target.wordsAffected, flag);
  add(target.overlappingLossMaskWords, [...flags].sort().join("|") || "none");
}
class Group {
  constructor(private readonly observesSurface: boolean) {}
  phoneEvents = 0; scoreablePhoneEvents = 0; transitionEvents = 0;
  rows = 0; scoreable = 0; unavailable: Counts = {}; identityComplete = 0; identityUnavailable = 0;
  loss = newLossCounts(); pairs: Counts = {};
  values = { A: { total: [] as number[], perTransition: [] as number[] }, B: { total: [] as number[], perTransition: [] as number[] }, delta: { total: [] as number[], perTransition: [] as number[] } };
  add(row: StudyRow): void {
    this.rows++; this.phoneEvents += row.phoneCount; if (row.identityComplete === true) this.identityComplete++;
    if (row.identityComplete === null) this.identityUnavailable++;
    countLoss(this.loss, row);
    if (!row.scores) { add(this.unavailable, row.unavailable!); return; }
    this.scoreable++; this.scoreablePhoneEvents += row.phoneCount; this.transitionEvents += row.transitionCount!;
    for (const model of ["A", "B", "delta"] as const) for (const unit of ["total", "perTransition"] as const) this.values[model][unit].push(row.scores[model][unit]);
    const sequence = ["#", ...row.tokens, "#"];
    for (let index = 1; index < sequence.length; index++) add(this.pairs, `${sequence[index - 1]} ${sequence[index]}`);
  }
  finish(A: Model, B: Model) {
    const transitions = Object.entries(this.pairs).sort(([a], [b]) => a < b ? -1 : 1).map(([pair, occurrences]) => {
      const [first, second] = pair.split(" "), c = contribution(first, second, A, B);
      return { ...c, occurrences, weightedDelta: occurrences * c.delta,
        weightedNumerator: occurrences * c.numeratorDelta, weightedDenominator: occurrences * c.denominatorDelta };
    });
    const totals = decomposition(transitions.map(item => item.weightedDelta), this.values.delta.total);
    close(totals.weightedDelta, totals.rowDelta, "weighted transition/word delta");
    return { rows: this.rows, phoneEvents: this.phoneEvents, scoreablePhoneEvents: this.scoreablePhoneEvents, transitionEvents: this.transitionEvents, scoreable: this.scoreable, unavailable: this.unavailable, identityComplete: this.identityComplete, identityUnavailable: this.identityUnavailable,
      loss: this.observesSurface ? this.loss : null, observedMultiPreimageTokens: this.observesSurface
        ? Object.fromEntries(Object.entries(this.loss.coarsePreimages).filter(([, preimages]) => Object.keys(preimages).length > 1)) : null,
      scores: { A: { total: stats(this.values.A.total), perTransition: stats(this.values.A.perTransition) },
        B: { total: stats(this.values.B.total), perTransition: stats(this.values.B.perTransition) },
        delta: { total: stats(this.values.delta.total), perTransition: stats(this.values.delta.perTransition) } },
      signs: { total: signed(this.values.delta.total), perTransition: signed(this.values.delta.perTransition) },
      transitions, decomposition: totals };
  }
}
/** Each named parent has an exact phone-count partition and a separately nested identity view. */
export class StudyGroups {
  private groups = new Map<string, Group>();
  add(row: StudyRow): void {
    const parents = row.identity.kind === "english" ? ["english"] : ["generated", `profile/${row.identity.profile}`, `stream/${row.identity.profile}/${row.identity.seed}`];
    for (const parent of parents) for (const view of ["all", "identity-complete"]) {
      if (view === "identity-complete" && row.identityComplete === null) continue;
      const totalKey = `${parent}/${view}`;
      if (!this.groups.has(totalKey)) this.groups.set(totalKey, new Group(row.identity.kind === "generated"));
      if (view === "identity-complete" && row.identityComplete !== true) continue;
      for (const key of [`${parent}/${view}`, `${parent}/${view}/phoneCount/${row.phoneCount}`]) {
        if (!this.groups.has(key)) this.groups.set(key, new Group(row.identity.kind === "generated"));
        this.groups.get(key)!.add(row);
      }
    }
  }
  finish(A: Model, B: Model) {
    return Object.fromEntries([...this.groups].sort(([a], [b]) => a < b ? -1 : 1).map(([key, group]) => [key, group.finish(A, B)]));
  }
}
export type FinishedGroups = ReturnType<StudyGroups["finish"]>;
export function gaps(groups: FinishedGroups) {
  const english = groups["english/all"];
  return Object.fromEntries(Object.entries(groups).filter(([key]) => !key.startsWith("english/")).map(([key, group]) => [key,
    Object.fromEntries((["total", "perTransition"] as const).map(unit => {
      const EA = english.scores.A[unit]?.mean, EB = english.scores.B[unit]?.mean, GA = group.scores.A[unit]?.mean, GB = group.scores.B[unit]?.mean;
      if (EA === undefined || EB === undefined || GA === undefined || GB === undefined) return [unit, null];
      const A = EA - GA, B = EB - GB, delta = B - A, pairedMeanDifference = (EB - EA) - (GB - GA);
      close(delta, pairedMeanDifference, "paired gap identity");
      return [unit, { EnglishRows: english.scoreable, generatedRows: group.scoreable, EA, EB, GA, GB, A, B, delta, pairedMeanDifference }];
    }))]));
}
