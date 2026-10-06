# WordTrace Diagnostics Guide

Use `trace: true` as the default for n-gram outlier diagnosis.

## Why

Surface strings only tell you what appeared. `WordTrace` tells you why.
Without trace evidence, root-cause claims are guesswork.

## Minimal Usage

```ts
import { generateWord } from "@unglish/word-generator";

const word = generateWord({ mode: "lexicon", trace: true, seed: 42 });
console.log(word.trace);
```

## Field Mapping

Use these fields to answer specific diagnostic questions:

- `stages`
  - Question: Where did the structure change in the pipeline?
  - Typical signal: a cluster appears after generation but before write.
- `graphemeSelections`
  - Question: Is the written trigram caused by grapheme weighting/conditioning?
  - Typical signal: low-probability grapheme repeatedly selected for the same phoneme context.
- `structural`
  - Question: Did structural events inject the pattern?
  - Typical signal: `finalS`, `nasalStopExtension`, `boundaryDrop`,
    `risingCodaBoundaryDrop`, or `sspBoundaryDrop`.
  - Schema: typed per-event payloads. Example:
    `vowelHiatusFallback.inserted`, `boundaryDrop.equalSonority`,
    `aspirationDecision.context/probability/roll`.
- `repairs`
  - Question: Did a repair rule create/preserve/remove the pattern?
  - Typical signal: frequent rule + before/after strings touching the target pattern.
- `morphology`
  - Question: Is the pattern base-form or affix-driven?
  - Typical signal: non-bare template with prefix/suffix creating the sequence.
- `summary`
  - Question: Quick sanity check for trace volume and repair density.

## Joint vowel completion

With `splitVowels` configured, the final vowel-completion pass first evaluates
whole-nucleus inventory alternatives. If that pool is infeasible because a
neighboring consonant would lose its licensed reading, it can evaluate an
adjacent consonant and nucleus together. Both candidates must remain eligible
under the proposed written prefixes, preserve their phonemes, and pass the
shared, split-vowel, reading-context, and written-form budget checks.

For a version 5 `baseSpelling` trace, inspect
`completion.attempts[index].attempt.joint` when present. Its proposals retain
both inventory identities, prefix and pool evidence, projection results, and
conditional sampling evidence. The ordinary `attempt.sample` remains infeasible
in this case; the final outcome comes from `attempt.joint.sample`. Count the
selected joint proposal as one completed nucleus.

A joint completion has one `vowelCompletion` edit covering the contiguous input.
The completion certificate describes the nucleus, while `neighborReplacements`
contains the consonant's separate phoneme IDs, input/output cell IDs, spelling,
inventory identity, and reading. Each output cell's completion origin identifies
its own unit and local offset. A nucleus certificate reading does not license
another unit. Replay must authenticate the attempt and all replacement records;
final surface strings alone cannot establish that the sounds were preserved.

Changing a spelling can also change the generator's length score and which
attempt it returns. Compare retained trace states to diagnose a specific repair,
and use the full registered continuous streams to measure its distributional
effect. A word disappearing from its former seed coordinate is not evidence of
repair.

## Root-Cause Buckets

When writing diagnostics, categorize each traced instance into one bucket:

1. Cluster generation / phonotactics
2. Grapheme realization / spelling
3. Structural events
4. Repair side effects
5. Morphology
6. Mixed / unknown

Use percentages by bucket to choose the fix level.

## Boundary Structural Events (0.6.0)

Boundary diagnostics now emit dedicated structured events:

- `boundaryDrop`
  - Equal-sonority policy drop.
  - Includes: `dropped`, `beforeOnset`, `equalSonority`, `probability`.
- `risingCodaBoundaryDrop`
  - Rising-coda policy drop.
  - Includes: `dropped`, `preDropCoda`, `remainingCoda`, `onset`,
    `probability`.
- `sspBoundaryDrop`
  - Hard SSP safety drop loop.
  - Includes: `dropped`, `preDropCoda`, `remainingCoda`, `onset`,
    `violation` (`rule1 | rule2 | rule3 | multi`).
- `junctionBoundaryDrop`
  - Non-SSP boundary safety drop (articulatory invalid junction).
  - Includes: `dropped`, `preDropCoda`, `remainingCoda`, `onset`.

## Recommended Workflow

1. Run canonical analysis (`node scripts/analyze-cmu-trigrams.mjs`).
2. Pick one extreme pattern (highest ratio or largest negative ratio).
3. Generate a focused sample and trace a subset.
4. Assign every traced example to a root-cause bucket.
5. Choose one lever class for the fix PR.
6. Re-run analysis and compare before/after.

## Evidence Standard

For n-gram tuning PRs:

- include the target pattern counts/frequencies before and after,
- include a short trace-based root-cause summary,
- include at least one concrete trace excerpt in the diagnostic notes.

## Trace Signatures Seen In Lexicon Outliers

Recent lexicon-mode tuning work found repeatable signatures:

- `ea`/`eat` over-representation
  - Signature: `graphemeSelections` dominated by `/ɛ/>ea` and `/i:/>ea`.
- `ern`/`rn` over-representation
  - Signature: `graphemeSelections` dominated by `/ɚ/>er` + `/n/>n`.
- `dis` over-representation
  - Signature: `morphology.prefix === "dis"` in a large share of hits.
- `ion`/`tio` under-representation
  - Signature: low `morphology.suffix === "tion"` incidence rather than a repair failure.
- `ns` under-representation
  - Signature: scarcity aligns with coda cluster weighting, not grapheme repair.

## Exact base-word edit provenance

`trace.baseSpelling` records source grapheme cells and each actual base-word edit.
Its direct selection ownership is exact; rewritten-cell ownership remains
explicitly unresolved. The older `trace.orthography` now labels its alignment
`inferred`. See [the contract and examples](./base-spelling-provenance.md) before
using either representation to claim spelling/phone agreement.

Phone-preserving budget decisions and version-2 certified unit replacements are
explained in [the spelling coverage policy](./spelling-coverage-policy.md). An
already-satisfied cap is not a whole-word pronunciation certificate.
