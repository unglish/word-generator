# Conditional root stress law

`createRootStressLaw` is a pure analytical API. It does not generate a word,
execute the legacy stress proposal, or change the default generator. Generator
integration and an explicit activated-corpus study remain separate review steps.

The input records one actual generated-root decision: every position unmarked
before primary assignment, then exactly one primary and all other positions
unmarked. Operational heavy classifications come from the existing shared weight
analysis. The API does not infer quantity or reevaluate phonemes. It accepts the
resolved secondary/rhythmic settings and a finite nonnegative `lambda`.

The declared law sums all legacy explicit-secondary and left-to-right rhythm
histories that lead to the same complete pattern. At a specified secondary count
K it weights each pattern by `exp(-lambda * adjacentMarkedPairs)`, then normalizes.
This is a real-valued independent-continuous-draw model, not a distribution over
seeds or a claim of positive machine probability below an RNG's resolution.
The all-zero candidate-weight rule still chooses the last candidate. Already
marked positions, excluded edges and the original directional neighbor test keep
their legacy support.

- `analyzeCount(K)` returns component masses and the unnormalized tilted
  partition in tagged log form. Zero support is `{ status: "zero" }`.
- `analyzePattern(marks)` returns K, adjacent marked pairs and summed prior and
  tilted log masses. A well-formed pattern outside the law's support returns zero;
  an invalid encoding or a changed primary is an input error.
- `sample(K, rng)` samples the component mixture and a backward chain. It returns
  the complete marks, actual extra draws, forced steps, and the selected pattern's
  total prior and conditional masses. Sampling a zero-support count is an error.

All returned arrays/objects are detached from the model and later results. The
model also detaches its input. Tagged zero masses avoid serializing negative
infinity as JSON null. Sampling draws must be finite values in `[0,1)`; deterministic
steps do not call the RNG. `lambda=0` is supported analytically here. A later
generator adapter must delegate supported zero-lambda requests directly to the
legacy execution to preserve its exact output, trace and RNG sequence.

The initial numerical domain requires finite nonnegative weights, finite gate
percentages in `[0,100]`, a finite legacy-ordered total that is zero or at least
`2^-1022`, and no positive addition absorbed by that sum. The preregistered
conservative accumulated log-magnitude bound must be at most 1024. Errors are
explicit; there is no clipping, rescaling, truncation or fallback. Tiny positive
gate masses are computed in logs before division can underflow.

Forward messages use O(m n (K+1)) arithmetic and rolling memory for the component
partitions; sampling retains O(n (K+1)) messages for just the selected component.
Here m is at most four for the first-three candidate window and at most n for the
all-nonprimary window. Work counters describe DP cells and transitions, not heap
usage, wall time, pattern-mass evaluation or RNG cost.

The protocol and design are frozen under
`evaluation/experiments/conditional-root-stress/protocol`. Version 2 of the oracle
protocol corrects only the tiny-rhythmic fixture's domain before execution; it
does not change the numerical range, grid cardinalities or tolerances. Independent
history enumeration must establish the law before generator integration. These
analytical tests establish neither general English quality nor a final-word
stress improvement: morphology may overwrite root marks, and a disyllable with
fixed K=1 has no alternative without an adjacency.
