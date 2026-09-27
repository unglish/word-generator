import type { SequenceModel } from "./spelling-sequence-probability.js";
import { planConditionedSequence } from "./spelling-sequence-probability.js";
import type { SpellingSequenceChoice, SpellingSequenceState } from "./spelling-sequence-model.js";

export interface SequenceSelectionEvidence {
  version: 1;
  index: number;
  roll: number;
  before: string;
  after: string;
  choice: SpellingSequenceChoice;
  logOriginalProbability: number;
  logConditionalProbability: number;
  logSequenceMass: number;
}

type SpellingModel = SequenceModel<SpellingSequenceState, SpellingSequenceChoice>;

/** One draw per slot. The caller retains control of interleaved writer operations. */
export function createSequenceEvidenceSession(model: SpellingModel) {
  const plan = planConditionedSequence(model);
  if (!Number.isFinite(plan.logMass)) throw new Error("No legal initial spelling sequence");
  let state = model.initial;
  let index = 0;
  function next(roll: number): SequenceSelectionEvidence {
    if (index >= model.length) throw new Error("Spelling sequence already complete");
    const edge = plan.draw(index, state, roll);
    const evidence: SequenceSelectionEvidence = {
      version: 1, index, roll, before: model.key(state), after: model.key(edge.next),
      choice: { ...edge.choice }, logOriginalProbability: edge.logProbability,
      logConditionalProbability: edge.logConditionalProbability, logSequenceMass: plan.logMass,
    };
    state = edge.next;
    index++;
    return evidence;
  }
  function finish(): void {
    if (index !== model.length || !model.accepts(state)) throw new Error("Incomplete or illegal spelling sequence");
  }
  return { next, finish, states: plan.states, edges: plan.edges };
}

/** Recompute support and the sampled path; records cannot supply their own law. */
export function verifySequenceEvidence(model: SpellingModel, records: readonly SequenceSelectionEvidence[]): void {
  const session = createSequenceEvidenceSession(model);
  for (const record of records) {
    const expected = session.next(record.roll);
    for (const field of ["version", "index", "roll", "before", "after", "logOriginalProbability",
      "logConditionalProbability", "logSequenceMass"] as const) {
      if (record[field] !== expected[field]) throw new Error(`Invalid sequence evidence: ${field}`);
    }
    for (const field of ["inventoryIndex", "selected", "realized", "doublingIncrement"] as const) {
      if (record.choice[field] !== expected.choice[field]) throw new Error(`Invalid sequence choice: ${field}`);
    }
  }
  session.finish();
}
