# Q08a: shared weight with exact legacy parity

The preregistered four-profile, five-stream comparison passed all 20,000 scheduled
draws. Each checkout made 40,000 public-API calls with tracing off and on. Complete
words, all pre-existing trace fields, cumulative RNG calls at every draw, and the
next RNG value match exactly. Only the new `stressWeight` observation is excluded
from legacy trace comparison. This establishes compatibility on the registered
sample, not improved human wordlikeness or English quantity accuracy.

The original is commit `8e9ceb2fb1d8a7a6d4a6d4239e501ccaaed73c1c`. Its local
checkout was verified against that ref before capture. Runtime and evaluator
fingerprints were checked before and after both captures; the reports pin Node
v24.11.1, the schedule, every source file, and the complete evaluator including
its preregistration. Reports were created exclusively and gzip files use a
deterministic header.

## Observations

Each row contains five distinct seeded streams of 1,000 words. Root-syllable weight
comes from the input to `applyStress`, before nucleus repair and morphology.

| Profile | Words | Unspecified nuclear quantities | Operational heavy | Operational light | Bare final stress corroborated | Affixed final correspondence unavailable |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| lexicon-default | 5,000 | 9,736 | 5,718 | 4,018 | 1,531 | 3,469 |
| lexicon-bare | 5,000 | 12,232 | 7,479 | 4,753 | 5,000 | 0 |
| monosyllables-bare | 5,000 | 5,000 | 4,923 | 77 | 5,000 | 0 |
| text-default | 5,000 | 7,013 | 4,360 | 2,653 | 2,680 | 2,320 |
| Total | 20,000 | 33,981 | 22,480 | 11,501 | 14,211 | 5,789 |

All 33,981 candidate nuclei retain unspecified quantity. Every analytical result
is unknown under the legacy policy; every operational decision matches the
original coda/segment-count predicate. The historical 20,000 traces lack this
decision field and are counted as unavailable, not as having known quantities.
Candidate traces recorded 12,506 secondary candidates and 3,543 applied secondary
decisions, with unchanged configured 70/30 candidate weights.

Legacy stage snapshots contain phones but omit stress marks. The observer
therefore checks weight coordinates against the archived root stage, and checks
selected primary/applied secondary marks independently only in bare final words.
It does not reconstruct pre-morphology stress from affixed final output. Complete
bounded witnesses and per-stream counts are retained in the reports.

## Files and reproducibility

`original.json.gz` and `candidate.json.gz` contain each capture's stream hashes,
provenance, observations and complete witnesses. `comparison.json.gz` records
the successful exact comparison and both sets of observations. The three source
bundles contain UTF-8 file contents and hashes for the runtime and evaluator.
Every bundled file was checked against the corresponding frozen report hash
before compression. The original bundle contains 45 files, the candidate 46,
and the evaluator 5; tests are available as normal repository source rather than
being included in runtime fingerprints.

| Archive | SHA-256 |
| --- | --- |
| original.json.gz | `b17ad2e58fe2b40de9976d798ab05ea34d5720bd70a137104955fa99dce20c6e` |
| candidate.json.gz | `f29606207391e9159a4181563afded592bfc20acbc6f5aac6b48ee14d58b186f` |
| comparison.json.gz | `3c51e05b476b48c5b2806fe036430990a1bad129954f23e3c25f17cda644d2d4` |
| original-source.json.gz | `e1b50ce704fa47a6cfabaab29b5082f915030c647869ed850e0d156167ec7ec3` |
| candidate-source.json.gz | `3d51a5f669ee6b32a3e61cc015948af8ac27e4bf5815a67208aba4d58c04602e` |
| evaluator-source.json.gz | `1ec6067e6707314d266a4e007955b44ba4a1d7c9840ad78a2b0af56aa3095c27` |

To inspect an archive, decompress it with `gzip -dc`. Source bundle `files`
entries specify `path`, `sha256`, and `content`; verify the UTF-8 content hash
before writing it into an empty directory. Runtime paths are relative to a
checkout; evaluator paths are relative to
`evaluation/quality/probes/syllable-weight`. Restore the original into a checkout
of the pinned ref, install the locked dependencies, and use the commands in the
[frozen preregistration](../../quality/probes/syllable-weight/README.md). The
capture refuses changed original bytes, additional runtime files, and overwritten
reports; comparison requires matching evaluator and schedule fingerprints.

Runtime digest: original
`61d169cedfe588cc461ddb992dc6b8d2e0382578fe7c9750f2fb334438097eaa`,
candidate `9c38b5bd7d6daf8ada680593eab173d25cf8d1bf7dca51146ecb53958cc76050`.
Evaluator digest:
`13e3121ee1e098aee3870525f978ad76b3b50ed7b32fbb07f672b8c5cfd63c86`.

## Validation and limits

- Full unit suite: 420 passed, one existing skip; new weight fixtures: 23 passed.
- Observer integrity fixtures: 6 passed; source and observer typechecks and
  touched-file ESLint passed.
- Quality suite: 12 passed with unchanged gates. Its initial report-write attempt
  was blocked by filesystem permissions; the authorized rerun passed completely.
- Isolated performance: 7,541 words/second, median batch variance 1.33×; both
  existing checks passed.

The opt-in model is tested with declared custom quantities, including atomic and
multi-element nuclei, partial knowledge, coda policy, tense disagreement,
malformed configuration, all primary strategies and controlled secondary
selection rates. English inventory quantities, vowel identities, rhythmic stress,
constraint weights and the current WSP objective remain unchanged. Activating an
English partial quantity model requires a separate preregistered comparison.
