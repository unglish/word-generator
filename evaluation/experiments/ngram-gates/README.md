# Q01b: unchanged-generator gate reproducibility

The unchanged generator fails its existing rare-trigram gate in **12 of 20**
preregistered 200,000-word study streams. All twelve failures concern `ugh`.
The bigram-over, trigram-over and bigram-under gates pass every study stream.
The separate seed-42 control passes all four gates.

This is an observed rejection fraction for these streams, not a linguistic
false-positive rate, a confidence interval or a human quality judgment. The CI
test is deterministic; its outcome is sensitive to the sampled stream. Changes
that alter subsequent RNG consumption can change that sample. These findings do
not clear a candidate's failing gate or establish that its distribution is
unchanged. Thresholds and generator behavior remain untouched.

## Exact rare-event results

The reference contains 472 `ugh` events out of 634,863 trigrams. The fixed ratio
floor is 0.0062. Each of the twenty generated opportunity denominators requires
six `ugh` occurrences to pass; observed counts range from one to nine. The ratio
is `(generated count / generated trigrams) / (472 / 634863)`.

| Stream | Seed | ugh count | Generated trigrams | Ratio to reference | Gate |
| --- | ---: | ---: | ---: | ---: | --- |
| study-01 | 3988283555 | 5 | 1,093,881 | 0.00614806 | Fail |
| study-02 | 1019792351 | 2 | 1,095,031 | 0.00245664 | Fail |
| study-03 | 4177834256 | 5 | 1,091,501 | 0.00616146 | Fail |
| study-04 | 3040908865 | 3 | 1,095,663 | 0.00368284 | Fail |
| study-05 | 1903983474 | 6 | 1,095,704 | 0.00736539 | Pass |
| study-06 | 767058083 | 1 | 1,093,892 | 0.00122960 | Fail |
| study-07 | 2093534175 | 2 | 1,095,140 | 0.00245640 | Fail |
| study-08 | 956608784 | 3 | 1,096,124 | 0.00368129 | Fail |
| study-09 | 4114650689 | 3 | 1,095,168 | 0.00368450 | Fail |
| study-10 | 2977725298 | 4 | 1,093,879 | 0.00491846 | Fail |
| study-11 | 1840799907 | 7 | 1,094,291 | 0.00860406 | Pass |
| study-12 | 3167275999 | 9 | 1,094,908 | 0.01105612 | Pass |
| study-13 | 2030350608 | 7 | 1,092,830 | 0.00861556 | Pass |
| study-14 | 893425217 | 6 | 1,093,109 | 0.00738288 | Pass |
| study-15 | 4051467122 | 9 | 1,094,415 | 0.01106110 | Pass |
| study-16 | 2914541731 | 5 | 1,092,646 | 0.00615501 | Fail |
| study-17 | 4241017823 | 2 | 1,094,070 | 0.00245880 | Fail |
| study-18 | 3104092432 | 4 | 1,093,583 | 0.00491979 | Fail |
| study-19 | 1967167041 | 7 | 1,094,621 | 0.00860146 | Pass |
| study-20 | 830241650 | 7 | 1,094,551 | 0.00860201 | Pass |

Seed 42 has 6 events / 1,093,845 trigrams, ratio 0.007377912202260244, and passes.
All 200,000 control spellings independently match the public batch API used by
the existing CI test. The control is excluded from the 12/20 fraction.

Across study streams, the worst bigram overrepresentation is `ry` (ratios
3.2679–3.3512 versus threshold 4.25); worst trigram overrepresentation is `abl`
(2.7506–2.8901 versus 3.21). Worst bigram underrepresentation is `ex` or `gh`
(0.029884–0.041786 versus floor 0.0215). Exact counts, denominators and extrema
for all gates are retained in `report.json.gz`.

## Trace-grounded interpretation

The first three control `ugh` witness draws are 11,358 (`dughidsed`), 30,581
(`incughont`), and 75,800 (`wughowns`). Their `graphemeSelections` record separate
`u`, coda `g`, and following-syllable onset `h`. Their complete stage, repair and
morphology evidence is included in `gate-witnesses.json.gz`. These are instances
of three letters spanning a syllable boundary, not evidence that an `ough`
construction was generated. The witness sample is bounded; this observation
must not be extrapolated to all occurrences.

A later gate redesign should distinguish event support, sampling variation and
linguistic mechanism, with a new preregistered acceptance rule. This PR supplies
the unchanged-source evidence and does not fit a replacement threshold.

## Integrity and reproduction

The generator, package/lock/tsconfig and both reference count files match full
commit `8e9ceb2fb1d8a7a6d4a6d4239e501ccaaed73c1c`. The 77-file snapshot includes
all generator source/tests, probe/protocol/verifier code and reference contents.
Its SHA-256 is `ac847fde3cf6662dfcbe85ca8f17a8e2f6cf845390fc9d9c2f56d6afdac99b56`.
Source and reference bytes were checked before and after the complete capture.
Node is `v24.11.1` on darwin arm64.

Twenty evenly spaced Mulberry32 phases use exact integer arithmetic. Every study
stream's consumed state count, including the next-value probe, fits its reserved
interval. This proves disjoint consumed state intervals among those streams;
it does not prove probabilistic independence or independence from historical
studies. Witness replay intentionally revisits the same states for evidence.
Validation outputs remain unseen.

Use the commands in the [study guide](../../quality/probes/ngram-gates/README.md).
The Python verifier independently recounts the complete written archives,
recomputes the four extrema, checks first-three witness selection, verifies every
artifact hash and phase capacity, and calculates each next-RNG value independently.
Write its output outside the immutable run directory.

Full raw archives remain at `memory/quality-runs/unchanged-ngram-gates-v1/`.
The compact report lists every raw artifact's hash and byte count. Reproduction
requires those archives or regenerating from the pinned source; compact witnesses
alone cannot replace full counting. `gate-witnesses.json.gz` retains all 247
complete draws needed for each replicate's four gate-extremum witness sets.

The complete uncompressed report SHA-256 is
`2ede80ff3c2c14a52f6e63b4c12af398eced38792c7e9a6aa9438c0ca129800b`.
`artifacts.json` pins the compact package. `sources.json.gz` preserves file
contents, while `protocol.json` records the fixed schedule. The independent
verification and public-batch control reports are also packaged.

Validation: seven TypeScript fixtures, four Python mutation-fixture groups,
strict study/control TypeScript and touched-file lint, complete 4.2-million-word
capture, independent full recount, and the separate 200,000-word batch control.
No runtime source changed, so no generator performance gain is claimed.
