# Grapheme selection probe v1

Registered before changing the spelling generator, 2026-09-26. This supplement
does not change the frozen v1 quality evaluator.

Hypothesis: the writer can honor every hard grapheme constraint and choose from
positive finite weights without treating an edge syllable as an edge segment.
We expect the existing zero-total-weight metric to reach zero. This does not
establish reader preference or spelling/pronunciation agreement after repairs.

Count decisions and affected words, with denominators, for:

- a nonpositive or nonfinite selected-candidate weight (including singletons);
- an empty ordinary candidate set, and its declared fallback or error outcome;
- any candidate restored after failing a hard context or positional constraint;
- each explicit positional scope and fallback reason.

The baseline's singleton trace weight is a synthetic 1 and its filtering trace
does not record whether an empty set was restored. Those two baseline quantities
are **unobserved**, not zero. For historical data, report zero-total multi-option
choices and singleton trace coverage separately. The new trace must expose true
weights and exclusions. Regressions in distributions, diversity, and word length
remain visible in the frozen four-profile benchmark.

Public API checks must cover first-syllable codas, last-syllable onsets, literal
word edges, isolated syllables, conditioned fallbacks, and unsatisfiable custom
configurations. A hard ban must survive even if all candidates violate it.
An explicit fallback is permitted only if its own context, constituent, cluster,
position, and weight constraints all pass; otherwise generation must fail with
a descriptive configuration error instead of emitting an unlicensed spelling.

Use development streams for diagnosis. Run the unchanged benchmark protocol on
all four profiles after the policy and tests are fixed. Report counts and ranges
across independent streams; do not tune on the reserved validation cohort.
