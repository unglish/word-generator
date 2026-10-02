# Add opt-in following-letter constraints for soft c and g

Soft `/s/` written as `c` or `sc`, and `/dʒ/` written as `g`, can currently be
selected before incompatible letters. In the 200,000-word immediate control,
2,065 of 6,736 initially single-owned target units have incompatible contexts;
2,029 remain incompatible at the root boundary.

This change adds an opt-in initial-sequence sampler conditioned on the declared
following-letter requirements. It considers joint grapheme and doubling choices,
uses continuation probabilities instead of retry limits, and records replayable
selection evidence. Generic edits and atomic edit batches reject changes that
would invalidate a preserved target reading. Existing completion, normalization,
shared and split construction checks continue to enforce their reading rules.

The sampling law covers initial realized selections, not the whole writer or
final morphology. Joint ownership, missing evidence and licensed exceptions keep
separate outcomes. The feature remains experimental and disabled by default.

## Evidence available

- Full structural analysis and independent recount pass across 200,000 words:
  2,018,528 events and 41,278,786 integer comparisons in 791 groups.
  Initial incompatible target contexts: 2,065/6,736 in the control versus
  0/4,803 in the candidate. Final-root incompatible targets: 2,029 versus zero.
  Nineteen initial candidate targets become jointly owned and remain a separate
  outcome. The recount verifies accounting, not conditional probabilities or
  inherited semantic licenses; production replay checks the selection law.
- Registered 200,000-word candidate capture completed with unchanged source and
  runtime inputs; all 25 artifacts verified.
- Immediate control fully recovered with all 25 original artifact hashes;
  original-baseline words recovered with all 20 original shard hashes.
- Three-way broad comparisons use the same evaluator, protocol and references.
  Trigram divergence increases in all four profiles against both baselines.
  Unique spellings decrease in three profiles versus the immediate control.
- Enabled quality suite: 10 passing, two failing tests. Five-consonant runs are
  86 versus the parent's 82; `owngs` occurrences are 49 versus 61 (50,000 words).
- 27 focused tests and strict TypeScript checks pass. Fresh omitted-policy parity
  passes 2,000 comparisons / 4,000 public calls, including full traces, RNG call
  counts and 2,000 next-value probes.
- Default full suite: 1,018 passes, four assertion failures matching the parent,
  four skips, plus a phonotactic hook timeout under load. The isolated phonotactic
  suite passes all 14 tests with the original timeout.

## Performance and evidence packaging

The fixed six-pair performance series is complete: median paired throughput
change is -50.75%. Both arms fail all six absolute speed gates and pass all six
variance gates. Final evidence packaging is committed in `evidence/index.json`;
all 64 indexed artifact hashes were reverified on October 2, 2026.
No overall linguistic-quality gain or promotion recommendation is established.

The intended base is Q14a commit f284fb8c3321606f2a1cc3d61a5aad029c7f018f.
This is an experimental candidate for draft PR review. The index is the
authority for the retained measurement files and their hashes.
