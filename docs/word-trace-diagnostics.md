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
  - `alternateUnstressedRootNuclei` shows lexicon root-edge vowel choices made
    before spelling. Later changes in `generatePronunciation` are surface
    reduction and do not rewrite the base spelling.
- `syllableCount`
  - Root syllable target, excluding affixes. Compare `word.syllables.length` for
    the completed word; affixes can increase it beyond the 1–7 root range.
- `targetPhonemeCount`
  - Question: What root phoneme budget did top-down planning choose?
  - Typical signal: very small targets explain missing short-word shapes before grapheme selection even starts.
- `syllablePlans`
  - Question: How did the planner distribute the root consonant budget across syllables?
  - Typical signal: an onsetless VC target is visible here before any later repairs.
- `selection`
  - `criteria` shows the retry limit and the global thresholds used to count
    rejections. `scheduledRelaxedAfter` gives the opening index when the
    selected root needed its letter-length schedule to qualify.
- `graphemeSelections`
  - Question: Is the written trigram caused by grapheme weighting/conditioning?
  - Typical signal: low-probability grapheme repeatedly selected for the same phoneme context.
  - `selected` and `emitted` are the original choice. When a spelling-budget
    certificate later replaced the whole unit, `respelled.form` gives the
    replacement and `respelled.certificateId` indexes
    `baseSpelling.certificates` (for example `aue·n·ce` written `ons`). When a
    hard-letter rule respelled the unit for its written neighbours (hard `c`
    before e/i/y → `k`/`ck`), `letterRespelled.form` gives the replacement and
    `letterRespelled.rule` the repair name. Word rules such as `magic-e` are
    recorded in `repairs` instead.
- `structural`
  - Question: Did structural events inject the pattern?
  - Typical signal: `finalS`, `nasalStopExtension`, `boundaryDrop`,
    `risingCodaBoundaryDrop`, or `sspBoundaryDrop`.
  - Schema: typed per-event payloads. Example:
    `vowelHiatusFallback.inserted`, `boundaryDrop.equalSonority`,
    `aspirationDecision.ruleId/probability/roll`,
    `aspirationDecision.evaluated/applied/targetPhoneme`.
- `repairs`
  - Question: Did a repair rule create/preserve/remove the pattern?
  - Typical signal: frequent rule + before/after strings touching the target pattern.
- `morphology`
  - Question: Is the pattern base-form or affix-driven?
  - Typical signal: non-bare template with prefix/suffix creating the sequence.
  - `syllableReduction` is a legacy name for the planned baseline affix count;
    it is no longer subtracted from the root. Actual selected allomorph counts
    are in `realization`. Root phoneme and letter scoring happens before
    affix attachment, independently of these costs.
- `random`
  - Question: Which random streams produced this word?
  - `scheme` is the stream derivation version and `key` the word's 64-bit
    stream key as 16 hex digits, `hi` then `lo`. To regenerate the word, pass
    a `rand` that returns `hi / 2**32` and then `lo / 2**32` (the key's first
    and last eight hex digits), with the same config, options and package
    version. The derivation itself is internal; see
    [Per-stage random streams](./stage-random-streams.md). Absent in traces
    from before #556.
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

## Focused common-word probes

For controlled `of`/`off`/`ofe` writer tests and a seeded root-plan-to-spelling
probe, see [productive `of` spelling diagnostics](of-spelling-diagnostics.md).

## Exact base-word edit provenance

`trace.baseSpelling` records source grapheme cells and each actual base-word edit.
Its direct selection ownership is exact; rewritten-cell ownership remains
explicitly unresolved. The older `trace.orthography` now labels its alignment
`inferred`. See [the contract and examples](./base-spelling-provenance.md) before
using either representation to claim spelling/phone agreement.

Phone-preserving budget decisions (`trace.spellingBudgets`) and version-2 certified
unit replacements are explained in [the spelling coverage policy](./spelling-coverage-policy.md).
An already-satisfied cap is not a whole-word pronunciation certificate.
