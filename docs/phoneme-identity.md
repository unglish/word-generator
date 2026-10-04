# Phoneme identity and scoring projections

The default generator has a legacy English inventory with mixed transcription
conventions. `phoneme-identity-v1` observes those conventions without changing
generation, spelling, pronunciation, selection weights, reduction or RNG use.
It adds no fields to existing `Phoneme` or `Word` objects.

The provisional comparison reference is **rhotic General American**. This is an
explicit research reference, not a claim that the current generator implements
a single American dialect. A default inventory migration requires a separate
decision and measured change. Existing `/ɑ, ɔ/` identities remain distinct;
no cot–caught merger is imposed.

## Public observer

```ts
import {
  generateWord, observeWordIdentity, projectLegacyArpabet, projectIdentityStress,
} from "@unglish/word-generator";

const word = generateWord({ seed: 42, trace: true });
const observation = observeWordIdentity(word, {
  sourceProfile: "english-legacy-v1",
  layer: "surface",
});
const coarse = projectLegacyArpabet(observation);
const preserved = projectIdentityStress(observation);
```

`sourceProfile` is mandatory. Custom inventories use `unclassified` unless their
author explicitly adopts the legacy inventory's interpretation. `layer` is a
caller declaration, not a reconstructed history. The observer consumes segmented
syllables, including multiple phones in a nucleus. It does not tokenize a whole
IPA string, resyllabify, or combine adjacent phones.

Every segment retains its raw symbol, syllable/slot/index coordinates, recorded
flags, and source identity. The 41 inventory identities are distinct, with stable
IDs based on their original Unicode codepoints. “Resolved” means the legacy
source entry is identified; it does not certify a General American realization
or a legal rime. The registry and its entries are frozen; observations are
independent value objects and can be edited without changing the input or registry.

The legacy profile explicitly recognizes two notation aliases: `iː` for `i:`,
and IPA `ɡ` for `g`. Raw symbols remain available. A single final aspiration
mark is recorded separately. Other unrecognized modifiers stay unsupported.
There is no automatic `əʊ`→`oʊ` or `r`→`ɹ` conversion: a dialect realization
or a custom trill cannot be inferred from a string alone. The IPA chart separately
defines trill/approximant, aspiration, rhoticity, stress and length notation.
[Official IPA chart](https://www.internationalphoneticassociation.org/IPAcharts/IPA_charts_TI/IPA_charts_TI.html)

## Unresolved identity and unavailable history

| Observation | Contract |
| --- | --- |
| `ɜ` | Distinct, explicitly ambiguous legacy identity. Inventory and grapheme comments say *bed/said* and select `e/ai`, while the rhotic module header and CMU mapping say *bird/ER*. No NURSE identity is inferred. |
| `ɚ` | A separate source rhotic-vowel identity; no automatic merger with `ɜ`. |
| `ə` and `ʌ` | Separate source identities, even though legacy scoring maps both to AH. |
| Missing stress mark | `unmarked`, not CMU stress zero. Legacy monosyllables intentionally omit a mark. |
| `ˈ`, `ˌ` | Primary and secondary remain distinct; other supplied markers are invalid. |
| `reduced: true` | A recorded flag; it does not identify the lexical source vowel. |
| Absent reduction/aspiration flag | Unknown recording, not evidence that the process did not happen. |
| `tense` | Recorded legacy metadata; it does not establish duration or mora count. |
| Unknown custom symbol | A retained aligned observation, never a deleted segment. |

Historical stage snapshots contain sound arrays but omit stress and reduction
lineage. A prepared-base stage is therefore counted for availability only. It
does not establish complete lexical identity. This observer deliberately makes
no lexical-to-surface correspondence claims; richer trace formats can support a
separately versioned adapter later.

Quantity must remain separate from this contract. Current `tense` values also
affect sonority, reduction and spelling, so changing them changes behavior in
several places. In particular, `/ʊ/` is marked tense, and configured `/ɑ, ɔ/`
reduction rules are skipped by the existing tense guard. Q08 needs an explicit
weight analysis rather than treating that flag as length. English stress can
also reflect vowel quality beyond a heavy/light distinction.
[Moore-Cantwell, 2021](https://www.cambridge.org/core/journals/phonology/article/weight-and-final-vowels-in-the-english-stress-system/30EDBFA90E382F68C400EEFCFC0DA31D)

## Projection contracts

`projectLegacyArpabet` reproduces the old symbol mapping, including its additional
`e` and `o` keys and its removal of aspiration markers. It returns **one item
per observed segment**, retaining `null` for an unmapped item. `complete: false`
must not be repaired by filtering nulls before scoring: that would fabricate
adjacency across an omitted sound. Per-item flags expose erased aspiration,
stress, possible identity merges, and unresolved source interpretation. The
projection also declares that it erases syllable boundaries. Potential merger
flags do not imply that both preimages occurred in a particular sample.

The observer's notation aliases do not alter the old projection. Thus `iː` can
resolve to the FLEECE source entry while still being unmapped by the deliberately
unchanged legacy CMU table. This distinction prevents an observer improvement
from silently changing an existing score.

`projectIdentityStress` retains source IDs and primary/secondary/unmarked stress,
with aligned missing IDs. It reports identity completeness, explicit stress
completeness and supported segment structure separately. Explicit stress
completeness requires a supplied primary/secondary mark on every syllable;
unmarked syllables are unavailable evidence, not automatically ill-formed English.
Multiple nucleus segments are supported and share their syllable's observed mark.
Neither projection computes a probability, wordlikeness score, duration or mora count.

`observeCmuToken` validates CMU's native token grammar. Vowels require one of
`0/1/2`; consonants have no stress digit. AH0/AH1/AH2 and ER0/ER1/ER2 retain
their original category and stress. The adapter does not claim that a CMU AH0
token uniquely identifies an underlying IPA schwa, or silently convert ER to
the generator's unresolved `ɜ`. Malformed or unsupported tokens remain present
with an unsupported result.
[Official CMU symbol list](https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.symbols)

The existing runtime helpers, quality evaluator and PR #304 `wordlikeness-v1`
artifacts remain unchanged. A future stress-preserving cross-corpus score needs
a new model version, explicit crosswalk and matched coverage. Rebuild it from
the same pinned raw corpus and rescore both archived sides; do not compare
different projection versions as if only the generator changed. CMU itself
acknowledges remaining errors, omissions and inconsistent entries.
[CMU README](https://github.com/cmusphinx/cmudict/blob/master/README)

## Reproducible archive observation

The nested probe requires the frozen standalone evaluator from
[PR #307](https://github.com/unglish/word-generator/pull/307), commit
`5a4ff2e72b3cb81e563f174f52f115eec9057ca6`. Its top-level quality source and
protocol fingerprint must be
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.
This is an explicit tooling prerequisite, not a standalone script. The probe
compares those source bytes with the pinned archived evaluator before and after
processing. It does not include another copy of the corpus or validator.

```sh
node --import tsx evaluation/quality/probes/phoneme-identity.ts \
  --run /path/to/2026-09-26-development-standalone \
  --out /new/path/identity-original.json
```

The committed `phoneme-identity-protocol.json` preregisters the measures. The
probe requires the original compressed word archives, verifies all pinned
artifacts before and after processing, validates draw identity/order/count,
checks observer source stability, and refuses to overwrite an existing report.
It never regenerates a word. It records original generator, archive, protocol,
reference and evaluator hashes alongside its separate observer fingerprint.

Reports cover every development profile/seed and actual morphology × final
syllable-count stratum. They include resolved/ambiguous/unknown mass, coarse
mapping coverage and raw preimages, observed stress by nucleus, recorded reduction
flags, unavailable underlying identity and prepared-base trace availability.
Raw-symbol and stress-map keys are JSON-encoded strings to retain arbitrary
unsupported symbols safely. Witnesses are first observed draws of each central
vowel/stress category per profile; they are evidence, not a representative review
sample. The frozen validation cohort remains sealed.

Acceptance is complete accounting, explicit missingness, unchanged legacy
mapping, input immutability and deterministic output/RNG parity. Coverage changes
are measurement results, not proof of better generated words. Human judgments
remain separate outcomes.

## Evidence

The source-frozen observer accounts for all **1,146,606 segments in 200,000
original development words**: 1,143,150 resolved, 3,456 explicitly ambiguous
`ɜ`, and zero unknown. AH merges 79,995 `ə` with 18,834 `ʌ`; ER merges 25,842
`ɚ` with 3,456 `ɜ`. An independent Python implementation verified every raw-symbol,
nucleus-stress and coarse-preimage count in all 20 shards.

The [experiment record](../evaluation/experiments/phoneme-identity/README.md)
contains compact evidence, exact fingerprints, test results and reproduction
commands. All 50,000 forced monosyllables have unmarked stress; their zero
explicit-stress completeness is unavailable information, not an error rate.
No generator behavior change or new human preference result is claimed.

The separate [identity/stress scoring diagnostic](identity-stress-score.md) uses
the same observational contract with authenticated native/base transition tables.
It reports explicit-only and aligned final-surface-trace coverage separately,
retains unavailable items, and compares the two alphabets only over matched
eligible words within each arm. It does not alter this original observer or the
legacy quality score.
