# Q11b: atomic morphophonemic cluster legality

The measured candidate rejects four `/sk/ → /ss/` root-coda proposals across the
two registered policy corpora. All four emitted pronunciations change; three clean
spellings change. Complete public replay and independent reconstruction cover
400,000 candidate words and their full traces. The original repository gates fail
in both arms, and the candidate reports lower native throughput in all six pairs.
This is a draft experiment with a demonstrated local invariant effect, not a
passing quality suite or evidence of speaker preference.

Measured control: `1159465fe6c10f55a97e8c5851e8a75c604450e7`.
Measured candidate: `9d2680b37b77ebb2f492f4173b1f1681446e40f4`.
Publication adds evidence without changing these measured source bytes.

## Behavior and reviewer entry points

`src/core/morphophonemic-guard.ts` checks the proposed replacement in its complete
affected syllable and nearby configured boundaries, with explicit root/affix
ownership. `src/core/morphology/attach.ts` performs an atomic decision before
changing a phone, its identity ledger, or the rule's written half. A rejected
proposal leaves the root unchanged; later ordered rules see that state. Physical
phones remain distinct even when a cross-morpheme repetition license applies.

`src/core/cluster-runtime.ts` and `cluster-validation.ts` share the existing
production classifier. They preserve its current semantics; options it does not
apply are not newly implemented. This guard does not certify every phonotactic
property elsewhere in a word, determine a native-speaker optimum, or implement
coalescence as a competing treatment.

The structured flag is
`morphology.morphophonemicPolicy.preserveClusterLegality`. Omission or `false`
preserves legacy execution and trace shape. The candidate **English configuration
enables it**, so the candidate default changes. The existing 10,000-pair omission
and 10,000-pair enabled trace/plain preflights retain output and RNG evidence.
Neither introduces a new guard RNG draw; rejection can nevertheless affect later
operations and stream alignment in other configurations.

Start with the prospective `treatment-design-v1.md`, `treatment-measurement.json`,
the guard and integration tests, and then these results. The independent Python
implementation imports no production classifier and reconstructs all configured
proposals, atomic states, ownership, bridge tape, written halves, and final cell
and phone ledgers for every successful emitted candidate record. Its scope does
not include discarded generation attempts or semantic phonemic licensing of every
written repair. Fixtures and corruption checks establish operator behavior; they
are not human quality measurements.

## Complete registered comparison

Each arm contains two spelling policies (`default`, `active`), each with the four
original profiles, five seeds, and 10,000 words per stream: 400,000 words per arm.
No profile, seed, original sample count, gate floor, heap setting or timeout was
reduced. Complete evaluator comparisons, including per-seed deltas, are in
`evidence/q11b-paired-summary-v1/default-comparison.md` and `active-comparison.md`.

The 200,000 bare-profile words and traces are byte-identical. Across all 200,000
affixed-profile ordinal pairs, 114,774 complete Word objects differ because their
traces differ; only four pronunciations, lexical objects and surface syllable
objects differ. Three whole written objects differ, and inspection of all four
examples confirms exactly three clean-spelling changes. Added evaluations are not
114,774 improved outputs. Same-seed pairs are descriptive, not a fixed-phone causal
experiment.

| Successful candidate records and proposal outcomes | Default policy | Active policy |
|---|---:|---:|
| Emitted words | 200,000 | 200,000 |
| Affixed records with proposal evidence | 57,343 | 57,431 |
| Planned bare records | 42,657 | 42,569 |
| Profile-disabled records | 100,000 | 100,000 |
| Configured rule evaluations | 2,294 | 2,262 |
| Condition not matched | 2,226 | 2,182 |
| Guarded replacement proposals | 68 | 80 |
| Accepted phone changes | 66 | 78 |
| Rejected for root repetition | 2 | 2 |

Each of the four enabled profile/policy combinations moves from one word with
adjacent identical coda phones per 50,000 draws to zero. Diversity, mean length and
morphology/syllable stratum counts are unchanged. Aggregate phoneme/trigram
divergence moves by small amounts in mixed directions; the complete values remain
in the comparison files. Distance from a reference corpus alone is not a quality
verdict.

## All four changed outputs, with complete traces

| Policy / profile / seed / zero-based draw | Control clean spelling | Candidate clean spelling |
|---|---|---|
| default / lexicon-default / 2089697863 / 835 | tugefgoussity | tugefgouscity |
| default / text-default / 2666001996 / 178 | lamcescity | lamcescity |
| active / lexicon-default / 2089697863 / 5864 | ewlkerssity | ewlkerscity |
| active / text-default / 4167471042 / 5089 | nessity | nescity |

The full extraction rereads all 200,000 affixed pairs, authenticates all 40
compressed input archives, and exactly matches the original Node census. Every
changed-output pair retains the complete original rows, WordTrace stages,
grapheme selections, structural decisions, repairs and morphology evidence in
`evidence/q11b-complete-trace-pairs-v1/*.json.gz`.

In each control trace, `ity-velar-softening` changes a root `/k/` phone to `/s/`
following an existing root `/s/`. In each candidate
`morphologyPreparation.prepared.evaluations`, the before coda is `[s,k]`, the
proposal is `[s,s]`, and the rejection reason is `repetition` with owners
`[root,root]`. No boundary repetition license is granted. The candidate preserves
the `/k/` identity and omits that rule's written half. The `lamcescity` pair shows
why spelling alone is insufficient: its written half makes no change while the
pronunciation changes from the duplicated coda to `/sk/`. The other structural
decisions and repairs remain in the complete witnesses for inspection.

## Original gates and compatibility limits

All 22 original commands finished: **6 pass, 16 fail**. `complete.json.passed`
means the operator finished and preserved its inputs/results; it does not mean
the original commands passed.

| Original command | Control | Candidate |
|---|---|---|
| Full unit suite | 18 failed, 1,065 passed, 4 skipped | 21 failed, 1,101 passed, 4 skipped |
| Diagnostic compilation | pass | pass |
| Quality suite | 1 failed, 11 passed; 73 five-consonant runs | 1 failed, 11 passed; 73 five-consonant runs |
| 2,000,000-word trigram diagnostic | pass | pass |
| 50,000-word trace diagnostic | pass | pass |
| Original native performance command, six repeats | six failures | six failures |
| Whole repository lint, recorded separately | 7 errors | same 7 errors |

Candidate-only unit failures include two assertion changes in custom fixtures
that narrow the positional phone pool, plus a 60-second grapheme-selection timeout.
The first fixture permits only `/aɪ/` nuclei but expects replacement with `/ɪ/`;
the other permits only `/k/` codas but expects `/s/`. The enabled guard rejects both
with reason `inventory`. The exact original fixture setup was extracted and
generated through public APIs; complete enabled and disabled traces are retained
in `evidence/q11b-custom-fixture-diagnostics-v2/`. Disabling the policy recovers the
original alternations. Adding a destination to a generation pool can change the
sampled root, so the altered-pool variant is diagnostic and is not treated as a
paired treatment result. The failed v1 diagnostic incorrectly assumed it would
necessarily retain the same root; its source, partial results and log are kept.

These assertion failures are a visible custom-configuration compatibility change,
not inherited passing tests. Review must resolve whether those fixtures should
express the legacy policy or permit the new destination explicitly. The original
test bodies, sample counts and assertions remain unchanged in this measured PR.
Other failures and timeouts are retained without blanket attribution to either
the environment or this treatment. Both lint logs have the same seven quote errors
in unchanged `src/config/language.test.ts`.

| Timing pair | Control reported words/sec | Candidate reported words/sec |
|---|---:|---:|
| 1 | 3,159 | 2,715 |
| 2 | 3,089 | 2,562 |
| 3 | 3,162 | 2,821 |
| 4 | 3,090 | 2,810 |
| 5 | 3,096 | 2,909 |
| 6 | 3,024 | 2,830 |

All twelve throughput observations are below the unchanged 4,500 words/sec floor;
their original variance gates pass. The candidate reports lower throughput in
every pair. Pair ordering, exact command/environment/source seals, unrounded test
values and all failure logs remain in `evidence/q11b-gates-v1/`. These comparisons
ran during the reserved interval without concurrent capture, replay or calibration
load. Earlier unit execution overlapped a small Q22 review check before timing;
that history is not a basis for discounting failures. This PR is not merge-ready.

## Evidence authentication and reproduction

`validation-index.json` binds every compact artifact's saved and original bytes,
the measured tracked source files and the raw-archive index. `retained-local-index.json`
binds all 80 complete raw Word/trace archives, which are retained locally rather
than adding several gigabytes to Git. A fresh clone can inspect compact evidence;
full reproduction requires the raw archives or a new run of the committed capture
and audit tools. The package verifier is an integrity and recorded-result check,
not a substitute for public generator replay or the independent structural oracle.

```sh
python3 -B evaluation/experiments/morphophonemic-cluster-legality/results/verify-validation.py \
  --repository-root .
# Add --archive-root PATH to authenticate all80 local raw archives.
```

The prospective measurement, capture binding and independent audit commands are
documented in `../measurement-tools.md`. Completed operator scripts, source seals,
original failed prototypes/preflights, interruption records, corrections, full
replays, independent counts, paired summaries, all original gate logs and complete
outlier traces are indexed here. No participant study has been run for this change.
