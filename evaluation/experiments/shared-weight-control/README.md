# Full Q08a legacy control for Q08b

The unchanged Q08a runtime at commit
`82b9152eb8610d9e99f8501e50d37e1463705f85` generated 200,000 traced development
words through the frozen #307 harness. All 20 shards were verified. Every complete
word matches the immutable original after removing **only** `trace.stressWeight`.
Every core summary field except the run ID, and every complete phoneme/trigram
distribution count, is identical. This control is the immediate reference for
the separately preregistered partial-quantity activation.

The observer processed every original/control record and checked all control
weight observations against root stage structure. Archived generator contents
match the independently verified Q08a original/control source bundles. The full
proof embeds its own observer sources, stream hashes and bounded complete
witnesses. It adds explicit aggregate and nuclear-segment reconciliation. Nine
archive-integrity fixtures, strict TypeScript and touched-file ESLint passed.

| Profile | Words | Root syllables / unspecified quantities | Operational heavy | Operational light | Bare final stress checked | Affixed final correspondence unavailable |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| lexicon-default | 50,000 | 97,665 | 56,369 | 41,296 | 15,048 | 34,952 |
| lexicon-bare | 50,000 | 123,213 | 75,084 | 48,129 | 50,000 | 0 |
| monosyllables-bare | 50,000 | 50,000 | 49,178 | 822 | 50,000 | 0 |
| text-default | 50,000 | 69,962 | 43,852 | 26,110 | 27,443 | 22,557 |

All 340,840 nuclear quantities remain unspecified; all analytical weight results
are unknown under the legacy policy. The operational coda/segment-count rule is
unchanged. The 200,000 historical traces lack quantity/decision evidence and are
counted as unavailable. Legacy stage snapshots omit stress marks, so affixed
final words are not used to invent earlier root stress. RNG was not archived by
the full harness; Q08a's separate 20,000-draw experiment checked exact RNG parity.

## Archived evidence

- `manifest.json`, `summary.json`, `sources.json.gz`, `distributions.json.gz`,
  `witnesses.json.gz`, and `review-samples.json.gz` are exact capture artifacts.
- `core-comparison.json.gz` contains the frozen-evaluator comparison.
- `full-parity-proof.json.gz` contains the all-record proof and observer sources.
  SHA-256: `c3a331d0dcab746b2eee0e921ef030b77cfb45d64d821f59afa0b2f377909f0f`.

The full raw `words/` shards remain in the ignored local archive
`memory/quality-runs/shared-weight-control`; they are pinned by the manifest but
not included in this compact repository package. Regenerate them from the
captured source/protocol when the local archive is unavailable. The immutable
original archive is `evaluation/quality/baselines/2026-09-26-development-standalone`
in the baseline checkout. Do not use the compact package as though it contained
raw words.

Control manifest digest:
`39864d578b01fc6f78e35674c10d23e86e070edd0f976504cbc65283b1548410`.
Control generator source digest:
`af85f75b5777eaef3eb8cfae93ac26bdb0c6e0cd3c243eea1f1039c095400799`.
Original manifest digest:
`a23414ae34d3611c4367d07ad677afb99e7d89a4be7886e6ed95018c2ff3f3da`.
Full-control observer digest:
`5ba5cbf195a800f4028bad595508e0e6c1c87d08e2265402a8e1dfe65aba8d86`.

From the Q08b worktree, verify the full archive and run the observer without
changing either runtime:

```sh
node --import tsx evaluation/quality/cli.ts verify --run memory/quality-runs/shared-weight-control
node --import tsx evaluation/quality/probes/syllable-quantity/control.ts ORIGINAL_ARCHIVE memory/quality-runs/shared-weight-control /tmp/shared-weight-control-proof.json
```

Reports refuse overwrites. This evidence proves the shared-analysis foundation
preserves these outputs; it makes no claim of improved English stress quality.

The verifier uses the frozen #307 harness helpers. If that independent PR is not
present in a checkout, restore the `evaluator` file entries (their recorded `path`
and `content`) from this control's `sources.json.gz` before running the commands.
Do not substitute an evolving evaluator; its exact source bytes are archived.
