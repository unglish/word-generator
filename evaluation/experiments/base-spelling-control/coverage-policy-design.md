# Q13 coverage policy: design for review, no behavior edits

The next branch should stack on #317 because the live cell/unit representation is
a real dependency. The 200,000-word `base-spelling-control` is regenerated from
that parity-checked implementation, not retroactively attached to the historical
archive. Every complete legacy draw and frozen core summary matches the original.
The proposed behavioral policy below has not been implemented or tuned.

## What the control establishes

The ledger identifies exact source-cell loss. It does **not** turn an inventory
entry or rewrite ancestry into a linguistic license. A surviving `h` from a
selected `th` is a directly observed clipping event, while a rewrite-derived `x`
with `/k/` and `/s/` in its ancestry is still an unresolved construction. Likewise,
no surviving cell lineage is an operational absence, not automatic proof that a
phone has no possible orthographic realization.

The control contains 1,009,139 selected units, 3,939 words with cap edits, and
4,122 cap-edit events. Of the cells consumed by those events, 35 already had
unresolved rewrite ownership. There are 139 partly surviving `th` selections and
9,435 units with no surviving direct or rewrite-descendant cells. These latter
counts include duplicate-removal and other rules; they must not all be credited
to a cap-only change. Caps account for 113 of the 139 partial `th` units (93
general raw cap, 20 final cap); syllable-join deduplication accounts for 26. Of the
9,435 units without surviving lineage, caps account for 1,797 and duplicate
removal for 7,638. Per-profile denominators and exact rule attribution are in
the control report. These are exploratory mechanism counts, not preregistered
quality wins.

## Contract

A spelling preference may choose a different licensed realization of the same
ordered phones. It may not remove a pronounced phone, cut a multi-letter
realization, invent a zero realization, or rewrite the phoneme array to justify
an already shortened string. Phonological repairs belong before spelling and
must produce the structure subsequently pronounced.

Keep the existing numeric values. Give the English configuration an explicit
`preserve-phones` budget policy: raw-letter maxima are preferences subordinate to
sound coverage, and violations have typed outcomes. Do not silently reinterpret
all custom configurations' existing hard-sounding numeric fields. Omitting the new policy in custom configurations retains legacy behavior;
fixtures must prove that compatibility. English opts in explicitly. A future
strict style cap would need a separate rejection/exhaustion contract; it is not
part of this candidate.

A legal long cluster can make a raw-letter budget infeasible. For example, the
four coda phones `/l f θ s/` require five letters in `lfths`. The inventory already
lists that coda as attested. The spelling `twelfths` is a real form; Collins lists
`twelfth` as `/twɛlfθ/` and its plural as `twelfths` ([dictionary entry](https://www.collinsdictionary.com/dictionary/english/twelfth)).
A cap cannot be enforced by deleting `/l/`, `/f/`, or half of `th`. The same
principle covers `strengths`; a `/ŋ k θ s/` variant must not receive a silent `/k/`
license merely because `strengths` is familiar. That would need an explicit joint
construction or phonological analysis, rather than opportunistic `ngk` deletion.

## Proposed internal API

The types below express decisions, not implemented public API:

```ts
interface GraphemeLicense {
  inventoryId: number;
  phoneIds: readonly number[];
  contextId: number;
  effectiveWeight: number; // finite and strictly positive
  realization: readonly WrittenPiece[];
}

interface WrittenPiece {
  text: string;
  phoneIds: readonly number[];
  role: "segment" | "split-marker" | "orthographic-marker";
}

interface CoverageCertificate {
  targetPhoneIds: readonly number[];
  realizedPhoneIds: readonly number[];
  licenses: readonly GraphemeLicense[];
  unchangedUnresolvedCellIds: readonly number[];
}

type BudgetDecision =
  | { kind: "satisfied"; before: BudgetMeasure; coverage: CoverageCertificate }
  | { kind: "respell"; before: BudgetMeasure; after: BudgetMeasure;
      plan: AtomicSpellingPlan; coverage: CoverageCertificate }
  | { kind: "infeasible"; before: BudgetMeasure; retainedCellIds: readonly number[];
      reason: "no-licensed-plan" | "unresolved-ownership" |
        "invalid-existing-license" | "phonotactic-violation" | "search-budget";
      unresolvedPhoneIds: readonly number[] };
```

`targetPhoneIds` and `realizedPhoneIds` must agree in order and multiplicity for
the changed region. A multi-piece construction covers its phone once, not once
per letter or marker. Unresolved cells outside the changed region are preserved
exactly and are reported separately; a certificate does not assert whole-word
correctness while such cells remain. A region whose ownership cannot be proved
returns `infeasible: unresolved-ownership`, retains the existing cells, and is
excluded from certified-respelling claims. Unknown is neither legal nor illegal.

`AtomicSpellingPlan` includes expected input cell IDs, output pieces, affected
unit/phone IDs, and updates for base written parts. Commit only after validating
all licenses and coverage. Update the clean and hyphenated projections from the
same plan; do not search a second string for a matching substring. If a required
part boundary is unresolved after an earlier rewrite, report that fact rather
than infer it from a nearby phone. This is base-word work; full morphological
part ownership remains a later composition with Q06.

## Candidate selection, not letter deletion

1. Identify the actual cells in an over-budget span. Expand the planning region
   to whole licensed units and the neighboring context on which their licenses
   depend. Count raw letters using the existing budget definition; do not count
   a vowel phone's `r` letter as a separate consonant phone.
2. Resolve legal alternatives with the same hard-condition, position and
   positive-weight policy used by Q12a. Store inventory identity and contextual
   evidence independently of trace. Do not reconstruct a candidate set from
   `trace.weights`, whose old singleton/selection contract is insufficient.
3. Search finite whole-unit realizations. Revalidate the complete affected
   context after any change: previous-grapheme conditions, vowel-dependent
   doubling and following-letter obligations can invalidate a cached alternative.
   A per-unit list filtered only under the original neighbors is insufficient.
4. Prefer plans satisfying every applicable budget, then minimize the number of
   changed units, then maximize the joint conditional probability over the same complete
   affected unit/context set, with each choice probability normalized over its
   applicable legal candidate set; use stable inventory order for exact ties.
   Recompute the normalization when a plan changes a conditioning context.
   Multiplying every weight for one phone by a positive constant must not change
   the ordering. Do not multiply raw weights only for changed units. No trigram-based tuning or new arbitrary weights.
   The selection can be deterministic and require no extra RNG draw. Changes to
   rejection caused by new word lengths still need distribution measurement.
   Recheck every applicable budget on the **complete resulting surface**, not
   merely the edited span: a plan can move or join an overrun at its boundary.
5. Optional doubling may be rolled back only when doing so restores a currently
   licensed realization with the same phones and keeps relevant vowel cues valid.
   `ph`→`f`, for example, is available only if that exact alternative is licensed
   in context; it is not a global string rule. `th`→`t`/`h` is never such a plan.
6. If exhaustive search proves no licensed shorter plan, preserve the valid
   existing realization and report `no-licensed-plan`. If a bounded search is
   required for performance, report `search-budget` separately; do not pretend
   that exhausting the search proves linguistic infeasibility.
7. Evaluate the post-word-rule surface again. A later regex can otherwise undo
   earlier protection. An unresolved rewrite cannot be made safe by deleting a
   character from it. Every result, including refusal to alter an unknown span,
   contributes to the decision denominators.

This continues enforcing the budget whenever a certified plan exists. The
fallback is an explicit preserved spelling with an unmet preference, not a
silent no-op or destruction of another whole grapheme unit.

## Dependencies and PR boundaries

- **Q12a (#310):** required before claiming that newly selected alternatives are
  legal. The control still contains 5,910 reported nonpositive selected-form
  weights, and positive legacy weights do not prove all hard constraints held.
  Reuse the pure legality resolver; do not copy the old fallback that resurrects
  rejected candidates. If Q12a must be integrated before Q13, preserve it as a
  declared dependency commit and capture a new dependency-only control. Compare
  the policy against both that immediate control and the immutable original.
- **Q13 (cap policy):** replace the destructive budget/backstop operations with the licensed
  planner and explicit outcomes. Cover general/final consonant and vowel budgets,
  including the post-join pass. Keep sound targets unchanged. Do not claim that
  this fixes duplicate-removal or unrelated regex construction errors.
- **Q13c:** adjacent-choice and syllable-join deduplication need a separate
  phonological/joint-realization decision. Two phones that share a letter are not
  automatically one phone. Q11's validated coda extensions may remove some
  duplicate-source cases upstream; measure the dependency rather than retaining
  a letter deletion that conceals them.
- **Q14a:** replace the role-blind magic-e regex and substring-based silent-e
  operation with licensed split-digraph constructions. Optional `ai`→`a…e`
  variation differs from fulfilling a bare long-vowel letter's required marker.
  `/j/` written `y` is an onset, not an eligible vowel nucleus; this resolves the
  `yet`→`yte` mechanism without a special `y` ban. Existing markers after `/v/`
  serve a different orthographic purpose and must not certify vowel length.
- **Q13b:** joint `/k s/` or `/g z/` spellings receive explicit multi-phone
  coverage and a separate conditioned probe.
- **Q14b:** soft `c`/`g` following-letter compatibility receives its own context
  model and probe. Until licensed, the affected regex-derived cells stay
  unresolved for the planner.
- **Q04 / Q02 / Q06:** `soundAtSpelling` is the writer-boundary observation. Root
  stress/reduction ordering and final affix realization must be integrated before
  making a claim about all final emitted phones, not merely the base snapshot.

## Preregister before the first behavioral patch

Keep the frozen v1 evaluator and raw-letter gate unchanged. A legal long cluster
may fail that gate; report the disagreement and its licensed witness rather than
raising the threshold or lowering its severity after seeing results.

Register, by profile and base/morphological scope:

- All words, phones, selected units and selected `th` units as denominators.
- Partial source-unit deletions and disappearance of all cell lineage, attributed
  by exact rule. Separate observed cell loss from certified phonological damage.
- Every over-budget episode, its known/unknown ownership state, legal alternative
  count, satisfied/respell/infeasible outcome and each infeasibility reason.
- Newly lost known phone coverage: target zero. Do not count an unresolved region
  as a success. Report unresolved rates and upstream invalid licenses separately.
- All 139 `th` witnesses stratified by the rule that consumed the missing source
  cell; only the targeted rule group belongs in a cap-policy success claim.
- Licensed long-cluster fixtures (`twelfths`, appropriate `strengths` variants),
  the seed 2643 clipped-`th` witness, and the `canes`/`spam` obligations that remain
  blocked on the appropriate spelling construction.
- Effects on length/rejection distributions and alternate-spelling frequencies,
  plus trace-on/off determinism, exact edit replay, full tests and isolated perf.

For selection-pressure statistics use actual attempted decisions if Q03 is
integrated. Otherwise label the available selected-attempt view explicitly.
Budget opportunities can change downstream when an earlier plan changes a
surface; retain both all-word denominators and conditioned episode denominators.

The explicit English/custom-config contract and scale-invariant search objective
are approved for implementation after the dependency-only control is captured.
Record that exact objective and search ordering in preregistration before seeing
candidate results. No behavior source has changed.
