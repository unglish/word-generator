---
name: verify-root-attempts
description: Check root acceptance, fallback, and rejection accounting when changing retries, pruning, length criteria, or the public generator trace.
---

# Verify root attempt selection

Run `npm run test:root-attempts:model`. The checker enumerates four proposals from nine combinations of phoneme distance and letter penalty, with absent, early, and delayed schedules. Its reference calculation evaluates the full sequence, including proposals that the engine prunes. A fallback must return the first best-scoring proposal and count every executed attempt, even when the winning proposal is early.

The checker uses the actual selector, rejection collector, and public trace projection. The bound includes exact acceptance, relaxed acceptance after two warmup attempts, ties, pruning, and exhaustion. It models the supplied scores. Run the public generator tests for scoring, spelling, RNG consumption, and full-length retries.

## Replay the historical failure

Before `8c7a3421`, the generator passed the selected fallback index to `finishWord` as the retry count. One exhausted public call reported one retry after executing twenty attempts.

In a scratch checkout, replace `this.selection.attemptsExecuted - 1` in `TraceCollector.toTrace` with `this.selection.selectedAttempt`. Run the model. Expect it to reject a full search that returns its first proposal. Restore the executed-count projection and rerun the model.

## Verify the public path

Run `npm test -- src/core/rejection-trace.test.ts src/core/golden-output.test.ts`. The Tests workflow runs the model on every merge into main.

The modeled functions are `chooseRootAttempt` in `src/core/root-attempt-search.ts`, `assessAttempt` and `isDecidedRejection` in `src/core/length-semantics.ts`, `RejectionTraceCollector.finish`, and `TraceCollector.toTrace`. `generateOneWord` connects the selector to the public API. Last confirmed against commit 12d92cfb. When a covered function changes, rerun the historical failure and the restored model, confirm the bounds, and update that commit.
