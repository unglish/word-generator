# Initial linguistic quality baseline

Captured on 2026-09-26 from the unchanged generator at
`3fd474dced417fcd78a7742e6b8f33d2a81765eb`.

| Cohort | Run ID | Words | Purpose |
|---|---|---:|---|
| [Development](2026-09-26-development/manifest.json) | `initial-development` | 200,000 | Compare each focused change |
| [Validation](2026-09-26-validation/manifest.json) | `initial-validation` | 200,000 | Reserved milestone confirmation |

The standalone evaluator rescored these exact archives without regeneration:

| Current comparison baseline | Run ID |
|---|---|
| [Development](2026-09-26-development-standalone/manifest.json) | `baseline-development-v1` |
| [Validation](2026-09-26-validation-standalone/manifest.json) | `baseline-validation-v1` |

Use the `-standalone` directories for new comparisons. They preserve all original
raw archive hashes, metrics, and generator provenance, and add the complete parent
manifest/source chain. This removes a dependency on changing human-review code;
the original directories remain unmodified.

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

The forced bare-monosyllable profile contains **0 / 50,000** words with /ʊ/.
This is a coverage diagnostic, not a recommendation to maximize that vowel's rate.
Validation results are deliberately omitted from this development scoreboard.

See the [complete development summary](2026-09-26-development/summary.json) and
the [capture and comparison guide](../../../docs/quality-baselines.md) for all
metrics, denominators, strata, interpretation, and commands.

The large `words/` archives are local and Git-ignored. Preserve a backed-up copy of
each complete directory before removing this worktree. Compact source bundles,
manifests, summaries, and evidence are available for version control; they have
not been committed automatically.
