# Review pronunciation changes with UCI

Use the packet to find changes in emitted IPA and count the adjacent sounds in
generated words. Its UCI scores measure how typical individual sounds and pairs
are at each absolute phone position in the English reference. Review the paired
words and traces when deciding whether to adopt a change. Claims about listener
preference require listening evidence.

## Compare generator revisions

Capture both revisions with the existing quality harness, then read the captures
with one scorer. Each command takes a fresh output directory.

```sh
npm run quality:pr -- --base origin/main --out memory/quality-pr/my-change
npm run quality:uci -- \
  --before memory/quality-pr/my-change/baseline \
  --after memory/quality-pr/my-change/candidate \
  --out memory/quality-pr/my-change/uci
```

The packet uses the five `lexicon-default` development streams in the
[quality protocol](../evaluation/quality/protocol.json). Each stream contains
10,000 lexicon draws with morphology enabled. Repeated draws count. A pair
shares its profile, seed, draw index and word-level random-stream key. Generating
both sides with `trace: true` records the chosen root attempt and the word key.
A changed attempt can change which root is returned even with the same key.
The CLI accepts development captures. Reserve validation streams for the final
review before a default changes.
[Capture and regeneration](quality-baselines.md) · [Stage streams](stage-random-streams.md)

Open `packet.md` for the counts, the first four paired draws per seed and the
largest pair-percentile changes. The version 2 JSON contains the complete data.

- **Changed draws.** Each `draws` row carries the pair key and both spellings,
  emitted IPA strings, realized root lengths, selected attempt indices and
  projected phones with their scores or coverage reason. `changedDraws` indexes
  every draw with a change in these tracked fields. IPA and spelling counts
  include draws with tied percentiles, missing peers or incomplete projections.
  Projected-phone comparisons require a complete mapping on both sides. The
  report counts changes by seed and before-root syllable count and shows the
  first 20 changed draws in protocol order. Other metrics can join on the pair key.
- **Generated sound pairs.** `generatedPairs` counts each adjacent token across
  all positions within the emitted word. Repeated pairs count each time. Both
  arms use the same fully projectable draws, including words without percentile
  peers. Each token share uses that arm’s total adjacent tokens as its denominator.
  The Markdown lists the largest gains and losses in token count alongside
  occurrences per 10,000 tokens in each arm.
- **Dictionary ranks.** The UCI score describes the whole emitted word. The
  score distributions use each arm’s own realized lexical-root syllable count.
  The ranked lists retain up to five higher and five lower pair percentiles per
  before-root group. A new phone count or fold can change the comparison group.
  Each raw score uses the model trained with that word's fold held out. The
  raw-delta cell names both folds when it compares two different models.
  For each mover the JSON gives the original held-out contributions and the
  changed absolute pair positions counted against one shared, full dictionary.
  These full-reference counts explain substitutions. The archived score always
  uses its held-out model. The five seed results show variation across streams.
- **Trace evidence.** `attemptComparison` gives the winning attempt index in
  each arm and a scope of `same-attempt` or `different-winners`. When the
  same attempt wins, the first differing snapshot locates an observed change
  within that attempt. When different attempts win, each snapshot and event
  describes its own winner. Their internal sounds can differ even when they
  emit identical IPA. To explain why selection changed, replay matching
  attempt indices in the two runs.
  When syllable snapshots match, the report lists the other trace sections
  that differ. Displayed phone and syllable positions start at one. JSON
  indices and winning-attempt indices start at zero. Both full winning traces
  are in the captures under the pair key and in the packet JSON for each mover.

For a selection-engine comparison, use `--before-engine` and `--after-engine`
to declare the identities known from the experiment. An omitted engine is
reported as unverified. The report identifies each generator revision, source
digest, dirty status, Node runtime and dependency lock. When capture environments
differ, account for them before attributing a change to the generator.
For changes to boundary and hiatus random streams, run `npm run audit:rejections` on each
checkout with the same evaluator and compare the retry histograms. Its
`--compare` flag tests exact output, selected-attempt and RNG parity. Store
the packet in the change's PR evidence archive. [Retry accounting](rejection-accounting.md) · [Evidence policy](experiments.md#where-evidence-lives)

## What the scorer measures

The English reference uses the 45,904 CMU spellings in the ordinary English
and American SCOWL lists through size 60. It gives one vote to the first valid
unlabelled CMU pronunciation of each spelling, including homophones. The English
adapter projects surface segments to unstressed CMU symbols in order. A missing
mapping makes the entire word ineligible. An unseen sequence of valid symbols
still receives a raw score. [Population and source pins](../data/cmu/ordinary/README.md) · [Projection and its mergers](phoneme-identity.md#projection-contracts)

Five folds keep identical projected pronunciations together. The historical
fold is the first eight bytes of SHA-256 of the space-separated phones, read as
an unsigned big-endian integer modulo five. Both model fitting and peer scoring
hold that fold out of training. The scorer also accepts a reference descriptor
with a JSON-array encoding for other symbol inventories.

Both raw scores start at 1. For each absolute phone position, add the number
of training rows containing that phone there divided by the number reaching
that position. For each internal pair, add the corresponding pair count divided
by the number reaching the second position. Sum left to right, with zero for
unseen events. A one-phone word therefore has a raw pair score of 1.
[UCI positional metrics](https://phonotactics.socsci.uci.edu/about)

For each score, compare against held-out dictionary peers from the same fold
with exactly the same number of phones. The percentile is
`100 × (peers below + peers tied / 2) / all peers`. A word without peers keeps
its raw scores and has unavailable percentiles. Report the median of eligible
draws and the number strictly below percentile 10 divided by the eligible
count. The peer match uses **surface phone count**, independently of the root
syllable grouping in the packet.

## Rebuild and verify the frozen result

The shipped English phone rows allow offline scoring. To check them against
the pinned raw CMU dictionary, or write a rebuild into a fresh directory:

```sh
npm run quality:uci -- build-reference --dictionary "$CMU_SOURCE"
npm run quality:uci -- build-reference --dictionary "$CMU_SOURCE" --out /tmp/uci-reference-rebuild
```

Fetch the evidence tags once if needed. The replay checks the dictionary rows,
folds, both raw scores and each available generated percentile row by row.
The optional root-strata check joins the later trace regeneration to the scored
draws using seed, draw index and emitted phones. Some spellings changed between
the scored revision and the revision used for tracing.

```sh
git fetch origin tag archive/pr-553
git fetch origin tag archive/issue-555-selection-strategy
npm run quality:uci -- verify-archive --root-strata
```

The frozen generator was `c151c4c9`. It drew 1,000 words per seed for seeds
201–245 and 904 for seed 246. Use a fresh development capture to describe a
later generator. [Frozen outputs and reference](https://github.com/unglish/word-generator/tree/archive/pr-553/review-exports/wordlikeness-research-evidence)

## Audited root pairs and stress

[The root census](../evaluation/corpus/uci-root-pairs-v2.json.gz) is a separate
dictionary input for investigating selection. It counts the terminal stem's
own pronunciation. `stemWeightedOccurrences` gives one vote to every occurrence
of a pair in a retained stem. `surfaceWeightedOccurrences` weights each such
occurrence by the number of included surface spellings resolving to that stem.
For example, the two medial L–IY pairs in *dillydally* both have primary stress
on the left and an unstressed vowel on the right, so the stem contributes two
occurrences to that row. The 20,851 retained stems represent 42,670 surfaces.
They supply 116,157 stem-weighted and 212,430 surface-weighted pair occurrences.

Every adjacent pair belongs to one of eight slots. Before the first vowel,
count consonant–consonant and consonant–vowel pairs. Between vowels, distinguish
vowel–consonant, consonant–consonant, consonant–vowel and adjacent vowels. After
the last vowel, distinguish vowel–consonant and consonant–consonant. For each
pair preserve the nearest vowel stress at or before its left phone and at or
after its right phone. CMU uses 0, 1 and 2 for unstressed, primary and secondary
stress. A missing flanking vowel is recorded as `null`. These slots require
no decision about which syllable owns a medial consonant.

Rebuild the Phase 1 ledger at its pinned revision and run the independent
verifier. Then run this command from the current checkout. It verifies the
ledger identity, terminal-coda exclusions and projection, and writes raw
integer counts without applying the fitted generator length weights.
[Ledger inputs and instructions](cmu-root-reference.md#reproduce)

```sh
node --import tsx evaluation/corpus/uci-root-counts.ts \
  --root-reference "$ROOT_JSON" --out /tmp/uci-root-pairs-rebuilt.json.gz
```
