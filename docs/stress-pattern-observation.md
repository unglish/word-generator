# Stress-pattern observation: prerequisite integration

This branch composes Q04 (#309, `d1d5189`), Q08a/b (#319/#322,
`70290d0` including `dd957d4`) and Q06 (#315, `a27f7fe`) on their common
main `8e9ceb2`. Q04 and Q08b remain draft behavioral dependencies. Their
combined output needs its own control; independent improvements and
regressions cannot be added together to predict this stack.

The dependency composition retains Q04's root/assembled/surface views and
single pronunciation pass, Q08's shared root weight analysis and named
partial quantity model, and Q06's resolved allomorph identities and exact
written parts. `PreparedMorphology` carries the selected forms and paired
phoneme/written decisions from assembly to spelling. Cleanup operates on
returned parts, with separate assembled and emitted snapshots, without
slicing using planned affix lengths. Coordinates use realized prefix
syllables. Both affix selections still inspect the root before alternations;
prefix then suffix stress effects retain their existing order.

Q04's monosyllabic root has internal primary stress, so the integrated
Q08 `stressWeight.primary.selectedIndex` is 0 for a monosyllable. The
weight trace remains pre-rhythm and before root nucleus repair; it does
not represent complete or final assembled stress. The later lexical root
spelling view can contain a promoted vowel replacement, and cannot replace
an earlier root-stage snapshot.

Q07, Q10a/b1, Q05 and rhythm sampling changes are outside this composition.
Unknown quantity remains unknown, and the existing operational fallback
remains explicit. No extra operational weight analysis is run on affix or
surface phones.

## Historical dependency fixtures

Two Q06 assertions retain their original source-specific expectations:
seed 167 expects `immamsed`, while this combination accepts `inlodsed`;
the 10,000-word seed-20260926 stream expects more than 30 `im` selections,
while this combination observes 29. These failures remain visible. They
are not silently relabeled as passing or used to retune the generator.
The sample count is not a calibrated linguistic frequency target.

A separate integrated seed-411 witness produces `immea`, with a resolved
`im` prefix before /m/. Forced public-API fixtures separately cover
pre-alternation selection, paired phoneme/written rules, same-spelling
variants, original variant priority, changed realized syllable counts,
and both affixes' stress effects. They do not replace the historical
seed/count assertions.

## Verification before the first control

The combined full unit run records 463 passing tests, one skip and three
failures: the two unchanged Q06 assertions above, plus the unchanged
`ugh` underrepresentation gate (0.004901× against its 0.0062× floor).
The dedicated quality suite passes all 12 tests; that suite does not
include the unit suite's n-gram gate. Strict TypeScript and touched-file
ESLint pass. All five added interaction fixtures pass. These results do
not establish overall quality improvement for the combined draft stack.

## Staged verification

The pre-detachment composition is committed as `ca6654c`. Its complete
200,000-word control is archived at
`memory/quality-runs/stress-pattern-composition`, with generator digest
`3f5b125a15e9a2aaa98ab79d14feeb5502fc77b8584307da025162fe55f2ea63`.
All 25 artifact hashes and all 45 generator source files were verified,
including equality to that commit. The frozen evaluator digest is
`ad7bf7980d18a9e4ed8084c5b3ea0b6f43ae24722db44b99f38a5da15c404007`.

The separate metadata correction uses one typed `clonePhoneme` for
lexical copies, promoted nucleus propagation, reduction targets and
aspiration copies. It preserves scalar values and explicitly clones
`nuclearQuantity`; positional metadata from Q07 is outside this stack.
Existing reduction target lookup and every probability/RNG call remain
unchanged. Five public mutation fixtures fail against the composition
and pass with this correction, while the complete lexical suite passes
16 tests. The corrected full suite records 468 passes, one skip, and the
same three failures (including the unchanged 0.004901× `ugh` ratio).
Dedicated quality remains 12/12; strict runtime/parity-tool TypeScript
and touched-file ESLint pass.

The correction requires exact unmutated value/full-trace/RNG parity
against the composition. The pre-fix 20,000-draw paired trace-on/off report
has been captured with the
[detachment parity tool](../evaluation/quality/probes/stress-pattern/README.md).
The post-fix full control and comparison are still pending. The later
Q09a observer separately requires exact parity after removing only its
new trace field. Original and independent PR archives remain unchanged.
