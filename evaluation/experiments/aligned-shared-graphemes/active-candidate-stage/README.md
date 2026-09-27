# Registered active English candidate

The English configuration enables the exact preregistered ks-to-x, gz-to-x and
cw-to-qu structured policy. No rules, probabilities, constraints or thresholds
were tuned from these results. The default-activation change is experimental;
formal corpus and paired timing measurements remain outstanding.

Legacy and isolated fixtures that remove predecessor spelling rules or reading
policy now explicitly omit sharedSpellings. Their assertions are unchanged.
Missing-configuration verifier fixtures explicitly omit the now-active policy.
Both control and active-candidate bounded archives pass production analysis and
independent Python recount, including rehashed-corruption rejection.

Validation:
- Final full suite: 921 passes, 4 failures, 1 skip. No timeout or setup failure.
  The failures remain consonant grapheme runs 9/100k, letter runs 28/100k,
  custom max-three grapheme runs 43/10k, and ck+another double 6 against a limit of 5.
- Dedicated quality: 11 passes, 1 failure (63 five-consonant words in 50,000).
- Measurement suite: 51 passes. Fixture migration rerun: all 322 tests pass.
- Strict TypeScript with incremental:false and changed-source/test lint pass.
- Initial full-suite fixture failures and sandbox report/build-info write errors
  are retained. Scoped report-write access and nonincremental type checking
  resolved those environment errors; no quality threshold was changed.

The public 20,000-word smoke sample (seed 129, mixed morphology/modes) forms ks→x 68,
gz→x 11 and cw→qu 115 times. All root ledgers pass production schedule/license
verification and all five structural-violation counts remain zero. Three complete
first witnesses are retained. This smoke sample is not a frozen quality corpus.

Final-source legacy parity against exact #338 passes 20,768 coordinates and 83,072
public calls, including all 20,000 registered coordinates and 768 custom ones.
All 32 streams preserve complete word/trace values, RNG counts and 128 next-value
probes. Its source, engine, runner, protocol and registration pins are retained;
installed loader dependencies are shared locally, not a hermetic runtime claim.
Earlier predecessor parity evidence remains unchanged.

The upcoming capture freezes the full source/tool/reference/runtime/dependency
closure before generation. No performance, corpus distribution, final-word
pronunciation or human-preference improvement is inferred from these checks.
