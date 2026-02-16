# N-gram Threshold Baseline (2026-02-16)

## Methodology
- Generated 5 samples of 200k words each (seeds: 42, 123, 456, 789, 1337)
- Extracted bigram/trigram frequencies from written forms
- Compared to CMU lexicon baseline (memory/cmu-lexicon-bigrams.json, memory/cmu-lexicon-trigrams.json)
- Over-representation ratio = sample_freq / cmu_freq (only for CMU n-grams with freq > 0.1%)

## Results

| Seed | Worst Bigram | Ratio  | Worst Trigram | Ratio  |
|------|-------------|--------|---------------|--------|
| 42   | th          | 6.831  | the           | 4.811  |
| 123  | th          | 6.830  | the           | 4.960  |
| 456  | th          | 6.814  | the           | 4.695  |
| 789  | th          | 6.783  | the           | 4.893  |
| 1337 | th          | 6.864  | the           | 4.705  |

## Analysis

The worst bigram outlier is consistently "th" (~6.8× over-represented vs CMU).
The worst trigram outlier is consistently "the" (~4.8× over-represented vs CMU).

This makes sense: the generator produces many words with "th" onsets, while CMU
has a broader distribution of onsets. This is a known characteristic worth tracking.

## Thresholds (max + 10% margin)

- **Max bigram ratio:** 6.864 (seed 1337, "th")
- **Max trigram ratio:** 4.960 (seed 123, "the")
- **Bigram threshold:** 7.55 (6.864 × 1.1)
- **Trigram threshold:** 5.46 (4.960 × 1.1)
