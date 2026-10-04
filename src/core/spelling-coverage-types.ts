import type { GraphemeSlot } from "./grapheme-selection.js";
import type { DoublingSlot } from "./spelling-doubling.js";
import type { GraphemeReading } from "../types.js";

export interface SpellingBudgetValues {
  consonantGraphemes: number;
  consonantLetters: number;
  finalConsonantLetters: number;
  vowelLetters: number;
}

export type SpellingBudgetKey = keyof SpellingBudgetValues;
export interface SpellingBudgetMeasurement {
  values: SpellingBudgetValues;
  limits: Partial<SpellingBudgetValues>;
  exceeded: SpellingBudgetKey[];
}

/** One member of the complete conditional selection replay, before string edits. */
export interface SpellingChoiceLicense {
  unitId: number;
  inventoryIndex: number;
  selected: string;
  afterDoubling: string;
  graphemeProbability: number;
  doublingProbability: number;
  pool: "ordinary" | "fallback";
  quotaRelaxed: boolean;
}

export interface SpellingUnitReplacement {
  unitId: number;
  phoneIds: number[];
  partId: number;
  inputCellIds: number[];
  before: string;
  after: string;
  reading: GraphemeReading;
}

/** Exact changed-region coverage; no claim about unchanged unresolved cells. */
export interface SpellingCoverageCertificate {
  version: 1;
  id: number;
  inputCellIds: number[];
  before: string;
  after: string;
  replacements: SpellingUnitReplacement[];
  choices: SpellingChoiceLicense[];
  /** Actual writer-boundary context and pre-plan state, retained for independent replay. */
  contexts: Array<{
    slot: GraphemeSlot;
    doubling: Omit<DoublingSlot, "form" | "nucleusForm">;
    inventoryIndex: number;
    afterDoubling: string;
  }>;
  phoneIds: number[];
  logProbability: number;
  budgets: SpellingBudgetMeasurement;
}

export type SpellingBudgetRefusal =
  | "unresolved-ownership"
  | "unknown-reading"
  | "construction-obligation"
  | "no-licensed-plan"
  | "search-budget"
  | "invalid-junction"
  | "normalization-context-unavailable";

interface SpellingBudgetEpisode {
  version: 1;
  scope: "base-before-word-rules" | "base-after-word-rules" | "final-morphology";
  before: SpellingBudgetMeasurement;
  after: SpellingBudgetMeasurement;
  visitedAssignments: number;
  legalOptions: number;
  unresolvedCells: number;
  changedUnits: number[];
}

export type SpellingBudgetOutcome = SpellingBudgetEpisode & (
  | { status: "satisfied" }
  | { status: "respell"; certificateId: number; logProbability: number }
  | { status: "infeasible"; reason: SpellingBudgetRefusal; refusals: Partial<Record<SpellingBudgetRefusal, number>> }
);
