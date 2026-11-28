# CMU syllabified root reference

X5 in [#555](https://github.com/unglish/word-generator/issues/555) specifies the
CMU-to-legacy-English mapping and syllabification for E2. The source variety is
the provisional rhotic General American reference described by
[the phoneme identity contract](phoneme-identity.md). The mapped observations
represent CMU dictionary pronunciations. The target is the generator's 41
legacy identities, whose glyphs include `əʊ`, `r`, and `i:`. A new variety
specifies its own input transcription, identity mapping, stress interpretation,
and boundary policy. The adapter interface accepts separate reference and
generator mappings. Boundary inference receives its onset inventories and
cluster license explicitly.

## What CMU can supply

The adapter ID is `cmu-legacy-english-v2`. The 69 native token forms comprise 24
consonants and 15 vowels with each of three stress marks. Every source token
keeps its literal spelling and zero-based position. CMU supplies explicit 0, 1,
and 2. A generated vowel with a known sound can contribute to a count by
identity even if its stress is unmarked or invalid. A count that uses the
vowel's stress requires an observed value. Unsupported tokens also retain
their source position. Their neighbors never become adjacent.

| Source observation | Permitted fitting interpretation |
| --- | --- |
| `AH0`, `AH1`, `AH2` | Fit `ə`, `ʌ`, `ʌ` respectively, as a declared convention. CMU supplies the stress distinction and the AH class. It cannot establish the generator's lexical distinction or recover reduction history. |
| `OW0`, `OW1`, `OW2` | Fit the generator identity spelled `əʊ`. CMU supplies a single OW class and cannot distinguish separate GOAT variants. |
| `ER0`, `ER1`, `ER2` | Preserve the source segment, stress and both candidate legacy IDs. Withhold target ID fitting because the reference cannot resolve `ɜ` and `ɚ`. |
| Remaining supported CMU tokens | Fit the corresponding legacy IDs and preserve their source stress where applicable. |
| Generated `ɜ` | Preserve its stable source ID and ambiguous interpretation. |
| Generated `ɡ`, `iː` | Resolve their canonical source identities through the identity observer and retain the alias glyphs. |
| Generated `e`, `o` | The legacy comparator has coarse EH/OW entries. These forms have no fitting identity. |
| Narrow `oʊ` and other unsupported glyphs | Retain the raw observation and mark fitting unavailable. Narrow output belongs to the [separate speech export](narrow-ipa.md). |

Of the 69 native forms, 66 have a permitted mapping under these conventions.
The three ER forms are explicitly ambiguous. The compact comparison column
preserves the frozen #304 coarse representation. The ID and native-token
columns provide the information needed to distinguish a fitting decision from
a comparison. The reference provides no phonetic length, reduction lineage, or
gold syllabification.

## Medial boundaries

`root-boundaries-v1` uses **audited-min3** for this adapter. Count each of the
20,851 retained stem spellings once toward initial onset support. The licensed
onset inventory contains the empty sequence and all initial clusters observed
in at least three stems. For each intervening consonant run, enumerate all
splits and choose the longest licensed onset. Root edges come from the source
tokens before the first and after the last vowel. Every boundary records its
alternatives, their license and the chosen split. CMU boundaries are inferred.
Generated root boundaries are supplied by `word.lexical.root` through the
public API. For varieties with source syllables, the generic row accessor
accepts supplied slot indices and verifies their alignment without reassigning
any phones. It preserves all phones and stress marks in a multi-phone nucleus.
The generated comparison hides supplied boundaries during inference and scores
them afterward. More than one split can occur in generated roots with the same
neighboring phones and stress.

Frozen #304 has 144 onset keys, all audited initials have 82, and audited-min3
has 65. On the five development seeds, audited-min3 recovered 40,450 of 57,561
supplied medial boundaries, compared with 38,224 for #304. A single consonant
in the generator's coda followed by an empty onset accounts for 12,548 of the
17,111 remaining misses. For example, the generator supplies *flen-a* where
audited-min3 infers *fle-na*. For comparisons of fitted cells, apply audited-min3
to both dictionary and generated roots. Keep the generator's supplied splits
as a separate measure of agreement. This sample measures agreement with the
generator. CMU provides no independent syllable labels.

The `config-legal` sensitivity check evaluates one candidate split between two
vowels. It uses the ordinary legacy root builder's position inventories, length
limits and consonant checks. Sounds in the preceding coda are excluded from the
next onset. The boundary must pass the configured junction rules and the local
vowel/coda, open-vowel/following-onset and onset/following-vowel restrictions.
A generated vowel is checked against its recorded inventory identity. For
reference vowels, a split must pass for every mapped reading. For example, CMU
`ER0 NG IH0` has no licensed split. The /ɚ/ reading of ER forbids a coda /ŋ/,
and the onset inventory excludes /ŋ/. This check covers the local consonant run
and its flanking vowels. Whole-root planning, constraints spanning two
boundaries, and later repairs apply during generation.

Audited-min3 covers all 42,670 surface-weighted dictionary observations.
The configuration check supplies every boundary in 40,946 of them.
Its `boundaryChangesFrom304` histogram counts 2,288 actual moves.
`unavailableBoundariesFrom304` counts 1,725 boundaries with no prediction.
Each key records the cluster length, flanking stress, native cluster, and change
in coda size, such as `0>1` or `1>unavailable`. A root can contribute both a
move and an unavailable boundary. The root-level `changesFrom304` counts that
root once per surface spelling as unavailable. Generated agreement includes
every supplied boundary in its denominator, including any missing predictions.
On the same five seeds the configuration check predicted all 57,561 boundaries
and matched 41,167.

## E2 input and reconciliation

Use the same pinned CMU and Phase 1 ledger as
[the root reference](cmu-root-reference.md). The builder verifies both inputs
and the coda exclusions. It emits one line per retained root, in source-line
order. Each line carries the dictionary line and label, surface ledger lines
and spellings, mapped tokens and policy analyses. A line can count once for a
distinct-root fit or `surfaces.length` times for a surface-weighted fit. Surface
weight here means the number of retained surface spellings represented by a
root, without token frequency weighting.

For E2, select `splits[row.policy]`. Each syllable gives indices for its onset,
nucleus and coda. `fittingEvent(phones, slotIndices, conditioningIndices, requiredStressIndices)`
returns the stable IDs for the slot and its context. Both index lists after
`slotIndices` default to empty. List a phone in `conditioningIndices` when
the cell requires its identity and in `requiredStressIndices` when the cell
requires its stress. An onset after `ER2` can be counted by the preceding
vowel's observed stress alone. Requiring that vowel's identity withholds the
event. Conversely, generated /ə/ with unmarked stress fits an identity-only
cell. It is withheld from cells that require its stress.

A valid request returns `null` when a required observation is missing or
ambiguous. A negative, fractional or out-of-range index raises a `RangeError`
even if another observation in that request is missing. The onset and rime
tables in this report are conditioned on nucleus stress and retain withheld
events under their native tokens. Whole-root complete-case phone and pair
counts require known identities throughout the root.

The report counts native phones and adjacent pairs with and without edge
markers. The reconstructed syllables preserve native phone and pair cells for
the full-coverage policy. An independent recount yields the following totals.

| Weight | Root observations | Phones | Internal adjacent pairs |
| --- | ---: | ---: | ---: |
| Distinct root | 20,851 | 137,008 | 116,157 |
| Surface weighted | 42,670 | 255,100 | 212,430 |
| Surface weighted, all phones eligible | 35,367 | 207,327 | 171,960 |

Each edge-marked pair table adds two events per root. Before emitting a row,
the builder checks every raw token against the original dictionary token at
the same index in both populations. This covers a single-phone root such as
*e* (`IY1`), which has no internal pair. It also checks the audited pairs against the
[pinned E1a root-pair census](uci-review-packet.md#audited-root-pairs-and-stress).
It compares all 5,890 cells by position, adjacent sounds and flanking vowel
stress, once per stem and once per represented surface spelling. The census
includes ambiguous ER tokens in their native form. Its positions depend only on
where vowels occur, so this check can catch a counting error while leaving the
choice of medial syllable breaks to the separate generator comparison.
The report also recounts
all 3,076 constituent cells in frozen #304 on the full 117,485-entry
compatibility population. That separate check uses #304's stress pooling,
initial onset inventory and coarse symbols. The two populations have
different denominators.

## Rebuild

```sh
node --import tsx evaluation/corpus/syllabified-reference-cli.ts \
  --source /tmp/cmudict.dict --phase-one /tmp/root.json \
  --out /tmp/x5-trial --cohort trial
```

Use `--cohort confirmation` for the last two development streams or omit it
for all five. `--words-per-seed 0` produces the mapped rows and constituent
counts alone. Use a fresh output directory for each run. A completed directory
contains `manifest.json` in the `x5-reference-run-v2` format with the generator
revision and source digest, quality protocol fingerprint, exact seeds and hashes
of its outputs. Rebuild v1 reports to obtain separate counts for moves and missing
predictions and the new generated-vowel eligibility. Keep generated rows and
run reports outside the tracked tree.
