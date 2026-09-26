# Q15: fixed-vector phone-transition table sensitivity

The measurement changes when the count table changes, although every word vector is
held fixed. B raises the English mean by **0.004067774 log2 units per transition**
and lowers the pooled generated mean by **0.003184122**. The normalized
English-minus-generated gap rises from **0.307366448 to 0.314618344**
(**+0.007251896**). This is a measured count-table sensitivity, not evidence of
improved or degraded generated words and not a model-adoption recommendation.

This package follows #333 at `91a1888140f45392a46b08af323610ebaff0a3b3` on
`codex/phone-transition-model-sensitivity`. All 325 inherited files and all 13
reviewed study files stayed fixed through the formal runs. No generator, gate,
reference consumer or public API changed. This directory is staged for parent
review; no commit, push or publication is included.

## Read this before the machine evidence

Start with this interpretation and [the complete group table](tables/all-group-scores.csv).
Review the source experiment's design/protocol, pure evaluator and independent
verifier separately from the generated evidence in `machine/`. The
[manifest](MANIFEST.json) pins every package file except itself, with original byte
identities for copied evidence. The external staging manifest pins this manifest.

The exact 164,954,928-byte report is stored as
[`machine/study/report.json.gz`](machine/study/report.json.gz). Decompression must
produce SHA256 `38d3dcbf8342a58fdc59e7f8b96ec2b9d62fa7d77f50d1775ac8fecbc3e17240`.
Its gzip transport has zero timestamp and no embedded filename; two compressions
were byte-identical. All 21 ordered row-stream gzip files are copied unchanged.
The second complete run is represented by the original acceptance record's 22
equal file hashes instead of duplicate copies. No raw CMU corpus or original
generator archive is copied into this package. Their exact external identities
remain in the 338-source/30-input freeze.

## What was held fixed

The study scores 117,485 selected CMU entries and the original 200,000 archived
development words: four 50,000-word profiles, each comprising five fixed streams.
Both models receive the same complete base-ARPABET vectors, including two `#`
boundary events. A is the exact historical 1,338-bin, 976,831-event table; B is the
matched selected-entry 1,339-bin, 859,818-event table. Vocabulary size remains 40,
add-one alpha remains 1, and logs remain base 2. Every A row retains exact parity
with the unchanged legacy scorer in the producing runtime.

Total scores sum ordered log probabilities. A per-transition score divides that
word's total by `phoneCount + 1`; its cohort mean gives every word equal weight.
It is not a pooled transition-weighted mean. Delta means are means of paired
per-word B−A values, independently sorted and accumulated as prescribed; they
can differ in their final floating bits from subtracting separately rounded means.
Positive deltas mean a higher model score only. Source-identity-resolved subsets
are nested views of exactly the same vectors, not new captured populations.

## A/B effects for every top-level cohort

The two tables show all 11 preregistered top-level views. `/ resolved` means every
archived segment has a resolved source identity. English identity eligibility is
unavailable, because CMU base tokens are not uniquely recovered IPA identities.
All rows in these views are scoreable; no vector was dropped.

### Total log2 score


| Cohort | Rows | A mean | B mean | Mean paired B−A | Paired Δ median | Paired Δ min … max |
| --- | --- | --- | --- | --- | --- | --- |
| english | 117,485 | -28.401300195 | -28.378738864 | 0.022561331 | 0.088568304 | -4.541638031 … 2.227405889 |
| generated | 200,000 | -28.484550180 | -28.507050333 | -0.022500153 | 0.041344141 | -2.326185896 … 1.886451062 |
| generated / resolved | 196,552 | -28.412615624 | -28.435962778 | -0.023347154 | 0.040623546 | -2.326185896 … 1.886451062 |
| lexicon-bare | 50,000 | -32.690545180 | -32.670921657 | 0.019623523 | 0.068729548 | -1.900525941 … 1.886451062 |
| lexicon-bare / resolved | 48,894 | -32.620762529 | -32.601727882 | 0.019034648 | 0.068296927 | -1.900525941 … 1.886451062 |
| lexicon-default | 50,000 | -31.886560569 | -31.925435434 | -0.038874865 | 0.042914923 | -1.792962815 … 1.681612828 |
| lexicon-default / resolved | 49,150 | -31.818375652 | -31.857966498 | -0.039590846 | 0.042202294 | -1.792962815 … 1.681612828 |
| monosyllables-bare | 50,000 | -24.860075079 | -24.916886594 | -0.056811515 | -0.033371048 | -1.506422678 … 0.710485681 |
| monosyllables-bare / resolved | 49,215 | -24.792042834 | -24.849999924 | -0.057957090 | -0.033822277 | -1.506422678 … 0.710485681 |
| text-default | 50,000 | -24.501019891 | -24.514957647 | -0.013937756 | 0.062054272 | -2.326185896 … 1.690904284 |
| text-default / resolved | 49,293 | -24.457495216 | -24.472129374 | -0.014634158 | 0.061680383 | -2.326185896 … 1.690904284 |

### Equal-word mean per-transition log2 score


| Cohort | Rows | A mean | B mean | Mean paired B−A | Paired Δ median | Paired Δ min … max |
| --- | --- | --- | --- | --- | --- | --- |
| english | 117,485 | -3.905332152 | -3.901264378 | 0.004067774 | 0.012661894 | -1.084014982 … 0.347522892 |
| generated | 200,000 | -4.212698600 | -4.215882723 | -0.003184122 | 0.006354267 | -0.500874503 … 0.275002577 |
| generated / resolved | 196,552 | -4.205935137 | -4.209259230 | -0.003324093 | 0.006257973 | -0.500874503 … 0.275002577 |
| lexicon-bare | 50,000 | -4.441523503 | -4.438267489 | 0.003256014 | 0.009870327 | -0.397402156 … 0.275002577 |
| lexicon-bare / resolved | 48,894 | -4.436401153 | -4.433239044 | 0.003162109 | 0.009787189 | -0.397402156 … 0.275002577 |
| lexicon-default | 50,000 | -4.254976964 | -4.260465674 | -0.005488710 | 0.005943203 | -0.397402156 … 0.258451045 |
| lexicon-default / resolved | 49,150 | -4.250516724 | -4.256120267 | -0.005603543 | 0.005870322 | -0.397402156 … 0.258451045 |
| monosyllables-bare | 50,000 | -3.965310198 | -3.973025947 | -0.007715749 | -0.005114308 | -0.397402156 … 0.148137908 |
| monosyllables-bare / resolved | 49,215 | -3.954902119 | -3.962791475 | -0.007889356 | -0.005253979 | -0.397402156 … 0.148137908 |
| text-default | 50,000 | -4.188983736 | -4.191771780 | -0.002788044 | 0.011249748 | -0.500874503 … 0.262909898 |
| text-default / resolved | 49,293 | -4.183518152 | -4.186445068 | -0.002926916 | 0.011172794 | -0.500874503 … 0.262909898 |

## Same-model English-minus-generated gaps

Gap = English mean − generated-cohort mean, separately under A and B. Every gap
uses all 117,485 English rows, including the convenience table's phone-count
subgroups; those are not length-matched English comparisons. Δgap = B gap − A gap.
A negative total gap can become less negative while a positive normalized gap
widens. Do not label all positive Δgaps as increases in absolute distance.


| Generated cohort | Total A gap | Total B gap | Total Δgap | Normalized A gap | Normalized B gap | Normalized Δgap |
| --- | --- | --- | --- | --- | --- | --- |
| generated | 0.083249985 | 0.128311469 | 0.045061485 | 0.307366448 | 0.314618344 | 0.007251896 |
| generated / resolved | 0.011315429 | 0.057223914 | 0.045908485 | 0.300602984 | 0.307994852 | 0.007391867 |
| lexicon-bare | 4.289244985 | 4.292182793 | 0.002937808 | 0.536191350 | 0.537003111 | 0.000811760 |
| lexicon-bare / resolved | 4.219462334 | 4.222989018 | 0.003526684 | 0.531069001 | 0.531974666 | 0.000905665 |
| lexicon-default | 3.485260374 | 3.546696571 | 0.061436197 | 0.349644812 | 0.359201296 | 0.009556484 |
| lexicon-default / resolved | 3.417075457 | 3.479227634 | 0.062152177 | 0.345184572 | 0.354855889 | 0.009671317 |
| monosyllables-bare | -3.541225116 | -3.461852269 | 0.079372846 | 0.059978046 | 0.071761569 | 0.011783523 |
| monosyllables-bare / resolved | -3.609257361 | -3.528738940 | 0.080518421 | 0.049569967 | 0.061527097 | 0.011957130 |
| text-default | -3.900280304 | -3.863781217 | 0.036499087 | 0.283651583 | 0.290507402 | 0.006855819 |
| text-default / resolved | -3.943804979 | -3.906609489 | 0.037195490 | 0.278185999 | 0.285180689 | 0.006994690 |

The normalized gap widens in all four primary profiles. Lexicon-bare's own score
rises, but less than English's, so its gap also rises. Monosyllables-bare has the
largest profile mean normalized decline; differences between these profiles are
descriptive because their word-length and morphology populations differ.

## Signs, fixed-stream variation and complete strata

Exact signs count the producing JavaScript binary64 deltas. Near-zero means
`abs(delta) <= 1e-10` and is a separate overlapping category. No delta in the
primary populations is exact zero or near-zero; total and normalized sign counts
are identical here. The generated pool has a positive median and a majority of
positive deltas despite its negative mean: sign frequency alone does not describe
the average effect.


| Cohort | Negative | Zero | Positive | Near-zero |
| --- | --- | --- | --- | --- |
| english | 36,005 | 0 | 81,480 | 0 |
| generated | 85,854 | 0 | 114,146 | 0 |
| generated / resolved | 84,597 | 0 | 111,955 | 0 |
| lexicon-bare | 18,266 | 0 | 31,734 | 0 |
| lexicon-bare / resolved | 17,907 | 0 | 30,987 | 0 |
| lexicon-default | 21,348 | 0 | 28,652 | 0 |
| lexicon-default / resolved | 21,039 | 0 | 28,111 | 0 |
| monosyllables-bare | 27,435 | 0 | 22,565 | 0 |
| monosyllables-bare / resolved | 27,077 | 0 | 22,138 | 0 |
| text-default | 18,805 | 0 | 31,195 | 0 |
| text-default / resolved | 18,574 | 0 | 30,719 | 0 |

| Profile | Fixed streams | Smallest stream mean normalized Δ | Largest stream mean normalized Δ |
| --- | --- | --- | --- |
| lexicon-bare | 5 | 0.002825624 | 0.003594024 |
| lexicon-default | 5 | -0.005735258 | -0.005231034 |
| monosyllables-bare | 5 | -0.007920327 | -0.007529383 |
| text-default | 5 | -0.003669037 | -0.001702368 |

These are descriptive ranges across the five fixed streams, not confidence
intervals or independent population-representative samples. The complete report
and group CSV retain all 839 groups: totals, profiles, all 20 streams, exact
original phone counts and nested source-identity views. Group views overlap and
must not be summed. Each phone-count partition is exhaustive within its parent.
No new threshold, selected favorable cohort or resampling was introduced.

## Identity and projection loss

All 1,146,606 generated segments map to coarse tokens; missing mappings and unknown
source identities are both zero. There are 3,456 ambiguous `ɜ` segments in 3,448
words, leaving 196,552 source-identity-complete words (98.276%). Both A and B still
score all 200,000 coarse-complete words. A resolved identity does not establish
phonological acceptability or dialect compatibility.


| Cohort | Words | Resolved words | Ambiguous segments | Affected words | Recorded aspiration lost | Recorded reduced nuclei | Merger-capable segments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| generated | 200,000 | 196,552 | 3,456 | 3,448 | 46,810 | 25,930 | 176,562 |
| lexicon-bare | 50,000 | 48,894 | 1,112 | 1,106 | 17,024 | 8,532 | 54,788 |
| lexicon-default | 50,000 | 49,150 | 852 | 850 | 14,347 | 11,689 | 59,195 |
| monosyllables-bare | 50,000 | 49,215 | 785 | 785 | 7,064 | 0 | 22,777 |
| text-default | 50,000 | 49,293 | 707 | 707 | 8,375 | 5,709 | 39,802 |

The observed many-to-one mappings are AH = 79,995 `ə` + 18,834 `ʌ`, and ER =
25,842 `ɚ` + 3,456 `ɜ`. The resolved subset removes `ɜ` but retains AH = 79,001 `ə`
+ 18,725 `ʌ`; source resolution does not make the coarse score lossless.
Merger-capable flags (176,562 segments; 126,233 affected words) refer to the full
mapping contract, not just these observed preimage collisions.

Recorded aspiration is lost on 46,810 segments in 42,856 words. Recorded reduction
is present on 25,930 nuclei in 23,468 words; 368,339 nuclei have unknown reduction
status, not a false flag. Underlying unreduced identity remains unavailable. The
loss masks overlap and must not be added as disjoint populations. Stress and
syllable/morpheme boundaries are erased by the coarse score; missing stress marks
remain unmarked. English surface-loss counts are unavailable (`null`), not zero.
The exact counters and preimages for all 11 views are in
[`cohort-identity-loss.json`](tables/cohort-identity-loss.json); complete overlapping
masks for every stratum remain in the exact report.

## Transition decomposition and numerical interpretation

Each transition delta is `logB - logA`. Its numerator component is
`log2(countB+1) - log2(countA+1)`; its denominator component is
`log2(rowTotalA+40) - log2(rowTotalB+40)`. Observed multiplicities weight those
contributions. Thus a smaller raw count can still receive a higher conditional
probability when its row total also falls.

`compensated-signed-terms-v2` retains low-order corrections when adding weighted
transition terms and per-word B−A totals. The residual is one compensated sum of
weighted terms and negated row terms, not subtraction of the rounded displayed
totals. Products, per-word scores, sorted sequential summary means and fixed
tolerances are unchanged. No residual is clamped to zero.


| Cohort | Weighted transition Δ total | Word Δ total | Signed-term residual |
| --- | --- | --- | --- |
| english | 2650.618020349 | 2650.618020349 | -1.19773080342611e-11 |
| generated | -4500.030641130 | -4500.030641130 | 6.03428418344265e-12 |
| generated / resolved | -4588.929755576 | -4588.929755576 | 6.38933350671778e-12 |
| lexicon-bare | 981.176156742 | 981.176156742 | 1.23634436022257e-12 |
| lexicon-bare / resolved | 930.680062990 | 930.680062990 | 1.14197540312944e-12 |
| lexicon-default | -1943.743263184 | -1943.743263184 | -9.19198051008152e-12 |
| lexicon-default / resolved | -1945.890070704 | -1945.890070704 | -8.95328255978711e-12 |
| monosyllables-bare | -2840.575740989 | -2840.575740989 | 1.89626092605977e-11 |
| monosyllables-bare / resolved | -2852.358186941 | -2852.358186941 | 1.80546688710592e-11 |
| text-default | -696.887793699 | -696.887793699 | -4.27613500164625e-12 |
| text-default / resolved | -721.361560921 | -721.361560921 | -4.29611901608951e-12 |

The largest absolute producer residual over all 839 groups is
`1.8962609260597674e-11` (`profile/monosyllables-bare/all`). This is an arithmetic
reconciliation diagnostic, not an effect size. The independently reconstructed
residuals pass the same fixed tolerance; compensation is not a general guarantee
of equality across `log2` libraries.

For orientation, the following are the five most negative and five most positive
weighted contributions in the pooled generated cohort, ranked descriptively after
the run. They are not new acceptance endpoints or per-word causal attributions.
All transitions for every top-level view appear in
[`cohort-transitions.csv`](tables/cohort-transitions.csv), and every stratum is in
the exact report.


| Transition | Occurrences | A count → B count | A denominator → B denominator | Per-event Δ | Weighted Δ |
| --- | --- | --- | --- | --- | --- |
| S → # | 40,121 | 11185 → 9192 | 49250 → 42890 | -0.083604181 | -3354.283351 |
| Z → # | 19,891 | 20377 → 13027 | 27713 → 19329 | -0.125600946 | -2498.328422 |
| AH → R | 5,711 | 177 → 121 | 69494 → 62375 | -0.389075581 | -2222.010641 |
| T → S | 11,989 | 4764 → 3726 | 47980 → 42520 | -0.180169834 | -2160.056143 |
| AH → Z | 3,770 | 1886 → 1200 | 69494 → 62375 | -0.495937759 | -1869.685352 |
| # → S | 37,877 | 12282 → 11068 | 132643 → 117525 | 0.024442785 | 925.819377 |
| L → # | 12,686 | 7390 → 7034 | 49083 → 43965 | 0.087648812 | 1111.912823 |
| IY → # | 10,208 | 13218 → 12548 | 34321 → 30151 | 0.111845098 | 1141.714757 |
| T → # | 15,882 | 9187 → 8580 | 47980 → 42520 | 0.075686488 | 1202.052806 |
| N → # | 18,304 | 14848 → 14024 | 59721 → 52559 | 0.101935490 | 1865.827215 |

For example, S→# contributes −3,354.283351 total log2 units across 40,121
occurrences. Its numerator reduction exceeds the compensating denominator change.
N→# contributes +1,865.827215 across 18,304 occurrences even though its raw count
falls, because its conditional probability rises. These repeated transitions
explain weighted arithmetic exposure; the report alone does not establish the
linguistic cause of historical A's population differences.

## All frozen witnesses

The first available witness in each named category and the maximum-absolute-total
delta witness were selected by the frozen rules. They are examples of the scoring
mechanism, not a representative sample or judgments of pronounceability.
[`witnesses.json.gz`](tables/witnesses.json.gz) preserves all six selections with
the original generated words/traces, projections and full transition contributions.


| Frozen category | Spelling | Source coordinate | Fixed tokens | Total Δ |
| --- | --- | --- | --- | --- |
| english/maximum-absolute-total-delta | huairou | line 57213; ordinal 49673 | HH W AY R UW | -4.541638031 |
| english/unseen-seen | awb | line 7281; ordinal 6216 | AA W B | 1.390091568 |
| generated/maximum-absolute-total-delta | hichrads | text-default/4167471042/3750 | HH IH CH R AH D Z | -2.326185896 |
| generated/ambiguous | assecsful | lexicon-default/69212153/55 | AE S ER K S F AH L | 0.200342823 |
| generated/seen-unseen | miszi | lexicon-default/69212153/1498 | M IH S Z IH | -0.696012184 |
| generated/unseen-seen | sathfowm | text-default/1999736106/4619 | S AA DH F AW M | 1.256887981 |

`huairou` is dominated by HH→W (historical count 380 versus B count 15;
transition Δ −4.363453908). `hichrads` has CH→R counts 28→7 and transition
Δ −1.680463814. `awb` exposes W→B changing from unseen to seen (0→1);
`sathfowm` exposes DH→F (0→1). `miszi` exposes S→Z changing from seen to unseen
(1→0), a −0.800517591 transition delta. `assecsful` retains its ambiguous `ɜ`
surface segment and coarse ER token; its positive score delta does not resolve
that identity. First ties and maximum-magnitude ranking use producing JS deltas.

## What the verification establishes

1. **Exact integers and identities:** raw English selection, every A/B table bin
   and row denominator, every archived coordinate/vector/projection, availability,
   loss counter, group partition and stream identity are independently reconstructed.
2. **Producing-runtime reproducibility:** 15 CLI cases pass (12 required rejects,
   one help case and two complete 317,485-row studies from different working
   directories). All 22 output files are byte-identical. Every case log and outcome
   is preserved in `machine/validation/cases/`.
3. **Binary64 numerical agreement:** the independent Python proof checks 5,325,847
   numeric values against `1e-10 + 1e-12*abs(reference)`, with no changed tolerance.
   Largest absolute error: `6.934897101018578e-12` at generated/all transition 659
   weighted numerator. Largest relative error is 36.465116279 near a zero residual,
   with absolute error only `3.481659405224491e-13`; it passes the absolute term.
   This does not claim bit-identical Python/JS logarithms.
4. **JS signs and rankings:** exact sign counts and maximum-magnitude witness
   selection are independently recounted from producer deltas after independent
   numerical checks. The verifier separately records cross-language sign and
   near-zero classification sensitivity; there are zero disagreements here. This
   is not an independent bit-for-bit reconstruction of JavaScript's math library.
5. **Authority:** external SHA pins anchor the pre-run freeze and complete report.
   All 338 source and 30 input byte pins are checked before/after, along with the
   report and row streams. A self-declared digest alone is not authority.

The [independent proof](machine/validation/independent-proof.json),
[formal acceptance](machine/validation/acceptance.json), and
[completion record](machine/authority/completion.json) preserve those distinctions.
[Preparation history](FAILURE-HISTORY.md) retains failed synthetic/tooling attempts
and the pre-freeze corrections. No source or tolerance changed after formal outcomes.

## Limits and next decisions

B is fitted to the same 117,485 English entries used for its English scores; these
are in-sample, not held-out predictive results. Historical A's population overlap
is unknown. Count magnitude changes and alpha=1's relative smoothing strength
changes with it; this study does not isolate normalized transition frequencies
from effective regularization. Bare roots, forced monosyllables and text-profile
mixtures are not matched dictionary-stem samples. Total-score gaps also depend on
length, and the reported phone-count gaps still use the complete English cohort.

The words never change here. Neither the shifted gap nor the positive/negative
score direction is an output-quality improvement, a pronunciation-acceptability
judgment, a human preference estimate or a basis for choosing a replacement gate.
No token frequency, POS, familiarity, dialect resolution or recovered underlying
vowel identity is inferred. The original 200k archive is not the live quality
suite's seed schedule. Generator tuning, held-out predictive validation and any
consumer/model/gate adoption require their own separately reviewed baseline and
evaluation. This package changes none of them.

## Reuse and transport

Review `MANIFEST.json` before extraction. Restore `machine/study/report.json.gz`
to a fresh external `report.json` and place the 21 unchanged row-stream files
beside it to recover the canonical completed run. Hash the restored report against
the external authority, and verify every original compressed row pin. Restoring
the same report preserves its original absolute provenance paths; relocation does
not silently create a new source/input freeze. Rerunning the frozen verifier still
requires the exact externally pinned source/input paths or a separately reviewed
relocation procedure. The package manifest authenticates transport only relative
to an independently trusted manifest hash.

