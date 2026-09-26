# Matched CMU reference populations (Q15b)

The character, length and phoneme baselines previously carried different
populations and units under the same CMU label. This evaluation-only PR adds
`cmu-joint-ascii-first-v1`: one population shared by all new tables. It depends
on the shared parser in #323, which preserves #304's selection contract.
Existing reference files, generator code, runtime weights and acceptance gates
are unchanged.

## Population, counts and limits

The source remains CMU revision `74790861f652b15e4ac49015a90074ad62a27690`,
with raw SHA-256
`81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
The same 117,485 first valid unlabelled ASCII spellings feed every joint table.
Their line/label/spelling/original-token digest is
`d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29`.

| Table | Units and denominator |
|---|---|
| Letters | 869,802 word-internal character occurrences |
| Bigrams | 752,317 word-internal occurrences; no word-boundary markers |
| Trigrams | 634,858 word-internal occurrences; no word-boundary markers |
| Native phones | 742,333 validated CMU token occurrences, retaining vowel stress 0/1/2 |
| Stressless phones | The same 742,333 occurrences with stress explicitly projected away |
| Written length, phone length, syllable count | 117,485 selected lexical entries per histogram |
| Length conditional on syllable count | Integer counts that reconcile with both marginal tables |
| Stress patterns | One explicit stress-mark sequence per selected pronunciation |
| Derived onset/rime and character model | The complete, unchanged #304 model and syllabification |

Each entry contributes one traversal; longer words contribute more phone and
character events. Event-normalized histograms therefore do not give each word
equal histogram mass. Syllable count comes from stress-marked vowel tokens;
the derived syllable boundaries come from #304's algorithm, not CMU annotations.
CMU provides no complete root, familiarity, name, POS, dialect or token-frequency
labels. The new artifact supplies none by inference.

An independent Python parser/counter reconstructs every table from the pinned
dictionary, including every #304 onset/rime/character count. The resulting full
reference digest is
`3a0e0c9c3eb0ba4990f6607e22946dd2971474d405c10b1246779ee13be534f6`.
Source identity, population, projections, units, aggregation and implementation
identity are distinct fields. Validators reject altered bins, even when totals
are conserved and the enclosing digest is recomputed. Source self-consistency is
separate from authenticity: artifact consumers also pin expected implementation
files from the reviewed checkout.

## Legacy reconstructions

The six old reference/normalization files are embedded byte for byte and pinned
by SHA-256. Legacy character tables reconstruct exactly from 117,493 ASCII
spellings, including the eight vowel-less entries excluded by the joint policy.
Those eight contribute 21 letters, 13 bigrams and five trigrams.

The old length artifact reconstructs every bin and rounded summary statistic
from 135,158 pronunciation lines. It includes alternative pronunciations and
punctuation in written length. Its adapter deliberately retains the historic
whole-pronunciation digit-count rule. Exact reconstruction does not establish
how the historic artifact was originally built.

The old phone artifact contains rounded percentages totaling about 99.99997,
with unresolved source population and event denominator. It stays a vector of
proportions. No integer corpus count is inferred from it. Both legacy and joint
phone comparisons use the explicitly recorded legacy IPA projection; this does
not establish phonemic identity or choose a dialect. Native stress tokens remain
available before that lossy comparison.

## Same-output reference sensitivity

The separate sensitivity report reads the original 200,000 archived development
draws from #307. It makes no generator calls. It pins the complete original
manifest (`a23414ae34d3611c4367d07ad677afb99e7d89a4be7886e6ed95018c2ff3f3da`),
all artifact bytes, exact filesystem shard set, source/lock/evaluator identities,
and every profile/seed/draw coordinate. The validation cohort stays sealed.

Both reference views score the same counts with #307's frozen distribution
function, checked byte for byte before import and after analysis. Reports retain
full per-profile and per-stream raw counts, reference weights, denominators,
projection paths and both scores. Generated aspiration removal and the
`ɚ → ɜ` / `ʌ → ə` aliases are explicit losses. Unmarked generated stress is not
invented as CMU stress 0.

The table below shows **joint minus legacy Jensen–Shannon divergence, in bits**.
These are changes in measurement with identical outputs, not improvements.

| Profile (50,000 words each) | Trigrams | Written length | Syllable count | Phones |
|---|---:|---:|---:|---:|
| Lexicon default | −0.000002144 | −0.000576750 | +0.000608540 | +0.000003047 |
| Lexicon bare | −0.000002130 | −0.000349005 | −0.000010286 | +0.000000022 |
| Monosyllables bare | +0.000000850 | −0.020116576 | −0.004277346 | −0.000003850 |
| Text default | −0.000001797 | −0.012278669 | −0.002456867 | +0.000004500 |

The complete report also includes letters, bigrams and directional missing/unseen
mass. Joint conditional-length and stress tables are constructed and reconciled;
they are not additional scored generator comparisons in this PR. Five stream
results are descriptive, not confidence intervals. Forced monosyllables and bare
roots are not matched to whole-dictionary stems; their divergence from broad
dictionary marginals must not be interpreted as a wordlikeness verdict.

The independent sensitivity verifier rereads raw shards and checks all counts
exactly. It computes the six distances separately in Python; floating score and
delta comparisons use an absolute tolerance of `1e-12`, while integer counts and
identities must match exactly.

## Reproduce without replacing historical artifacts

Run these commands from this checkout. `$CMU_SOURCE` is the pinned dictionary
file, `$ORIGINAL_RUN` is #307's retained original development archive, and
`$FROZEN_DISTANCE` is that branch's `evaluation/quality/distribution.ts`.
Outputs must be new paths; commands use exclusive creation.

```sh
node --import tsx evaluation/corpus/joint-cli.ts --source "$CMU_SOURCE" --out /tmp/cmu-joint-new.json
python3 evaluation/corpus/verify-joint.py --source "$CMU_SOURCE" --artifact /tmp/cmu-joint-new.json --out /tmp/cmu-joint-proof-new.json
python3 evaluation/corpus/verify-joint-test.py --source "$CMU_SOURCE" --artifact /tmp/cmu-joint-new.json
node --import tsx evaluation/corpus/sensitivity-cli.ts --baseline "$ORIGINAL_RUN" --reference /tmp/cmu-joint-new.json --distance-module "$FROZEN_DISTANCE" --out /tmp/cmu-sensitivity-new.json
python3 evaluation/corpus/verify-sensitivity.py --source "$CMU_SOURCE" --artifact /tmp/cmu-joint-new.json --baseline "$ORIGINAL_RUN" --report /tmp/cmu-sensitivity-new.json --out /tmp/cmu-sensitivity-proof-new.json
python3 evaluation/corpus/verify-sensitivity-test.py --source "$CMU_SOURCE" --artifact /tmp/cmu-joint-new.json --baseline "$ORIGINAL_RUN" --report /tmp/cmu-sensitivity-new.json
npx tsc -p tsconfig.corpus.json
npm run test:review
```

Compact reference, sensitivity and verification evidence is retained in
`evaluation/experiments/cmu-matched-reference/`. Raw dictionary and 200,000-word
archives are not duplicated in the PR. New measurements do not overwrite the old
baseline or relabel old scores as if they used the new population. Adopting these
references in runtime sampling, a dashboard or a gate is a separate change with
its own unchanged-generator comparison.
