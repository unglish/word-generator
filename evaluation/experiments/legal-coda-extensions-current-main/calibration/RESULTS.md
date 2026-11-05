# PR #313: calibration investigation

## Decision

Keep implementation `075df460a93416a40edc1e0ae90d2ae4020b239a` unchanged and leave the PR draft. Do not lower /z/ weights or loosen gates on this evidence. The shift is consistent across seeds and concentrated in root codas, but the trace-supported mechanism preserves legitimate phones. This investigation did not establish a new legality defect or a defensible replacement weight. Aggregate CMU alignment remains a real engineering target; failing it is not dismissed as noise. A separate, explicitly justified distribution tradeoff or better-matched reference/model remains necessary before merge.

The earlier statement that /z/ was the sole blocker was incomplete: the unit test stops at its first failed assertion. Calibration also exposes /n/'s absolute-gap failure at seed 42. Both are reported below.

## Protocol fixed before runs

`protocol.json`, SHA-256 `69d0b5993e1199252a769cc48d828bc8b8f534bb504007d49eb104f29f845df7`.
Baseline current main: `43ef38ae029f4359f323d1c19955b3d44a10a6f7`.
Candidate: `075df460a93416a40edc1e0ae90d2ae4020b239a`.
Same Node v24.22.1 environment and installed lockfile dependencies as the prior renewal.

Run unchanged `npm run calibrate:phonemes -- --count 10 --jobs 3 --output <new-file>` on each revision: ten fixed, evenly spaced Mulberry32 streams, 200,000 words per stream, lexicon, morphology false, existing normalization/reference/metric code. Four million generated words total. The existing tool verifies consumed RNG intervals do not overlap within either arm. Same seed schedules compare distributions; changed RNG consumption means words at equal indices are not matched lexical items. Nonoverlap does not prove statistical independence.

The trace operator uses public `generateWord`, `trace:true`, the first 10,000 words of each of those ten streams with morphology false, and another 10,000 with default morphology. That is 100,000 words per profile per arm, 400,000 traced outputs total. Bare trace samples are prefixes of the calibration streams, not independent new replicates. Stage accounting and final normalized/raw /z/ totals reconcile for every run. Bounded complete witnesses are retained, not every sampled Word.

Ten separate confirmation stream starts were reserved in advance and checked against consumed development intervals. They remain unused: no weight or model change was proposed. No held-out results were used for tuning.

## Gate results

| Measurement | Current main | PR #313 | Existing limit |
|---|---:|---:|---:|
| Worst common-phone ratio, min–max across ten streams | 1.051167–1.059438 | 1.073565–1.087667 | <=1.066 |
| Worst ratio, mean | 1.056021 | 1.081087 | — |
| Streams failing overrepresentation | 0/10 | 10/10, all /z/ | 0 |
| Total variation, min–max percentage points | 1.521362–1.629587 | 1.482601–1.605698 | <=1.78 |
| Largest absolute gap, min–max percentage points | 0.303885–0.384073 | 0.305541–0.390567 | <=0.39 |
| Streams failing absolute gap | 0/10 | 1/10, seed42 /n/ | 0 |

Main's worst overrepresented phone is /k/ in six streams and /z/ in four. Candidate's is /z/ in every stream. Minimum-representation, total-variation, generated-only mass, missing-CMU-phoneme and normalization-loss requirements pass in both arms. At seed42 the candidate's /n/ ratio is 0.9447916664, implying a 0.3905670565 percentage-point deficit against the normalized reference. This is an additional failure even though the unit test exits earlier at /z/.

The calibration script's proposed bounds are diagnostic output, not permission to adopt them. In particular, its proposed overrepresentation ceiling of 1.101 for the candidate was NOT applied. Even unchanged main's worst-plus-three-SD proposals can exceed current limits in a new ten-stream sample; the proposal algorithm is not itself a pass/fail justification.

## Trace accounting: bare roots

Counts over 100,000 words per arm:

| Quantity | Main | Candidate |
|---|---:|---:|
| All final phones | 634,895 | 635,009 |
| /z/ after generateSyllables | 17,520 | 17,803 |
| /z/ removed by repairClusterShape | 325 | 0 |
| Final /z/ phones | 17,195 | 17,803 |
| Final onset /z/ | 4,376 | 4,379 |
| Final coda /z/, nonfinal syllables | 7,769 | 7,881 |
| Final coda /z/, final syllables | 5,050 | 5,543 |

The final count difference is exactly 608: 283 more /z/ already present in selected generateSyllables snapshots, plus 325 fewer deletions afterward. This is an accounting identity across different sampled words, not a causal decomposition of matched proposals. It distinguishes preservation from the changed selected-root/RNG mixture. Of the final increase, 605 phones are in codas and three in onsets. Candidate selected-word traces include 436 rejected final-s proposals whose original coda contains /z/; baseline rejection instrumentation does not exist and must not be interpreted as zero proposals.

The prior renewal already retained the direct mechanism: baseline `nadjers`, lexicon-bare seed2380207674 draw335, has finalS and repairClusterShape /zs/ -> /s/. Candidate `jachtres`, same profile/seed draw311 (a different word), records `codaExtensionRejected`, candidate /s/, coda [/z/], reason voicing, and retains /z/ across the shape repair. The public-API /z/ preservation fixture independently specifies this behavior. New bounded witnesses per seed and stage are in the trace artifacts.

## Morphology

The failing gate explicitly disables morphology. It cannot be explained by plural/other suffix /z/.

In the default-morphology diagnostic samples, main has 30,797 final /z/ phones among 793,524 phones; candidate has 31,279 among 794,990. Morphology assembly gains 13,414 /z/ phones on main and 13,400 on candidate. Main loses 303 root /z/ phones in shape repair; candidate loses none. Root-stage totals are 17,686 and 17,879. Onset /z/ totals are 4,452 and 4,443. These observations support the root-coda preservation mechanism rather than growth in morphology-added /z/. Assembly gains are stage differences, not an alignment proof assigning every final phone to an affix.

## Why no weight correction

The /z/ inventory already has distinct onset and coda weights (55 and 92). The evidence localizes the shift but does not independently establish that 92 should become a particular lower value. Root selection depends on spelling and length acceptance, so dividing a weight by the observed excess would not be a validated correction. No candidate weight sweep was run.

The active CMU map is a whole-lexicon vector of rounded proportions, with unresolved historical source population/event denominator documented in docs/cmu-matched-reference.md. It is not a matched bare-root reference and has no per-position target. Existing derived onset/rime tables use a named algorithmic syllabification and a different explicit population; they cannot silently replace the active gate or justify comparing generator coda labels as if boundaries were identical. No pinned raw dictionary was present in the inspected data locations, and no reference was downloaded or changed. This limits causal/linguistic claims, not the obligation to respect the current merge gate.

The repository's previous November calibration also identified /z/ near the ceiling and explicitly called for review if a later change pushed it further. That review now has multi-stream and trace evidence. It does not by itself authorize a threshold override.

## Reproduction and archive

The implementation branch is unchanged and clean. No new runtime, test, reference, weight, threshold or golden-output changes were made during this investigation. Existing implementation validation remains as recorded in archive/pr-313. The unchanged calibration tooling was run successfully on both revisions; all new measurements and trace reconciliation are archived here.

Use the recorded revisions, install the lockfile dependencies, and run the calibration command above in each checkout. Run `node --import tsx trace.mjs <checkout> <fresh-output>` from a directory where tsx resolves. The operator currently names `/tmp/pr313-calibration/protocol.json`; relocate that path explicitly for another machine. Full trace files are gzip-compressed in the archive. Log paths identify this run, not portable defaults. Retain protocol and input hashes when reproducing.

This evidence-only commit is tagged `archive/pr-313-calibration`; it is not on the proposed main history. Existing archive/pr-313 and archive/pr-313-original tags are unchanged.
