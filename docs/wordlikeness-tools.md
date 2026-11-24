# Proposed offline diagnostics for English wordlikeness

The spelling and pronunciation pilots support three uses in generator evaluation. Lingua can flag shifts in the kinds of spellings a batch contains. KenLM can select unusual spellings for trace review. The UCI Phonotactic Calculator can show whether generated pronunciations contain unusual sounds or sound pairs for their positions. None of the pilots established a threshold for perceived quality.

Use the 45,904 filtered CMU/SCOWL entries as the English reference, with one vote per spelling and its selected CMU pronunciation. Retain repeated draws in generated batches. For each run, record the generator revision, seeds, mode, morphology setting, scorer version, training population and coverage of matched reference groups. [Corpus definition](../data/cmu/ordinary/README.md)

## Lingua for batch composition

With all 75 Rust language models enabled, Lingua ranked English first for about 44% of the filtered English reference and 8% of generated spellings. English rank and the distribution of first-choice languages are useful ways to locate spelling patterns for inspection. A language label on an isolated spelling has limited value as a judgment about that word. Compare batches after matching letter and syllable counts, then trace examples from groups whose shares shifted. The existing pilot is sufficient to propose this use. [Lingua setup and interpretation](lingua-diagnostic.md)

## KenLM for unusual spellings

Train a character five-gram model on the filtered spelling corpus. Score letters with word boundaries and divide the total log score by the letter count plus the end marker. Estimate reference scores out of sample, keeping identical spellings together when assigning folds. The 45,904-draw comparison found that the pooled first-percentile cutoff flagged about one in five three-letter dictionary spellings and only one of 4,953 ten-letter spellings. Use the same-letter-count reference percentile to select traces. The bottom 1% is a proposed inspection threshold for lengths with enough reference data.

KenLM showed some agreement with written ratings on 200 previously reviewed spellings. Its advantage over the filtered trigram scorer on the full sample reversed on the 40-word subset. Before giving KenLM weight in individual spelling rankings, collect fresh blinded judgments on the prepared length- and syllable-matched pairs. Before using a cutoff to reject words, obtain direct plausibility ratings for samples on both sides of that cutoff. Pair preferences alone answer a ranking question.

## UCI for pronunciation patterns

Fit the type-weighted positional single-sound and adjacent-pair models on unstressed CMU phoneme sequences. Assign identical pronunciations to the same fold. Score the generator's emitted phonemes directly and compare against held-out dictionary peers with the same phoneme count. Report the two scores separately.

Across 45,904 generated draws with morphology enabled, the median matched percentile was 46 for individual sounds and 28 for adjacent pairs. Of the 45,902 draws with same-length peers in their fold, 24.4% were below the reference's tenth percentile for pairs. This establishes a measurable batch difference. It leaves open where the difference arises and whether listeners find it objectionable.

Use low-scoring groups to select traces and compare proposed changes. In a one-syllable bare-root pilot, reducing the weight for the single-consonant ending /n/ brought its frequency closer to the reference on all ten fresh seeds. The improvement in the UCI pair-score distribution on the development sample reversed on confirmation. A future automated tuning objective needs replication across candidate changes and an audio-only test of listener preference. [UCI metric definitions](https://phonotactics.socsci.uci.edu/about)

## Decision

Propose all three as offline diagnostics. Keep scores separate so each finding points to a spelling, pronunciation, or batch-composition question that can be investigated through the generator trace. Human validation becomes necessary when using a score to rank perceived quality, reject individual outputs, or select production weights on that basis. [Trace diagnostics](word-trace-diagnostics.md) · [Human review](human-review.md)
