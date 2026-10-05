# Observer implementation checkpoint

The initial TypeScript observer authenticates the base trace before counting,
uses physical root-cell adjacency, preserves original selection strata, and
reports unavailable/joint ownership separately. It emits one event per phone
at both selection and root boundaries and keeps final assembled-word ownership
unavailable. Configured reading compatibility and English-pattern interpretation
are independent axes, including for custom reading metadata.

Validation on 2026-09-27, Node v24.11.1:

- `node node_modules/typescript/bin/tsc -p evaluation/experiments/following-letter-conditions/tsconfig.json`: passed.
- `node --import tsx --test evaluation/experiments/following-letter-conditions/observe-following.test.ts`: five tests passed, zero failed.
- The population-accounting test uses 120 sequential public generated words,
  seed 129, alternating morphology, with the Q14a explicit split policy.
- The archived carowngs witness retains the /s/ c before a failure at both
  boundaries and uses /æ/ at spelling time rather than its later reduced phone.
- Mutated cell identity and inventory identity are rejected before observation.

These are focused development checks, not the full contract's adversarial
matrix, independent validation, or a 200,000-word population measurement.
Independent Python reader/recount now agrees on all 2,716 events and 35,869
integer comparisons in the retained 241-word pilot (120 default, 120 split,
and the archived witness). Five independent tests pass, including deliberate
event/count corruption and ownership mutations. Observer, test and harness
TypeScript all pass strict type-checking. Pilot input and source hashes are
retained in `pilot/manifest.json`. This remains development evidence.

Before freezing: expand independent adversarial coverage; add fixtures
for full shared/split adjacency, licensed/normalized/completed extents,
certificate corruption, historical versions, cross-syllable context and
selection-to-root transitions; add the archive runner, stratified witnesses,
configuration/source pins, denominator tables and complete output seals.
No candidate behavior change or quality-improvement claim exists yet.


Additional retained ownership fixtures now cover licensed replacement and actual
following split-vowel cells, plus three public-API normalized units from a
synthetic configuration. Independent comparison passes 72 additional events
and 1,194 integer comparisons. Damaged licensed and normalized certificates are
rejected. See `ownership-fixtures/README.md` for provenance and remaining gaps.


Accounting revision 2 adds original-selection cohort denominators and status
transitions in both implementations. Exact archived input equality is checked;
all 249 words agree on 2,788 events and 51,445 counts. Six TypeScript tests and
five Python tests pass; all experiment TypeScript type-checks. See
`accounting-v2/README.md` for the retained evidence, JSON map reconstruction
correction and outstanding coverage. Earlier manifests pin historical observer
sources and should not be interpreted as hashes of the current revision.


Boundary checks now cover actual cross-syllable adjacency, public-API synthetic
shared-output adjacency and a deliberately empty historical ledger. Eight
TypeScript tests, seven Python tests and strict type-check pass. The Python
suite now checks all 252 retained words, including all earlier ownership
fixtures, rather than only the initial pilot. Shared fixture recount adds 18
events and 621 counts (current total 2,806 events / 52,066 counts). The full
corpus runner, source/configuration freeze and complete protocol audit are
still required before baseline measurement; no generation policy is changed.


The corpus runner and independent grouped recount now pass a 24-word,
eight-stream integration smoke and three corruption checks. The prospective
immediate-control binding fixes the existing 200,000-word Q14a development
archive and exact configuration; it does not register or endorse a Q14b
candidate. Source/dependency/runtime closure and input hashes are checked at
both ends. Original-baseline comparison remains required separately.
