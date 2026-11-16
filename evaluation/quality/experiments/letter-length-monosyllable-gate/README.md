# Letter-length monosyllable gate (PR evidence)

Measurement packet for calibrating `LETTER_LENGTH_TARGETS[1]` from `[2,4,6,8]` to `[2,3,7,8]`.

Reference: `data/cmu/cmu-length-baseline.json` (CMU Pronouncing Dictionary 0.7b).

## Reproduction (2M, seed 85)

| Row | Found | 2-letter | Mean letters |
|-----|------:|---------:|-------------:|
| `[2,4,6,8]` | 44 | 184 (0.009%) | 9.176 |
| `[2,3,6,8]` | 65 | 998 (0.05%) | 9.152 |
| `[1,2,6,8]` | 68 | 3125 (0.16%) | 9.149 |

Matched the independent check exactly.

## Calibration

Metric: total variation between generated bare-monosyllable letter-length distribution (200k lexicon bare draws, seed 42) and CMU monosyllable `bySylLen[1]`.

Chosen row: `[2,3,7,8]` (lowest TV among gate-unlocking candidates: 0.1805).

## Coverage 10M

| Seed | Baseline `[2,4,6,8]` | Candidate `[2,3,7,8]` |
|-----:|--------------------:|----------------------:|
| 85 | 61 | 80 |
| 86 | 60 | 80 |
| 87 | 61 | 80 |

## Quality gates

Phoneme TV / n-gram over-rep/under-rep: pass before and after (see `gate-*.log`). Quality cohort comparison: `comparison.md`.

## Policy

Keep this packet on the PR branch for review; tag as `archive/pr-<n>` and remove from the branch before merge (`docs/experiments.md#where-evidence-lives`).
