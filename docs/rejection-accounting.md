# Rejection and fallback accounting

`generateWord({ trace: true })` records `trace.selection` for the complete search,
while the existing stages, repairs, and grapheme selections describe only the
returned attempt. This is instrumentation: candidate generation, acceptance,
fallback selection, and RNG consumption are unchanged.

`attemptsExecuted` is a count, and `selectedAttempt` is a zero-based index. An
accepted first attempt therefore reports 1 and 0. Exhaustion can report 20 attempts
executed while returning, for example, attempt 4. `status` distinguishes accepted
outputs from best-candidate fallbacks; `acceptedBy` distinguishes exact matches
from the existing relaxed acceptance after warmup. Fallback has no acceptance
criterion. `rejectedAttempts` includes every unsuccessful check, including the
returned candidate when it is a fallback.

The legacy `trace.attempts` field continues to mean zero-based retries: it equals
`attemptsExecuted - 1`. Its fallback value is corrected to count all retries;
previous releases could report the best candidate's index instead. Historical
traces without `selection` cannot reveal whether search exhausted, how many
attempts ran, or why other candidates were rejected. Treat those facts as unknown.

Rejection reasons count failed conditions on rejected attempts and can overlap:

- `phonemeTarget`: the root phoneme count differs from its target.
- `letterLength`: the letter penalty exceeds the relaxed limit.
- `warmup`: a nonzero letter penalty occurs before relaxed acceptance is allowed.

Selection scores roots before any planned affixes are attached, so every
recorded length describes a root attempt. The trace records the actual
thresholds, selected root lengths/score, and a compact histogram of all proposed
root lengths; the root phoneme target is `trace.targetPhonemeCount`. Bins contain
syllables, phonemes, letters, and multiplicity. For an affixed word, the selected
root lengths differ from the returned word's lengths.
These bins include both rejected and selected candidates. They allow comparison of
proposal and output distributions without retaining rejected words or their large
traces. The morphology template is available in `trace.morphology`; a `bare` plan
is not an actually affixed word even when `summary.morphologyApplied` is true.

## Preregistered verification

The primary requirement is **zero output and RNG changes**. Run the public-API
probe against the unchanged generator and this branch using the same evaluator:

```sh
npm run audit:rejections -- --generator-root /path/to/unchanged-checkout --out memory/rejection-before.json
npm run audit:rejections -- --out memory/rejection-after.json --compare memory/rejection-before.json
```

The fixed development probe uses the four baseline profiles, their five fixed
development seeds, and 1,000 continuous draws per stream: 20,000 words total.
Before inspecting these results, acceptance requires matching per-stream output
hashes (excluding traces), RNG call counts, and the next RNG value. For historical
traces the old attempt index must match the new selected index. New captures must
also show consistent attempt/rejection totals and histogram multiplicities.

Reports retain per-stream fallback/exact/relaxed counts, rejection reasons,
attempt and selected-index histograms, and attempted-versus-selected length bins
stratified by actual morphology and returned syllable count. This measures the
selection mechanism; it does not claim better wordlikeness. Historical unknown
search outcomes remain unknown instead of being reported as zero fallbacks.
In probe reports, `proposedLengths` keys (`syllables/phonemes/letters`) describe
root attempts, while `selectedLengths` keys describe returned words, including
any affixes. Compare them directly only in bare strata, and normalize each
distribution by its own observation count. A proposal contributes once per
attempt; a selected word contributes once per search. Strata use the returned
word's morphology and syllable count, so proposals within a stratum can have
different syllable counts.
The probe records source and evaluator fingerprints, configuration, and traced
witnesses; it refuses to overwrite an existing report. Frozen v1 quality-baseline
metrics cannot retrospectively recover the missing rejection history.

Public-API tests cover exact acceptance, relaxed acceptance, impossible targets,
an early selected fallback, trace/no-trace output and RNG parity, and bookkeeping
across default bare and affixed words. Instrumentation is allocated only when
tracing is enabled. No complete rejected-word payload is stored.

## Measured evidence

The [2026-10-04 evidence report](./rejection-accounting-evidence.json) records all
20 stream hashes, RNG counts and next values, source/evaluator fingerprints,
search summaries, morphology/length strata, and traced witnesses. It compares
this branch with the unchanged generator at its base commit, after root-only
length selection (#305). Every output hash, selected-index hash, RNG call count,
and next RNG value matched. Archives captured before #305 record different
outputs, so they are not a parity reference for this generator.

These newly observable counts describe the unchanged generator:

| Profile | Words | Attempts executed | Exact | Relaxed | Fallback | Previously omitted retries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| lexicon-default | 5,000 | 13,214 | 4,410 | 523 | 67 | 1,074 |
| lexicon-bare | 5,000 | 13,825 | 4,408 | 494 | 98 | 1,351 |
| monosyllables-bare | 5,000 | 49,918 | 2,965 | 443 | 1,592 | 22,019 |
| text-default | 5,000 | 14,049 | 4,239 | 737 | 24 | 384 |

Previously omitted retries are the difference between actual retries and the
selected root's zero-based index. Across these draws, the legacy field omitted
24,828 retries from fallback searches. That is an accounting correction, not a
change to selection behavior or an improvement in wordlikeness.

Validation passed: 574 unit tests (one skipped), 12 quality tests, project and
probe strict type checks, and both performance gates. The performance run measured
6,407 words/second against a 4,500 floor and median batch variance 1.14× against
the 3× limit. These are local gate results, not a paired performance improvement.
