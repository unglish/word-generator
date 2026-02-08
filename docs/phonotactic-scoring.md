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
- **Per-bigram normalization**: Total score ÷ (number of phonemes + 1)

More negative = less probable phoneme sequence. Scores are in log2-space.

**Why Per-Bigram > Total Score:**

The switch from total log-probability to per-bigram scoring addresses a fundamental bias:

- **Total scores penalize length**: A 10-phoneme word accumulates ~10 negative log-probabilities, while a 3-phoneme word only accumulates ~3. This makes longer words appear "worse" even if their phoneme transitions are equally plausible.

- **Per-bigram normalizes fairly**: Dividing by bigram count (phoneme count + 1) gives the average log-probability per transition, making 3-phoneme and 10-phoneme words comparable.

- **Better threshold stability**: Per-bigram thresholds work across different generated word length distributions, while total score thresholds depend heavily on average word length.

- **Phonotactic focus**: Per-bigram scores measure "how English-like are these transitions" rather than "how short is this word."

## Calibration Results

| Metric | Full CMU Dictionary (123,892 words) | Per-Bigram (Length-Normalized) |
|--------|-------------------------------------|--------------------------------|
| **Per-bigram Mean** | **-3.89** | **Primary comparison metric** |
| **Per-bigram Median** | **-3.84** | **Length-normalized scores** |
| **Per-bigram Min** | **-7.92** | **Floor for outlier detection** |
| **Per-bigram Max** | **-2.37** | **Best possible per-bigram score** |
| Total Mean   | -28.37 | Reference only (length-dependent) |
| Total Min    | -133.04 | Reference only (very long words) |
| Total Max    | -8.36 | Reference only (very short words) |

**Why Per-Bigram Scoring?** Per-bigram scores normalize for word length, making them more meaningful for comparing generated words of varying lengths against English. A 3-phoneme word and a 12-phoneme word can now be compared on equal footing. Total scores were biased toward shorter words since longer words accumulate more negative log-probabilities simply due to having more bigrams.

**Expected Performance:** Generated words should achieve per-bigram scores in the -4 to -6 range if the generator produces phonotactically plausible sequences. Scores much worse than -8 suggest implausible phoneme combinations.

## Thresholds

| Assertion | Threshold | Rationale |
|-----------|-----------|-----------|
| **Per-bigram Gap** | **< 2.0** | Generated per-bigram mean should be within 2 points of English (-3.89) |
| **Per-bigram Min Floor** | **> -12.0** | Based on English min (-7.92) with generous margin for outliers |
| **Sample Size** | **135,000 words** | Large sample for reliable statistics (~13 seconds at 11k/sec) |
| Generated per-bigram mean | -4 to -6 range | Expected performance for phonotactically valid sequences |
| Performance | > 5k words/sec | Maintain generation speed |

**Length-Normalized Benefits:**
- No bias toward short vs long words
- Meaningful comparison across word lengths  
- Per-bigram floor catches truly implausible sequences
- Gap measurement reflects phonotactic quality, not word length distribution

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
