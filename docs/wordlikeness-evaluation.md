# Algorithmic wordlikeness evaluation

Issue [#301](https://github.com/unglish/word-generator/issues/301) adds independent,
pure scoring functions in `evaluation/review/wordlikeness/`. They do not change
any generator configuration, sampling weights, repairs, or public generation API.
No acceptance gate, calibrated prediction, or “percentage English” is defined.

## What is replicated, adapted, and proposed

[Frisch, Large, and Pisoni (2000)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3129706/)
use constituent probabilities in a prosodic onset–rime grammar. We retain the
log-product calculation and eight categories: initial versus medial onsets,
medial versus final rimes, each stressed versus unstressed. The authors also
describe these categories in their
[discussion of probabilistic phonotactics](https://ndl.ethernet.edu.et/bitstream/123456789/55546/1/22pdf.pdf).
The paper's spoken nonwords and English pronunciation preparation do not validate
our written-form review task. This implementation is a CMU-based adaptation,
not a replication of the paper's corpus, parser, stimuli, or reported accuracy.

For each syllable, score its onset and rime (nucleus plus coda) in their respective
contexts. `paper = sum(log(count / context_total))`, with natural logarithms.
Higher (less negative) finite scores mean more probable constituent combinations.
`typicality = paper / (2 * syllable_count)` is an unvalidated extension, not the
paper's preferred metric. Retaining both makes their different length behavior
visible. A syllable in a monosyllable has an initial onset and a final rime.

`spelling` is a proposed character-trigram extension for the displayed spelling:
`sum(log P(next | previous_two)) / (letter_count + 1)`. `spelling_total` retains
the numerator. There are exactly two start markers (`^^`) and one end marker
(`$`); end prediction is included in both the numerator and denominator. The
output vocabulary is the 26 lowercase ASCII letters plus `$`. Start markers
are context only. Add-half smoothing is fixed before inspecting ratings:
`P = (count + 0.5) / (context_total + 0.5 * 27)`. No backoff is fitted; an unseen
context gives the uniform distribution over the 27 outputs. These probabilities
use natural logs and are not comparable in absolute magnitude to the existing
bigram scorer's log base 2.

## Reference lexicon and preparation

The model uses [CMUdict](https://github.com/cmusphinx/cmudict) revision
`74790861f652b15e4ac49015a90074ad62a27690`, file `cmudict.dict`, SHA-256
`81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
CMU's license and acknowledgment are included beside the derived model.

The deterministic parser lowercases ASCII-letter spellings, keeps the first
unlabelled pronunciation per spelling, removes trailing dictionary comments,
and excludes numbered pronunciation alternatives, punctuation/apostrophes,
digits, unsupported ARPABET, and entries without a vowel. It does not remove
proper names, acronyms spelled entirely with letters, or inflections. Every
accepted spelling has equal lexical weight; this is not token-frequency weighting.
The spelling and sound models use exactly the same accepted spelling set.
The pinned model accepts 117,485 entries and records exclusions by reason.

CMUdict provides stressed phonemes but no syllable boundaries. This adaptation
finds every vowel, derives an inventory of word-initial consonant clusters from
the accepted lexicon, and assigns each intervocalic cluster's longest suffix in
that inventory to the next onset. Remaining consonants close the prior syllable;
word-final consonants all belong to the final coda. An empty onset is permitted,
including between adjacent vowels. The resulting inventory is saved in the
model. There is no ambisyllabicity, morphological boundary analysis, or
stress-sensitive resyllabification. Names can introduce unusual onset clusters.
These choices can especially affect medial-rime probabilities and coverage.

Each nucleus is one CMU vowel (including diphthongs). Stress 1 and 2 both map to
stressed; 0 maps to unstressed. Empty onsets are ordinary counted constituents.
An empty coda makes a vowel-only rime; there is no independent coda score.
Constituent occurrences increment their context totals, including repeated
constituents within a word, rather than deduplicating word/context pairs. This
explicit occurrence-counting adaptation gives normalized distributions in every
context even when a word has multiple medial syllables.

## Frozen inputs, comparators, and missingness

The scorer validates the committed v1/v2 snapshots and uses each saved
`Word.syllables` and stress field. It never regenerates a word, applies a repair,
inferentially reparses a displayed spelling, or changes the sample IDs. Saved
primary/secondary stress markers are stressed; an absent marker is unstressed,
including in monosyllables. This last convention preserves the saved data even
when it differs from a reader's likely pronunciation.

IPA mapping reuses `ipaToArpabet`: aspiration is discarded, schwa and /ʌ/ share
AH, and the generator's /əʊ/ and /o/ share OW. Unsupported phonemes invalidate
both sound comparators; they are never dropped. Missing/invalid nuclei and
unsupported segment positions or stress also return diagnostics. The saved
phonology need not equal the pronunciation a reviewer inferred from spelling;
orthographic-only repairs can change visible form without adding sound tokens.

The onset–rime model uses **unsmoothed MLE**, with no unknown bucket or backoff.
An unseen constituent has probability zero and mathematically log probability
negative infinity. Its component retains `probability: 0` and
`unseen-constituent-zero-probability`; its JSON log, word total, and normalized
score are `null`. An unobserved context has a separate diagnostic. Missing
scores are excluded pairwise in correlation calculations and never replaced by
zero, a finite floor, or a rank. This can bias coverage toward common structures;
compare coverage and baselines on the same words before interpreting a result.

Spelling input must be nonempty ASCII letters. Case is normalized; whitespace,
non-ASCII characters, punctuation, and digits invalidate the score instead of
being silently stripped. Unseen but supported trigrams remain finite through
the prespecified smoothing, and component diagnostics identify them.

`bigram` and `per_bigram` call the existing `scoreArpabetWords` on the validated
saved sequence. They preserve its boundary `#`, add-one smoothing, reference
counts, and log2 units. The comparator's source files and IPA mapping are hashed
in each machine artifact; see [phonotactic scoring](phonotactic-scoring.md) for
its original baseline. Written letter count and saved syllable count are also
retained. No sound score reads generator sampling weights.

## Reproduce construction and frozen scoring

Run from the repository root with installed development dependencies. The CLI
has no new runtime dependencies. Output files use exclusive creation; choose
fresh paths when reproducing, then compare with the committed artifacts.

```bash
curl -fL https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict -o /tmp/wordlikeness-cmudict.dict
npm run review:wordlikeness -- build --corpus /tmp/wordlikeness-cmudict.dict --out /tmp/reference-v1.json
npm run review:wordlikeness -- score --model /tmp/reference-v1.json --snapshot evaluation/review/studies/written-v1-baseline.json --snapshot evaluation/review/studies/written-v2-baseline.json --out /tmp/frozen-scores-v1.json
cmp /tmp/reference-v1.json evaluation/review/wordlikeness/artifacts/reference-v1.json
cmp /tmp/frozen-scores-v1.json evaluation/review/wordlikeness/artifacts/frozen-scores-v1.json
```

The build command enforces the corpus checksum. Artifacts carry the scoring
version, corpus revision, preprocessing and smoothing settings, corpus/model
hashes, scoring implementation hash, comparator hash, snapshot/source hashes,
sample IDs, word digests, metrics, and per-constituent/per-trigram contributions.
Natural-log arithmetic is deterministic for the same JavaScript runtime. There
are no timestamps or local paths in machine artifacts. Change scoring versions
for future methodological changes; do not silently reuse a prior version's
artifact after changing its implementation.

The committed score artifact has 200 rows per rubric snapshot, representing the
same 200 spellings. Both rubric copies have identical scores. Spelling, bigram,
and length baselines cover all 200; onset–rime and typicality cover 151, with
explicit unseen-constituent diagnostics for the other 49. These are machine-only
coverage facts, not statements about human judgments.

## Private exploratory analysis

Export each study through the existing owner workflow in
[human review](human-review.md). Use one export per study, from the same frozen
sample. Earlier and later exports of a study must not both be supplied: that
would double-count immutable responses. No cloud access is needed for analysis
of existing local exports.

```bash
npm run review:wordlikeness -- evaluate --scores evaluation/review/wordlikeness/artifacts/frozen-scores-v1.json --input review-exports/v1/export.json --input review-exports/v2/export.json --run pilot-001
```

This writes `report.md` and `report.json` exclusively to
`review-exports/wordlikeness/pilot-001/`, an ignored private directory. The CLI
rejects symlinked output parents, makes private directories/files with owner-only
permissions, and never overwrites a run. Keep human responses, comments, joined
exports, and reports private. Do not attach them to a public issue or add them
to Git, published assets, or public machine artifacts.

The primary view pools **both rubric versions**, as agreed for this pilot. Nine
views retain combined/v1/v2 crossed with all/unfamiliar/familiar judgments.
Separate rubric views are descriptive sensitivity checks; different word
coverage, batches, and wording preclude a causal claim about wording.

Each spelling retains rating histograms, denominators, skips, rubric fields,
familiarity flags, original response/session IDs, and qualitative comments.
Skips are excluded from rating denominators. Per-word means receive equal weight
in tie-aware Spearman correlations. Duplicate draws keep their own machine rows;
when a spelling has multiple saved pronunciations its sound metrics average
original draws, not copies across rubrics. Missing draw scores propagate to the
spelling mean, avoiding selective averaging. Full trace evidence remains linked
by sample ID and word digest.

For each metric the report gives finite coverage, missing rated spellings,
Spearman correlation, high/low examples, and the largest percentile-rank gaps
against mean judgments. The same eligible words are used for each candidate's
comparison with negative written length and negative syllable count (the
prespecified shorter-is-better baseline orientation). Raw length rows retain
positive lengths and their signed correlations. Deltas for baseline rows are
not evidence of improvement over themselves. Trace excerpts include changed
stages, grapheme selections, structural events, repairs, morphology, and rare
model constituents/trigrams. They describe saved observations, not why someone
responded. Morphology-related explanations are hypotheses unless tested.

No coefficients, smoothing settings, or combined predictor are fitted to these
ratings. A future fitted analysis must use `splitSpelling`: SHA-256 of
`issue-301-v1 + NUL + lowercase spelling`, first 32 bits divided by 2^32 below
0.2 assigns heldout; all other spellings assign train. This makes repeated draws,
ratings, and rubric copies stay together. The split is recorded now for future
work, not presented as a completed held-out evaluation. Choosing a combined model
or optimizing parameters requires training-only decisions and a separate test.
A small holdout supports tentative conclusions only.

Anonymous batches are not verified independent people, particularly with
continued reviewing. Do not infer population confidence or reviewer-level
generalization from response/session counts. Comments remain qualitative until
there is an explicit coding procedure. The report establishes descriptive
comparisons, not a validated winning metric or a generator threshold.

## Validation

```bash
npm run test:review
npm run review:typecheck
npx eslint evaluation/review/wordlikeness/*.ts
npm test
npm run lint
```

Tests cover hand-calculated probabilities, prosodic categories, syllabification,
empty boundaries, zero/unsupported inputs, normalization, corpus filtering,
frozen-sample determinism and immutability, artifact tampering, pooled rubric
joins, skips/familiarity/comments, tied ranks, and deterministic split leakage.
