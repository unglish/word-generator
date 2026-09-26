# Q09b exact complete-pattern law: implementation prerequisite

Read-only follow-up to `/private/tmp/q09-rhythm-design.md`, 2026-09-26.
No generator source, sampling, capture, test or timing run was changed or started.
The inspected integrated Q09a checkout was at
`564dc5727bb28d0f421f73092b9bfb05ea9c9938`; relevant source is
`src/core/pronounce.ts`, `stress-pattern.ts`, `utils/getWeightedOption.ts`,
`utils/random.ts` and `config/language.ts`. This derives an algorithm for the
already proposed root-placement hypothesis. It does not authorize behavior code.

## Recommendation and exactness boundary

Use a finite mixture over explicit-secondary outcomes and an exact chain dynamic
program within each mixture component. Condition the new draw on the **actual
legacy proposal's total secondary count K**, not its explicit-secondary location
or its rhythmic history. Keep primary choice, input segments/shared weight,
quantity, morphology, reduction, spelling and the secondary-count prior fixed.

The polynomial construction below sums every supported legacy decision history.
It has no enumeration cap, beam, deduplication-by-maximum, or replacement prior.
“Exact” means exact marginalization for the declared real-valued decision model.
An IEEE-754 implementation is a numerical approximation to those real values,
and a finite-output RNG is not a continuous uniform random variable. Those are
separate claims and must remain separate in the API, trace, tests and report.

The recommended initial model is independent continuous-uniform decision draws,
with configured nonnegative weights interpreted as real numbers and the actual
all-zero-weight **last-option** rule retained. This is not a law over Mulberry32
seed cycles or arbitrary user-supplied deterministic functions. Proposal K is
preserved path by path for supported executions; a stochastic distribution claim
requires the declared draw model. Do not claim positive machine probability for
events below a supplied RNG's resolution. If literal finite-grid probability is
required instead, preregister a different model as discussed below before coding.

## Freeze the exact root decision input

The first policy supports **exactly the current generated-root domain**: n >= 1,
all root syllables unmarked immediately before the one primary assignment, then
exactly one primary at its actually selected index p and every other syllable
still unmarked. Read these states at the real root decision boundary, using the
Q09a domains when traced and the same internal checks when trace is off. A final
assembled word, surface word or unavailable historical snapshot is not this x.

Let x contain that root-after-primary state, p, the shared operational weight
analysis already computed by Q08, and the resolved secondary/rhythmic settings.
Reject pre-existing secondary marks, a pre-existing primary before the call,
multiple/missing primary afterward, or primary/other mark mutations introduced
by custom callbacks on this opt-in path. Do not clear them, silently treat them
as fixed marks, rerun primary selection, or choose the first primary. Legacy
omission retains its existing behavior. Any public pure analysis API must expose
and validate these same preconditions; a broad `Syllable[]` type alone must not
imply support for arbitrary label histories.

Generalized marked inputs are deliberately deferred. The present secondary
selector excludes only the first primary and can select an already-secondary
syllable or overwrite a different primary. That changes count increments and
history equivalences. A generalized model needs its own contract and oracle;
the narrow generated-root proof below must not be used for it.

Build the ordered candidate list J exactly as the current secondary rule:
`[0,1,2]` within bounds or every root index, then exclude p. Weights are exactly
the existing heavy/light decision values from the already computed analysis.
Do not replace unknown quantity with a new weight or reevaluate after stress.
Candidates are unique here; duplicate primary candidates in the separate
weight-sensitive primary selector are outside this model.

### Explicit-secondary mixture

Let g be the secondary gate probability divided by 100. Let rho_j be the
candidate selection probability. With positive total W, rho_j = w_j / W in
the declared real-valued model. With every weight zero, rho is a point mass at
the **last ordered candidate**. It is not uniform and not the first candidate.

Define latent E in `{none} union J`:

```
pi_none = 1 - g
pi_j    = g * rho_j
```

If secondary is disabled, the root is monosyllabic, or J is empty, only `none`
exists with mass 1. A selected candidate followed by gate failure leaves no mark;
all such histories sum into `none`. Their executed RNG calls still belong in the
proposal trace. Marginalizing them is not permission to skip their actual calls.
For E=e, initial binary markedness is `b_i(e) = [i == p or i == e]`, treating
`none` as no index. Primary and secondary are both “marked” for neighbor tests.
Keep the label primary at p; a new mark elsewhere is secondary.

### Rhythmic transition, including directional support

The legacy rhythm pass scans only interior positions `1 .. n-2`, left to right.
At position i, its left neighbor already has its **final** mark l. Its right
neighbor has the **initial** mark b_(i+1)(e), because that position has not yet
been visited. This distinction is the reason a two-state chain is sufficient.

Let T_i^e(l,z) be the probability of final mark z at i:

1. At either edge, or when rhythm is disabled: z = b_i(e), mass 1.
2. At an already marked interior position: z = 1, mass 1, no gate is executed.
3. At an unmarked interior position with required unmarked neighbors and
   `(l == 1 || b_(i+1)(e) == 1)`: z = 0, mass 1, no gate is executed.
4. Otherwise z = 1 with r = rhythmicProbability/100 and z = 0 with 1-r.

Zero and unit probabilities remove only structurally zero-probability branches.
An eligible probability-0 or probability-100 gate still consumes a draw in the
**executed legacy proposal**. Do not invent draws at skipped positions.
When the neighbor requirement is false, the left/right marks do not prevent the
gate, but already marked positions and edge exclusions still do.

This retains the original scan's directional bias and legal support. Checking
both neighbors against final marks, applying a parallel rhythm update, permitting
edge rhythm or forbidding every adjacent pair would define different models.

## Law, count preservation and summed histories

For a complete binary marked vector z with fixed p, write

```
q(z | x) = sum_e pi_e * product_i T_i^e(z_(i-1), z_i),  z_-1 = 0
K(z)     = sum_i [i != p] * z_i
C(z)     = sum_(i=1..n-1) z_(i-1) * z_i
```

C is the declared adjacency proxy; diagnostics distinguish primary-secondary
directions from secondary-secondary pairs. It is not an acoustic or categorical
grammatical judgment. A finite nonnegative penalty lambda gives

```
q_lambda(z | x,K) = 1[K(z)=K] q(z|x) exp(-lambda*C(z)) / Z_K
Z_K = sum_(z:K(z)=K) q(z|x) exp(-lambda*C(z))
```

The old conditional normalizer q(K|x) cancels. No division by a tiny materialized
q(K) is required. Every pattern with positive declared q at this K retains
positive **real-valued model** mass for finite lambda. This is not a claim about
finite RNG resolution or floating underflow.

First execute the unchanged legacy secondary/rhythm decisions on a detached
proposal using the actual caller RNG. Record proposal K, then sample the new law
given x,K. Do **not** condition the second draw on the proposal's selected E;
that would wrongly exclude alternative legacy paths and complete patterns.
The resulting root has exactly proposal K on every supported execution. Under
the declared stochastic model, its K marginal also remains the legacy marginal.
Subsequent morphology can overwrite labels, so this is not a final-word K claim.

For fixed x,K, differentiating the normalized exponential tilt gives
`d E_lambda[C] / d lambda = -Var_lambda(C) <= 0`. The decrease is strict when
supported patterns have different C and lambda increases finitely. This is a
mathematical mechanism result, not proof that sampled English-like words improve.
Lapses, weight placement and later reduction can trade off and remain guardrails.

## Forward messages and literal backward sampling

Define A_i^e(l,k) as the tilted mass of positions `[0,i)`, ending in mark l,
with k secondaries in that prefix. Let `s_i(z) = [i != p] * z`.

```
A_0^e(0,0) = 1; every other initial state = 0

A_(i+1)^e(z, k+s_i(z)) +=
    A_i^e(l,k) * T_i^e(l,z) * exp(-lambda*l*z)

Z_e(K) = sum_l A_n^e(l,K)
Z_K    = sum_e pi_e * Z_e(K)
```

Only k from 0 through observed K is needed: secondary counts never decrease
within the proposal law. No cost dimension is needed because the score factor is
local to an adjacent pair. Edges are ordinary deterministic transitions; the
sentinel l=0 at i=0 prevents a fictitious left boundary adjacency.

Store log masses. Unreachable states are `-Infinity`; exact-zero transition
probabilities are absent. Use `logaddexp` to sum incoming paths. Choose the
component e and terminal l with log mass `log(pi_e) + log(A_n^e(l,K))`.
Then move backward from i=n-1 to 0. The current state fixes z_i and k. Candidate
predecessor l has k' = k - s_i(z_i) and log mass

```
log(A_i^e(l,k')) + log(T_i^e(l,z_i)) - lambda*l*z_i.
```

Normalize over the at most two valid predecessor marks, sample one, and continue
from `(i,l,k')`. At i=0 the only valid predecessor is `(0,0)`. The probabilities
telescope to the chosen component's conditional path law; summing over sampled
components gives the full mixture law above. A sampled latent component is an
analytical witness, **not** an executed original affix/secondary event.

### Polynomial bounds and storage

There are m <= |J|+1 components, n positions, two previous-mark states and K+1
counts, with at most two successors per state. Computing every component's
partition takes O(m*n*(K+1)) arithmetic operations. Store rolling slices for
this pass, then sample e and recompute all slices only for the chosen component
to support backward sampling. Memory is O(n*(K+1)+m), time stays
O(m*n*(K+1)). Construct b_i from x and e on demand rather than storing m*n arrays.

The default first-three window gives m <= 4: O(n*(K+1)) time. With all-nonprimary
custom candidates, m <= n and K <= n-1: O(n^3) worst-case time and O(n^2) memory.
These are arithmetic-operation bounds, not unbounded-root performance promises.
No 8,192-state cap, top-N pattern list or silent fallback is part of the sampler.
If a future explicit resource limit is necessary, reject before applying stress;
do not silently switch to a different probability law.

## Duplicate histories: a concrete oracle witness

Use n=4, primary at index 3, equal explicit weights on indices 0/1/2, g=r=2/5,
and required unmarked neighbors. The final secondary set `{1}` can arise from
successful explicit selection of 1, or from no explicit mark followed by rhythm
at 1. Rhythm at 2 is blocked by primary at 3 in either history.

| Final secondary set | Prior mass | C | Tilted conditional mass at K=1, exp(-lambda)=1/2 |
| --- | ---: | ---: | ---: |
| empty | 27/75 | 0 | excluded by K=1 |
| `{0}` | 10/75 | 0 | 10/43 |
| `{1}` | 28/75 | 0 | 28/43 |
| `{2}` | 10/75 | 1 | 5/43 |

The `{1}` mass is `(1-g)*r + g/3`, not one path's mass or their maximum.
This catches deduplication, conditioning on the proposal E, and normalization by
the wrong denominator. Separately, n=4, p=2, equal weights on 0/1, K=1 gives the
simple 2/3 versus 1/3 tilted placement contrast.

## Numerical and custom-input contract: decisions before code

The opt-in policy must validate and report unsupported inputs explicitly. It
must not modify validation or behavior when the policy is omitted/legacy.

- Gate inputs must be finite percentages in [0,100]. Current public config
  validation already rejects NaN, infinities and out-of-range gate values.
  The raw `rand()*100 < probability` helper would return false for NaN or a
  nonpositive threshold and true for a threshold above 100 with valid RNG; those
  helper facts are not additional supported public-policy inputs. Endpoint gates
  still draw in the proposal. Never clamp or reinterpret invalid percentages.
- Secondary heavy/light weights currently lack an equivalent finite/nonnegative
  validation in the legacy config path. Require finite nonnegative weights for
  the new policy. Preserve the all-zero last-candidate rule. Reject finite
  weights whose **legacy ordered sum** overflows, and reject positive additions
  that are absorbed by that cumulative sum for the initial supported contract.
  Do not silently rescale such inputs and call the result the legacy law.
- Even finite positive naive sums can have subnormal multiplication and rounded
  threshold edge effects. `getWeightedOption` uses strict `<` against cumulative
  floating sums and falls back to the last option; with infinite totals or NaN
  products that fallback can dominate. The ideal w/W law is not a literal
  reconstruction of every IEEE comparison interval. Record this distinction,
  preserve the executed proposal exactly, and reject a proposal outcome assigned
  structural zero mass by the declared model. Do not silently repair K or extend
  support when a machine threshold/fallback contradicts the chosen model.
- Reject invalid RNG results outside finite [0,1) on the opt-in path. Do not add
  a global RNG sanitizer to legacy. A deterministic supplied RNG retains K and
  determinism guarantees, not an independently uniform distribution guarantee.
- Treat a configured positive percentage as positive in log space: for example,
  use `log(percent)-log(100)`, not `log(percent/100)` when that division could
  underflow. Compute the complement from `(100-percent)` with exact endpoint
  branches. Use log weights/log-sum-exp without materializing tiny normalized
  weights. Do not turn a finite log mass into an absent branch by epsilon tests.
- Require finite nonnegative lambda. Check a conservative bound on accumulated
  finite log magnitude from component weight, n gate terms and `(n-1)*lambda`.
  Finite but huge lambda or root length can overflow that bound; reject an
  unsupported numerical range before application. `logaddexp(-Inf,-Inf)` stays
  unreachable; a supported proposal K with nonfinite/zero total modeled mass is
  an error, not authorization to return the proposal or a greedy pattern.
- Log-sum-exp avoids ordinary product underflow but does not provide arbitrary
  precision: `exp(min-max)` can round to zero inside a sum, so a much smaller
  contribution can disappear from the rounded normalizer. Retain its separate
  finite log state and test against a high-precision oracle; never claim exact
  real arithmetic from binary64. Do not exponentiate a whole path's probability.
- For a two-way conditional draw, a log-uniform comparison can avoid first
  rounding a tiny probability to zero. Zero RNG values and structurally absent
  branches need explicit handling: never select a zero-mass branch because
  `log(0)=-Infinity`. A finite RNG cannot represent all real probabilities, and
  log comparison does not fix that. It may quantize a tiny event to zero or one
  grid atom. Record supported numerical error and do not claim literal positive
  probability for every mathematically supported pattern.

**Alternative requiring separate review:** define q using iid values from the
specific 2^32 Mulberry output grid and exactly count `u*100 < p` and the ordered
weighted-selector intervals (including multiplication rounding and last-option
fallback). Monotone binary searches can count these outcomes in O(32) comparisons
per threshold for finite nonnegative sums. This is a different declared law;
it is not the correlated deterministic seed-cycle distribution, and a supplied
off-grid RNG could propose a K absent from that grid law. Do not quietly swap
this alternative in after a continuous-law test fails. The initial recommendation
remains the explicitly labeled real-valued model plus numerical validation.

## RNG and trace contract

Keep the omitted/legacy path untouched and prove exact complete-word, legacy
trace and per-draw RNG parity. For the opt-in policy, recommend validating its
supported-input contract first, then delegating lambda=0 to the unchanged legacy
execution path. This preserves its words/RNG within that supported domain without
new draws to resample an identical law. Unsupported opt-in inputs still error;
omitting the policy retains legacy behavior even outside the analytical domain.

For positive lambda, execute the full legacy proposal's draws in their original
order, then use a fixed declared order for component selection and backward
predecessor choices. Do not draw for a unique positive branch. Bound additional
sampling work/draws by O(m+n); no padding or retry-until-desirable logic. New policy
draw consumption intentionally differs; later archived words are not paired
counterfactuals merely because they share a draw index.

The active proposal lives in detached state. Apply the sampled complete pattern
to the root once, before root stressed-nucleus repair or surface reduction. Q09a's
seven stages describe actually executed legacy assignments; copying proposal
events into that ledger as applied would be false. The active policy needs an
explicit versioned proposal/applied trace distinction, including input x, actual
proposal decisions/K, numerical policy, partition log mass, sampled component
as a model witness, backward choices, final pattern and origin
`root-pattern-sampler`. Keep later morphology's real origin chain separate.
This trace-contract review is a prerequisite, not permission to reinterpret old
snapshots or affix marks. Full candidate dumps are unnecessary and exponential.

## Independent small-input oracle and acceptance

Use a standalone Python `Fraction` enumerator for small roots, never importing
the production DP transition, sampler, normalizer or analysis implementation.
For integer/rational fixtures, represent g/r and candidate probabilities exactly;
the preregistered half-per-clash factor gives exact rational tilted masses.
Enumerate the literal original procedure on copied mark arrays: every ordered
candidate selection, gate success/failure, left-to-right eligibility check and
rhythmic branch. Include selected-but-failed histories rather than prematurely
collapsing them. At every leaf add its probability to a map keyed by the complete
mark vector. Sum duplicate histories, then condition on K and tilt the resulting
pattern masses. This independent control flow differs from mixture-chain DP.

Before candidate outcomes, freeze a finite exhaustive fixture grid, e.g. n=1..7,
every primary position, both candidate windows, both neighbor settings, enabled
flags, gate values 0/1/40/100, and selected heavy/light assignments and zero-weight
cases. Avoid a combinatorial fixture explosion by explicitly fixing the cross
product and supplementary cases in a protocol, not by stopping after favorable
examples. Include both numeric-range rejection and ordinary-path fixtures.

Require:

1. Oracle leaf mass sums to 1; all K strata sum back to the original law.
2. DP prior masses, each component partition, total Z_K, and every normalized
   supported pattern agree with the oracle within a preregistered numerical
   tolerance, with structural zero versus positive checked separately.
3. The duplicate-history witness above, all-zero last-option, individual zero
   weights, disabled gates, 0/100 consumed proposal gates, blocked rhythm, edge
   exclusions, and actual left-to-right neighbor updates all agree.
4. Backward transition probabilities telescope to complete-pattern mass.
   Deterministic boundary RNG fixtures cover zero, near one and exact cumulative
   boundaries under the declared implementation convention. Trace on/off is
   observational; proposal K, primary, segments and metadata remain fixed.
5. Public `createGenerator` fixtures verify actual application and trace domains;
   expose a typed pure law-analysis helper only if it is a genuine analytical
   API, not a test-only internal-generation escape hatch. Oracle tests do not
   call private generator stages to manufacture words.
6. A separately preregistered sampling check agrees with declared conditional
   masses at resolvable probabilities; low-resolution tails are labeled rather
   than declared empirically verified. Larger roots test polynomial operation/
   allocation bounds and absence of truncation, not enumerated expected lists.

Exact conditional expected C follows from the same weighted transitions or
partition derivatives. Expected unmarked pairs are another local reward;
triples need one additional bounded history state. Exact maximum-gap distributions
would require a run-length augmentation (still polynomial), not reading them
from C or K. Specify which lapse expectations are calculated and report sampled
maximum/edge gaps separately; do not present an unavailable expectation as zero.

## The limitation this experiment does not solve

For a disyllable with one primary and K=1, the only other syllable is secondary.
Its adjacency is fixed at 1; the conditional tilt cannot change it. K=0 is also
fixed. More generally, when every supported same-K pattern has identical C,
expected adjacency is unchanged. Report these cases explicitly in the mechanism
denominator. No exact sampler can evade this without changing support, primary
placement or the count prior.

Morphology-induced stress, root/affix alignment, class/compound labels, new
secondary-count priors and final-word refooting remain outside this design.
The preserved count/support and improved conditional adjacency mechanism do not
prove perceived rhythm improves; the original linguistic and broader diagnostic
guardrails still apply. Approval of the numerical/input/trace contracts above
must precede implementation or any new behavioral capture.
