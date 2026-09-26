# Q09b sampler transcript and frequency prerequisite

Design only, 2026-09-26. No sampler-frequency runs or generator corpora are
created by this document. The pure-law proof uses the separately frozen v2
Fraction oracle. This proposal adds verification of the sampler, not a new
linguistic parameter or a relaxation of that oracle's acceptance limits.

## Separate three claims

1. The real-valued declared law is the exact summed-history distribution
   `q(P) exp(-lambda C(P)) / Z_K`. The existing independent Fraction oracle tests
   production analysis against it. A stochastic frequency check cannot prove it.
2. A sampler with independent uniform 32-bit grid draws has a discrete law.
   Its branch probabilities need not equal the continuous conditional ratios,
   even with exact arithmetic. A grid draw is exactly `j / 2^32`, including zero
   and excluding one. Positive real model mass is not a guarantee of positive
   probability for every outcome on this machine grid.
3. Observed counts on a frozen random tape are one finite experiment. Statistical
   bounds require the declared independent-uniform-input assumption. They do not
   certify that an operating system entropy source is mathematically IID, and
   they do not describe Mulberry32 seed cycles or arbitrary custom RNG functions.

Recommendation: use frozen raw random uint32 tapes for the frequency diagnostic,
not five seeds described as independent streams. A seeded regression can remain
an exact replay check without attaching an unjustified IID p-value to it.
Generate tapes once only after this protocol/source is approved and frozen; pin
all bytes before reading any sample outputs. Never regenerate a failed tape.

## Fixed finite schedule

The JSON companion fixes six input configurations and one target K for each.
They cover duplicate histories, a primary-position change, first-three versus
all-nonprimary selection, both neighbor policies, unequal weights, individual
zero weights, and the all-zero last-candidate rule. All use `lambda=Math.log(2)`
and exact oracle factor 1/2. No quality outcome chooses among lambdas.

Use five blocks of 20,000 independent-tape rows per case: 100,000 samples per
case, 600,000 sampler calls total. Each row has 15 uint32 words, encoded little
endian, so the complete input is 36,000,000 bytes. Each call reads its own row in
order; unused trailing cells remain archived and are not reassigned to another
call. Fifteen is the predeclared bound `(m-1)+n <= 2n-1` for n<=8, allowing even
the forced backward steps in this conservative count. Exceeding a row is an
error, not a request for more random input. Do not consume unused cells as fake
sampling draws. This is an analytical sampler study, not generator RNG parity.

Check every same-primary secondary mask, including zero-support masks. Their
counts are 8+8+32+32+128+32=240 across the six cases. Check the five blocks and
the aggregate: at most 1,440 simultaneous bin comparisons. Invalid marks, a
changed primary, a wrong K or any structurally unsupported output are immediate
failures regardless of statistical tolerance.

## Numerical finite-grid reference before frequency outcomes

Build a separate sampler-reference module; do not modify the frozen analytical
oracle that is already generating its proof archive. It consumes the frozen
literal-history component maps and exact score factor. First construct the
**ideal-arithmetic grid law** by following the declared component-then-backward
order. For a binary conditional ratio a/(a+b), the number of uint32 values taking
the first branch is `ceil(2^32*a/(a+b))`. This is exact Fraction arithmetic with
the strict less-than boundary, including zero/one branch cases. Sum duplicate
leaf patterns, rather than selecting a representative component history.

The actual implementation uses binary64 log masses and libm calls. Independently
reconstruct each finite branch's log masses from the literal-history oracle and
check them with the original absolute-log tolerance 2e-10 and applicable
probability tolerances. Review/record the executed predicate separately: for
logs a,b and s=logaddexp(a,b), it tests `log(u)<a-s` when a<=b, otherwise
`log1p(-u)>b-s`. Reproducing this expression audits numeric execution; it is not
an independent proof of the underlying probability law.

For these six small cases, enumerate the reachable binary decision tree with a
public `sample(K,rng)` adapter and fixed prefixes. Use integer binary search on
j in [0,2^32) for each monotone predicate's first/second boundary. Check the two
neighboring grid values at every boundary, zero, the last grid value, and the
quarter/half/three-quarter probes. Preserve every node's fixed input prefix,
logs, boundary integer and public transcript. This derives a numeric grid-law
reference by multiplying integer branch counts over 2^32 and summing leaves.
It is exact **conditional on the reviewed monotonic predicate on the engine**;
it is not exhaustive execution of all 2^32 libm inputs, nor evidence that an
arbitrary opaque RNG callback is uniform. A monotonicity/source/transcript
mismatch fails; do not silently substitute the ideal grid reference.

Preregister total variation <=1e-8 between this numeric grid reference and the
continuous Fraction target for each fixed case. Also report ideal-grid versus
continuous and numeric-grid versus ideal-grid differences separately. The ideal
quantization bound is at most D/2^32 for D<=15 by sequential coupling; the
additional numeric comparison is an engineering check, not a universal libm
error theorem. No probability threshold deletes rare positive model support.
A numerical reference failure blocks the frequency stage and needs source/design
review, not a larger tolerance. The eventual frequency target is the validated
numeric grid law, with its numerical assumptions explicitly attached.

## Exact transcript and independent prefix/suffix checks

Use each component's literal complete-history map, including all K strata, to
construct reference messages without importing production transitions or DP.
For each prefix length i, aggregate component-conditioned prior mass by its last
mark l and prefix secondary count k, multiplying only by the score for adjacent
pairs entirely inside that prefix. Future histories sum out. This reconstructs
A_i(l,k) directly from histories instead of using the production recurrence.
For each next mark z, likewise sum the joint prefix-plus-next-mark histories,
including their new adjacency score. Those two l-specific masses are the
unnormalized backward candidates recorded by the sampler. Empty sets must be
exact zero, never epsilon-pruned.

Independently also condition the complete component histories on the already
chosen suffix and K. Its normalized predecessor probabilities must agree with
the normalized prefix-derived backward candidates. This checks both the
prefix-message meaning and the backward conditional factorization. A selected
component's identity is latent evidence, not an applied explicit-secondary event.

For every checked sample verify exactly:

- The count analysis has the frozen candidate/component order and target K.
- Every component candidate and remaining-tail mass matches the oracle; tail
  means the sum of every later positive component, not a pairwise shortcut.
- Raw draws equal the assigned tape cells in order, and ordinals are contiguous.
  The number of consumed cells equals the number of drawn transcript records.
- Forced choices have exactly one positive predecessor and no RNG record.
- Backward indices descend n-1 to0; remaining counts refer to the prefix through
  the current index, before its decrement. The terminal edge is deterministic
  within each component; the initial predecessor is unmarked with count0.
- The chosen marks, K, primary and adjacency count agree with replay. Component
  and prefix/suffix masses are checked numerically under the existing frozen
  tolerances, while support and coordinates are exact.
- The final prior mass sums all supporting components. The final conditional
  mass subtracts the full Z_K, not the selected component's partition.
- The same tape row yields identical data after mutating prior returned results;
  fixture inputs and other rows remain detached.

Retain witness records for each sampled component, every observed first/second
branch and each supported final pattern, with bounded first-in-schedule witness
selection fixed before outcomes. Archive per-block full-transcript hashes and
input/source hashes so the full sequence can be replayed without committing
600,000 verbose transcripts. A forged transcript fixture must fail for wrong
mass, missing/extra draw, swapped predecessor, false forced step, wrong count,
wrong ordinal, changed primary, omitted duplicate history and an aliased input.
These observer tests are separate from generator trace v2 tests.

Before frequency use, deterministic transcript fixtures include all six cases
with constant uint32 rows 0, 2^30, 2^31, 3*2^30, 2^32-1 and an alternating
0/(2^32-1) row. Boundary-adjacent rows from the numerical reference are additional
specified algorithmic fixtures, not outcome-picked empirical seeds.

## Frequency acceptance and multiple comparisons

Fix family alpha=0.01 and M=1440. For each mask in each 20,000-row block and each
100,000-row aggregate, require absolute frequency error relative to the validated
numeric-grid probability no greater than
`sqrt(log(2*M/alpha)/(2*N))`.
This is a conservative simultaneous Hoeffding/union-bound criterion under the
independent-uniform-row assumption. It does not require independence among bins,
or among aggregate and block tests. The fixed bound includes zero bins, although
structural zero violations already fail exactly. Never merge bins, drop a rare
bin, add draws, switch to a different seed/tape, or relax alpha after outcomes.
Report all deviations and worst coordinates, with both pass and fail artifacts.

The experiment diagnoses a gross sampler distribution or draw-handling defect.
Passing does not prove exactness, establish general long-root numerical accuracy,
or show linguistic quality improvement. The exact law proof, structural checks,
finite-grid numerical study, sampled frequencies, and later generator-quality
capture remain separately labeled evidence.

## Later morphology trace integration is a different check

Do not count root-pattern transcript validation as proof of morphology origins.
After integration, retain the approved v2 fixtures: actual resolved prefix-array
length offsets, zero-syllable affixes, declared-versus-realized length mismatch,
allomorph variants, suffix attraction demoting the real primary and promoting a
sampler-marked syllable, previousOrigin links to real events, and detached nested
quantity/phone snapshots. Proposal IDs must never enter applied origins. Those
fixtures require no claim that prefix/suffix morphology preserves root K.

## Recommended publication boundary

Publish the pure law, sampler and independently checked deterministic evidence as
one reviewable PR before integrating the opt-in v2 trace/config adapter. The
production law source should stay frozen through its transcript and numerical
sampler review. The pure PR adds an explicit analytical API; no generator path
calls it and no default configuration activates it. Its evidence therefore
supports a declared mathematical law and implementation checks, **not an
activated output-quality improvement**. Keep the inherited generator failures
visible; focused analytical tests are not a claim that the entire generator suite
is clean.

The v2 trace migration has different risks (proposal/applied event namespaces,
missing phase domains, morphology origin links, lambda-zero compatibility) and
should follow as an explicit dependency. Only after that integration and a newly
preregistered activated configuration should a word-quality capture be made.
Frequency evidence can be packaged as its own proof section/follow-up after
approval of this protocol; it cannot replace deterministic sampler verification.

Retain the original oracle/comparator/freeze/report bytes, including historical
absolute paths. A portable self-test is a separately versioned packaging-only
variant with the same eleven tests and a pinned effective protocol hash; do not
rewrite the frozen original. Retain the oracle archive outside Git with its hash,
manifest and reproducible generator if its full bytes would make review noisy.
The proposed raw sampling tapes likewise need durable immutable retention, even
if the repository contains only their manifests and replay instructions.

The numerical-domain documentation should explicitly retain one conservative
restriction: the approved bound includes the rhythmic probability terms even
when rhythm is disabled. An otherwise unused extreme setting can thus be an
unsupported-range input. This is deliberate domain validation, not a zero-support
claim, and relaxing it would require a new reviewed numerical protocol.
