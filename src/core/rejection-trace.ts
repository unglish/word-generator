import type { AttemptAssessment, AttemptScore } from "./length-semantics.js";
import type { AttemptLengths, SelectionTrace } from "./trace.js";

/** Observes existing decisions without choosing candidates or consuming randomness. */
export class RejectionTraceCollector {
  private readonly proposals = new Map<string, AttemptLengths & { count: number }>();
  private readonly attempts: Array<AttemptLengths & { score: AttemptScore }> = [];
  private readonly reasons: SelectionTrace["rejectionReasons"] = {
    phonemeTarget: 0, letterLength: 0, warmup: 0,
  };
  private rejectedAttempts = 0;

  constructor(
    private readonly criteria: SelectionTrace["criteria"],
  ) {}

  record(lengths: AttemptLengths, score: AttemptScore, assessment: AttemptAssessment): void {
    this.attempts.push({ ...lengths, score: { ...score } });
    const key = `${lengths.syllables}/${lengths.phonemes}/${lengths.letters}`;
    const bin = this.proposals.get(key) ?? { ...lengths, count: 0 };
    bin.count++;
    this.proposals.set(key, bin);
    if (assessment.acceptedBy) return;

    this.rejectedAttempts++;
    if (assessment.failed.phonemeTarget) this.reasons.phonemeTarget++;
    if (assessment.failed.letterLength) this.reasons.letterLength++;
    if (assessment.failed.warmup) this.reasons.warmup++;
  }

  finish(selectedAttempt: number, acceptedBy: SelectionTrace["acceptedBy"]): SelectionTrace {
    return {
      status: acceptedBy === null ? "fallback" : "accepted",
      acceptedBy,
      attemptsExecuted: this.attempts.length,
      selectedAttempt,
      rejectedAttempts: this.rejectedAttempts,
      rejectionReasons: { ...this.reasons },
      criteria: { ...this.criteria },
      selected: this.attempts[selectedAttempt],
      proposedLengths: [...this.proposals.values()],
    };
  }
}
