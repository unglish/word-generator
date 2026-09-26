import type { Affix, ResolvedStressRules } from "../config/language.js";
import type { Phoneme, Syllable } from "../types.js";
import type { RootPatternSample, RootStressLawInput } from "./root-stress-law-types.js";
import { RootStressLawError } from "./root-stress-law-types.js";
import { stressMark } from "./stress-pattern.js";
import type { AffixStressEffect, RhythmicIteration, StressAssignmentCause, StressMark, StressPatternTrace, StressPhoneSnapshot } from "./stress-pattern.js";
import type { SyllableWeightAnalysis, StressWeightTrace } from "./syllable-weight.js";

export type SharedAppliedStressDomain = "assembled-after-morphology" | "final-lexical-before-realization" | "surface-after-realization";
type MorphologyCause = Extract<StressAssignmentCause, { kind: "morphology" }>;
/** Only actual assembled-word operations are shared between v1 and v2. */
export interface AppliedStressObserver {
  assemble(syllables: Syllable[], rootSyllableStart: number): void;
  affix(role: "prefix" | "suffix", effect: Affix["stressEffect"], indices: number[]): number;
  assignment(syllableIndex: number, stress: Syllable["stress"], cause: MorphologyCause): void;
  snapshot(domain: SharedAppliedStressDomain, syllables: Syllable[]): void;
}

export interface RhythmicStepSink {
  skipped(reason: "already-marked" | "marked-neighbor"): void;
  checkedNeighbors(): void;
  gate(draw: number, assigned: boolean): void;
  assigned(): void;
}
export type RhythmicSink = (index: number, syllables: Syllable[]) => RhythmicStepSink;
export type ProposalRhythmicIteration = Omit<RhythmicIteration, "applied"> & { assignedInProposal: boolean };
export type ProposalSecondary = Omit<StressPatternTrace["explicitSecondary"], "applied"> & { assignedInProposal: boolean };
export interface ProposalAssignment {
  proposalEventId: number;
  syllableIndex: number;
  before: "unmarked";
  after: "secondary";
  cause: { kind: "explicit-secondary" } | { kind: "rhythmic"; iteration: number };
}
export interface LegacyRootProposal {
  target: "detached-proposal";
  sourceAppliedSnapshot: "root-after-primary";
  explicitSecondary: ProposalSecondary;
  rhythmic: { enabled: boolean; probability: number; requireUnstressedNeighbors: boolean; iterations: ProposalRhythmicIteration[] };
  assignments: ProposalAssignment[];
  snapshots: [
    { phase: "after-explicit-secondary"; proposalEventCount: number; marks: StressMark[] },
    { phase: "after-rhythm"; proposalEventCount: number; marks: StressMark[] },
  ];
  secondaryCount: number;
}
export type AppliedOriginV2 = { kind: "unmarked" } | { kind: "event"; eventId: number };
export type AppliedCauseV2 = { kind: "root-primary" } | { kind: "root-pattern-sampler"; decisionId: 0 } | MorphologyCause;
export interface AppliedAssignmentV2 {
  id: number;
  coordinates: "root" | "word";
  syllableIndex: number;
  before: StressMark;
  previousOrigin: AppliedOriginV2;
  after: StressMark;
  cause: AppliedCauseV2;
}
export type ConditionalStressDomain = "root-before-primary" | "root-after-primary" | "root-after-pattern-application" | SharedAppliedStressDomain;
export interface AppliedSnapshotV2<D extends ConditionalStressDomain = ConditionalStressDomain> {
  domain: D;
  coordinates: D extends `root-${string}` ? "root" : "word";
  eventCount: number;
  syllables: Array<{ onset: StressPhoneSnapshot[]; nucleus: StressPhoneSnapshot[]; coda: StressPhoneSnapshot[]; mark: StressMark; origin: AppliedOriginV2 }>;
}
export interface RootPatternDecision {
  decisionId: 0;
  policy: {
    model: "legacy-continuous-uniform-v1";
    score: "adjacent-marked-pairs";
    lambda: number;
    numericalContract: "binary64-log-chain-v1";
    countSource: "actual-legacy-proposal";
  };
  proposal: LegacyRootProposal;
  sampling: {
    algorithm: "component-mixture-backward-chain-v1";
    targetSecondaryCount: number;
    components: RootPatternSample["count"]["components"];
    logPartitionAtK: number;
    componentDraws: RootPatternSample["componentDraws"];
    selectedComponentIndex: number;
    componentTermination: RootPatternSample["componentTermination"];
    backward: RootPatternSample["backward"];
    selectedPatternPriorLogMass: number;
    selectedPatternConditionalLogMass: number;
  };
  application: { secondaryIndices: number[]; appliedEventIds: number[]; adjacentMarkedPairs: number };
}
export interface ConditionalStressPatternTrace {
  version: 2;
  execution: "count-conditioned-root-pattern";
  scope: "returned-attempt";
  rootSyllableCount: number;
  primary: { strategy: ResolvedStressRules["primary"]["type"]; selectedIndex: number; draws: number[] };
  weightInput: { domain: "root-before-primary"; policy: StressWeightTrace["policy"]; syllables: SyllableWeightAnalysis[] };
  rootPattern: RootPatternDecision;
  assembly: { rootSyllableStart: number; prefixSyllables: number; suffixSyllables: number };
  morphology: AffixStressEffect[];
  events: AppliedAssignmentV2[];
  snapshots: [
    AppliedSnapshotV2<"root-before-primary">, AppliedSnapshotV2<"root-after-primary">,
    AppliedSnapshotV2<"root-after-pattern-application">, AppliedSnapshotV2<"assembled-after-morphology">,
    AppliedSnapshotV2<"final-lexical-before-realization">, AppliedSnapshotV2<"surface-after-realization">,
  ];
}
export type WordStressPatternTrace = StressPatternTrace | ConditionalStressPatternTrace;

/** Validate raw marks before the legacy convenience classifier can collapse them. */
export function conditionalMarks(syllables: Syllable[], phase: "before-primary" | "after-primary"): StressMark[] {
  const marks = syllables.map(syllable => {
    if (syllable.stress === undefined) return "unmarked" as const;
    if (phase === "after-primary" && syllable.stress === "ˈ") return "primary" as const;
    throw new RootStressLawError("invalid-input", `Unsupported ${phase} root stress mark.`);
  });
  const primaryCount = marks.filter(mark => mark === "primary").length;
  if (!marks.length || primaryCount !== (phase === "after-primary" ? 1 : 0)) {
    throw new RootStressLawError("invalid-input", `Unsupported ${phase} root stress domain.`);
  }
  return marks;
}
export function conditionalLawInput(beforePrimary: StressMark[], syllables: Syllable[], analysis: readonly SyllableWeightAnalysis[], rules: ResolvedStressRules, lambda: number): RootStressLawInput {
  return { beforePrimary, afterPrimary: conditionalMarks(syllables, "after-primary"),
    operationalHeavy: analysis.map(syllable => syllable.operational.weight === "heavy"),
    secondary: { ...rules.secondary }, rhythmic: { ...rules.rhythmic }, lambda };
}

/** This collector describes assignments to a detached proposal, never the word. */
export class RootProposalObserver {
  private readonly assignments: ProposalAssignment[] = [];
  private readonly iterations: ProposalRhythmicIteration[] = [];
  private secondaryResult?: ProposalSecondary;
  private afterExplicit?: LegacyRootProposal["snapshots"][0];
  constructor(private readonly rules: ResolvedStressRules) {}

  secondary(result: StressWeightTrace["secondary"], draws: number[], syllables: Syllable[]): void {
    let skipped: ProposalSecondary["skipped"] = null;
    if (syllables.length <= 1) skipped = "monosyllabic";
    else if (!this.rules.secondary.enabled) skipped = "disabled";
    else if (!result.candidates.length) skipped = "no-candidates";
    this.secondaryResult = { enabled: this.rules.secondary.enabled, candidateWindow: this.rules.secondary.candidateWindow,
      probability: this.rules.secondary.probability, candidates: result.candidates.map(candidate => ({ ...candidate })),
      selectedIndex: result.selectedIndex, assignedInProposal: result.applied,
      selectionDraw: draws[0] ?? null, gateDraw: draws[1] ?? null, skipped };
    if (result.applied) this.assignment(result.selectedIndex!, { kind: "explicit-secondary" });
    this.afterExplicit = { phase: "after-explicit-secondary", proposalEventCount: this.assignments.length, marks: syllables.map(syllable => stressMark(syllable.stress)) };
  }

  private assignment(index: number, cause: ProposalAssignment["cause"]): void {
    this.assignments.push({ proposalEventId: this.assignments.length, syllableIndex: index, before: "unmarked", after: "secondary", cause });
  }

  readonly rhythm: RhythmicSink = (index, syllables) => {
    const iteration = this.iterations.length;
    const observation: ProposalRhythmicIteration = { syllableIndex: index, before: stressMark(syllables[index].stress),
      left: stressMark(syllables[index - 1].stress), right: stressMark(syllables[index + 1].stress),
      neighborCheckPerformed: false, skipped: null, draw: null, assignedInProposal: false };
    this.iterations.push(observation);
    return {
      skipped: reason => { observation.skipped = reason; },
      checkedNeighbors: () => { observation.neighborCheckPerformed = true; },
      gate: (draw, assigned) => { observation.draw = draw; observation.assignedInProposal = assigned; },
      assigned: () => { this.assignment(index, { kind: "rhythmic", iteration }); },
    };
  };

  finish(syllables: Syllable[]): LegacyRootProposal {
    if (!this.secondaryResult || !this.afterExplicit) throw new Error("Incomplete root proposal observation");
    const marks = syllables.map(syllable => stressMark(syllable.stress));
    const secondaryCount = marks.filter(mark => mark === "secondary").length;
    if (secondaryCount !== this.assignments.length) throw new Error("Root proposal assignment count mismatch");
    return structuredClone({ target: "detached-proposal", sourceAppliedSnapshot: "root-after-primary",
      explicitSecondary: this.secondaryResult, rhythmic: { ...this.rules.rhythmic, iterations: this.iterations },
      assignments: this.assignments, snapshots: [this.afterExplicit,
        { phase: "after-rhythm", proposalEventCount: this.assignments.length, marks }], secondaryCount });
  }
}

function phoneSnapshot(phone: Phoneme): StressPhoneSnapshot {
  return { sound: phone.sound, ...(phone.nuclearQuantity ? { nuclearQuantity: { ...phone.nuclearQuantity } } : {}),
    ...(phone.reduced !== undefined ? { reduced: phone.reduced } : {}),
    ...(phone.aspirated !== undefined ? { aspirated: phone.aspirated } : {}) };
}

/** Passive applied ledger. Proposal events cannot be used as applied origins. */
export class ConditionalStressPatternObserver implements AppliedStressObserver {
  readonly primaryDraws: number[] = [];
  private readonly events: AppliedAssignmentV2[] = [];
  private readonly morphology: AffixStressEffect[] = [];
  private marks: StressMark[];
  private origins: AppliedOriginV2[];
  private coordinates: "root" | "word" = "root";
  private primaryIndex?: number;
  private decision?: RootPatternDecision;
  private assembly?: ConditionalStressPatternTrace["assembly"];
  private readonly beforePrimary: AppliedSnapshotV2<"root-before-primary">;
  private afterPrimary?: AppliedSnapshotV2<"root-after-primary">;
  private afterApplication?: AppliedSnapshotV2<"root-after-pattern-application">;
  private assembled?: AppliedSnapshotV2<"assembled-after-morphology">;
  private lexical?: AppliedSnapshotV2<"final-lexical-before-realization">;
  private surface?: AppliedSnapshotV2<"surface-after-realization">;
  private readonly weightInput: ConditionalStressPatternTrace["weightInput"];
  private readonly rootSyllableCount: number;
  private readonly primaryStrategy: ResolvedStressRules["primary"]["type"];

  constructor(syllables: Syllable[], rules: ResolvedStressRules, analysis: SyllableWeightAnalysis[]) {
    this.marks = conditionalMarks(syllables, "before-primary");
    this.origins = this.marks.map(() => ({ kind: "unmarked" }));
    this.rootSyllableCount = syllables.length;
    this.primaryStrategy = rules.primary.type;
    this.weightInput = structuredClone({ domain: "root-before-primary", policy: rules.syllableWeight, syllables: analysis });
    this.beforePrimary = this.rootSnapshot("root-before-primary", syllables);
  }

  private snapshotSyllables(syllables: Syllable[]): AppliedSnapshotV2["syllables"] {
    return syllables.map((syllable, index) => ({ onset: syllable.onset.map(phoneSnapshot), nucleus: syllable.nucleus.map(phoneSnapshot),
      coda: syllable.coda.map(phoneSnapshot), mark: stressMark(syllable.stress), origin: { ...this.origins[index] } }));
  }
  private rootSnapshot<D extends "root-before-primary" | "root-after-primary" | "root-after-pattern-application">(domain: D, syllables: Syllable[]): AppliedSnapshotV2<D> {
    return { domain, coordinates: "root", eventCount: this.events.length, syllables: this.snapshotSyllables(syllables) } as AppliedSnapshotV2<D>;
  }

  primary(index: number, syllables: Syllable[]): void {
    this.primaryIndex = index;
    this.assignment(index, "ˈ", { kind: "root-primary" });
    this.afterPrimary = this.rootSnapshot("root-after-primary", syllables);
  }

  assignment(syllableIndex: number, stress: Syllable["stress"], cause: AppliedCauseV2): void {
    const id = this.events.length;
    const after = stressMark(stress);
    this.events.push({ id, coordinates: this.coordinates, syllableIndex, before: this.marks[syllableIndex],
      previousOrigin: { ...this.origins[syllableIndex] }, after, cause: { ...cause } });
    this.marks[syllableIndex] = after;
    this.origins[syllableIndex] = { kind: "event", eventId: id };
    if (cause.kind === "morphology") this.morphology[cause.effectId].eventIds.push(id);
  }

  rootApplied(lambda: number, proposal: LegacyRootProposal, sample: RootPatternSample, syllables: Syllable[]): void {
    if (sample.count.logPartition.status !== "finite") throw new Error("Sampled an unsupported root count");
    const secondaryIndices = sample.marks.flatMap((mark, index) => mark === "secondary" ? [index] : []);
    const adjacentMarkedPairs = sample.marks.slice(1).filter((mark, index) => mark !== "unmarked" && sample.marks[index] !== "unmarked").length;
    this.decision = structuredClone({ decisionId: 0,
      policy: { model: "legacy-continuous-uniform-v1", score: "adjacent-marked-pairs", lambda,
        numericalContract: "binary64-log-chain-v1", countSource: "actual-legacy-proposal" },
      proposal, sampling: { algorithm: "component-mixture-backward-chain-v1", targetSecondaryCount: proposal.secondaryCount,
        components: sample.count.components, logPartitionAtK: sample.count.logPartition.value,
        componentDraws: sample.componentDraws, selectedComponentIndex: sample.selectedComponentIndex,
        componentTermination: sample.componentTermination, backward: sample.backward,
        selectedPatternPriorLogMass: sample.selectedPatternPriorLogMass, selectedPatternConditionalLogMass: sample.selectedPatternConditionalLogMass },
      application: { secondaryIndices, appliedEventIds: this.events.filter(event => event.cause.kind === "root-pattern-sampler").map(event => event.id), adjacentMarkedPairs } });
    this.afterApplication = this.rootSnapshot("root-after-pattern-application", syllables);
  }

  assemble(syllables: Syllable[], rootSyllableStart: number): void {
    this.coordinates = "word";
    this.assembly = { rootSyllableStart, prefixSyllables: rootSyllableStart,
      suffixSyllables: syllables.length - rootSyllableStart - this.rootSyllableCount };
    const rootOrigins = this.origins;
    this.marks = syllables.map(syllable => stressMark(syllable.stress));
    this.origins = this.marks.map((mark, index) => {
      const rootIndex = index - rootSyllableStart;
      if (rootIndex >= 0 && rootIndex < rootOrigins.length) return { ...rootOrigins[rootIndex] };
      if (mark !== "unmarked") throw new Error("Unsupported premarked affix in conditional stress trace");
      return { kind: "unmarked" };
    });
  }

  affix(role: "prefix" | "suffix", effect: Affix["stressEffect"], indices: number[]): number {
    let status: AffixStressEffect["status"] = "applied";
    if (!indices.length) status = "no-realized-syllables";
    else if (effect === "none") status = "none";
    else if (effect === "attract-preceding" && role === "prefix") status = "prefix-attraction-not-applied";
    else if (effect === "attract-preceding" && indices[0] === 0) status = "no-preceding-syllable";
    const id = this.morphology.length;
    this.morphology.push({ id, role, effect, syllableIndices: [...indices], status, eventIds: [] });
    return id;
  }

  snapshot(domain: SharedAppliedStressDomain, syllables: Syllable[]): void {
    const data = { coordinates: "word" as const, eventCount: this.events.length, syllables: this.snapshotSyllables(syllables) };
    if (domain === "assembled-after-morphology") this.assembled = { domain, ...data };
    else if (domain === "final-lexical-before-realization") this.lexical = { domain, ...data };
    else this.surface = { domain, ...data };
  }

  toTrace(): ConditionalStressPatternTrace {
    if (this.primaryIndex === undefined || !this.decision || !this.assembly || !this.afterPrimary || !this.afterApplication || !this.assembled || !this.lexical || !this.surface) {
      throw new Error("Incomplete conditional stress-pattern trace");
    }
    return structuredClone({ version: 2, execution: "count-conditioned-root-pattern", scope: "returned-attempt",
      rootSyllableCount: this.rootSyllableCount, primary: { strategy: this.primaryStrategy, selectedIndex: this.primaryIndex, draws: this.primaryDraws },
      weightInput: this.weightInput, rootPattern: this.decision, assembly: this.assembly,
      morphology: this.morphology, events: this.events,
      snapshots: [this.beforePrimary, this.afterPrimary, this.afterApplication, this.assembled, this.lexical, this.surface] });
  }
}
