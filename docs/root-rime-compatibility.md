# Root nucleus/coda compatibility

Nucleus replacement preserves configured compatibility with the retained root
coda. Original coda selection (including optional extensions), stress replacement,
edge replacement, and the check immediately before root spelling use the same
configured pair predicate. No exclusions or sampling weights are added.

## Contract and boundaries

A `bannedNucleusCodaCombinations` entry excludes the Cartesian product of its
nucleus and coda sounds anywhere within a syllable. It is not an adjacency rule
or an exact-rime template. Custom configurations supply the entire rule set.

Stress repair keeps its existing trigger: the first nucleus of a primary-marked
syllable whose sound belongs to `stressedNucleusBan`. This includes lexical
monosyllables. Alternatives retain nucleus-only relative weights (`nucleus ?? 1`)
and explicit word-edge eligibility. Edge repair keeps its per-segment trigger,
nucleus-times-position weights, and legacy positional fallback.

Both pools exclude alternatives incompatible with any retained coda segment.
Individual weights must be finite and positive. An invoked repair with an empty
eligible pool or overflowing total weight throws before selection RNG. Untouched
nuclei do not trigger that check. Pool order and the single selection draw,
including singleton pools, are preserved. No coda deletion or new sampler is used.

Final lexical stress can promote another root vowel after affix assembly. For
those existing replacements, compatibility is checked against the retained root
coda that will be spelled, using the root's offset in the assembled word. The
existing assembled-word edge eligibility and look-ahead RNG stream are preserved.
Affix-only repairs receive no additional pair constraint. This does not promise
legality of final morphology, vowel alternations, or surface reduction.

Every nucleus segment is checked against every coda segment of every root
syllable immediately before `generateWrittenForm`, after copied-back final stress
repairs. Later custom reduction may introduce an excluded pair. Public generation
currently builds one nucleus segment; multi-segment contracts are tested with
hand-built repair inputs.

## Trace

Changed root nucleus repairs include a detached `nucleusReplacement` record:
root-relative coordinates, retained coda, word-edge flags used for selection,
weighting policy, eligible entry count, positive pair exclusions, and total weight.
For `repairFinalStressedNuclei`, coordinates are root-relative while edge flags
refer to the assembled word, matching existing selection behavior. Its stage
snapshot uses assembled coordinates; add `lexical.rootSyllableStart` to locate the
corresponding root event. Affix-only repairs have no root replacement record.
Other repair records retain their existing shape.

## Evidence

Historical dependency-control measurements are preserved in the annotated tag
`archive/pr-324-before-main-2026-11-05`. They do not certify current main or a
rebased head. Fresh comparisons and validation results belong in PR #324 and its
archive tag, following [the evidence policy](./experiments.md).
