# PR #313 on current main

Baseline: `43ef38ae029f4359f323d1c19955b3d44a10a6f7`.
Implementation: `075df460` (full SHA in `source-match.json`). Node v24.22.1, macOS arm64.

Optional final /s/ and nasal-stop extensions are validated before mutation. Invalid proposals preserve the existing root coda and record `codaExtensionRejected`; exact attestation allows /kst+s/ -> /ksts/. The final implementation preserves normal construction and repair behavior. With extensions disabled, 10,000 full traced public-API outputs and next RNG values match main across text/lexicon and morphology off/on. The original broader implementation changed normal construction; it was measured as an ablation but not retained. No weights, thresholds, gate switches, final-affix ownership, or terminal-y repairs were changed.

## Validation and blocker

- 25 focused public-API tests pass: discussion shapes /ns/, /ks/, /kts/+ly, /rks/+tion with default morphology and root-only budgeting; licensed /ksts/; inventory/position/shape constraints; /d/ and /z/ preservation; deterministic tracing; 20,000 bare and 30,000 default-morphology text words.
- Strict `NGRAM_TRIGRAM_UNDERREP_BLOCKING=1 npm run check`: lint and all typechecks pass; unit suite 802 passed, 1 skipped, 1 failed. The additional /z/ preservation fixture was added afterward; the final focused 25 tests, lint and typechecks were rerun successfully. Review tests were run separately because check stops on the phoneme failure: 260 passed. Build and diagnostics (6 tests) pass.
- Sole code/quality blocker: bare lexicon seed 42, 200,000 words, /z/ overrepresentation 1.0739840424x exceeds unchanged 1.066x maximum. Main passes (worst /k/ 1.059x). Initial broader port also failed /z/ (1.0681437636x) and a rare fallback-coverage assertion; narrowing scope removed the latter, not the phoneme failure. No gate was weakened and no unrelated weight was tuned.
- Historical `ugh` failure resolved on this baseline without tuning: current main 13 occurrences / 1,441,242 trigrams = 0.0121323369x CMU; final candidate 16 / 1,443,870 = 0.0149049289x, both above 0.0062x. Full traced seed-42 replays retain every witness. Main already makes the trigram underrepresentation check report-only by default; validation explicitly enabled blocking.
- Isolated performance suite: main 6,424 words/s and 1.24x median batch variance; candidate 5,888 words/s and 1.20x. Both exceed 4,500 words/s and stay below 3x variance. These are single isolated suite runs, not a statistically established throughput difference.
- Golden output reviewed and regenerated: 125/160 entries change, with RNG draw totals changing in all four cases. Seeded outputs are intentionally version-dependent; determinism and trace parity remain tested.

## Frozen development comparison

Current harness, unchanged protocol, four profiles, five fixed seeds per profile, 10,000 draws per seed, trace:true: 200,000 words per arm. Summaries/manifests and shard hashes were verified by the unchanged historical supplementary coda probe; its final duplicate counts agree with the frozen evaluator. Equal draw indices are not paired words. Counts describe selected-word traces, not all internal attempts.

| Profile (50,000 words each) | Main final duplicate-coda words | Candidate |
|---|---:|---:|
| Lexicon, default morphology | 267 | 5 |
| Lexicon, bare | 283 | 0 |
| Monosyllables, bare | 5,358 | 0 |
| Text, default morphology | 239 | 10 |

Root-stage adjacent duplicate pairs: 6,137 -> 0; all baseline pairs coincide with finalS at the same syllable. Candidate's 15 final duplicate pairs first appear at assembleMorphology. Retained examples include `milyonossity` (lexicon seed101601885 draw812) and `dislessity` (text seed4167471042 draw2147), both tracing `ity-velar-softening` /k/ -> /s/. This is outside optional extension legality and does not establish universal final-word coda legality.

Licensed /ksts/ occurrences: 103 -> 106; /sts/ 129 -> 134; /sps/ 133 -> 145; /sks/ 630 -> 689. Accepted finalS events: 11,281 -> 3,321; nasalStopExtension: 4,285 -> 3,572. Candidate rejections: final-s repetition 3,020; voicing 1,307; attestation 893; nasal-stop attestation 1,807. Historical rejected-proposal instrumentation is absent, not zero.

The /z/ shift has a concrete trace mechanism. Main bare-lexicon seed2380207674 draw335 (`nadjers`) has finalS then repairClusterShape /zs/ -> /s/. Candidate draw311 (`jachtres`, a different word) rejects /z+s/ for voicing and keeps /z/ across repairClusterShape. Across the frozen bare-lexicon profile, z-deleting shape repairs fall 157 -> 0; candidate records 225 rejected /s/ proposals after a coda containing /z/. Final raw /z/ phones are 8,414/317,595 -> 8,829/317,513. These traces establish a mechanism, not a matched-word decomposition of the entire distribution shift. The explicit /z/ fixture separately tests preservation.

Side effects are mixed/adverse, not an overall quality claim. Trigram Jensen-Shannon divergence increases in all profiles: lexicon-default +0.001505 bits, lexicon-bare +0.000160, monosyllables-bare +0.009282, text-default +0.001771. Monosyllable unique spellings fall 16,785 -> 16,353; text 39,375 -> 39,324. Lexicon uniqueness rises slightly. Stress-clash hits/eligible: lexicon-default 5,384/13,355 -> 5,279/13,385; bare 9,493/23,146 -> 9,362/23,238; text 6,180/15,316 -> 6,226/15,313. Full distributions, morphology strata and per-stream values are in comparison/comparison.json and final-probe.json.gz. No human-preference claim is made.

## Packet and reproduction

This compact archive retains all non-word capture artifacts, full bounded coda witnesses, all rare-ugh witnesses, voiced-coda witnesses, comparisons, probe operators, logs and source correspondence. The three raw 200,000-word shard sets are retained locally under /tmp/pr313-evidence and are deliberately not duplicated into Git. Their hashes remain in the manifests; this compact archive alone cannot run a full shard-integrity verification. Regenerate the two final arms with the committed frozen harness and sources before rerunning the probe. Broad-port provenance is also retained to explain the scope decision; its results are not final-candidate measurements.

Reproduce final captures using `npm run quality:pr -- --base 43ef38ae --out <fresh-directory>` from implementation commit 075df460. Run `node <absolute-real-path>/probes/analyze.mjs <baseline> <candidate> <new-output.json>` afterward (the historical operator's main guard requires a canonical script path). The ugh and parity operators use public APIs; local paths in those supplementary scripts/logs describe this run and must be adjusted for another checkout. All 55 captured generator files were checked byte-for-byte against the implementation commit.

The old PR head and its original evidence are preserved in annotated tag `archive/pr-313-original`. The current compact packet is in annotated tag `archive/pr-313`, on an evidence-only child of the implementation. Neither packet is part of the proposed main history. PR remains draft; do not merge with the phoneme gate failing.
