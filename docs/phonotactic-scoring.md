# Phonotactic Scoring

This project uses the [UCI Phonotactic Calculator](https://github.com/KaiGiDev/uci-phonotactic-calculator) to measure how "English-like" generated words sound, based on their phoneme sequences.

## How It Works

1. **Generate words** using the word generator engine
2. **Convert IPA → ARPABET**: The generator uses IPA phoneme symbols internally (e.g., `æ`, `tʃ`, `eɪ`). The UCI calculator uses ARPABET (e.g., `AE`, `CH`, `EY`). The bridge module (`src/phonotactic/ipa-to-arpabet.ts`) handles this conversion.
3. **Score via UCI**: Words are scored against the CMU-based English phonotactic corpus using bigram conditional probabilities with Laplace smoothing.
4. **Assert thresholds**: Vitest tests verify that generated words stay above minimum phonotactic plausibility thresholds.

## Metric Used

**Column**: `ngram_n2_pos_none_bound_both_smooth_laplace_weight_none_prob_conditional_agg_prod`

This is a bigram log-probability score with:
- Laplace smoothing (handles unseen bigrams)
- Word boundary markers (# start/end)
- Conditional probability mode
- Product aggregation across bigrams

More negative = less probable phoneme sequence. Scores are in log-space.

## Calibration Results

| Metric | Real English (20 words) | Generated (100 words) |
|--------|------------------------|----------------------|
| Mean   | ~-12.5                 | ~-24.0               |
| Min    | ~-16.0                 | ~-41.0               |
| Median | ~-12.3                 | ~-22.3               |

Generated words score roughly 2× worse than real English in log-probability space. This is expected — they are novel sequences that follow English phonotactic patterns but aren't actual English words.

## Thresholds

| Assertion | Threshold | Rationale |
|-----------|-----------|-----------|
| Generated mean | > -35 | Generous floor; real English ~-12.5 |
| Generated min  | > -50 | No catastrophically bad words |
| Gap (English mean − generated mean) | < 25 | Stay within striking distance of English |
| English baseline mean | > -20 | Sanity check on the scorer itself |

## Setup

```bash
# Create Python venv and install UCI calculator
python3 -m venv .venv
.venv/bin/pip install uci-phonotactic-calculator==1.0.1

# Run tests
npm test
```

## Architecture

```
src/phonotactic/
├── ipa-to-arpabet.ts    # IPA → ARPABET symbol mapping
├── score.ts             # UCI scorer integration (shell out to Python CLI)
└── phonotactic.test.ts  # Vitest tests with threshold assertions
```

## Environment Variables

- `PHONOTACTIC_CALCULATOR_PATH` — path to `uci-phonotactic-calculator` CLI binary
- `PHONOTACTIC_CORPUS_PATH` — path to the English corpus CSV file
