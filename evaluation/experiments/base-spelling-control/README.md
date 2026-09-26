# Regenerated base-spelling control

`base-spelling-control` is a new, frozen **200,000-word development control**
generated from #317 commit `a602888`. It is not historical ownership retrofitted
into the original archive. The immutable original remains unchanged.

## Verified equality

- Four fixed profiles × five seeds × 10,000 continuous draws; 50,000 words/profile.
- Every original and control artifact verified against its manifest checksum.
- Exact profile/seed/draw schedule, shard set, and counts verified.
- All 200,000 complete archived draws equal after deleting **only**
  `word.trace.baseSpelling` and `word.trace.orthography.alignment` from the control.
- All 200,000 ledgers replay by exact input/output cell IDs, origins, and offsets.
- Entire frozen per-profile summaries equal: metrics, distributions, morphology,
  replicates and strata. The v1 evaluator/protocol/reference hashes are unchanged.
- Every captured runtime source file equals its content at the recorded commit.

`verification.json.gz` records hashes, stream equality checks, exact replay counts,
and exploratory mechanism counts/witnesses. `control-manifest.json.gz`,
`control-summary.json.gz`, `control-sources.json.gz`, and the original manifest
preserve compact capture provenance; `source-check.json` verifies the committed
runtime. `comparison.json.gz`/`comparison.md` are the unchanged frozen evaluator's comparison.
`artifacts.json` pins every packaged evidence file.
Raw words remain locally at `memory/quality-runs/base-spelling-control/words/`.

Control generator digest:
`a34e855354454004d2075de5d7cb9f9cd72ba5b28ae1ccd4513ba48e3aaaf2ff`.
Control commit: `a60288821ccb2ac5d4d902552dc538c217e6d101`.

## Exploratory mechanism counts

These counts diagnose this control. They are not preregistered quality claims
and must not be treated as certified pronunciation errors.

| Profile | Words | Selected units | Words with cap edits | Cap edits | Partial th / selected th | No surviving lineage units |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| lexicon-default | 50000 | 241241 | 632 | 656 | 24 / 866 | 869 |
| lexicon-bare | 50000 | 317625 | 588 | 614 | 38 / 1261 | 1134 |
| monosyllables-bare | 50000 | 264100 | 1993 | 2118 | 68 / 1011 | 6941 |
| text-default | 50000 | 186173 | 726 | 734 | 9 / 722 | 491 |

A partial `th` retains exactly one original cell and no surviving rewrite lineage
for the unit. Of the 139 cases, 93 originate at the general raw-consonant cap,
20 at the final-consonant cap, and 26 at syllable-join deduplication. A cap-only
policy therefore has 113 relevant cases, not 139.

“No surviving lineage” means no direct selection cell or transitive rewrite
cell in the final base ledger refers to the unit. Of 9,435 such units, 1,797 end
at cap edits and 7,638 at duplicate removal. Some correspondences could require
an explicit shared/joint construction; lineage absence alone does not prove
that every possible orthographic analysis loses a phone.

Of 4,122 cells consumed by cap edits, 35 already have unresolved rewrite
ownership. The final bases of 37,093 words contain unresolved cells. Those cells
must not be converted to certified ownership merely to enable a repair. The
legacy trace also reports 5,910 nonpositive selected-form weights; a positive
legacy value is not a complete legality certificate. Q12a remains a dependency.

The approved [coverage-policy design](./coverage-policy-design.md) separates cap
policy, duplicate removal, split digraphs, and joint/soft-consonant constructions.

## Reproduce verification

The verifier depends on the frozen quality harness from #307, with evaluator
hash `ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.
It reads the archived words; it does not generate or modify them.

```sh
node --import tsx evaluation/experiments/base-spelling-control/verify.ts ORIGINAL_RUN memory/quality-runs/base-spelling-control verification.json
```

Verifier lint and standalone strict TypeScript checks pass. A focused
code-simplifier review preserved the equality and source-lineage definitions.
No runtime source changed while preparing this evidence.
