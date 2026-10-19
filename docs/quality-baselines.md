# Frozen quality baselines

The linguistic benchmark captures the generator and compares a change against the
revision it builds on. It measures structural correctness, distribution changes,
and output composition. Human wordlikeness remains a separate outcome.

Generation is deterministic and the seeds are fixed in the committed protocol, so
a baseline does not need to be stored to be compared: it can be **regenerated**.
The default workflow captures the baseline from a pull request's merge base and the
candidate from its head, with one harness in one environment, and compares the two.
Raw word archives are an optional local cache. The committed `summary.json` and
`review-samples.json.gz` files remain the durable historical record.

## Fixed protocol

`evaluation/quality/protocol.json` defines four profiles: default lexicon, bare
lexicon, forced bare monosyllables, and default text. Each uses five distinct
32-bit seeds and a continuous RNG stream of 10,000 draws: **200,000 words per
cohort**, with `trace: true` throughout. Development and validation seeds are
separate and globally unique. Seeds were fixed before collecting this baseline.

The first 40 draws of every stream form an unfiltered review sample (200 words per
profile). Duplicate spellings retain their draw multiplicity. Curated defect
witnesses are saved separately and must not substitute for that sample.

The validation cohort is reserved for milestone confirmation. Do not repeatedly
tune against its results. Once used for tuning, it is development data; a new
confirmation cohort requires an explicitly versioned protocol.

## Compare a change against its merge base

```sh
npm run quality:pr
npm run quality:pr -- --base origin/main --out memory/quality-pr/my-change
```

This works from a clean clone with no archives. It finds the merge base of `HEAD`
and `--base` (default `origin/main`), checks that revision out into a temporary Git
worktree, captures it as `baseline/`, captures the current checkout (including
uncommitted generator edits, recorded as a dirty patch) as `candidate/`, and writes
`comparison.json` and `comparison.md` beside them. The default output is a new
timestamped directory under `memory/quality-pr/`. The base is your local
`origin/main`, so run `git fetch` first. A full development cohort takes about three
minutes and writes about 80 MB of archives per side, which can be deleted
afterwards. The temporary worktree is deleted afterwards, including when capture
fails; if the command is interrupted, `git worktree prune` removes a leftover
registration.

Both sides share the harness at `HEAD`, so evaluator edits never make the two
incompatible. A branch with no generator changes reports zero for every numeric
delta.

Pull requests run the same command in CI (the `quality-comparison` job), which
writes `comparison.md` to the job summary and uploads both reports as an artifact.
CI checks out the pull request merged into its base, so there the baseline is the
current base tip and the candidate is the merged result.

## Capture another revision

```sh
git worktree add --detach /tmp/unglish-3fd474d 3fd474d
npm run quality:capture -- --generator-root /tmp/unglish-3fd474d \
  --id regen-original --cohort development --out memory/quality-runs/regen-original
npm run quality:verify -- --run memory/quality-runs/regen-original
git worktree remove /tmp/unglish-3fd474d
```

`--generator-root` captures words from the generator in another checkout through
its public API, while the evaluator, CMU reference tables, and dependency lock come
from the harness checkout. The manifest's generator commit, dirty flag, patch,
source digest, and effective configuration describe that checkout. Omit it to
capture the harness checkout itself. The other checkout's `src/index.ts` is imported
without installing its dependencies, which works because the generator has no npm
runtime imports; a revision that adds one would need its own `node_modules`.

### Fidelity probe

When the captured revision has a committed run in `evaluation/quality/baselines/`
with the same protocol, cohort, and clean generator commit, capture first
regenerates the fixed review draws (the first 40 of every seed stream) and requires
each to serialize byte for byte as it does in that run's `review-samples.json.gz`.
Otherwise it refuses before writing anything and names the first diverging draw,
for example `regenerated lexicon-default seed 69212153 draw 3 differs from its
committed review sample`. A passing probe is recorded in the manifest's
`fidelityProbes`. The original baseline revision `3fd474d` passes this probe against
both committed cohorts, and its regenerated summaries equal the committed ones
metric for metric. A development regeneration on linux/x64 with a newer Node patch
release also passed and matched.

Compressed `words/` bytes are not portable: on that Linux machine none of the 20
regenerated archives had the committed SHA-256, although every word was identical.
Compare runs by their summaries, review samples, or decompressed content, not by
archive hashes from another environment.

The probe is strong evidence, **not proof**, that every archived word regenerates
identically: it checks 800 draws per cohort, not all 200,000. A dirty generator,
or a revision with no matching committed run, is not probed.

Regeneration cannot add evidence a revision never recorded. A metric that needs a
trace field added after a revision cannot be measured on that revision; it must
report missing evidence rather than a successful result.

The committed baselines are stored in:

- `evaluation/quality/baselines/2026-09-26-development-standalone`
- `evaluation/quality/baselines/2026-09-26-validation-standalone`

These hold words captured from revision `3fd474d`'s generator. The older
written-v2 human-review snapshot remains a separate historical study.

Each is a rescore of an initial capture (`initial-development`,
`initial-validation`) with an evaluator independent of the human-review code.
Archive hashes, metrics, and original generator provenance were verified identical.
The initial runs are not committed separately: their complete manifests and source
bundles are retained in each directory's `provenance.json.gz`, and their summaries,
review samples, distributions, and witnesses were identical to the committed ones.

Every run records:

- Exact generator and evaluator source contents, effective configuration, Git
  revision and generator patch, protocol, derived CMU reference tables, dependency lock,
  and Node/platform information. Raw CMU source and corpus-builder scripts are not
  bundled; the comparison pins the already-derived tables.
- SHA-256 hashes for every artifact; capture fails if source, evaluator,
  dependencies, or references change during collection.
- Every generated `Word`, including its complete trace, in compressed JSONL files.
- Per-profile and per-seed metrics with explicit eligible denominators, plus
  actual morphology × syllable-count strata.
- Spelling diversity, syllable/phoneme-length and morphology distributions,
  mean letter length, raw phoneme/trigram counts, and union-based Jensen–Shannon
  distances to the pinned CMU references. Missing reference categories remain in
  the comparison with generated probability zero.
- Unfiltered review samples and separately labeled defect witnesses.

A completed run has a `manifest.json` containing a digest of its manifest.
Interrupted captures have no completion manifest. Existing directories are never
overwritten, including interrupted runs; choose a new ID/path when retrying.

The manifests, summaries, source bundles, and compact evidence are versioned in
Git. The much larger `words/` archives are deliberately ignored: they are a local
cache of output any machine can regenerate, and need not be backed up. Comparisons
verify the pinned summaries and work without raw archives; full verification
(`quality:verify`) and re-scoring read the archives of the run they are given. A
content hash detects alterations relative to its manifest; versioning or retaining
the original manifest is what prevents silently replacing both a file and its
expected hash.

## Compare captured runs

`quality:pr` covers the usual case. To compare runs captured separately, for
example a regenerated original baseline, a previous step, and a candidate:

```sh
npm run quality:compare -- \
  --baseline memory/quality-runs/regen-original \
  --previous memory/quality-runs/step-01 \
  --candidate memory/quality-runs/step-02 \
  --out memory/quality-comparisons/step-02
```

Omit `--previous` for the first change. Reports contain exact counts and rates,
percentage-point changes against both references, eligible-denominator changes,
and descriptive per-stream delta ranges. JSON also retains all morphology/length
strata and distribution bins so improvements caused by a changed output mixture
remain visible. The report makes no automatic universal pass/fail claim.

Comparison refuses mismatched cohorts, protocols, evaluators, metric definitions,
reference data, profile/seed schedules, or draw counts. Regenerating both sides
with the current harness is the way to compare across an evaluator change; do not
edit hashes to force a comparison.

### Runs from different environments

Runs captured together share a Node version and dependency lock and compare
without further checks. A reference (baseline or previous step) whose generation or
evaluation runtime or dependency lock differs from the candidate's is accepted only
when a run captured in the candidate's environment passed the fidelity probe
against that exact reference manifest. That run may be the candidate itself, the
other reference, or one passed with `--probe <run>`. The comparison then lists each
difference in `comparison.json` (`environmentDifferences`) and in a section of
`comparison.md`. Without such a probe it refuses. `--strict-environment` refuses
every environment difference, as earlier versions did.

## Re-score existing words with a new evaluator

Re-scoring is the fallback for when an old revision can no longer be run, for
example because its generator needs a runtime that is no longer available. It needs
the run's `words/` archives. Start from the most recent rescore of the cohort so the
provenance chain stays complete; for the committed baselines that is the
`-standalone` directory:

```sh
npm run quality:rescore -- \
  --run evaluation/quality/baselines/2026-09-26-development-standalone \
  --id baseline-evaluator-02 \
  --out memory/quality-runs/baseline-evaluator-02
```

Rescoring fully verifies the input archive, then evaluates its exact saved `Word`
objects without calling the generator. Both capture and rescoring use the same
aggregation path. Every draw must match its declared profile, seed, and consecutive
index, and each stream must contain the protocol's exact draw count. Raw compressed
files are copied byte for byte into the new run, independently of the original;
the source directory is never modified.

The new run retains the original generator source, revision, patch, effective
configuration, generation environment, dependency source files, protocol, and
reference tables. It records the current evaluator source and evaluation
environment separately, plus the parent manifest/evaluator digests. Its
`provenance.json.gz` preserves all preceding manifests and source bundles when an
archive is rescored more than once. Historical manifests without a separate
evaluation environment used their recorded generation environment for both.

The new evaluator recomputes metrics, summaries, distribution scores, fixed review
samples, and defect witnesses. Original metrics remain in the original archive.
New evaluator definitions cannot recover observations omitted from historical
traces: such metrics must explicitly represent missing evidence rather than
silently treating it as a successful result. Reference changes require a separate
versioned migration; this command deliberately uses the input's frozen tables.

Compare the rescored baseline with a candidate captured or rescored using that
same evaluator. The environment rules above still apply to the generation
environment: rescoring does not erase a difference in how the words were
produced. Existing output directories are rejected, and interrupted
rescoring has no completion manifest, just like interrupted capture.

Using the same RNG schedules controls the experiment, but a change can consume
random numbers differently. Equal draw indices are therefore **not matched words
or causal before/after pairs**. Compare distributions and structural rules, and
use targeted fixtures to establish the mechanism of a correction.

## What counts as evidence

| Claim | Required evidence |
|---|---|
| A specific defect was corrected | A traced witness, a meaningful rule/invariant test, and reduced observed violations across profiles |
| A distribution moved toward its reference | Effect sizes, eligible counts, consistency across streams, within-stratum checks, and diversity/regression checks |
| Readers prefer the outputs | Blinded written-wordlikeness judgments on unfiltered samples, with length/morphology controlled |
| Spellings communicate the intended pronunciation | Independent read-aloud judgments compared with intended phones and stress |
| Intended sounds are more plausible | A separate controlled auditory-wordlikeness comparison |

Zero observed violations is a statement about the sampled corpus, not a proof
over all possible seeds. Per-stream ranges describe Monte Carlo variation; they
are not confidence intervals for human preference. Tiny rate movements should not
be treated as established gains from five replicates alone.

Thirteen initial trace metrics distinguish invariants from diagnostics. Examples
include missing primary stress, prohibited primary schwa, zero-weight choices,
stale orthographic traces, duplicate coda segments, stress clashes, and FOOT-vowel
coverage. Diagnostic directions are guides, not universal targets: more /ʊ/ is
useful for an exclusion bug, but maximizing it would be wrong. The hiatus metric
counts affixed words with a traced fallback and is not an alignment proof for every possible future
glide rule. Final open checked vowels likewise require dialect-sensitive judgment.

The existing CMU normalization merges some vowel categories, so its scores remain
coarse distribution diagnostics. Compare bare roots against whole-word CMU with
care: missing affix patterns do not establish a root-generation defect. Improved
corpus resemblance alone cannot establish a human wordlikeness gain.

For human comparisons, randomize and hide generator version, retain unfiltered
draws and predefined strata, and use the existing review workflow as a starting
point. Anonymous sessions do not establish independent participants. Do not mix
historical studies or silently revise their frozen wording/samples.

## Step record

For each focused change, record its hypothesis, intended metric/stratum, generator
revision, capture ID, cumulative and previous-step report, targeted tests, observed
regressions, and human evidence when applicable. Define the expected effect before
inspecting the candidate results. Use controlled ablations when changes interact;
a series of improving aggregate scores alone does not isolate causality.

Run the normal suites alongside the benchmark:

```sh
npm run check
npm run test:perf
```

Performance is measured by the existing dedicated performance suite. Capture time
includes compression and trace serialization and is not a generator speed score.

Harness tests cover deterministic captures, capture from another checkout, the
fidelity probe and its refusal, the environment gate, a zero-delta merge-base
comparison, fixed review selection, refusal to overwrite, artifact corruption, correct affix denominators, missing-category
penalties, incompatible comparisons, cumulative/previous regressions, and missing
eligible strata. Rescoring tests also verify that generation is never invoked,
raw archives remain byte-identical, historical provenance is retained, malformed
draw schedules fail, and unchanged recaptures produce compatible summaries. The
harness tests are also included in `npm test`.
