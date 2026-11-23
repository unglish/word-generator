import assert from "node:assert/strict";
import { RejectionTraceCollector } from "../../../src/core/rejection-trace.js";
import { chooseRootAttempt } from "../../../src/core/root-attempt-search.js";
import { TraceCollector } from "../../../src/core/trace.js";

interface Candidate {
  phonemeDistance: number;
  letterPenalty: number;
}

const candidates = [0, 1, 2].flatMap(phonemeDistance =>
  [0, 0.5, 1].map(letterPenalty => ({ phonemeDistance, letterPenalty })),
);
const criteria = { maxAttempts: 4, warmupAttempts: 2, relaxedLetterPenalty: 0.5 };
const target = 5;

function total(candidate: Candidate): number {
  return candidate.phonemeDistance * 2 + candidate.letterPenalty;
}

function check(sequence: readonly Candidate[]): void {
  const observer = new RejectionTraceCollector(criteria);
  let generated = 0;
  const result = chooseRootAttempt(criteria, target, index => {
    assert.equal(index, generated++);
    const candidate = sequence[index];
    return { candidate, lengths: { syllables: 1, phonemes: target + candidate.phonemeDistance } };
  }, ({ candidate, lengths }, index) => ({
    lengths: { ...lengths, letters: 10 - candidate.letterPenalty * 2 },
    value: index,
    score: { ...candidate, total: total(candidate) },
  }), observer);

  const accepted = sequence.findIndex(({ phonemeDistance, letterPenalty }, index) =>
    phonemeDistance === 0 && (letterPenalty === 0 || (index >= 2 && letterPenalty <= 0.5)),
  );
  const consumed = accepted === -1 ? sequence : sequence.slice(0, accepted + 1);
  const best = accepted === -1
    ? consumed.findIndex(candidate => total(candidate) === Math.min(...consumed.map(total)))
    : accepted;
  const outcome = accepted === -1 ? null : sequence[accepted].letterPenalty === 0 ? "exact" : "relaxed";
  const expectedPruned = consumed.filter(({ phonemeDistance }, index) =>
    phonemeDistance > 0 && consumed.slice(0, index).some(previous => total(previous) <= phonemeDistance * 2),
  ).length;

  const traceCollector = new TraceCollector();
  const selection = observer.finish(result);
  traceCollector.selection = selection;
  const trace = traceCollector.toTrace(false);
  assert.equal(generated, consumed.length);
  assert.equal(trace.attempts, consumed.length - 1, "Trace retries count executed attempts, even when an earlier fallback wins");
  assert.equal(selection.attemptsExecuted, consumed.length);
  assert.equal(selection.selectedAttempt, best);
  assert.equal(selection.acceptedBy, outcome);
  assert.equal(selection.rejectedAttempts, consumed.length - Number(accepted !== -1));
  assert.equal(result.selected.value, best);
  assert.equal(selection.selected.score.total, total(sequence[best]));
  assert.equal(selection.prunedLengths.reduce((count, proposal) => count + proposal.count, 0), expectedPruned);
  assert.equal(selection.proposedLengths.reduce((count, proposal) => count + proposal.count, 0), consumed.length - expectedPruned);
}

let checked = 0;
function visit(sequence: readonly Candidate[]): void {
  if (sequence.length < criteria.maxAttempts) {
    for (const candidate of candidates) visit([...sequence, candidate]);
    return;
  }
  try {
    check(sequence);
  } catch (error) {
    throw new Error(`Root attempt counterexample with scores ${JSON.stringify(sequence)}`, { cause: error });
  }
  checked++;
}

visit([]);
console.log(`Root attempt search verified across ${checked} proposal sequences.`);
