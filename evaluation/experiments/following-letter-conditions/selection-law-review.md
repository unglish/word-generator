# Q14b selection-law review — provisional, not registered

The control analysis is running. This note lives outside the source/evaluation
closure so it cannot change the inputs of that measurement. No runtime edits,
candidate law or acceptance claim follows from this review.

## Observed dependencies

The writer resolves one grapheme using previous written form and the current
doubling count, samples its weight, samples doubling, then appends the realized
form. It may normalize a collision immediately. Syllable and word spelling
passes follow; vowel completion runs at the end of the root writer. Therefore
the next phoneme does not determine the next visible letter, and an initial
lookahead decision is not a final-root preservation guarantee.

The ordinary resolver filters conditions and positions before selecting positive
weights. It enters fallback only if that ordinary pool is empty. Doubling-quota
preference may relax when every supported candidate is excluded. A later
reading filter must not silently reinterpret either of these decisions.

The existing vowel-completion pool deliberately accepts only nucleus slots.
Consonant policy should use the shared resolver directly through a typed new
planner, not bypass that restriction or mislabel a consonant as a nucleus.
Normalization, joint construction and completion all have their own exact
ownership/certificate rules. A visible adjacent letter can be known even when
its spelling is jointly owned; replacement eligibility still requires complete
ownership of the unit being replaced.

## Competing sampling laws

1. Exact conditioning of the existing sequential process. For a complete
   trajectory t with original probability P(t), legality L(t), and normalizer
   Z = sum(P(t) for legal t), the target is P(t | L) = P(t)/Z. A choice's
   conditional probability depends on its original weight and the probability
   mass of all legal continuations, including doubling and later writes.
   One-step lookahead that treats each surviving candidate equally supported
   does not implement this distribution. Right-to-left selection likewise
   changes prefix-sensitive weights and quota state. An exact solver needs a
   proven sufficient state (including written prefix effects and transformations),
   zero-mass behavior and a defined sampling/RNG schedule. Exponential search
   cannot be hidden behind an arbitrary cap whose exhausted paths disappear.

2. Initial sequential draw followed by a registered repair kernel K(x,y).
   Its final law is Q(y) = sum_x P(x) K(x,y), not P(y | L). Retaining already
   compatible spellings gives them their original mass plus incoming repair
   mass. This is a legitimate separately measurable model only if declared
   explicitly. One cannot call it distribution-preserving simply because
   repairs sample alternatives with the existing inventory weights.
   The kernel must specify source order, exact whole-unit alternatives,
   projected neighbors, quota/doubling treatment, zero/one/many-candidate draws,
   infeasibility and later preservation. It must not use a shortest-spelling
   preference or a hidden fallback to make the metrics pass.

3. Local joint conditioning on adjacent choices. This can directly model the
   c/g context where next-written form is initially known, but cannot by itself
   settle subsequent normalization, split formation, completion or morphology.
   Overlapping pairs need a consistent sampling law and no double-counted
   outcomes. This could be part of a staged model; it is not equivalent to
   exact conditioning of the complete writer.

## Decisions requiring baseline evidence

Use the complete initial-to-root transition table to locate where incompatible
contexts enter or disappear. If selection creates most of them, that supports
investigating joint selection; if later writes create them, preservation must
be solved there as well. Keep unavailable ownership and infeasible alternatives
visible instead of treating them as compatible cases.

Separate productive soft-c/g constraints from hard-g exceptions. Existing
hard-g metadata is a generation preference, not a universal reading theorem.
Changing that metadata requires its own scope and side-effect evidence.
Final morphology is not certified by root ownership and remains a separate
measurement boundary. No implementation route is chosen in this note before
the baseline transitions and unresolved cohorts are available.
