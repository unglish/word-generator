import type { StressMark } from "./stress-pattern.js";
import type { RNG } from "../utils/random.js";

/** A real-valued decision model, not a distribution over finite RNG seeds. */
export interface RootStressLawInput {
  beforePrimary: readonly StressMark[];
  afterPrimary: readonly StressMark[];
  operationalHeavy: readonly boolean[];
  secondary: {
    enabled: boolean;
    candidateWindow: "first-three" | "all-nonprimary";
    probability: number;
    heavyWeight: number;
    lightWeight: number;
  };
  rhythmic: { enabled: boolean; probability: number; requireUnstressedNeighbors: boolean };
  lambda: number;
}

export type RootLogMass = { status: "zero" } | { status: "finite"; value: number };
export type RootStressComponent = { kind: "no-explicit-mark" } | { kind: "explicit-mark"; syllableIndex: number };
export interface RootComponentMass {
  component: RootStressComponent;
  prior: RootLogMass;
  /** Includes the component's prior; not normalized by the count probability. */
  tiltedMassAtK: RootLogMass;
}
/** DP arithmetic/allocation counters, not heap or wall-clock measurements. */
export interface RootLawWork {
  componentPasses: number;
  positions: number;
  statesVisited: number;
  transitionsConsidered: number;
  /** Sum of allocated DP numeric cells, including recomputation for sampling. */
  allocatedCells: number;
  peakRetainedCells: number;
}
export interface RootCountAnalysis {
  secondaryCount: number;
  logPartition: RootLogMass;
  components: RootComponentMass[];
  work: RootLawWork;
}
export interface RootPatternMass {
  secondaryCount: number;
  adjacentMarkedPairs: number;
  priorLogMass: RootLogMass;
  tiltedLogMass: RootLogMass;
}
export interface RootComponentDraw {
  candidateIndex: number;
  remainingFromIndex: number;
  logCandidateMass: number;
  logRemainingMass: number;
  uniform: number;
  drawOrdinal: number;
  takeCandidate: boolean;
}
export type RootBackwardChoice = {
  kind: "forced";
  syllableIndex: number;
  previousMarked: boolean;
  /** Count still present in positions 0 through syllableIndex, before this step. */
  remainingSecondaryCount: number;
} | {
  kind: "drawn";
  syllableIndex: number;
  previousMarked: boolean;
  remainingSecondaryCount: number;
  logUnmarkedMass: number;
  logMarkedMass: number;
  uniform: number;
  drawOrdinal: number;
};
export interface RootPatternSample {
  marks: StressMark[];
  count: RootCountAnalysis;
  selectedComponentIndex: number;
  componentTermination: "accepted-candidate" | "last-positive" | "only-positive";
  componentDraws: RootComponentDraw[];
  backward: RootBackwardChoice[];
  selectedPatternPriorLogMass: number;
  selectedPatternConditionalLogMass: number;
  work: RootLawWork;
}

/** Methods return fresh data. Mutating inputs or results cannot change this law. */
export interface RootStressLaw {
  analyzeCount(secondaryCount: number): RootCountAnalysis;
  analyzePattern(marks: readonly StressMark[]): RootPatternMass;
  /** A well-formed zero-support count throws instead of falling back. */
  sample(secondaryCount: number, rand: RNG): RootPatternSample;
}

export type RootStressLawErrorCode = "invalid-input" | "unsupported-numerical-range" | "zero-support" | "invalid-rng";
export class RootStressLawError extends Error {
  constructor(readonly code: RootStressLawErrorCode, message: string) {
    super(message);
    this.name = "RootStressLawError";
  }
}
