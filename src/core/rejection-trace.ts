import type { AttemptAssessment } from "./length-semantics.js";
import type { AttemptCriteria, RootSelection } from "./root-attempt-search.js";
import type { AttemptLengths, PrunedAttemptLengths, SelectionTrace } from "./trace.js";

export class RejectionTraceCollector {
  private readonly proposals = new Map<string, AttemptLengths & { count: number }>();
  private readonly pruned = new Map<string, PrunedAttemptLengths & { count: number }>();
  private readonly reasons: SelectionTrace["rejectionReasons"] = {
    phonemeTarget: 0, letterLength: 0, warmup: 0,
  };

  constructor(private readonly criteria: AttemptCriteria) {}

  record(lengths: AttemptLengths, assessment: AttemptAssessment): void {
    const key = `${lengths.syllables}/${lengths.phonemes}/${lengths.letters}`;
    const bin = this.proposals.get(key) ?? { ...lengths, count: 0 };
    bin.count++;
    this.proposals.set(key, bin);
    if (assessment.acceptedBy) return;

    if (assessment.failed.phonemeTarget) this.reasons.phonemeTarget++;
    if (assessment.failed.letterLength) this.reasons.letterLength++;
    if (assessment.failed.warmup) this.reasons.warmup++;
  }

  recordPruned(lengths: PrunedAttemptLengths): void {
    const key = `${lengths.syllables}/${lengths.phonemes}`;
    const bin = this.pruned.get(key) ?? { ...lengths, count: 0 };
    bin.count++;
    this.pruned.set(key, bin);
    this.reasons.phonemeTarget++;
  }

  finish({ selected, selectedAttempt, attemptsExecuted, acceptedBy }: RootSelection<unknown>): SelectionTrace {
    return {
      status: acceptedBy === null ? "fallback" : "accepted",
      acceptedBy,
      attemptsExecuted,
      selectedAttempt,
      rejectedAttempts: attemptsExecuted - Number(acceptedBy !== null),
      rejectionReasons: { ...this.reasons },
      criteria: { ...this.criteria },
      selected: { ...selected.lengths, score: { ...selected.score } },
      proposedLengths: [...this.proposals.values()],
      prunedLengths: [...this.pruned.values()],
    };
  }
}
