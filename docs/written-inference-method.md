# Q21 crossed reader/spelling inference draft

The primary outcome is the registered difference in 4–5 rating share, candidate
minus baseline. Register the cohort (`all-ratings` or `unfamiliar-only`), seed,
replicate count, confidence level, coverage requirements and sampling/missingness
assumptions before collecting observations. These settings are part of the frozen
comparison digest. The inference API rejects an external substitute protocol.

## Basis and limits

[Owen and Eckles (2012)](https://arxiv.org/html/1106.2125) motivate independent
factor reweighting when observations share crossed units. Their results concern
mean-variance estimation under stated random-effects conditions. They also
explain why holding observed missingness fixed cannot repair informative
missingness or sampling bias. Those results do not establish exact percentile
coverage for this implementation's fixed-count weighted observation ratio.

This implementation extends that principle to the existing descriptive statistic:
each eligible rating receives its item's original draw multiplicity divided by
the fixed eligible-rating count for that item. Independent person and spelling
factors then multiply that observation weight, and the condition score is the
ratio of weighted favorable ratings to weighted observation mass. At unit weights
this equals the existing item/draw-weighted descriptive statistic. The weighted
ratio and percentile interval are an engineering choice requiring
independent arithmetic checks and simulation/calibration, not a theorem supplied
by the citation. Neither a passing fixture nor a narrow interval establishes a
real reader preference, representative recruitment or a default-promotion result.

## Registered computation

Factor lists are fixed from the complete roster and frozen spelling pool, rather
than changing when responses are missing. A spelling shared across conditions or
strata has one factor weight; a person has one weight across all their responses.
Factor axes are divided by their respective maxima before summation. These two
global positive scale constants cancel from the ratio; they avoid avoidable
overflow. Representational underflow is rejected, never silently rounded into a
zero-weight factor. Weights are positive exponential transforms of 32-bit midpoint bins from the
public seeded RNG. Every replicate retains its result and integer-bin hash, and
the report records the exact RNG draw count. Midpoint mapping avoids endpoints
that would produce zero or infinite weights. This is a discrete numerical
approximation to continuous exponential reweighting.

For item `i`, reader `p` and observed binary favorable rating `y`:

```
fixed_base_weight(p,i) = draws(i) / eligible_observed_ratings(i)
weight(p,i) = fixed_base_weight(p,i) * person_weight(p) * spelling_weight(i)
condition_share = sum(weight(p,i) * y(p,i)) / sum(weight(p,i))
contrast = candidate_share - baseline_share
```

Only items with eligible observed ratings enter those sums. Missing and skipped
ratings are never zero scores. Familiar ratings are excluded only when the
frozen cohort rule specifies that. Original pool/covered draws and rated reader
and spelling counts accompany every estimate. If coverage is incomplete, the
point estimate describes the covered frozen subset; bootstrap weights do not
recover unobserved outcomes.

Intervals use linear interpolation at `(1-confidence)/2` and its upper-tail
counterpart. Any unavailable replicate stays in the report and withholds the
interval; there is no replacement draw or seed retry. Registered participant,
spelling and coverage requirements also withhold intervals. Minimum counts are
eligibility rules, not evidence of adequate statistical power. The pooled
contrast is primary. Stratum intervals are exploratory without multiplicity
adjustment.

## Identity and collection

Human-mode inference requires an owner-held roster binding each participant slot
to one unique opaque person key and one verification-record hash. The roster
must cover the complete planned roster and match the comparison digest. Session
IDs are not person identities. Duplicate people, slots or verification records
and changed/incomplete rosters are rejected.

The roster is owner-attested evidence. Its hash authenticates its contents; the
program cannot prove the people or verification records exist. Keep the private
verification records, actual enrollment evidence, recruitment method and
responses for review. Development fixtures remain explicitly marked and cannot
count as human ratings. The actual study still requires collection transport,
registered precision/power choices, independently validated/calibrated analysis
and real observations.

## Pre-observation correction from the unexecuted V1 draft

V1 normalized reader weights again within each item. With a singly rated item,
that normalization canceled the reader factor completely, hiding shared-reader
variation in sparse assignments. The unexecuted source/operator draft is retained
in owner evidence, and its idle check job was explicitly interrupted before any
tests or ratings. V2 fixes the observed rating-count denominator before bootstrap
reweighting, so a reader factor changes total mass even for singly rated items.
The unweighted point statistic is preserved. New analytical sparse-reader checks
and the independent raw-export oracle must pass; simulation calibration and real
observations still remain. This is a pre-observation method amendment, not a
post-outcome choice of a favorable interval.
