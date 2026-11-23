import { assessAttempt, isDecidedRejection } from "./length-semantics.js";
import type { AcceptanceCriteria, AttemptAssessment, AttemptScore } from "./length-semantics.js";
import type { AttemptLengths, PrunedAttemptLengths } from "./trace.js";

export type AttemptCriteria = AcceptanceCriteria & { maxAttempts: number };

interface RootProposal {
  lengths: PrunedAttemptLengths;
}

interface ScoredAttempt<T> {
  lengths: AttemptLengths;
  score: AttemptScore;
  value: T;
}

export interface RootSelection<T> {
  selected: ScoredAttempt<T>;
  selectedAttempt: number;
  attemptsExecuted: number;
  acceptedBy: AttemptAssessment["acceptedBy"];
}

interface AttemptObserver {
  record(lengths: AttemptLengths, assessment: AttemptAssessment): void;
  recordPruned(lengths: PrunedAttemptLengths): void;
}

export function chooseRootAttempt<P extends RootProposal, T>(
  criteria: AttemptCriteria,
  targetPhonemes: number,
  propose: (attempt: number) => P,
  score: (proposal: P, attempt: number) => ScoredAttempt<T>,
  observer?: AttemptObserver,
): RootSelection<T> {
  let best: { selected: ScoredAttempt<T>; selectedAttempt: number } | undefined;
  for (let attempt = 0; attempt < criteria.maxAttempts; attempt++) {
    const proposal = propose(attempt);
    const bestScore = best?.selected.score.total ?? Infinity;
    if (isDecidedRejection(Math.abs(proposal.lengths.phonemes - targetPhonemes), bestScore)) {
      observer?.recordPruned(proposal.lengths);
      continue;
    }
    const candidate = score(proposal, attempt);
    const assessment = assessAttempt(candidate.score, attempt, criteria);
    observer?.record(candidate.lengths, assessment);
    if (assessment.acceptedBy) {
      return { selected: candidate, selectedAttempt: attempt, attemptsExecuted: attempt + 1, acceptedBy: assessment.acceptedBy };
    }
    if (candidate.score.total < bestScore) {
      best = { selected: candidate, selectedAttempt: attempt };
    }
  }
  if (!best) throw new Error("Failed to generate word");
  return { ...best, attemptsExecuted: criteria.maxAttempts, acceptedBy: null };
}
