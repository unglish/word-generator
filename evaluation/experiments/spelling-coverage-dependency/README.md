# Dependency-only spelling coverage control

This freezes Q02a/#317 exact provenance together with Q12a/#310 legal positive-weight
selection before Q13 budget-policy behavior is implemented. The named dependency
commit is `6b0b8f22f7ea04244c580c886bbd9b48d9cd2f3f`, based on `f51abb2`.
The integration retains both writer observers at the conflict sites and updates
four seeded provenance fixtures to this dependency's selection stream.

## Verification

- All 200,000 development draws exactly equal the existing Q12a archive after
  deleting only `word.trace.baseSpelling` and `word.trace.orthography.alignment`.
- Every ledger replays by input/output IDs, source lineage, and exact positions.
- All archived artifacts, shard membership, stream coordinates, and counts verify.
- Every captured runtime file (43 files) equals its committed bytes.
- Complete frozen profile summaries exactly equal Q12a, not merely the primary metric.
- Frozen evaluator `ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`
  and the v1 protocol/reference remain unchanged.

Generator digest:
`ab111e9ad95ce3d1c58257b1bacbbec9378ab31ea9fe400955359121d6128ccb`.
Raw archive: `memory/quality-runs/spelling-coverage-dependency`.
The original archive and the separate `base-spelling-control` remain immutable.
`comparison.md` compares this dependency with both of them; differences are the
Q12a dependency, not an effect of provenance or the future coverage policy.

## Selected-attempt exploratory mechanism counts

Each profile contains 50,000 returned words. These are exact cell-loss observations,
not a claim that ancestry proves a linguistic realization. They are not Q13 results.

| Profile | Units | Cap words | Cap edits | Partial th / selected th | Units with no surviving lineage | Final bases with unresolved cells |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| lexicon-default | 240949 | 536 | 552 | 29 / 867 | 736 | 8871 |
| lexicon-bare | 317555 | 494 | 518 | 39 / 1305 | 1083 | 10533 |
| monosyllables-bare | 264087 | 2671 | 2852 | 74 / 1103 | 6773 | 7792 |
| text-default | 187046 | 764 | 779 | 19 / 701 | 484 | 8272 |

All reported selected-form weights are positive. Of 161 partial `th` cases,
126 originate at caps and 35 at syllable-join duplicate removal. Thirty consumed
cap-input cells already have unresolved rewrite ownership. Q13 must retain that
uncertainty rather than certify it. Rule-level counts and trace witnesses are
in `verification.json.gz`.

## Validation and reproduction

Focused integration tests: 22/22. Full suite: 418 pass, one skip, one known Q12a
failure: `ex` representation is 0.0155307585 versus the unchanged minimum 0.0215.
The distinct joint-spelling work is still required; illegal zero-weight choices
have not been restored to hide that regression. Separate quality suite: 12/12.
Typecheck and touched-file/verifier lint pass. Isolated performance is deferred
until the shared CPU window is available; captures were concurrent with other work.

The verifier depends on the frozen #307 quality harness:

```sh
node --import tsx evaluation/experiments/spelling-coverage-dependency/verify.ts memory/quality-runs/legal-grapheme-selection memory/quality-runs/spelling-coverage-dependency verification.json
```

The compressed manifests, summary, source bundle, exact verifier report and test
logs retain compact evidence. `source-check.json` maps every runtime file to the
recorded commit; `artifacts.json` pins the complete evidence package. No runtime
behavior beyond the named Q12a dependency changed during capture or verification.
