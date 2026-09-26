# Opt-in conditional root stress: measured runtime outcomes

This change exposes the separately proved [#334](https://github.com/unglish/word-generator/pull/334) law through an **opt-in** generator policy. The English default stays legacy. With `rootPattern: {type: "count-conditioned", lambda: Math.log(2)}`, it preserves the actual primary position and the detached legacy proposal's secondary count K, then samples and applies one complete root pattern. The penalty is an experimental modeling choice, not a fitted English grammar.

The measurements are mixed: adjacency decreases on the targeted root diagnostic, but some lapse and spelling diagnostics worsen, and throughput falls. They do not establish improved human judgments or justify default adoption.

## Review order

1. Read the [runtime contract](../../../../docs/conditional-root-stress-runtime.md), [registered protocol](../protocol-v1.json), and [implementation notes](../implementation-notes-v1.md). Source entry points are [the dispatcher](../../../../src/core/pronounce.ts), [v2 collection/application](../../../../src/core/conditional-stress-pattern.ts), and [resolved morphology hooks](../../../../src/core/morphology/attach.ts).
2. Read the [observer contract](../observer-contract-v1.md), [capture boundary](../capture-contract-v1.md), [Node replay](../observe.mjs), and [independent recount](../recount-runtime.py). The pure law and sampler proof remain in #334; this PR integrates them with the generator.
3. Inspect [the common comparison](common-comparison/comparison.md), [the supplement overview](supplement/q09-runtime-supplement-overview-v2.json), the full supplement, and the timing audit. [package-index.json](package-index.json) maps every evidence transport to its original bytes and execution path.

Earlier implementation/protocol paragraphs saying that execution has not yet happened remain unchanged as historical preregistration. This companion records the later reviewed executions.

## What the implementation changes

Omitted policy, explicit legacy, and supported lambda zero delegate to the old executor. The positive policy consumes additional draws and can change every later word in a stream. It changes root secondary placement; morphology, primary stress, reduction, spelling and rejection behavior are not redesigned here. Unsupported inputs fail explicitly within the pure law's declared numerical domain.

Positive activation emits `stressPattern.version === 2`: six actual domains, a separate detached proposal namespace, ascending applied assignments, and real resolved-affix coordinate/origin chains. It omits the old `stressWeight` property whose `secondary.applied` meaning would be incorrect for proposal events. V1-only observers must reject active traces. Missing or replaced phases do not receive invented labels or zero-defect credit. Traces and counts describe the retained attempt, not all rejected histories.

## Registered development evidence

The immediate control is exact #334, commit `9e772f257def91b4370462e17156f71b8f54575d`. Each variant has 200,000 returned words: four profiles, five distinct seeded streams per profile, 10,000 words per stream. The sealed validation cohort was not inspected. Control and active words at the same coordinates are not causal pairs; changed RNG consumption and retained-attempt selection can change output composition.

Within the **same active retained attempts**, the detached proposal has 29,760 adjacent marked pairs and the applied pattern has 28,194. Both contain 37,783 secondary marks. Adjacency falls in 3,169 attempts, rises in 1,603, and is unchanged in 195,228; the net decrease is 1,566. A stochastic penalty is not a per-word no-clash rule.

The separate control/active samples show:

| Diagnostic | #334 control | Active ln(2) |
|---|---:|---:|
| Root adjacent marked pairs, all 200,000 words | 29,787 | 28,194 |
| Final lexical adjacent marked pairs, all 200,000 words | 47,730 | 46,180 |
| Bare lexicon words with an unmarked run of at least three syllables, 50,000 words | 1,771 | 1,822 |
| Bare lexicon such runs (a word can contain more than one) | 1,771 | 1,823 |

Final lexical pair counts by profile are 21,743→21,125 (lexicon-default), 14,661→13,787 (lexicon-bare), 0→0 (forced monosyllables), and 11,326→11,268 (text-default). These are pair counts, not percentages of words.

Trigram Jensen–Shannon divergence against the unchanged historical reference increases in every non-monosyllable profile; lower distance is only a descriptive diagnostic, not a human-quality score:

| Profile | Control JSD, bits | Active JSD, bits | Change |
|---|---:|---:|---:|
| lexicon-default | 0.157835898 | 0.159061418 | +0.001225520 |
| lexicon-bare | 0.183540938 | 0.185175566 | +0.001634628 |
| monosyllables-bare | 0.506435860 | 0.506435860 | 0 |
| text-default | 0.178858450 | 0.181547072 | +0.002688623 |

Disyllabic primary/secondary clashes persist: 8,757/20,829→8,764/20,887 in lexicon-default, 9,357/22,960→9,422/22,951 in lexicon-bare, and 7,532/17,038→7,679/17,266 in text-default. A two-syllable root with one primary and K=1 has no nonadjacent alternative. This policy also does not optimize final-word patterns after affixation.

The common comparison includes both the historical original baseline and this immediate control; improvements inherited from earlier work must not be credited to this PR. All diagnostics, denominators and stream ranges remain available. Stream ranges are descriptive, not confidence intervals.

## What the proofs cover

- Exact delegation passed 160,000 generation calls over 20,000 coordinates: control, candidate omitted, explicit legacy, and supported zero, each traced/untraced. Complete own keys, words, legacy traces and RNG counts match; 160 separate next-value probes are accounted separately.
- The Node observer replays positive proposal, sampling, actual application and morphology provenance across all active records. It is an integration replay using the production pure law, not an independent reimplementation of that law.
- The independent Python proof recounts 200,000 active words/20 streams and checks all 788 input/K contexts: 3,112 pattern queries, 1,802 positive and 1,310 exact zero. Its mass/support proof uses literal histories and exact/Decimal arithmetic. It does not independently replay all sampler and morphology events.
- The full supplement retains all named morphology/length/context strata, continuous-law expectations, and deterministic witnesses: 7,384 control witnesses and 14,224 active witnesses. The smaller overview contains only total/profile summaries and explicitly points to the full report. No group or witness was removed from the full transport.

Continuous-law expectations are standardized to retained contexts. Neither those expectations nor retained frequencies are a fresh finite-machine sampler-frequency proof or an unbiased estimate before rejection. Unknown quantity, absent historical data and unavailable denominators remain explicit. The underlying numerical/support limitations remain those of #334.

## Performance: gates pass, throughput regresses

The corrected fixed matrix has six adjacent control/active pairs per trace mode, 24 fresh processes, 314,400 generated words/calls. Each complete slot has 13,100 public `generateWord` calls, 3,052 logical workload operations and two explicit public RNG constructions. All 24 slots completed. The 12 untraced slots passed the unchanged throughput, variance and deadline checks; trace-on is descriptive and has no invented legacy speed gate.

| Mode | Median active/control throughput | Six-pair range | Median throughput decrease |
|---|---:|---:|---:|
| Trace off | 0.829160204 | 0.821800473–0.845781781 | 17.1% |
| Trace on | 0.519189168 | 0.508904506–0.534573097 | 48.1% |

The unchanged default-legacy performance suite separately passed at 6,862 words/sec, with median batch variance 1.37×. Passing gates does not erase the configured active slowdown. These are local, nonhermetic configured-factory measurements, not a general hardware performance guarantee; factory construction is outside the times.

All 24 slots of the first timing matrix failed before any word because the external benchmark called a nonexistent factory `generateWords`. Those failed reports, ledger, tools and the erroneous synthetic factory are retained. The corrected version uses one public `createSeededRng` per local batch and the real factory `generateWord`, with exact partial-call accounting. Its small real smoke checks both factories/trace modes and confirms the four matching control batches equal public `generateWords` byte-for-byte. The invalid first matrix contributes no timing observations. No seeds, workload sizes or thresholds changed.

## Validation and remaining failures

The final full suite reports **555 passed, 1 skipped, 3 failures**. These are the three registered failures already present in #334: the `ugh` ratio 0.004901057711283718 below 0.0062; the old seed-167 expectation `immamsed` versus `inlodsed`; and 29 selected `im` forms versus the old `>30` assertion. They remain failures. No gate or expectation was weakened. The quality suite passed 12/12, the 38 new runtime fixtures passed, and recorded type/lint and observer/adapter checks passed. The corrected external timing preparation passed 34 synthetic tests and the 84-word interface smoke. Exact logs, including earlier failed preparation runs, are packaged.

The supplement's first execution failed during manifest verification, before observing a word, because its Python canonicalizer did not match JavaScript's array-index key ordering. The original sources/authority/failure are retained alongside the reviewed serializer correction; endpoint definitions, archived words and tolerances did not change.

Remaining hypotheses include secondary-count priors, final-word refooting, primary-window/weight modeling, quantity and dialect expansion, reduction, lexical classes/compounds, and perceived rhythm. This opt-in does not settle them or establish a dialect inventory.

## Published transports and reproduction limits

The package includes exact raw/scored **top-level** manifests, source/provenance bundles, summary/distribution/witness/review artifacts, the common comparison, delegation and independent proofs, all supplement source/authority/history, timing tools and both raw outcome sets, plus check logs. A separate frozen source bundle embeds 147 source entries; the 77 unchanged published law/proof files remain in the base commit and were hash-verified.

The 400,000 raw word records are not bundled here. Their compressed shards remain at the recorded archive paths and are pinned in the included manifests. Scored directories refer to those same draws. The top-level directories alone are deliberately incomplete `readRun` inputs: restore the exact manifest-listed word shards, or regenerate them from the archived source/config/engine/protocol and check their hashes, before rerunning whole-corpus analysis. Do not mistake the included summary for an independently readable complete corpus archive.

Historical tools retain their original absolute execution paths and engine identity. `package-index.json` maps these to published transports; executing the unchanged tools requires materializing that path layout and the pinned dependencies/engine. A portable rewrite would require separate provenance rather than silently editing the frozen sources. Installed package-lock identity is not a registry-authenticity proof or a hermetic host claim.

The full report is losslessly encoded as `supplement/full-report.json.xz` using XZ/LZMA preset 9 with CRC64. Decoding produces exactly 1,507,751,990 bytes with SHA-256 `6a51e736296f436e9b55b0c97d14680b332ca7609a32b21941b5dda79e84e8dc`; the XZ transport is 20,039,908 bytes with SHA-256 `dd2c5cf03014f42dba7f13130547570d04a22c2b8673e12a75d261de070d3c08`. The larger 99,506,107-byte gzip stays external as a transport comparison; only XZ is selected for the full report in this package. Decode from this directory with Python's standard library:

```sh
python3 - <<'PY'
import lzma, shutil
with lzma.open('supplement/full-report.json.xz', 'rb') as source:
    with open('full-report.json', 'xb') as target:
        shutil.copyfileobj(source, target, 1024 * 1024)
PY
```

Other `.gz` files use gzip; `timing/raw-outcomes-v1.tar.gz` and `v2.tar.gz` contain the exact original per-slot reports/stdout/stderr. The index records each member's original path, size and hash. Compression is transport only; no report serialization, witness content, measurements or frozen source bytes were rewritten.
