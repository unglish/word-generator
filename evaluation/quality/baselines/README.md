# Initial linguistic quality baseline

Captured on 2026-09-26 from the unchanged generator at
`3fd474dced417fcd78a7742e6b8f33d2a81765eb`.

| Cohort | Run ID | Words | Purpose |
|---|---|---:|---|
| [Development](2026-09-26-development-standalone/manifest.json) | `baseline-development-v1` | 200,000 | Compare each focused change |
| [Validation](2026-09-26-validation-standalone/manifest.json) | `baseline-validation-v1` | 200,000 | Reserved milestone confirmation |

Each directory is a rescore of an initial capture (`initial-development`,
`initial-validation`) by an evaluator that no longer depends on changing
human-review code. The rescores preserve all original raw archive hashes, metrics,
and generator provenance. The initial runs are not committed separately: their
complete manifests and source bundles are retained in each `provenance.json.gz`.

Each cohort contains four profiles, each with five independent seeded streams of
10,000 draws. Every output includes its full generation trace. Both completed
archives passed full artifact integrity verification. Comparing development with
itself as baseline, previous step, and candidate produced zero for all 2,310
numeric delta fields.

## Selected development measurements

These are observed baseline defects and diagnostics, not evidence of improvements.
Rates use their eligible denominators; each profile contains 50,000 words.

| Measurement | Default lexicon | Bare lexicon | Default text |
|---|---:|---:|---:|
| Polysyllables missing primary stress | 9,342 / 45,470 (20.55%) | 0 / 43,577 (0%) | 9,947 / 27,246 (36.51%) |
| Words with primary-stressed schwa | 1,008 / 50,000 (2.02%) | 0 / 50,000 (0%) | 593 / 50,000 (1.19%) |
| Words with a zero-total-weight grapheme choice | 1,956 / 50,000 (3.91%) | 3,016 / 50,000 (6.03%) | 864 / 50,000 (1.73%) |
| Affixed words with a traced hiatus fallback | 3,862 / 34,952 (11.05%) | No eligible words | 4,481 / 22,557 (19.87%) |
| Words whose orthographic trace differs from the final spelling | 34,952 / 50,000 (69.90%) | 0 / 50,000 (0%) | 22,557 / 50,000 (45.11%) |

The orthographic trace mismatches are exactly the affixed words in each profile:
the trace records the root's spelling and stops before affix spelling is attached.
Unaffixed words have no mismatches. Roadmap item Q02 (final-word trace provenance
and orthographic ownership) tracks this.

The forced bare-monosyllable profile contains **0 / 50,000** words with /ʊ/.
This is a coverage diagnostic, not a recommendation to maximize that vowel's rate.
Validation results are deliberately omitted from this development scoreboard.

See the [complete development summary](2026-09-26-development-standalone/summary.json) and
the [capture and comparison guide](../../../docs/quality-baselines.md) for all
metrics, denominators, strata, interpretation, and commands.

The large `words/` archives are Git-ignored and are not part of this repository.
Full verification and rescoring need them; comparisons do not. Compact source
bundles, manifests, summaries, and evidence are committed alongside this README.
