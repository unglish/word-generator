# Fixed n-gram gate reproducibility

This preregistered study measures how often the unchanged generator is rejected
by its existing four n-gram gates across twenty fixed streams. A separate seed-42
control reproduces the existing CI sample. It does not change the generator,
reference corpus, thresholds, test environment switches or acceptance policy.
Observed rejection is not a linguistic false-positive rate or evidence about
human preferences. The full protocol was frozen before collection.

Each replicate contains 200,000 public `generateWord` calls with the same default
lexicon and morphology settings used by `generateWords(200000, {seed:42})` in the
existing test. Counts use overlapping, lowercase, UTF-16 windows within each
clean spelling. Missing reference categories remain zero-count observations.
Eligibility, extrema tie order and inclusive threshold comparisons reproduce
the original test. All four thresholds are measured even if an environment
variable requests nonblocking CI gates.

The twenty study seeds occupy evenly spaced phases in the existing Mulberry32
state cycle. Exact integer arithmetic generates the schedule. The counter aborts
before any replicate consumes its neighbor's reserved states; the extra next-RNG
value is included in that bound. This certifies disjoint consumed state intervals
among the study streams, not stochastic independence or independence from other
historical streams. Seed 42 is outside the study numerator. No validation output
is read and no candidate change is evaluated in this study.
Trace replays deliberately revisit their original word's states to recover
evidence; they are not additional sampled words or additional study streams.

For every eligible reference gram, retain the first three matching draw indices.
Repeated occurrences within one word count as one witness. Exact word-start RNG
state replay with `trace:true` must reproduce the complete nontrace word and its
RNG consumption. These bounded witnesses support inspection of mechanisms; they
are not a claim that every occurrence has the same origin.

The capture compares all generator source, package/lock/tsconfig and both CMU
reference files to the full pinned original revision. All source, probe, protocol
and reference bytes are checked again after collection. The output directory and
all reports are exclusively created. Interrupted runs remain incomplete and must
not be resumed or treated as complete studies. Use a new directory for a new run.

```sh
npx vitest run --config vitest.ngram-study.config.ts
npx tsc -p tsconfig.ngram-study.json
python3 evaluation/quality/probes/ngram-gates/verify_test.py
mkdir -p memory/quality-runs
node --import tsx evaluation/quality/probes/ngram-gates/study.ts \
  --out memory/quality-runs/unchanged-ngram-gates-v1
python3 evaluation/quality/probes/ngram-gates/verify.py \
  memory/quality-runs/unchanged-ngram-gates-v1 /new/path/independent-check.json
node --import tsx evaluation/experiments/ngram-gates/verify-control.ts \
  memory/quality-runs/unchanged-ngram-gates-v1 /new/path/control-check.json
```

The independent Python verifier checks the exact artifact set and all hashes,
recounts every archived spelling, recomputes gate extrema and denominators,
verifies first-three witness selection and trace spellings, reconstructs the
phase schedule and checks each next-RNG value. Synthetic corrupt/reordered
archives and invalid gate/capacity certificates exercise its rejection paths.
The separate control check uses the public batch API and compares all 200,000
spelling outputs with the captured control.
Write verification reports outside the immutable run directory.

A report retains every replicate, exact event counts and reference/opportunity
denominators, all gate outcomes, and the observed rejection fraction. It supplies
no confidence interval from an unproved independence assumption. Gate redesign
or threshold calibration requires a separate reviewed hypothesis; this study
must not be used to fit thresholds to a favored candidate.
