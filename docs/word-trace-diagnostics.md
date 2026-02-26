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
  - Typical signal: `finalS`, `nasalStopExtension`, or boundary events.
- `repairs`
  - Question: Did a repair rule create/preserve/remove the pattern?
  - Typical signal: frequent rule + before/after strings touching the target pattern.
- `morphology`
  - Question: Is the pattern base-form or affix-driven?
  - Typical signal: non-bare template with prefix/suffix creating the sequence.
- `summary`
  - Question: Quick sanity check for trace volume and repair density.

## Root-Cause Buckets

When writing diagnostics, categorize each traced instance into one bucket:

1. Cluster generation / phonotactics
2. Grapheme realization / spelling
3. Structural events
4. Repair side effects
5. Morphology
6. Mixed / unknown

Use percentages by bucket to choose the fix level.

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
