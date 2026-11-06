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
10,000-word sample.

Every default `in`→`im` opportunity now keeps `im` in its final spelling, and
every affixed word records which form was selected and how its emitted parts make
up the final spelling. Consonant-letter cleanup can still delete root letters
(assembled `brilongs` + `ly` becomes `brilonsly`); the trace records the loss, and
that cleanup problem is separate.

The frozen 200,000-word development comparison, the preregistered archive probe
and its supplementary report are kept at tag `archive/evidence-pre-cleanup`:

```sh
git fetch origin tag archive/evidence-pre-cleanup
git show archive/evidence-pre-cleanup:evaluation/experiments/resolved-allomorphs/comparison.md
git show archive/evidence-pre-cleanup:evaluation/quality/probes/resolved-allomorphs/README.md
```

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
