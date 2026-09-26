import type { AttemptScore } from "./length-semantics.js";
import type { AttemptLengths, SelectionTrace } from "./trace.js";

/** Observes existing decisions without choosing candidates or consuming randomness. */
export class RejectionTraceCollector {
  private readonly proposals = new Map<string, AttemptLengths & { count: number }>();
  private readonly attempts: Array<AttemptLengths & { score: AttemptScore }> = [];
  private readonly reasons: SelectionTrace["rejectionReasons"] = {
    phonemeTarget: 0, letterLength: 0, warmup: 0, morphologyResolution: 0,
  };
  private rejectedAttempts = 0;

  constructor(
    private readonly targets: SelectionTrace["targets"],
    private readonly criteria: SelectionTrace["criteria"],
  ) {}

  record(lengths: AttemptLengths, score: AttemptScore, accepted: boolean, morphologyResolved: boolean): void {
    const attemptIndex = this.attempts.length;
    this.attempts.push({ ...lengths, score: { ...score } });
    const key = `${lengths.syllables}/${lengths.phonemes}/${lengths.letters}/${lengths.morphologyPhonemes}`;
    const bin = this.proposals.get(key) ?? { ...lengths, count: 0 };
    bin.count++;
    this.proposals.set(key, bin);
    if (accepted) return;

    this.rejectedAttempts++;
    if (score.phonemeDistance !== 0) this.reasons.phonemeTarget++;
    if (score.letterPenalty > this.criteria.relaxedLetterPenalty) this.reasons.letterLength++;
    if (attemptIndex < this.criteria.warmupAttempts && score.letterPenalty > 0) this.reasons.warmup++;
    if (!morphologyResolved) this.reasons.morphologyResolution++;
  }

  finish(selectedAttempt: number, acceptedBy: SelectionTrace["acceptedBy"]): SelectionTrace {
    return {
      status: acceptedBy === null ? "fallback" : "accepted",
      acceptedBy,
      attemptsExecuted: this.attempts.length,
      selectedAttempt,
      rejectedAttempts: this.rejectedAttempts,
      rejectionReasons: { ...this.reasons },
      targets: { ...this.targets },
      criteria: { ...this.criteria },
      selected: this.attempts[selectedAttempt],
      proposedLengths: [...this.proposals.values()],
    };
  }
}
