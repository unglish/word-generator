# Lexicon stage calibration (Phase 2)

The [Phase 1 ledger](cmu-root-reference.md) supplies 43,026 representable common
surface types. Each of those types contributes one root observation. Thus
`run` and an accepted inflection of `run` both contribute the same root
pronunciation. The root target averages 2.288 syllables. The representable
surfaces average 2.595 and the full 45,904-word common subset averages 2.608.

## From ledger to generation

Follow the Phase 1 build and independent verification steps, then extract the
calibration tables with the same pinned CMU source. The extraction verifies the
CMU bytes, selected-entry identity, ledger alignment and the artifact digest.
Use a fresh output path and compare it with the committed module.

```sh
node --import tsx evaluation/corpus/lexicon-calibration.ts \
  "$ROOT_JSON" "$CMU_SOURCE" "$NEW_TABLES"
cmp "$NEW_TABLES" src/config/lexicon-reference.ts
```

The extractor counts root phones, root syllables within each phone length, and
final coda length within each joint length. The marginal template counts are
49.27% bare, 44.46% suffixed, 2.44% prefixed and 3.83% both. The generator chooses
a template from the row for the sampled root syllables. Within each affix slot
it samples the measured affix counts. These are independent choices across
slots and host phones. The existing allomorph rules still determine the
realized forms, and #462 owns the missing `-ation`/`-ion` forms and host
restrictions.

A lexicon root draws its coda length from that joint row and its complete coda
from the corpus counts at that length. The positive count keys are the
root-final whitelist. Runtime phone availability and coda constraints still
apply. For forced or custom budgets outside the observed joint shape, use the
marginal counts over feasible lengths. The generator keeps the chosen coda
through spelling and phoneme-count retries, so a shape with a cheap spelling
does not get an extra chance. The final-s and nasal-stop mutations are redundant
in this path. Text and non-final codas use the existing cluster configuration.
In a paired check, all 10,000 text draws with morphology on and all 10,000 with
morphology off serialized byte for byte like Phase 1, including traces.

## Stripped-row audit

Sample 200 from the 21,829 representable rows with at least one removal, using
Python's `random.Random(491).sample(rows, 200)` in ledger order. Review whether
the proposed terminal stem and each affix join capture a recognizable analysis
of the recorded surface. Manual review found **8 clear errors (4.0%)**,
**3 ambiguous readings (1.5%)**, and **189 acceptable rows (94.5%)**.

| Clear error | Ledger stem | Assessment |
|---|---|---|
| records | cord | False `re-` analysis of `record`. |
| refineries | finery | False `re-` analysis of `refinery`. |
| maximal | maxim | The contemporary root sense is maximum, rather than an adage. |
| impairment | pair | False `im-` analysis of `impair`. |
| infringed | fringe | False `in-` analysis of `infringe`. |
| implied | ply | False `im-` analysis of `imply`. |
| pursuers | pursuer | Missed `pursue + er` inside the plural. This analysis exceeds the suffix budget. |
| displayed | play | False `dis-` analysis of `display`. |

The ambiguous cases were `returns → turn` (depends on sense),
`johns → john` (ordinary noun or proper-name reading), and
`discharge → charge` (depends on sense). The worst-case rate in the sample
including those cases is 5.5%. This audit checks the precision of represented
strips and exposed one incomplete chain. It cannot estimate missed affixes
among bare rows or name contamination in the whole population. The reference
is suitable for aggregate gates at this measured error rate.

## Distribution gates

The recomposition test uses the configured root lengths and conditional
templates and the measured extra syllables per root-length/template cell. It
must recover the representable surface distribution to (10^{-9}) percentage
points of total variation (TV). The full common subset includes stacked
affixes and irregular residue; the two measured surface distributions are
0.543 points apart, so the full-population tolerance is 1 point. This check
uses observed deltas. The separate public-API gate checks actual realized
morphology, including allomorphs.

The finished-word gate uses 20,000 draws. Five additional development seeds
(42, 123, 456, 789, 1337) gave 1.43–1.93 points of syllable TV, means of
2.595–2.610, and 4.73–5.42 points of phone TV. The limits are 2.25 points of
syllable TV, 0.05 syllables from the common mean, and 5.8 points of phone TV.
The bounds detect reintroduction of Phase 1's overlong output and loss of
the measured phoneme improvement. The gate also requires the full projected
phone inventory without normalization loss. Templates use 1.5 points of TV,
covering several sampling errors at 20,000 draws while rejecting the old mix.
Affix slots use five binomial standard errors plus one draw for discrete rare
counts. The root coda TV limit is 3 points (observed 1.73); every observed
root-final coda must be licensed.

The bare-root marginal and joint gates use the same root reference. The old
six-phone-only interval of 18.5–22.0% becomes a per-bin comparison with four
binomial standard errors plus 0.5 percentage points for fallback. The six
joint distribution margins from #443 (±2.5, ±2.5, ±3.5, ±3.5, ±3.5 and ±4 points)
and the forced-count tolerances (0.12 phones and 3.5 points) are now centered
on corpus counts. The forced-test 10% ceiling for long codas still applies.

For the bare-root phoneme limits, eight disjoint 200,000-word streams apply
the existing worst ± three sample standard deviations rule. Under the **same**
new reference, the Phase 1 generator's seed-42 TV is 7.235 points; Phase 2's is
6.322. This table accounts for both the reference change and the remaining fit.

| Root phoneme limit | Old | New | Calibration and interpretation |
|---|---:|---:|---|
| Max TV (points) | 1.88 | 6.43 | Worst 6.32247, SD 0.03479. The old fit was to full CMU, where inflected roots helped match the inventory mixture. |
| Max common-phone ratio | 1.080 | 2.217 | Worst /z/ 2.17186×, SD 0.01504. Root /z/ fell from 2.485× to 2.147× on seed 42; the per-position phone weights still overproduce it. |
| Min common-phone ratio | 0.896 | 0.544 | Worst /ʃ/ 0.56392×, SD 0.00646. This is a real regression from 0.714× on seed 42. The measured final coda, shorter roots, and existing onset weights produce fewer /ʃ/ events than the root reference, which still contains unmodeled derivations. |
| Max common-phone gap (points) | 0.600 | 1.633 | Worst /ə/ 1.56954, SD 0.02098. The largest seed-42 gap moved from /t/ (1.636) to /ə/ (1.563) as the root mixture shifted toward shorter words. |

The common-phone cutoff (0.5%), normalization loss, missing-phone count and
generated-only mass requirements stay fixed. For the written n-gram checks,
only `cc` gets a separate floor (0.0010× versus the general 0.0089×). It occurs
2–11 times across each of five 200,000-word streams in the new output; the
lowest ratio is 0.00114×. This applies the existing 10% margin to that count.
Trace replay places all 28 Phase 1 and all 9 Phase 2 seed-42 `cc` examples
at the root–`able` boundary
(e.g. `praccable`), which has less opportunity after the affix frequency
revision. Reachability tests force rare `ian`, `ial` and `sion` forms; the
surface gate measures their rates from the trace. Their measured rates
supersede appearance floors of three spellings per 5,000 and the former
`ia`/`ian` floors of 0.20×/0.45× against full CMU. The public assembly
test checks that it actually exercises `im-` and then validates its spelling,
irrespective of how often the revised prefix template selects it.
