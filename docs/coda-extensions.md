# Coda extensions and legality

Final `/s/` and nasal-stop extensions are proposals subject to the same segment,
position, nucleus/coda, cluster-weight, and cluster-sequence filters used while
building a root coda. Shared shape checks additionally enforce configured length,
obstruent voicing agreement, and nasal-stop place agreement before choosing a
continuation. The safety-net repairs use the same feature predicates and length
calculation.

An extension also has to be a legal completed coda: its final segment must satisfy
`codaConstraints.allowedFinal`, and a multi-segment extension must be an exact
entry when `clusterLimits.attestedCodas` is supplied. During construction, a
prefix of a longer listed coda may still be used to reach that complete cluster.
`codaAppendants` grants the configured extra length slot; it does not bypass
voicing, repetition, or attestation constraints. Without a whitelist, the existing
sonority and regex filters remain in force.

Adjacent identical coda segments are rejected before they are appended.
Non-adjacent repetition remains possible when licensed by the attested inventory:
`/kst/ + /s/ → /ksts/` and `/st/ + /s/ → /sts/` remain available. Rejecting every
repeated sound would incorrectly remove these patterns.

Nasal-stop extension chooses a voiced stop sharing the nasal's configured place
of articulation. Only eligible coda candidates participate. If none satisfy the
remaining constraints, the nasal remains unchanged. For example, default English
licenses `/nd/` and `/mb/`, while an unlisted `/ŋg/` proposal is rejected.

Successful transformations retain the existing `finalS` and
`nasalStopExtension` trace events. A proposed but illegal extension records
`codaExtensionRejected`, including the original coda, proposed segment, extension
type, rejection reason, and syllable index. Rejections have no orthographic unit:
they do not delete or claim ownership of an existing grapheme.

Changing eligibility changes the deterministic word stream and the frequency of
the extensions. Measure the bare and affixed profiles independently using the
fixed baseline protocol. The focused public-API tests include forced 100%
extension configurations and a 20,000-word bare-root stream.

This work concerns root construction and extension. Morphophonemic replacements
are separate operations. A traced development probe still finds `-ity` changing
`/sk/` to `/ss/`; that requires validating the root alternation and its paired
spelling transformation. It is not repaired by deleting one `/s/` afterward, and
the remaining affixed-word duplicate metric must stay visible.

## Frozen development comparison

Each profile below contains 50,000 archived words across five fixed seed streams.
The original and candidate captures share the frozen protocol, evaluator, and
reference fingerprints. Counts are words containing an adjacent duplicate coda.
The [compressed supplementary report](../evaluation/experiments/legal-coda-extensions/coda-extension-probe.json.gz)
retains the full counted evidence and witness traces.

| Profile | Original | Candidate |
|---|---:|---:|
| Lexicon, morphology enabled | 180 | 2 |
| Lexicon, bare roots | 272 | 0 |
| Forced monosyllables, bare roots | 5,429 | 0 |
| Text, morphology enabled | 167 | 1 |

The [supplementary archival probe](../evaluation/quality/probes/coda-extensions/README.md)
cross-checks these counts against the frozen summary and stratifies by actual
morphology. In the original archive, 6,045 duplicates were already present after
`generateSyllables`, each with a `finalS` event at the same syllable. The candidate
has zero duplicate codas in every recorded root-pipeline stage. Its three final
duplicates arise after that pipeline; all three traces record
`ity-velar-softening`, with root `/sk/` becoming `/ss/` and no extension event:

| Profile | Seed | Draw index | Output |
|---|---:|---:|---|
| Lexicon default | 101601885 | 5370 | efiessity |
| Lexicon default | 2089697863 | 2294 | oussity |
| Text default | 2666001996 | 4234 | eatiessity |

Separated repetition remains available. Exact inventory-listed coda occurrences
across all 200,000 final words changed as follows:

| Coda | Original | Candidate |
|---|---:|---:|
| /sts/ | 101 | 2,141 |
| /sps/ | 108 | 761 |
| /sks/ | 588 | 3,488 |
| /ksts/ | 90 | 73 |

This shows retained reachability and changed cluster composition, not a fitted
English frequency distribution. Successful selected-word `finalS` events fell
from 10,522 to 2,380, and nasal-stop extensions from 3,693 to 3,045. Candidate
traces recorded 3,034 repetition rejections, 1,085 final-s voicing rejections,
756 final-s attestation rejections, and 1,572 nasal-stop attestation rejections.
These are events in returned-word traces, not all internally attempted words.
Historical rejection events were not instrumented and remain unknown.

Inventory coverage is narrower than universal coda legality. Unlisted
multi-segment codas fell from 542 to zero among 15,358 candidate multi-segment
codas in the bare lexicon profile, and from 6,443 to zero among 42,009 candidate
multi-segment codas in the forced-monosyllable profile. Every candidate with no
applied morphology also had zero unlisted multi-segment codas. There are still
1,616 unlisted coda occurrences in lexicon-default and 1,000 in text-default,
all in suffix-bearing words. An unlisted suffix-expanded cluster is not by itself
evidence of linguistic invalidity; inflectional codas such as /ndz/ need a
morphological licensing model separate from the root inventory.

Normal construction still allows a listed cluster's proper prefix and may stop
there at its planned length. The current 95-entry English inventory lists every
multi-segment proper prefix, so this creates no additional unlisted default
clusters. Custom inventories need not have that property. Requiring exact
completion throughout normal construction would be a separate contract change
(Q11c), beyond this extension-specific final check.

The change also shifts unrelated measured outcomes. In lexicon-default,
disyllabic primary/secondary stress clashes rose from 4,467/21,065 (21.206%) to
4,552/21,042 (21.633%): +0.427 percentage points, with increases from +0.214 to
+0.666 points across all five streams. The existing rare `ugh` spelling gate also
fails at 0.0036781× versus its unchanged 0.0062× minimum. These limitations remain
visible; no statistical gate or spelling weight was changed. The result establishes
a narrower coda invariant improvement, not overall wordlikeness or human preference.
