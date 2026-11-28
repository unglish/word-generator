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

The adapter ID is `cmu-legacy-english-v1`. The 69 native token forms comprise 24
consonants and 15 vowels with each of three stress marks. Every source token
keeps its literal spelling and zero-based position. CMU supplies explicit 0, 1,
and 2. An unmarked generated nucleus retains its unmarked stress and its source
identity, with stress-dependent fitting unavailable. Unsupported tokens also
retain their source position. Their neighbors never become adjacent.

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

The sensitivity run also evaluates frozen #304 maximal onset (144 onset keys), all
audited initials (82 keys), and configured medial cluster legality. Audited-min3
has 65 onset keys. Config legality checks medial clusters and their junction
against the current generator, so its comparison can track generator changes.
It leaves a boundary unavailable when no split passes those checks. It covers
41,085 of 42,670 audited observations. Audited-min3 covers all 42,670.

Correct medial splits are scored against all supplied boundaries, with
unavailable predictions included in the denominator. Audited-min3 improves
agreement over #304 on both the trial and confirmation streams. Config legality
improves generated-boundary agreement further at the cost of dictionary
coverage. Audited-min3 retains that coverage for the fitting handoff. The
runner records agreement, coverage, movement from #304 and trace witnesses,
with strata by stress, length, cluster and repairs.

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
nucleus and coda. A call to `fittingEvent(phones, slotIndices, conditioningIndices)`
provides stable target IDs for the slot and for each context phone, or returns
`null` if any required phone is ambiguous or unavailable. Include every phone
used to condition the cell. For example, a medial onset following ER can
contribute to an onset count without context phones. It is withheld from an
onset table conditioned on that ER. A withheld rime retains its native tokens
for reconciliation. Whole-root complete-case counts require every phone to be
eligible. They serve a different denominator from local constituent counts.

The report counts native phones and adjacent pairs with and without edge
markers. The reconstructed syllables preserve native phone and pair cells for
the full-coverage policy. An independent recount yields the following totals.

| Weight | Root observations | Phones | Internal adjacent pairs |
| --- | ---: | ---: | ---: |
| Distinct root | 20,851 | 137,008 | 116,157 |
| Surface weighted | 42,670 | 255,100 | 212,430 |
| Surface weighted, all phones eligible | 35,367 | 207,327 | 171,960 |

Each edge-marked pair table adds two events per root. E1a slot-conditioned
totals can be reconciled by summing over slot bins against these native
endpoints with the same weighting and eligibility. The report also recounts
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
contains `manifest.json` with the generator revision and source digest, quality
protocol fingerprint, exact seeds and hashes of its outputs. Keep generated
rows and run reports outside the tracked tree.
