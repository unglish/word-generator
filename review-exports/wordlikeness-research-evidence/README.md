# Offline wordlikeness research evidence

The generator runs used revision c151c4c9ca4512d89ccc1f2f2324c4627c552de6. The spelling reference contains 45,904 CMUdict spellings in the ordinary SCOWL lists through size 60. See docs/wordlikeness-tools.md on the PR branch for the evaluation proposals.

The Rust Lingua report uses all 75 languages and batches from seeds 1 through 48. The 20,000-draw KenLM pilot used seeds 101 through 120. The equal-size KenLM and UCI comparisons used the same lexicon-mode draws with morphology enabled, across seeds 201 through 246. The last seed contributed 904 draws. The CSV files retain repeat draws.

KenLM used character five-grams with start and end markers and log10 scores divided by letter count plus one. Use the held-out score columns for the English versus generated comparison. UCI used upstream type-weighted positional phone unigram and bigram scores without stress markers. Five-fold validation kept identical spellings together for KenLM and identical pronunciations together for UCI. Percentile comparisons use reference peers from the same fold and length.

The UCI coda experiment used separate 20,000-draw batches of one-syllable bare roots per setting. In the two JSON files, target_pct measures roots containing /n/ in their coda after matching the distribution of phone counts. uni_distance and bi_distance average absolute differences across score quantiles and matched lengths. Smaller distances indicate closer agreement with the dictionary. The development and confirmation phases used distinct reference partitions and generator seeds.
