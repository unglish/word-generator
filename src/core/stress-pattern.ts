import type { Affix, ResolvedStressRules } from "../config/language.js";
import type { Phoneme, Syllable } from "../types.js";
import type { RNG } from "../utils/random.js";
import type { NuclearQuantity, StressWeightTrace } from "./syllable-weight.js";

export type StressMark = "unmarked" | "primary" | "secondary";
export type StressOrigin = { kind: "unmarked" } | { kind: "input" } | { kind: "event"; eventId: number };
export type StressPatternDomain = "root-before-primary" | "root-after-primary" | "root-after-explicit-secondary" | "root-after-rhythmic" | "assembled-after-morphology" | "final-lexical-before-realization" | "surface-after-realization";
export interface StressPhoneSnapshot {
  sound: string;
  nuclearQuantity?: NuclearQuantity;
  reduced?: boolean;
  aspirated?: boolean;
}
export interface StressPatternSyllable {
  onset: StressPhoneSnapshot[];
  nucleus: StressPhoneSnapshot[];
  coda: StressPhoneSnapshot[];
  mark: StressMark;
  origin: StressOrigin;
}
export interface StressPatternSnapshot {
  domain: StressPatternDomain;
  coordinates: "root" | "word";
  /** Number of executed assignments preceding this snapshot. */
  eventCount: number;
  syllables: StressPatternSyllable[];
}
export type StressAssignmentCause =
  | { kind: "root-primary" }
  | { kind: "explicit-secondary" }
  | { kind: "rhythmic"; iteration: number }
  | { kind: "morphology"; effectId: number; action: "demote-primary" | "affix-primary" | "affix-secondary" | "preceding-primary" };
export interface StressAssignment {
  id: number;
  coordinates: "root" | "word";
  syllableIndex: number;
  before: StressMark;
  previousOrigin: StressOrigin;
  after: StressMark;
  cause: StressAssignmentCause;
}
export interface RhythmicIteration {
  syllableIndex: number;
  before: StressMark;
  left: StressMark;
  right: StressMark;
  neighborCheckPerformed: boolean;
  skipped: "already-marked" | "marked-neighbor" | null;
  /** Raw RNG value; null means no draw was executed. */
  draw: number | null;
  applied: boolean;
}
export interface AffixStressEffect {
  id: number;
  /** Word-local reference to trace.morphology.realization[role], not a global affix ID. */
  role: "prefix" | "suffix";
  effect: Affix["stressEffect"];
  syllableIndices: number[];
  status: "applied" | "none" | "no-realized-syllables" | "prefix-attraction-not-applied" | "no-preceding-syllable";
  eventIds: number[];
}
export interface StressPatternTrace {
  version: 1;
  /** Rejected attempts and non-stress RNG calls are outside this record. */
  scope: "returned-attempt";
  rootSyllableCount: number;
  /** Realized syllable coordinates; zero-syllable affixes can add phones inside the root span. */
  assembly?: { rootSyllableStart: number; prefixSyllables: number; suffixSyllables: number };
  primary: { strategy: ResolvedStressRules["primary"]["type"]; selectedIndex: number | null; draws: number[] };
  explicitSecondary: StressWeightTrace["secondary"] & {
    enabled: boolean;
    candidateWindow: ResolvedStressRules["secondary"]["candidateWindow"];
    probability: number;
    selectionDraw: number | null;
    gateDraw: number | null;
    skipped: "monosyllabic" | "disabled" | "no-primary" | "no-candidates" | null;
  };
  rhythmic: { enabled: boolean; probability: number; requireUnstressedNeighbors: boolean; iterations: RhythmicIteration[] };
  morphology: AffixStressEffect[];
  events: StressAssignment[];
  snapshots: StressPatternSnapshot[];
}

export function stressMark(stress: Syllable["stress"]): StressMark {
  return stress === "ˈ" ? "primary" : stress === "ˌ" ? "secondary" : "unmarked";
}

function snapshotPhone(phone: Phoneme): StressPhoneSnapshot {
  const result: StressPhoneSnapshot = { sound: phone.sound };
  if (phone.nuclearQuantity) result.nuclearQuantity = { ...phone.nuclearQuantity };
  if (phone.reduced !== undefined) result.reduced = phone.reduced;
  if (phone.aspirated !== undefined) result.aspirated = phone.aspirated;
  return result;
}

/** Record values returned by existing RNG calls; never draw ahead or pad a stream. */
export function observeStressDraws(rand: RNG, draws: number[] | undefined): RNG {
  if (!draws) return rand;
  return () => {
    const value = rand();
    draws.push(value);
    return value;
  };
}

/** Passive state for one generation attempt. It never writes a word or consumes RNG. */
export class StressPatternObserver {
  readonly trace: StressPatternTrace;
  private coordinates: "root" | "word" = "root";
  private marks: StressMark[];
  private origins: StressOrigin[];

  constructor(syllables: Syllable[], rules: ResolvedStressRules) {
    this.marks = syllables.map(syllable => stressMark(syllable.stress));
    this.origins = this.marks.map(mark => ({ kind: mark === "unmarked" ? "unmarked" : "input" }));
    this.trace = {
      version: 1, scope: "returned-attempt", rootSyllableCount: syllables.length,
      primary: { strategy: rules.primary.type, selectedIndex: null, draws: [] },
      explicitSecondary: { enabled: rules.secondary.enabled, candidateWindow: rules.secondary.candidateWindow, probability: rules.secondary.probability, candidates: [], selectedIndex: null, applied: false, selectionDraw: null, gateDraw: null, skipped: null },
      rhythmic: { enabled: rules.rhythmic.enabled, probability: rules.rhythmic.probability, requireUnstressedNeighbors: rules.rhythmic.requireUnstressedNeighbors, iterations: [] },
      morphology: [], events: [], snapshots: [],
    };
    this.snapshot("root-before-primary", syllables);
  }

  assignment(syllableIndex: number, stress: Syllable["stress"], cause: StressAssignmentCause): void {
    const id = this.trace.events.length;
    const after = stressMark(stress);
    this.trace.events.push({ id, coordinates: this.coordinates, syllableIndex, before: this.marks[syllableIndex], previousOrigin: { ...this.origins[syllableIndex] }, after, cause: { ...cause } });
    this.marks[syllableIndex] = after;
    this.origins[syllableIndex] = { kind: "event", eventId: id };
    if (cause.kind === "morphology") this.trace.morphology[cause.effectId].eventIds.push(id);
  }

  secondary(result: StressWeightTrace["secondary"], draws: number[], syllables: Syllable[]): void {
    const observation = this.trace.explicitSecondary;
    observation.candidates = result.candidates.map(candidate => ({ ...candidate }));
    observation.selectedIndex = result.selectedIndex;
    observation.applied = result.applied;
    observation.selectionDraw = draws[0] ?? null;
    observation.gateDraw = draws[1] ?? null;
    if (syllables.length <= 1) observation.skipped = "monosyllabic";
    else if (!observation.enabled) observation.skipped = "disabled";
    else if (!syllables.some(syllable => syllable.stress === "ˈ")) observation.skipped = "no-primary";
    else if (result.candidates.length === 0) observation.skipped = "no-candidates";
    if (result.applied) this.assignment(result.selectedIndex!, syllables[result.selectedIndex!].stress, { kind: "explicit-secondary" });
  }

  rhythmicIteration(syllableIndex: number, syllables: Syllable[]): RhythmicIteration {
    const observation: RhythmicIteration = {
      syllableIndex, before: stressMark(syllables[syllableIndex].stress),
      left: stressMark(syllables[syllableIndex - 1].stress), right: stressMark(syllables[syllableIndex + 1].stress),
      neighborCheckPerformed: false, skipped: null, draw: null, applied: false,
    };
    this.trace.rhythmic.iterations.push(observation);
    return observation;
  }

  assemble(syllables: Syllable[], rootSyllableStart: number): void {
    this.coordinates = "word";
    this.trace.assembly = { rootSyllableStart, prefixSyllables: rootSyllableStart, suffixSyllables: syllables.length - rootSyllableStart - this.trace.rootSyllableCount };
    const rootOrigins = this.origins;
    this.marks = syllables.map(syllable => stressMark(syllable.stress));
    this.origins = this.marks.map((mark, index) => {
      const rootIndex = index - rootSyllableStart;
      if (rootIndex >= 0 && rootIndex < rootOrigins.length) return { ...rootOrigins[rootIndex] };
      return { kind: mark === "unmarked" ? "unmarked" : "input" };
    });
  }

  affix(role: "prefix" | "suffix", effect: Affix["stressEffect"], indices: number[]): number {
    let status: AffixStressEffect["status"] = "applied";
    if (indices.length === 0) status = "no-realized-syllables";
    else if (effect === "none") status = "none";
    else if (effect === "attract-preceding" && role === "prefix") status = "prefix-attraction-not-applied";
    else if (effect === "attract-preceding" && indices[0] === 0) status = "no-preceding-syllable";
    const id = this.trace.morphology.length;
    this.trace.morphology.push({ id, role, effect, syllableIndices: [...indices], status, eventIds: [] });
    return id;
  }

  snapshot(domain: StressPatternDomain, syllables: Syllable[]): void {
    this.trace.snapshots.push({
      domain, coordinates: this.coordinates, eventCount: this.trace.events.length,
      syllables: syllables.map((syllable, index) => ({
        onset: syllable.onset.map(snapshotPhone), nucleus: syllable.nucleus.map(snapshotPhone), coda: syllable.coda.map(snapshotPhone),
        mark: stressMark(syllable.stress), origin: { ...this.origins[index] },
      })),
    });
  }
}

export type StressPatternInput = { availability: "observed"; marks: readonly StressMark[] } | { availability: "unavailable"; reason: string };
export interface ObservedStressPatternAnalysis {
  availability: "observed";
  syllables: number;
  primaryIndices: number[];
  secondaryIndices: number[];
  adjacencies: Array<{ leftIndex: number; left: "primary" | "secondary"; right: "primary" | "secondary" }>;
  unmarkedRuns: Array<{ start: number; end: number; length: number; position: "whole-word" | "initial" | "internal" | "final" }>;
  secondaryDistances: Array<{ syllableIndex: number; primaries: Array<{ primaryIndex: number; signedDistance: number }> }>;
}

/** Descriptive label proxies, without inferring feet, acoustic prominence or missing historical labels. */
export function analyzeStressPattern(input: StressPatternInput): ObservedStressPatternAnalysis | { availability: "unavailable"; reason: string } {
  if (input.availability === "unavailable") return { ...input };
  const marks = input.marks;
  const primaryIndices = marks.flatMap((mark, index) => mark === "primary" ? [index] : []);
  const secondaryIndices = marks.flatMap((mark, index) => mark === "secondary" ? [index] : []);
  const adjacencies: ObservedStressPatternAnalysis["adjacencies"] = [];
  const unmarkedRuns: ObservedStressPatternAnalysis["unmarkedRuns"] = [];
  for (let index = 0; index < marks.length; index++) {
    const left = marks[index];
    const right = marks[index + 1];
    if (left !== "unmarked" && right && right !== "unmarked") adjacencies.push({ leftIndex: index, left, right });
    if (left !== "unmarked") continue;
    const start = index;
    while (index + 1 < marks.length && marks[index + 1] === "unmarked") index++;
    const initial = start === 0;
    const final = index === marks.length - 1;
    unmarkedRuns.push({ start, end: index, length: index - start + 1, position: initial && final ? "whole-word" : initial ? "initial" : final ? "final" : "internal" });
  }
  return { availability: "observed", syllables: marks.length, primaryIndices, secondaryIndices, adjacencies, unmarkedRuns,
    secondaryDistances: secondaryIndices.map(syllableIndex => ({ syllableIndex, primaries: primaryIndices.map(primaryIndex => ({ primaryIndex, signedDistance: syllableIndex - primaryIndex })) })),
  };
}
