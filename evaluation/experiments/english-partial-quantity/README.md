# Partial English quantity activation

Q08b is stacked on the shared-analysis foundation, PR #319 at `dd957d4`.
Only `src/elements/phonemes.ts` and `src/config/english.ts` change runtime
behavior: eleven explicit nuclear quantities and the named moraic policy with
weight-by-position codas and an explicit legacy fallback. No inventory symbols,
tense flags, generation weights, stress weights, noise, candidates or rhythm
settings change. This corrects one modeled weight classification; it is not an
overall output-quality claim.

## Frozen comparison

The immutable original and the immediate 200,000-word Q08a control have identical
complete words and legacy traces, proven in the
[separate control experiment](../shared-weight-control/README.md). The candidate
uses the same frozen #307 evaluator, development protocol, four profiles and five
distinct seeded streams. Each profile contributes 50,000 words. All archive
artifacts were verified. The independent quantity observer then checked all
600,000 original/control/candidate records.

The preregistered mechanism metric is **operationally light open atomic
diphthongs / all open atomic diphthongs at root stress assignment**:

| Profile | Control light / eligible | Candidate light / eligible | Candidate heavy / eligible |
| --- | ---: | ---: | ---: |
| lexicon-default | 5,112 / 5,112 | 0 / 5,097 | 5,097 / 5,097 |
| lexicon-bare | 5,158 / 5,158 | 0 / 5,210 | 5,210 / 5,210 |
| monosyllables-bare | 116 / 116 | 0 / 116 | 116 / 116 |
| text-default | 3,638 / 3,638 | 0 / 3,670 | 3,670 / 3,670 |
| Total | 14,024 / 14,024 | 0 / 14,093 | 14,093 / 14,093 |

Every candidate operational classification agrees with independent arithmetic.
The only disagreement with the old coda/segment-count rule is the registered
open-diphthong context. The original archive has no weight-decision field; its
decision evidence is explicitly unavailable. Its observed root geometries match
the exact control, whose added trace makes the baseline classification measurable.

| Profile | Candidate root nuclei | Known 1 mora | Known 2 moras | Unspecified quantity | Operational legacy fallbacks |
| --- | ---: | ---: | ---: | ---: | ---: |
| lexicon-default | 97,433 | 51,623 | 13,772 | 32,038 | 12,971 |
| lexicon-bare | 122,892 | 67,993 | 16,525 | 38,374 | 12,131 |
| monosyllables-bare | 50,000 | 31,331 | 5,270 | 13,399 | 353 |
| text-default | 69,957 | 36,128 | 9,952 | 23,877 | 10,276 |
| Total | 340,282 | 187,075 | 45,519 | 107,688 | 35,731 |

Closed syllables can have known heavy weight while their nuclear quantity is
unknown. The partial model does not silently fill the six unresolved entries.
The report retains per-stream, source-vowel, actual-morphology, root-length and
syllable-position strata, weight patterns and complete trace witnesses.

## Stress decisions and broader diagnostics

Observed primary selections on open diphthongs rise from 1,435 to 1,840 in
lexicon-default, 1,707 to 2,276 in lexicon-bare, and 535 to 685 in text-default.
Explicit secondary applications on those syllables are respectively 574 to 521,
629 to 661 and 198 to 169. These are observations on the generated samples, not
counterfactual winners on identical roots. Root-level secondary decisions are
before the separate rhythmic pass. Legacy monosyllables still have no primary
decision index. The model does not require every heavy syllable to receive stress.

Final stress remains imperfect. Primary stress outside the final three root
syllables remains 2,228 / 3,500 eligible roots in lexicon-default, 4,285 / 6,698
in lexicon-bare, and 1,058 / 1,726 in text-default. Those diagnostics remain
separate from the corrected quantity classification and are not tuned here.
The observer corroborates final stress only for bare words; correspondence is
unavailable for the 57,654 affixed candidate words.

The complete [core comparison](./core-comparison.md) includes every pre-existing
diagnostic against both controls. Material limitations include:

| Final-output diagnostic | Control | Candidate | Change |
| --- | ---: | ---: | ---: |
| lexicon-default monosyllables whose sole nucleus is schwa | 899 / 4,530 (19.845%) | 923 / 4,425 (20.859%) | +1.013 pp |
| lexicon-default polysyllables without primary stress | 9,342 / 45,470 (20.545%) | 9,480 / 45,575 (20.801%) | +0.255 pp |
| text-default words ending in an open checked vowel | 966 / 50,000 (1.932%) | 1,015 / 50,000 (2.030%) | +0.098 pp |

The default monosyllabic-schwa increase occurs in all five streams, with rate
deltas from +0.437 to +1.506 percentage points. It is disclosed as a regression,
not dismissed because it lies outside the target mechanism. The forced
monosyllable profile's core diagnostics and complete count distributions are
unchanged. Changed stress can alter later random consumption and rejection, so
equal draw coordinates need not contain identical roots. Profile composition and
eligibility changes remain visible; replicate ranges are not confidence intervals.

## Verification and opt-out

- Full suite: 423 passed, 1 skipped, 1 failed. The existing rare-`ugh` gate fails
  at `0.0049132495084684156` against unchanged threshold `0.0062`. No gate is
  relaxed. The other three n-gram gates pass.
- Quality suite: all 12 passed. Initial report writing was blocked by worktree
  access; the complete rerun with write access passed.
- Shared-weight fixtures: all 27 passed; observer/integrity fixtures: all 14
  passed. Strict TypeScript and touched-file ESLint passed.
- Isolated performance: 7,421 words/sec (floor 4,500), median batch variance
  1.31× (ceiling 3×). These are the existing checks, not a performance-improvement
  claim.
- Explicit legacy opt-out: 20,000 distinct scheduled draws, tracing on/off,
  40,000 API executions per checkout. Complete normalized outputs and every
  legacy trace field match the unchanged original, as do every per-word RNG
  boundary and next RNG values. Only `nuclearQuantity` and the new `stressWeight`
  observation are excluded from that object comparison. The candidate's legacy
  operational weight is separately checked against recorded root geometry.

The opt-out retains additive metadata. Its precise comparison rule and the
existing global-inventory reduction caveat are recorded in the dated
[preregistration amendment](../../quality/probes/syllable-quantity/activation-amendment.md).
The previous full-control proof bytes and embedded README are unchanged.

## Artifacts and reproduction

`manifest.json`, `summary.json`, `sources.json.gz`, `distributions.json.gz`,
`review-samples.json.gz`, and `witnesses.json.gz` are exact capture artifacts.
The core comparison, independent quantity observation and opt-out proof are
compressed with deterministic gzip timestamps. Source-content bundles accompany
their hashes; every opt-out bundle file was checked against its recorded hash.
`artifact-hashes.json` pins this compact package. The quantity report embeds its
observer/dependency sources, including both preregistration documents.

Raw word shards remain in the ignored local archive
`memory/quality-runs/english-partial-quantity`. The compact package does not
contain them. Regenerate from captured source/protocol if that archive is
unavailable. The original and immediate control archives must remain available
for the all-record observer. Restore the exact frozen evaluator entries from
`sources.json.gz` when #307 is not present; do not substitute changing tooling.

```sh
node --import tsx evaluation/quality/cli.ts verify --run memory/quality-runs/english-partial-quantity
node --import tsx evaluation/quality/cli.ts compare --baseline ORIGINAL_ARCHIVE --previous memory/quality-runs/shared-weight-control --candidate memory/quality-runs/english-partial-quantity --out NEW_COMPARISON_DIRECTORY
node --import tsx evaluation/quality/probes/syllable-quantity/analyze.ts ORIGINAL_ARCHIVE memory/quality-runs/shared-weight-control memory/quality-runs/english-partial-quantity NEW_REPORT.json
node --import tsx evaluation/quality/probes/syllable-quantity/legacy-opt-out.ts ORIGINAL_CHECKOUT CANDIDATE_CHECKOUT NEW_OPT_OUT_REPORT.json
```

Candidate manifest digest:
`0a120d3f3b0f3ba96c90867f480e63412eca31925a6d56af6b98c9cea6824c62`.
Candidate generator source digest:
`45143bfa5b4b1c6c249b5d14c92cfccc90f32da4298eb25857d9e4978acff276`.
Frozen quantity observer digest:
`0fae63827768edc4d4c27dc8a3bef45a46ead5ef2a5829633a50437ef25c5911`.
