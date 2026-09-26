# Q13 spelling-budget coverage preregistration

Registered before the first Q13 behavioral implementation or candidate result.
Dependency runtime: `6b0b8f22f7ea04244c580c886bbd9b48d9cd2f3f`; its frozen 200,000-draw
archive is `spelling-coverage-dependency` (evidence commit `f7f2e35`). The immutable
original and regenerated #317 `base-spelling-control` remain separate controls.
The v1 evaluator, gates, numeric caps, seed schedule and reference corpus are unchanged.

## Hypothesis and exact scope

Explicit English `preserve-phones` spelling-budget policy reduces cap-attributed
source-unit clipping and disappearance without introducing a missing, reordered,
or duplicated phone in a changed region. It searches licensed whole-unit spellings;
when no certified plan is available it retains the current surface and reports why.
The raw cap is a spelling preference subordinate to phone coverage. Omitted policy
in custom configurations preserves legacy behavior and RNG/output semantics.

Targets: consonant-grapheme, raw-consonant, final-consonant and raw-vowel budgets,
including the post-word-rule backstop. A phonotactically invalid junction produces
an explicit infeasible outcome rather than spelling-only phone deletion. Duplicate
removal, generic regex damage, affix ownership, split-digraph generation, joint
multi-phone graphemes and soft-c/g repair remain separate hypotheses.

A coverage certificate establishes configured realization and exact ordered phone
coverage at the writer boundary. It is not a claim that every reader pronounces an
invented word identically. Unresolved construction ancestry is never a license.
The ledger has no historical final-affix ownership, and soundAtSpelling can differ
from phones after later pronunciation/reduction operations.

## Selection state and objective

1. Reuse one pure resolver for normal selection and planner alternatives. Hard
   conditions, explicit positional scopes and finite positive weights always apply.
   Fallback-only candidates enter only when the ordinary legal positive pool is
   empty; an inconvenient length never unlocks them.
2. Preserve the actual writer boundary: previous grapheme means the previous
   after-doubling choice, before duplicate removal or regex changes. Keep current
   and previous nucleus choice forms plus cumulative doubling count. Never infer
   this state from a rewritten surface or inferred orthographic alignment.
3. A plan replays the full ordered choice sequence because cumulative quota can
   affect distant choices. The doubling quota remains a soft preference with its
   existing empty-pool relaxation. Recompute actual choice pools and normalization
   in each proposed context. Unknown written cells remain fixed and uncertified.
4. Enumerate only positive-support doubling outcomes. An outcome configured at
   probability zero is unavailable; a forced 100% branch cannot be undoubled by
   pretending the base form is an ordinary stochastic alternative. Pure eligibility
   and state transitions are shared with the existing RNG wrapper.
5. Satisfying every applicable budget over the complete resulting surface is
   mandatory for committing a plan. Then minimize the number of changed units;
   then maximize joint normalized probability across the same complete ordered
   choice sequence: actual-pool grapheme probability times conditional doubling
   outcome probability. Compute sums of log probabilities. Scores within 1e-12
   tie and retain stable inventory/outcome order. Uniformly rescaling all weights
   for one phone by a finite positive factor must not affect plan choice.
6. Search deterministically in increasing changed-unit count, then inventory and
   outcome order; unmodified realization precedes modified realizations. Bound a
   search at 8,192 visited partial assignments, counted before child expansion.
   If the optimum cannot be established within the bound, retain the input and
   report `search-budget`, even if a provisional fitting plan was encountered.
   No-licensed-plan means the finite declared search was exhausted, not that an
   English spelling is impossible outside the supported construction model.
7. Alternatives requiring an unresolved marker, joint realization or following-
   letter obligation are not certified merely by inventory weight. Construction
   refusals remain explicit and separately counted. Numeric budgets cannot be
   satisfied by deleting a whole unit or silently declaring zero realization.

## Atomicity and versioned evidence

The plan records expected source cell IDs, exact unit/phone identities, licensed
replacement pieces, legal context and probability evidence, and written-part
updates. Input and output phone lists must match in order and multiplicity.
Commit only after all validation succeeds. Units and actual decision state remain
live when trace is off; historical event retention may remain optional.

A new ledger version declares support for licensed replacement origins and exact
part identities. Generic rewrite cells stay unresolved. Part identity originates
in actual write operations, not inferred nearby phonemes. Cross-part replacements
have unresolved part assignment; a required unresolved boundary prevents a plan.
Clean and hyphenated changes share the same plan. Version-1 archives are supported
as historical input with unavailable part identity, not upgraded by guesswork.
Unknown versions and mismatched certificates fail verification.

## Measures and comparison

Read and checksum-verify every manifest-listed shard; reject missing/extra scheduled
shards, incomplete archives and wrong profile/seed/draw coordinates. Score the same
four profiles, five continuous seeds and 10,000 draws/replicate as v1. Report each
profile separately and include denominators, not only pooled percentages.

Primary mechanism measures:

- Words, phones, selected units and selected th units; partial source-unit deletions
  and units without surviving lineage, with exact consuming-rule attribution.
- Cap-attributed partial th / all selected th and / all words. Dependency control:
  126 such cases; another 35 are duplicate-removal cases outside this hypothesis.
- Cap-attributed no-lineage units / all selected units and / all words. Dependency
  control: 1,700 units. Lineage absence remains an operational observation.
- Newly lost, reordered or duplicated known target phone IDs in committed plans:
  target zero. Report replay/certificate failures separately; unknown is not success.

Episode measures: every budget invocation, over-budget episode and implicated
constraint; satisfied/respell/infeasible outcome; known/unknown input; legal option
count; visited assignments; fallback/quota-relaxation status; each infeasibility
reason (including exhaustion separately from proved no supported plan); retained
unresolved cells; number and identity of changed units; normalized score; full
resulting budget values. Count every refusal in the denominator.

Report all-word and episode-conditioned denominators, base scope and morphological
strata, raw cap violations, spelling lengths, existing rejection distributions and
alternative spelling frequencies. Q03 is not integrated: decisions describe the
returned attempt only, not all rejection attempts. Earlier respellings may change
later opportunities and RNG rejection paths, so later words are not paired outcomes.

## Required checks

- Dependency-only integration: all 200k legacy draws and frozen profiles already
  equal #310 after deleting just the two provenance additions; exact ledger replay.
- Refactor-only public-API output/trace/RNG parity before English activation.
- Trace on/off exact output and RNG-call parity; omitted-policy custom-config parity.
- Public-API fixtures for clipped th, unchanged dedup losses, unknown rewrite cells,
  supported whole-unit respelling, forced doubling, fallback and quota contracts.
- Licensed long clusters, including /l f θ s/; preserve their phones when five raw
  letters cannot meet the configured maximum. Do not use familiar `strengths` as
  permission to drop /k/ in /ŋ k θ s/.
- Certificate tampering, unknown version, exact edit replay and atomic clean/
  hyphenated projection checks. No mutation on failed/exhausted planning.
- Weight-scale invariance and complete-surface budget checks after every candidate.
- Full unit suite, separate quality suite, strict types, touched lint and isolated
  performance. Record all failures; do not weaken thresholds to accommodate results.

The existing Q12a `ex` gate failure (0.0155307585 vs 0.0215) is a declared dependency
condition. Its joint-grapheme remedy remains separate. New exploratory findings
will be labelled exploratory without rewriting this hypothesis or success criteria.

## Dependency amendment before behavioral implementation

Before any Q13 activation, source inspection identified that final morphology
cleanup reconstructs planned affix spellings even when the raw cap does not fire.
Bypassing that cleanup would conflate Q06 allomorph restoration with cap protection.
Therefore Q06/#315 (`a27f7fe`) is now an explicit prerequisite, integrated separately
at `875e832` after the parity-verified resolver extraction (`8eeeb12`). All earlier
controls remain immutable. A revised full development control is captured as
`spelling-coverage-resolved-dependency` before Q13 behavior is written.

Integration verification permits only the Q06 written handoff and additive
`morphology.realization`. It reconstructs both old planned-label cleanup and new
resolved-part cleanup with the unchanged legacy cap implementation, checks all
other complete word/trace fields and base ledgers, and measures RNG boundaries
through the public APIs. The standalone Q06 seed167 witness (`immamsed`) and the
combined dependency seed435 witness (`inmorn` → `immorn`) are retained separately.
The existing reachability test observes30 im cases against unchanged `>30`; its
failure is reported, not retuned.

Q13 must also honor preservation at final cleanup, otherwise that step could
immediately clip a cluster retained by the base planner. Resolved written parts
supply exact morphological text boundaries, but do not certify affix phone
ownership. A final over-budget surface without that ownership is retained with a
separately scoped `infeasible: unresolved-ownership` outcome. Report its affected
words/episodes and final constraint values independently of base certificates.
This is an explicit refusal, not a claim of full-affix phonological certification.
Under-budget resolved cleanup and omitted-policy custom configurations retain
their established behavior. No numeric cap, gate, primary hypothesis, search
objective, or search bound changes in this amendment.
