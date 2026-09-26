# Q13c: preserve whole units during adjacent-letter deduplication

**Draft: the observed deletion defects are corrected, but quality and performance
regressions prevent an unconditional improvement claim.** This experiment is
stacked on [#331](https://github.com/unglish/word-generator/pull/331), exact commit
`569adf516a7fa03a77124d3515c9e1a17a8f71ac`.

## Behavior and review entry points

The two existing deduplication sites could erase a one-letter realization of a
separate phone or cut the `t` off a `th` unit. Under `preserve-phones`, the writer
now shortens the entire later unit only when its nonempty remainder has positive
support for the same phone in the original selection context, with compatible
neighbor readings. Otherwise it retains the original units and records why.
The original sampled choices, doubling quota history and RNG consumption are not
retroactively rewritten. Omitting the policy preserves the historical path.

Start with `src/core/spelling-normalization.ts` and the two calls in `write.ts`.
`base-spelling.ts` commits replacements atomically. The v3 ledger records every
guard and collision, actual doubling increments, local certificates and a distinct
normalized-cell origin. `spelling-normalization-evidence.ts` and
`spelling-normalization-checks.ts` replay the ledger and application points;
historical v1/v2 readers remain separate. The cap planner explicitly refuses
`normalization-context-unavailable` after normalization rather than certify stale
selection state. This is not a shared-grapheme construction model or a fix for
all subsequent regex/morphology edits.

## Frozen development results

The protocol has four profiles, five fixed streams each and 200,000 words per
cohort. The immediate control uses the immutable #328 corpus: #331's separately
published 800,000-call parity establishes its unchanged behavior. The candidate
was captured once after source review. Equal RNG coordinates are not matched
words after behavior changes.

| Measure | Immediate control | Candidate |
|---|---:|---:|
| Deduplication-attributed units with no surviving lineage | 7,398 | 0 |
| Words containing those erased units | 7,388 | 0 |
| Deduplication-attributed partial `th` units | 31 | 0 |
| Words with five consecutive consonant letters | 203 | 252 |

The candidate had 7,530 collisions: 25 normalized and 7,505 retained. The
normalizations were `/d/ ed→d` (11), `/k/ lk→k` (13), and `/m/ lm→m` (1).
All 25 certificates passed the production license verifier. Refusals were
would-erase-phone (7,217), no-legal-remainder (179), unresolved-ownership (95),
and construction-obligation (14). These counts are not target quotas.

Independent Python replay traversed all 200,000 archived words and agreed on
13,835 integer leaves, including exact UTF-16 cell/edit/guard structure and
source-phone multiplicity. It does **not** independently establish English
readings, production selection probabilities, or arbitrary regex correctness.
The production license checks and independent structural proof are complementary.

The full original/control/candidate comparison is in
[comparison/comparison.md](comparison/comparison.md); all bins and strata remain
in `comparison.json.gz`. Monosyllable trigram JSD worsened by 0.006672 bits versus
the immediate control, while unique spellings increased by 1,293. Five-consonant
words rose most in forced bare monosyllables, from 68 to 111 of 50,000. These
tradeoffs are retained, not offset by the target defect counts. No validation
cohort or human preference/read-aloud result is claimed.

## Compatibility, suites and timing

The formal public-API study passed 120,000 scheduled calls plus eight mutation
calls: omitted-policy behavior and RNG stream use agree with the predecessor,
and active trace-on/off output and RNG behavior agree. It does not assert that
active outputs equal control outputs. Inherited returned-phone aliasing remains
observable; this is not a new caller-mutation-isolation guarantee.

Targeted mechanism/observer fixtures, strict types, lint, independent verifier
fixtures and analyzer/parity guards passed. Historical full-suite evidence is
606 passed, one skipped, five failed. The failures cover underrepresented
bigrams, three consonant-run checks, and the `ck` plus another-double check
(8 observed, threshold 5). The dedicated quality suite passed 11/12; its
five-consonant-letter gate observed 64 against a zero requirement. No gate was
changed. The traced doubling diagnostic separates actual sampled doubling from
adjacent letters owned by different phones and exposes two `/s/→c→ck` cases for
the separate Q12c hypothesis.

The fixed quiet-window series used the unchanged performance suite and six fresh
AB/BA pairs, with exact #331 as A and this candidate as B. All 12 logs, raw
statuses, installed dependency pins and rounded-rate bounds are in `performance/`.

| Local performance measure | Control | Candidate |
|---|---:|---:|
| 4,500 words/sec floor passes | 6/6 | 2/6 |
| Median-variance <3 passes | 6/6 | 6/6 |

Candidate/control throughput ratios were 0.96097, 0.96090, 0.95602, 0.95952,
0.95177 and 0.92277. Their median was 0.95777 (**4.22% lower throughput**), range
0.92277–0.96097. No slow run was replaced. This is one local, nonhermetic series,
not a general platform performance claim. Source and installed dependency bytes
were unchanged before/after the series.

## Evidence integrity and reproduction

`manifest.json` lists the exact original and stored hashes of 103 copied
artifacts. Large JSON is deterministically gzipped without rewriting its decoded
bytes. `candidate/` contains the original capture manifest, source bundle,
summaries, distributions, unfiltered review samples and labeled witnesses.
`evidence/` contains parity, structural proof, license observations and comparisons.
`tools/` preserves the exact external independent checkers and timing driver.
`logs/` retains failed suites as well as successful targeted checks.

The historical registration and implementation amendments in
`evaluation/quality/probes/unit-normalization/` are unchanged. Their statements
about pending implementation describe their registration date; this outcome
report supersedes their status, not their requirements. All 140 frozen source and
tool files were rechecked before packaging. The 14 top-level quality-harness
files included on this branch are byte-for-byte copies from baseline commit
`9afcd4d`; their identities are listed separately in the publication manifest.
They introduce no benchmark tuning.

The large `words/` shards remain outside Git at
`/private/tmp/q13c-unit-normalization-candidate-v1`, with hashes in the original
capture manifest. Full independent replay needs these retained archives and the
immediate-control archive; summaries alone cannot reproduce that proof. Preserve
and back up complete run directories before deleting worktrees. External tools
retain their original absolute input paths and hashes; relocation requires
explicit path setup or a separately reviewed runner, not editing frozen hashes.

Typical commands, using original external paths and fresh destinations:

```sh
node --import tsx --test evaluation/quality/probes/unit-normalization/observe.test.ts
node --import tsx --test evaluation/quality/probes/unit-normalization/analyze-current.test.mjs
node --import tsx --test evaluation/quality/probes/unit-normalization/parity-current.test.mjs
node node_modules/vitest/vitest.mjs run src/core/spelling-normalization.test.ts src/core/spelling-coverage.test.ts src/core/spelling-coverage-observer.test.ts
```

The recorded command logs and tool contracts specify formal capture, analysis,
parity, independent replay and fixed timing invocations. Formal timing is not
part of these synthetic checks and must run without competing controlled jobs.
