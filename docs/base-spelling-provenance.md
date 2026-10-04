# Base-spelling provenance (Q02a / Q13 foundation)

This document describes the version-1 foundation. The opt-in version-2 coverage
contract is documented in [spelling-coverage-policy.md](./spelling-coverage-policy.md).

In the instrumentation-only control at commit `a602888`,
`generateWord({ seed: 2643, morphology: true, trace: true })` produced `bunhtreern`.
Its `/θ/` selected `th`, and the raw consonant-letter cap deleted the
`t`. `trace.baseSpelling` now identifies that exact source cell and edit. This is
an additive diagnostic and representation change at that control: it does not
repair the clipped
spelling or change the generated words, probabilities, or RNG calls.

## Contract and boundary

`WordTrace.baseSpelling` is optional and versioned. Its `phones`, `units`, and
`cells` describe the base spelling at the writer boundary. IDs are stable and
local to one generated attempt; IDs must not be compared across independently
generated words or rejected attempts. The chosen attempt carries the trace.

- A phone records its root syllable, onset/nucleus/coda position, and
  `soundAtSpelling`. That sound is an observation at the moment the writer runs,
  not a promise about final pronunciation after subsequent phonological or
  morphological transformations. Integration with stress/reduction ordering can
  change the lifecycle boundary without changing this meaning.
- A unit links the original grapheme-selection decision to its phone ID and
  source cell IDs. `selected` is the sampled form; `afterDoubling` is the form
  before adjacent-letter deduplication. A unit survives in the trace even when
  all its cells are removed. This distinguishes an empty spelling from an actual
  phoneme deletion.
- A cell contains one JavaScript UTF-16 code unit. A direct selection cell has
  exact unit ownership. A replacement cell records the exact edit ID and the
  transitive source units consumed by that edit, but its phoneme ownership is
  **unresolved**. Source lineage does not license a pronunciation.
- An edit records its actual rule, phase, current offset, consumed cells and
  produced cells. Pure insertions have no consumed source units. Deleted cells
  remain in the event history; surviving cells keep their IDs. IDs and edit
  decisions advance identically with tracing disabled. Only historical event
  retention and trace serialization are conditional on tracing.

The default scope, `root-before-morphology`, ends after base-word spelling rules
and repairs. It excludes affixes, morphophonemic changes, and post-morphology
cleanup. Consequently `baseSpelling.surface` can differ from `written.clean`.
For example, original-control seed 38 with morphology enabled emitted `canes`,
while its base surface was `cane`. For a selected bare gap override the scope becomes
`bare-after-gap-spelling`, and its exact whole-word replacement is recorded.
Whole-word gap mappings do not automatically provide per-letter phone ownership.

Regex replacements, silent-e swaps/insertions, and boundary insertions all retain
unresolved ownership. This foundation does not yet model a licensed split digraph
or a joint `/k s/` → `x` construction. It deliberately does not assign inserted
letters to the nearest phone. Existing `trace.orthography` is retained unchanged
apart from `alignment: "inferred"`: its edit-distance ownership is a heuristic,
not evidence that spelling and pronunciation agree.

## What is recorded

The ledger observes edits where they actually execute: adjacent-choice duplicate
removal; syllable spelling rules; cross-syllable duplicate removal; silent-e
swaps and markers; consonant-conditioned final-e appends; boundary insertions;
grapheme and raw-letter caps; junction repair; whole-word spelling rules;
post-join vowel caps; final backstops; and bare gap overrides. Native deterministic
replacement-string semantics and the existing limited probabilistic replacement
semantics are both preserved.

The history can be replayed by initializing each unit's `afterDoubling` cells in
unit order using `sourceCellIds`, then applying edits in recorded order. Later
choices append at the end, so their presence at the tail does not change earlier
edit coordinates. Validate input cell IDs and origins at every step, not just
rendered strings: repeated letters can conceal wrong ownership.

## Measurement and next boundaries

The supplementary [parity probe](../evaluation/quality/probes/base-spelling/README.md)
compares 20,000 scheduled draws across four profiles against unchanged
`origin/main` source, each with tracing on and off. It checks complete word
outputs, RNG calls at every draw, next RNG values, legacy traces, and exact cell
replay. The historical 200,000-word archives have no exact ledger; their absence
is unavailable evidence, not zero damage.

Subsequent independent changes must address sound coverage and licensed spelling:

1. Replace destructive raw-letter repair policy with coverage-preserving decisions.
   Keeping whole digraphs while deleting other pronounced units is insufficient.
   Licensed long spellings such as `strengths` need an explicit cap contract.
2. Model split-digraph eligibility and completion using actual vowel/consonant
   roles, including `/j/` written `y`; an ad-hoc `y` ban is insufficient.
3. Model joint phone-to-grapheme constructions and following-letter constraints
   for soft `c`/`g`, with their own conditional denominators and witnesses.
4. Compose root ownership with resolved morphology parts from Q06; do not recover
   boundaries by slicing planned affix lengths or infer ownership across root
   transformations.

Original-control witnesses were: seed 38 `canes` /seɪnz/, seed 661 `spam` /speɪm/,
and seed 2643 `bunhtreern` with clipped `/θ/`. All three require
`{ mode: "lexicon", morphology: true, trace: true }`, with no forced syllable count.

The coverage-policy branch integrates the Q12a legal-selection dependency after
this control. Seeded choices change with that dependency; current tests use its
own trace-grounded coordinates (including `remhtrile` with clipped `th` and
`ilenes` with an unowned inserted marker). Historical control data remains frozen.
