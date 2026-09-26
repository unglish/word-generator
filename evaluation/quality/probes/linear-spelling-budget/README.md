# Linear spelling budget scan: preregistered performance revision

This experiment compares a budget-scan optimization directly with the frozen Q13
candidate, commit `973406761e17f9b1795ba519a694cade68a7c2db` (#328). The intended
change is limited to `measureSpellingBudgets` and its unused import. The tokenizer,
shared token classifier, caps, reading contracts, search order/counters, 8,192-state
bound, and snapshots remain unchanged. No output-quality change is expected.

`protocol.json` records the exact hypothesis, schedules and acceptance criteria.
`cases.ts` defines 248,042 differential measurements: 11,111 UTF-16 strings across
22 configurations, plus 3,600 limit-edge cases. `reference.ts` is the original
spelling-budget module with only import paths relocated. The source fixture adds
hand expectations, contextual/terminal y, custom-list mutation, getter order and
detached-result checks. Terminal y retains its current consonant classification.
Undefined and empty custom token lists remain distinct.

The first checkpoint records these definitions and the original runtime hashes
before the runtime edit. Run the focused fixture before and after the edit:

```sh
npx vitest run src/core/spelling-budget.test.ts
```

After source review, compare all four original/proposed × trace-on/off paths over
the frozen 200,000-coordinate development schedule: 800,000 public generator calls.
Full traces, per-draw RNG counts, end-of-stream next RNG values, certificates and
all archived Q13 outputs must match exactly. Per-draw call counts bind the state of
the unchanged seeded RNG without inserting extra draws into the archive schedule.
Reuse the existing omitted-policy/custom/mutation schedule and adversarial ledger
fixtures. Original archives and frozen evaluator/observer definitions stay intact.

Only after parity and a parent-reserved idle interval, run six fixed pairs in the
order A/B, B/A, A/B, B/A, A/B, B/A. Each is a fresh execution of the unchanged perf
suite. Retain every result. A local improvement requires median paired B/A >1 and
at least five positive pairs; report the unchanged 4,500 words/sec floor separately.
No extra tuning follows a missed floor. Existing quality failures are preserved,
not waived or renamed. A scan accounting for 6–8% of sampled work cannot explain
or recover the whole previous throughput regression.
