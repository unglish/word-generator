# Blinded written baseline/candidate comparison

This workflow prepares a separate Q21 comparison using the existing written-v2
rubric unchanged. It does not alter or replace the anonymous pilot. Its owner
artifacts keep the complete baseline and candidate snapshots, source manifests,
traces and original draw multiplicities. Reviewer packets expose only the rubric,
opaque IDs and spellings.

## Register before observations

Supply two authenticated snapshots and a `ComparisonRegistration` JSON file.
Record the candidate-selection reason, target population, assignment seed, fixed
participant slots, pairs per stratum and an even session length from 2 to 20.
Declare length, surface-syllable-count and morphology strata that partition every
original draw exactly once. Overlap and uncovered draws are errors. Do not remove
poor outputs or regenerate the pool after inspecting outcomes. A development
fixture must use `purpose: "development-fixture"`; it is never a human observation.

For `purpose: "human-study"`, conditions must have committed, clean generator
sources and the unchanged rubric. Authenticate the generating module's checkout,
effective configuration and complete output before release. The source snapshot
freezer now rejects a root different from the module's physical checkout and
checks source/head stability again after generation. Hashes bind frozen content;
they do not independently establish that source was replayed or that ratings
came from people.

The same spelling can arise in several conditions or strata. Retain all those
draws in the owner artifact. Each participant plan shows the spelling at most
once across all their sessions. A complete bipartite matching satisfies the
condition/stratum quotas; if no matching exists, preparation fails without
relaxing quotas or returning partial sessions.

Participant slots are owner-managed opaque codes, distinct from session IDs.
Use an even roster: every participant receives the same number of baseline and
candidate items per stratum, while adjacent roster slots receive opposite
condition orders at every planned position. Fixed allocation cannot respond to
scores. Item-use counts prioritize coverage when several complete allocations
are possible; exact equal exposure of all items is not promised.

Keep the roster-to-person correspondence privately and verify enrollment outside
this anonymous pilot. A slot or session alone does not prove a distinct person.
Register recruitment, inclusion, attrition, power/precision targets and the
participant/item inference plan before collecting judgments. Those parts are
still required for the actual Q21 study.

## Owner commands

Create an ignored private parent directory such as `review-exports/`. Preparation
requires a new child directory and writes owner-only files with mode 0600:

```sh
npm run review:compare -- prepare --registration registration.json \
  --baseline baseline.json --candidate candidate.json \
  --out review-exports/written-comparison
```

The owner plan maps each participant slot to ordered session IDs. Export one
packet for a session; never share `comparison.json`, `plan.json`, complete traces,
or a response export with reviewers:

```sh
npm run review:compare -- packet \
  --input review-exports/written-comparison/comparison.json \
  --plan review-exports/written-comparison/plan.json --session SESSION_ID \
  --out packet.json
```

A `ComparisonExport` binds the original comparison, deterministic plan and every
received response. Response positions and item IDs must match the registered
assignment. Duplicate response IDs or positions, foreign items, altered plans
and invalid ratings/skips are rejected. Files are never overwritten.

```sh
npm run review:compare -- report --input private-export.json --out private-report.json
```

The report separates condition and stratum, preserves pool/covered draw counts,
and uses per-item rating proportions weighted by original draw multiplicity.
Missing items stay missing; additional ratings do not increase an item's draw
weight. Skips and unfamiliar-only views have explicit denominators. Within-slot
contrasts use complete rated pairs and report incomplete pairs separately.
Planned and observed presentation-position counts expose attrition imbalance.

These are descriptive summaries of the covered frozen cohort. They do not give
population confidence intervals. Synthetic checks test allocation/export
contracts, not wordlikeness gains. The [local collector](written-collection.md)
provides authenticated, durable submission of the frozen blinded plan. Registered
inference still requires calibration, verified recruitment and actual observations
before Q21 can count as a completed study or output-quality improvement.

## Inference draft

The [crossed reader/spelling inference draft](written-inference-method.md) binds an optional inference protocol to the comparison before observations. `review:compare infer --input private-export.json --roster private-roster.json --out private-inference.json` uses that frozen protocol and a bound owner-attested enrollment roster. Arithmetic validation, calibration, actual enrollment and real observations are still required; the draft is not proof of human preference.
