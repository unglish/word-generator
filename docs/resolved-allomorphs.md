# Preserving resolved allomorphs

Morphology resolves an affix against the generated root, then carries that result
through written cleanup. Previously, cleanup sliced the assembled word using the
original plan's prefix/suffix lengths and rebuilt it with the original spellings.
This could overwrite a selected allomorph or remove root letters when a custom
variant had a different length. Default seed 167 returned `inmamsed` despite
selecting the bilabial `im` form; it now returns `immamsed`.

`applyMorphology` returns a `MorphologyResult`: resolved prefix and suffix forms,
plus ordered `MorphologyWrittenPart` entries with `role` and `text`. The root part
already includes paired morphophonemic spelling changes and boundary transforms.
Cleanup operates on those parts directly. It does not recover their boundaries
by slicing the assembled word.

## Trace contract

The existing `trace.morphology.prefix` and `.suffix` remain planned spellings.
The optional `trace.morphology.realization` supplies:

- `prefix` and `suffix`: separate `planned` and `resolved` forms, each containing
  spelling, phone strings, syllable templates, and syllable count;
- `allomorphIndex`: the original configured variant index, even when specificity
  sorting changes the order of evaluation; `null` selects the base form;
- `boundaryPhoneme`: the actual root phone's sound, voicing, manner, and place
  tested before root alternations, without unrelated weight or surface metadata;
- `assembledParts`: the ordered prefix/root/suffix text after attachment and root
  transforms, before post-morphology consonant-letter cleanup;
- `emittedParts`: the same roles after cleanup, whose concatenation is the output.

Selected forms, nested arrays, boundary phones, and written-part snapshots are
detached objects. Later pronunciation, cleanup, config changes, or edits to a
returned trace do not rewrite the saved selection or other snapshots.
Historical traces without `realization` have unknown resolution provenance.

The default inventory currently provides `in`→`im` before bilabials. The tests
exercise `il` and `ir` only in explicitly configured custom inventories. This
change adds no new affixes, weights, or allomorph rules, and preserves the existing
specificity ordering, pronunciation order, and hyphenated-output formatting.

## Evidence and limits

Public-API tests cover default/base selection, different-length prefix/suffix/both
variants, `-ed` and `-s` phones and syllables, genuine boundary transforms, paired
root alternations, snapshot independence, trace determinism, and a continuous
10,000-word sample. The [preregistered archive probe](../evaluation/quality/probes/resolved-allomorphs/README.md)
keeps explicit candidate resolution separate from narrowly source-derived
historical `in`→`im` opportunities.

The frozen development comparison contains 200,000 words per version: four
profiles, each with five independent 10,000-word streams. The probe verifies
manifest, source, configuration, shard hashes, and draw coordinates before
examining either archive.

| Preregistered observation | Original baseline | Candidate |
| --- | ---: | ---: |
| Source-identifiable `in`→`im` opportunities | 248 | 248 |
| Eligible words retaining `im` in final spelling | 0/248 | 248/248 |
| Eligible words with the resolved /m/ prefix coda | 248/248 | 248/248 |
| Affixed words with explicit resolution provenance | 0/57,509 (unknown) | 57,509/57,509 |
| Selected affixes matching archived configuration and assembled spelling | Unknown | 64,031/64,031 |
| Affixed words whose emitted parts concatenate to final spelling | Unknown | 57,509/57,509 |

The `im` opportunities comprise 182 lexicon-profile words and 66 text-profile
words. Every opportunity is repaired in each of the ten relevant seed streams;
the actual root boundary phones are /b/ (134), /m/ (79), and /p/ (35). For example,
lexicon seed 69212153, draw 50 changes `inmatos` to `immatos` while keeping
`ˌɪmˈmeɪ.tɔs`. Historical recovery uses the archived root-stage phone and the exact
default bilabial rule, independently confirmed by the prefix coda; it does not
invent missing selected-form metadata.

All core diagnostic hit counts, eligible counts, and actual morphology/syllable
strata are unchanged in all four profiles. Trigram divergence decreases by
0.000516 bits in lexicon-default and 0.000273 bits in text-default; unique lexicon
spellings decrease by two. These distribution changes are descriptive and do not
establish general quality improvement. The improvement demonstrated here is
preserving the selected allomorph and exposing its provenance.

The candidate also records 50 cleanup operations (40 lexicon, 10 text),
all affecting root text. A retained limitation is lexicon seed 69212153, draw
1737: assembled `brilongs` + `ly` becomes `brilonsly`. The trace records the root
letter loss; this PR does not solve that separate cleanup problem. The archived
[supplementary report](../evaluation/experiments/resolved-allomorphs/allomorph-probe.json.gz)
contains bounded complete trace witnesses and per-profile/replicate counts.

Final `es` letters alone cannot recover historical `s`→`es` segmentation: the old
reconstruction could leave `e` inside its guessed root without changing the final
word. That boundary remains unknown in old traces.

The existing consonant-letter cleanup may still shorten an affix or split a
grapheme. Such edits appear as assembled/emitted part differences rather than
being relabeled as the selected allomorph. Grapheme-preserving cleanup belongs to
Q13. Parts identify morphological text boundaries, not phone-to-character
ownership; final-word provenance remains separate Q02 work. The lexical-stress
pipeline PR also changes attachment and generation call sites, so the two changes
require an explicit integration rather than taking either implementation wholesale.

## Coverage-policy dependency integration

The original Q06 witness and measurements above belong to standalone commit
`a27f7fe`. The Q13 preparation branch also includes Q12a legal selection and Q02a
provenance, which change its seeded selection stream. Its equivalent default
`in` → `im` before /m/ fixture is seed 435, `immorn`; original Q06 seed 167 produced
`immamsed`. The fixed-root and custom allomorph fixtures retain their mechanisms.
The existing 10,000-word im reachability assertion observes exactly 30 cases
against the unchanged `> 30` floor in this dependency combination; that failure
is retained and reported, not weakened or retuned.
