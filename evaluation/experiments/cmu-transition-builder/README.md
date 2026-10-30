# Explicit phone-transition construction evidence

This independent tooling slice is stacked on #329 at
`c2ffd4f6c553564dbec60f1314df5ef047f8b9fd`. It replaces the unsafe manual
`generate-bigram-table.ts` workflow with explicit pinned-source construction into
a fresh versioned artifact. The generator, active scorer table, score baseline,
thresholds, old references and demo inputs are unchanged. There is no claim of
improved naturalness or adoption of a new scoring population.

## Completed results

Two fresh builds produced identical bytes through the Node/tsx entrypoint from
the repository and a symlinked local tsx entrypoint from another working directory,
including relative paths containing spaces. The independent Python checker reused
the frozen source parser and reconstructed every phone pair with a separate
traversal. It also independently reconstructed the complete joint parent.

| Quantity | Native stress tokens | Explicit stressless projection |
| --- | ---: | ---: |
| Selected entries | 117,485 | 117,485 |
| Source phone events | 742,333 | 742,333 |
| Adjacent transitions including boundaries | 859,818 | 859,818 |
| Start events | 117,485 | 117,485 |
| End events | 117,485 | 117,485 |
| Observed ordered pair bins | 2,985 | 1,339 |
| Observed labels including `#` | 70 | 40 |

An *n*-phone entry contributes *n + 1* transitions. Start and end counts above
are separate counts; their combined edge-event count is 234,970. Each full native
and base table matches the independent reconstruction, including every bin,
row total, label and entry identity. This is corpus construction evidence, not a
held-out predictive evaluation or a generator quality change.

All 24 formal CLI/check commands returned their specified statuses. They covered
two successful fresh builds, help, rejected malformed flags and sources,
protected prior packages/runtime/demo paths, directory aliases, hardlinks,
existing and dangling symlinks, missing output directories, and the independent
full-bin checker. All 261 protected parent files remained byte-identical.
Only the approved manual script and documentation files changed among the 264
tracked parent files.

The first formal attempt stopped at `tsx --help` because the sandbox denied its
IPC pipe (`EPERM`). It constructed no successful reference. Its runner, plan,
command record and failure log remain in this package. The second attempt ran the
same matrix in a fresh directory with execution permission; production, verifier,
test and protocol bytes were unchanged. The two runner files differ only in the
evidence-directory constant. No failed outcome was overwritten or omitted.

Local checks: 211 review tests passed across eight files, including 39 transition
fixtures; seven independent Python fixture groups passed; strict corpus/review
TypeScript, explicit lint for the touched TS files, and diff checking passed.
The synthetic envelope fixtures deliberately use artificial tables matching
parent marginals; they are not presented as CMU observations. A rehashed 2×2
pair swap preserving row and column totals is rejected against the externally
trusted full table.

The repository's pull-request workflow targets `main`. This stacked PR therefore
does not automatically receive those CI checks; the recorded validation is local.
No generator capture or performance claim is part of this offline change.

## Identities and retained evidence

- Artifact SHA-256: `1b5360bf7a6d378fe09892199820a607580a5d2bf980fd4088608b0eafb8dcb2`.
- Artifact digest: `45da904ae1eb33db2f1bb85c8eb1721cfde6251213a6fd6487e2b6186a95d067`.
- Production implementation digest: `d4ac881dd120d5c10f7cc3690618e37fcaed30ef5780e6295eb8a51bd4c46f2c`.
- Independent verification SHA-256: `f93cdbed23aa2aff80763a35d5ee078e2666367afec08283c3139ce9475682de`.
- Formal acceptance SHA-256: `fb90e0d144dd39f75d4d3422e87c0ca6790bbe8e34d33b8f4c05ef953872ebde`.

`protocol.json`, `design.md` and `parent-files.json` were frozen before
implementation. Amendment 01 adds only the approved `TUNING.md` row to the allowed
legacy documentation edits. `source-review-freeze-v1.json` binds the reviewed
production, verifier, test and protocol files before formal construction. Its
production digest uses exact ordered source content snapshots; its separate
verifier digest uses an explicitly labeled path-to-SHA list.

After successful acceptance, amendment 02 updates only the new contract guide's
pending status to point to this result. `contract-at-source-review.md.gz` preserves
the exact guide bytes named by the review freeze. It is not a production or metric
change. The package manifest pins all compressed and uncompressed evidence bytes.
`command-results.json.gz` retains exact executed commands, cwd, outputs and exit
codes. The frozen runner files record their historical local paths; they are
execution evidence, not portable installed commands. The raw dictionary and the
second identical artifact are not duplicated in Git.

## Reproduce

Use the pinned CMU revision and checksum in
[the construction guide](../../../docs/cmu-transition-builder.md), with the
matching source closure in this checkout. Choose fresh paths outside protected
repository directories. Run from this checkout, replacing the variables with
canonical regular-file paths:

```sh
node --import tsx scripts/generate-bigram-table.ts \
  --source "$CMU_SOURCE" --policy cmu-ascii-first-v1 \
  --units integer-phone-transition-occurrences --out /private/tmp/new-transitions.json
python3 evaluation/corpus/verify-transitions.py \
  --root "$PWD" --source "$CMU_SOURCE" \
  --artifact /private/tmp/new-transitions.json --out /private/tmp/new-transition-proof.json
python3 evaluation/corpus/verify-transitions-test.py
npm run test:review
npx tsc -p tsconfig.corpus.json
npm run review:typecheck
```

The Python checker takes trusted current checkout sources, verifies pinned parent
and raw source identities, compares the complete expected envelope and all counts,
and rechecks inputs before finishing. The artifact's own embedded source tree is
not used as a trust anchor. Its report path must be fresh and outside protected
source/evidence directories. The prior source commit remains the environment for
reproducing older artifacts; this PR does not relabel their provenance.
