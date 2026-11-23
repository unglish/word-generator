---
name: verify-review-continuation
description: Check durable review batches when changing the browser store, response outbox, retry handling, or Supabase continuation RPC.
---

# Verify review continuation

Run `npm run test:review:model` after changing how the browser stores or resumes review batches. The previous batch must keep its identity until the database acknowledges the continuation. Losing that identity lets the browser start an unrelated batch and show spellings the reviewer has already seen.

The checker in `evaluation/review/verification/check-continuation.ts` explores two tabs, two one-word batches, duplicate or delayed replies, and reloads between transactions. It enumerates the outgoing transitions from every reachable modeled state and replays the shortest path to each transition against the production `ReviewStore`. Each store write is one IndexedDB transaction. The checker uses fake-indexeddb from the lockfile and assumes the server returns one successor per completed batch. The bound covers safety through a finite set of replies. It leaves server concurrency, browser scheduling within transactions, and eventual network delivery to the integration checks.

## Reproduce the historical failure

In a scratch checkout, open `git show 3fd474dc:demo/review/local.ts` and find `nextBatch`. Restore its `return this.newSession();` in place of the state update that marks the completed session as continuing. Run `npm run test:review:model`. Expect a counterexample that ends at the first request for the next batch. The stored identity changes before a reply can arrive. Restore the current transition and rerun the checker.

## Verify the database and browser

Start the local stack with `npx supabase start`. Run `npm run test:review:db` to check concurrent retries, private responses, and anonymous access. Run `npm run test:review:smoke` to check that Chromium recovers the exact batch committed by Supabase after a lost reply and that pool exhaustion survives reload. Both commands use synthetic studies. The Tests workflow runs the model. The Review E2E workflow runs the database, browser, and smoke checks.

## Keep the check current

The model covers `ReviewStore.ensure`, `receive`, `enqueue`, `acknowledge`, and `nextBatch`, plus `pendingReviewRequest` and `latestSession` in `demo/review/local.ts`. Its server assumptions come from `private.start_review` and `private.continue_review` in `supabase/migrations/20260906000000_review_chains.sql` and the submission RPC in `supabase/migrations/20260905000000_review_v2.sql`. The browser flow runs through `ReviewApi.request` and `startSession`.

Last confirmed against commit `1f228e18`. If a covered function changes, compare its transaction or reply boundary with the modeled action, rerun both the historical failure and the passing check, and update the commit here.
