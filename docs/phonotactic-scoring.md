# Phonotactic Scoring

Measures how "English-like" generated words sound based on their phoneme sequences, using a pure TypeScript scorer with zero external dependencies.

## How It Works

1. **Generate words** using the word generator engine
2. **Convert IPA → ARPABET**: The generator uses IPA internally (`æ`, `tʃ`, `eɪ`); the scorer uses ARPABET (`AE`, `CH`, `EY`). The bridge module (`src/phonotactic/ipa-to-arpabet.ts`) handles conversion via direct lookup.
3. **Score via bigram model**: Words are scored against ARPABET bigram frequencies derived from the full CMU Pronouncing Dictionary (123,892 words, 976,831 bigrams) using conditional log₂-probabilities with Laplace smoothing.
4. **Assert thresholds**: Tests verify quality gates, regression tolerance, and per-bigram floor.

## Scoring Algorithm

**Bigram conditional log-probabilities with Laplace smoothing:**

- Word boundary markers (`#`) at start and end
- `P(phoneme_i | phoneme_{i-1}) = (count + 1) / (total + V)` (Laplace)
- Sum log₂ probabilities across all bigrams
- **Per-bigram normalization**: total score ÷ bigram count

More negative = less probable. Per-bigram normalization removes word-length bias, making 3-phoneme and 12-phoneme words comparable.

## Calibration

English baseline (full CMU dictionary, 123,892 words):

| Metric | Value |
|--------|-------|
| Per-bigram mean | -3.89 |
| Per-bigram median | -3.84 |
| Per-bigram min | -7.92 |
| Per-bigram max | -2.37 |

Generated baseline (135k words, seed 42):

| Metric | Value |
|--------|-------|
| Per-bigram mean | -4.74 |
| Gap from English | 0.85 |

## Quality Gates

| Gate | Threshold | What it catches |
|------|-----------|-----------------|
| **Per-bigram gap** | < 2.0 | Generated words drifting too far from English |
| **Regression tolerance** | < baseline + 0.5 | New changes making things worse |
| **Per-bigram floor** | > -12.0 | Individual words with implausible phoneme sequences |
| **Performance** | > 5k words/sec | Generation speed regression |

## Architecture

```
src/phonotactic/
├── score.ts              # Pure scorer — ARPABET in, scores out (no generator deps)
├── ipa-to-arpabet.ts     # IPA → ARPABET direct lookup
├── arpabet-bigrams.ts    # Pre-computed bigram frequency table from CMU dict
├── english-baseline.json # Baseline stats (English + generated)
└── phonotactic.test.ts   # Quality gates, regression checks, unit tests
```

The scorer has no dependency on the generator — it's a pure function from ARPABET strings to scores. The `generateAndScore` helper lives in the test file to keep this boundary clean.

## Setup

```bash
npm ci        # install (no Python required)
npm test      # run all tests including phonotactic gates
```

## Regenerating Data

The bigram table and baseline can be regenerated from source:

```bash
npx tsx scripts/generate-bigram-table.ts   # → src/phonotactic/arpabet-bigrams.ts
npx tsx scripts/generate-baseline.ts       # → src/phonotactic/english-baseline.json
```

Both scripts download the CMU Pronouncing Dictionary and process it locally.
