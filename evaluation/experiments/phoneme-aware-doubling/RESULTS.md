# Q12c: phoneme-aware doubling

**Draft: the targeted sound/spelling mismatch is removed in the frozen sample;
existing quality failures and mixed broader effects remain.**

The predecessor doubles by selected spelling alone. It can therefore expand
c selected for /s/ to ck, or s selected for /z/ or /ʃ/ to ss. The new English
policy declares fourteen sound/selected/result relations and carries each
resulting reading into coverage and normalization. Unsupported relations do
not consume a doubling draw. The existing stress, position, probability and
quota guards remain. An omitted structured policy preserves legacy custom
configuration behavior; the documented opt-out is `realizations: undefined`.

Read `src/core/spelling-doubling.ts`, `src/elements/graphemes/doubling.ts`, then
the reading propagation changes in spelling coverage and normalization. The
runtime implementation is commit 91fd20a; later commits add measurement tools
and evidence. No generator source changed after candidate capture.

## Evidence

| Measure | Exact #335 control | Candidate |
|---|---:|---:|
| Development words | 200,000 | 200,000 |
| Sampled doubling successes | 17,362 | 15,969 |
| Unsupported ordinary-policy expansions | 1,682 | 0 |
| Sampled /s/:c→ck | 220 | 0 |
| Raw five-consonant words | 252 | 247 |
| Unresolved spelling cells | 63,911 | 63,938 |
| Search-budget-refusal words | 1 | 2 |
| Local speed-floor passes | 0/6 | 6/6 |

The independent doubling recount checks all 400,000 control/candidate words,
131,621 integer comparisons and 119 complete first witnesses. Per-stream,
length, resolved-affix and morphology groups remain explicit and overlap;
they are not extra samples. Legacy opt-out parity passes 83,072 public calls
at 20,768 coordinates, including complete words, traces and RNG state checks.
All fourteen declared relations have explicit eligible test fixtures; zero
unsupported results is not achieved by disabling all doubling.

The fixed six-pair local performance series shows an 8.73% median paired
throughput gain, with all twelve variance gates passing. The full comparison
against both the original baseline and immediate predecessor retains mixed
stress, phoneme/trigram-distribution, diversity and composition changes.
Changed RNG consumption prevents treating equal coordinates as causal word
pairs. Inherited improvements are not attributed to this change.

## Validation and limits

- Targeted runtime tests: 184 pass; observer/aggregation/recount harness: 55
  pass; capture-freeze checks: two pass; performance runner: 23 synthetic
  checks pass. Strict TypeScript and lint of changed runtime files pass.
- Full suite: 676 pass, one skipped, five failures: the `ex` distribution floor,
  three consonant-run tests, and the ck-plus-other-double surface-regex test.
- Quality suite: 11 pass, one failure (65 words in its fixed sample have five
  consecutive consonant letters). This sample differs from the 200,000-word
  development corpus above. No threshold was relaxed.
- Full lint has seven quote errors in `src/config/language.test.ts`, verified
  unchanged from exact #335. These are retained rather than silently repaired
  after freezing the experiment.

Production certificate replay reports zero deduplication-attributed erased
units, partial th units and normalization phone-multiplicity violations in both
corpora. All 23 candidate normalization certificates pass that replay. Those
license judgments are implementation replay, not independent pronunciation
proof. The independent doubling observer checks root phone/unit ownership;
unresolved cells and incomplete final morphology ownership remain disclosed.
A refused /s/:c expansion still leaves soft-c context to Q14b. Shared spellings,
split digraphs and complete final-word pronunciation remain separate work.
Ordinary-policy unsupported ss does not mean all lexical ss readings are
impossible. No human preference gain is claimed.

## Reproduction and review map

The original registration and exploratory control inspection are preserved in
`design.md`, `protocol.json` and `exploration/`. See `legacy-parity/` for the
compatibility proof, `control-measurement/` and `candidate-measurement/` for
full reports and independent proofs, `performance/` for all twelve timing
slots, and `validation/` for unchanged failing checks and preparation history.
Each package has exact byte hashes. Frozen raw word shards remain outside Git
at the absolute paths recorded in the capture manifests; packaged summaries
cannot replace those shards for a full recount. Source/runtime/dependency pins
record local reproducibility, not registry authenticity or a hermetic host.

The PR depends on exact #335 (`ce3800d`) because output-reading obligations must
survive its whole-unit normalization. It should remain draft while the reported
quality failures and integration tradeoffs are reviewed. No merge is authorized.
