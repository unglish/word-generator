# Phonotactic Scoring

This project uses a **pure TypeScript phonotactic scorer** to measure how "English-like" generated words sound, based on their phoneme sequences. This replaces the previous Python-based UCI Phonotactic Calculator with a zero-dependency TypeScript implementation.

## How It Works

1. **Generate words** using the word generator engine
2. **Convert IPA → ARPABET**: The generator uses IPA phoneme symbols internally (e.g., `æ`, `tʃ`, `eɪ`). The scorer uses ARPABET (e.g., `AE`, `CH`, `EY`). The bridge module (`src/phonotactic/ipa-to-arpabet.ts`) handles this conversion.
3. **Score via TypeScript**: Words are scored against real ARPABET bigram frequencies derived from the CMU Pronouncing Dictionary using conditional probabilities with Laplace smoothing.
4. **Assert thresholds**: Vitest tests verify that generated words stay above minimum phonotactic plausibility thresholds.

## Metric Used

**Algorithm**: Bigram conditional log-probabilities with Laplace smoothing

This is a bigram log-probability score with:
- Laplace smoothing (handles unseen bigrams)
- Word boundary markers (# start/end)
- Conditional probability mode: P(phoneme_i | phoneme_{i-1})
- Product aggregation across bigrams

More negative = less probable phoneme sequence. Scores are in log2-space.

## Calibration Results

| Metric | Real English (500 words, 5 seeds) | Generated (100 words, seed 42) | Notes |
|--------|-----------------------------------|--------------------------------|-------|
| Mean   | -27.72                           | -34.38                         | Real CMU dictionary data |
| Min    | -55.28                           | -61.41                         | Measured with empirical bigrams |
| Median | -27.48                           | -32.42                         | Gap: 6.66 points |
| Max    | -11.23                           | N/A                           | English best case |

**Gap: 6.66 points** (English mean − generated mean). Generated words score somewhat worse than real English in log-probability space, which is expected — they are novel sequences that follow English phonotactic patterns but aren't actual English words from the CMU dictionary.

## Thresholds

| Assertion | Threshold | Rationale |
|-----------|-----------|-----------|
| Generated mean | > -40 | Based on measured mean (-34.38) minus margin |
| Generated min  | > -100 | Generous floor for 1000-word samples (English min ~-68 at 500 words) |
| Gap (English mean − generated mean) | < 12 | Based on measured gap (6.66) plus margin (5) |
| Performance | > 5k words/sec | Maintain generation speed |

## Setup

```bash
# Install dependencies (no Python required!)
npm ci

# Run tests
npm test

# Run benchmarks
npx vitest bench --run
```

## Architecture

```
src/phonotactic/
├── ipa-to-arpabet.ts     # IPA → ARPABET symbol mapping
├── arpabet-bigrams.ts    # Pre-computed ARPABET bigram frequency table
├── score.ts              # Pure TypeScript bigram scorer (no Python!)
└── phonotactic.test.ts   # Vitest tests with threshold assertions
```

## Implementation Details

The pure TypeScript implementation:
- Uses real ARPABET bigram counts derived from 132,603 CMU Pronouncing Dictionary entries (976,831 bigrams)
- Implements the same scoring algorithm as the UCI calculator: conditional log-probabilities with Laplace smoothing
- Eliminates the Python dependency and subprocess overhead
- Provides empirically-grounded scoring based on actual English pronunciation data
- Much faster and easier to deploy than the Python-based approach

No environment variables or external dependencies required!
