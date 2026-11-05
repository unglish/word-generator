# PR 313: reviewed phoneme-gate recalibration

This packet records an explicitly approved acceptance-policy change, not a generator weight adjustment. Runtime generation is identical to implementation 075df460a93416a40edc1e0ae90d2ae4020b239a. Baseline is 43ef38ae029f4359f323d1c19955b3d44a10a6f7. Earlier correctness, rare-ugh, quality and performance evidence remains in archive/pr-313; the initial 10-stream investigation and /z/ traces remain in archive/pr-313-calibration. These immutable archives are complementary.

## Protocol and decision

protocol.json was frozen before the 30-stream development measurements. Each arm generated 30 disjoint RNG streams of 200,000 bare lexicon words: six million words per arm. The candidate's /z/ ratio exceeds the old 1.066 ceiling in all 30; /n/ absolute gap exceeds 0.39 percentage points in four. Main passes both in all 30. This is not resolved by changing a seed or attributing the shift to random noise.

The accepted change retains every global limit and adds exactly two phone-specific bounds: /z/ maximum ratio 1.105, /n/ maximum absolute gap 0.471 percentage points. Each is the candidate development maximum plus three sample standard deviations, rounded outward to 0.001, following the existing calibration method. This margin is an engineering policy, not a false-failure probability guarantee. No CMU reference, generator weight, minimum representation, total variation, inventory or normalization requirement changes.

The exact proposal was frozen in frozen-proposal.json before evaluating the ten previously reserved streams. Its SHA256 is aafc52c97f76d1bb29e404afbffb7716c1d08fe5984fde051c9204db825dc5d7. The confirmation result did not change the proposal. All ten confirmation streams (two million words) pass every applicable per-phone and global limit. Their /z/ ratios span 1.07430–1.08869 and /n/ gaps 0.33234–0.39915 percentage points. These streams have disjoint actual RNG state spans from all 30 candidate development streams; disjointness is not a proof of statistical independence.

The development-policy-verification run replays the same six million candidate words using the expanded reporter to retain every common phone. It is not additional independent evidence. verify.py checks exact original metrics/draw parity, every applicable limit, disjoint RNG spans, the frozen proposal hash, and trace accounting.

## Independent /n/ investigation

trace-n.mjs uses the public generateWord API with trace:true, capturing 100,000 bare words per arm across ten streams. These diagnostic streams are prefixes of the earlier calibration investigation, not extra independent replicates. Main has 42,808 /n/ phones at both selected generateSyllables and final stages; candidate has 42,342 at both. Total final phones are 634,895 and 635,009. Main /n/ onset/coda counts are 12,199/30,609; candidate 12,113/30,229. No selected /n/ phones are lost or gained in later recorded stages. Candidate rejection events after codas containing /n/ include repetition 51, attestation 35 and voicing 55. These observations locate the deficit in selected-root composition; they do not assign a complete counterfactual causal effect to individual proposals.

The earlier /z/ trace study accounts for the final increase of 608 bare /z/ phones as 283 more in selected roots and 325 fewer later repair deletions. Preserving a legal root before rejecting an invalid optional extension is the correctness benefit. The /n/ exception separately accepts a secondary distribution cost of changed root eligibility. Neither exception claims an ideal English distribution. The unchanged aggregate total-variation and minimum-representation gates remain additional constraints.

## Scope and caveats

This policy does not erase the original frozen quality comparison's adverse trigram-divergence changes in all four profiles or the loss of monosyllable diversity. It accepts a documented correctness/distribution tradeoff. Final morphology can still introduce duplicate codas; final spelling/affix ownership and terminal-y work remain out of scope. The historical rare-ugh failure does not reproduce on the actual baseline or scoped fix with blocking explicitly enabled.

All rows in calibration JSON are common phones under the unchanged minCommonBaselinePct. Missing phones, generated-only mass and normalization losses remain separately gated. The new gate tests verify that /z/'s exception cannot hide another phone's ratio failure, /n/'s gap exception does not relax other phones, and unspecified bounds still apply to each reviewed phone.

## Reproduction

Use Node v24.22.1 and npm dependencies from the implementation checkout. Run `npm run calibrate:phonemes -- --count 30 --jobs 3 --output <output.json>` for development. Run the same command with `--seeds` followed by the comma-separated confirmationSeeds in protocol.json for confirmation. The baseline development report uses the preexisting calibrator from main; the final candidate reporter adds common-phone rows and violations without changing generation. The original candidate-development report also uses that earlier reporter. `python3 verify.py` verifies this packet, including .json.gz files if compressed. `trace-n.mjs` accepts the checkout path and output path; inspect its invocation before reproducing. Local absolute paths in logs are provenance, not portable dependencies.

Raw generated word corpora are not included. Calibration retains exact per-stream sufficient counts/metrics and RNG draw totals, while trace reports retain stage aggregates and bounded witnesses. Existing original quality captures and their hashes are described in archive/pr-313.

## Final validation

Implementation/policy commit: f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b. Runtime generator sources remain unchanged from 075df460.

- `NGRAM_TRIGRAM_UNDERREP_BLOCKING=1 npm run check`: passes lint, typechecks, 809 unit tests (one existing skip), and 260 review tests. The unchanged rare-ugh threshold passes at 0.0149x.
- `npm run build`: passes. `npm run test:diagnostics`: six tests pass.
- `npm run test:perf`: two tests pass in an isolated run; 5,603 words/sec against 4,500 floor; median batch variance 1.21x against 3x bound. This single run is not an estimate of a statistically significant change from earlier runs. No runtime generation changed during recalibration.
- Gate-policy and calibration focused tests: ten pass. Targeted calibrator typecheck passes with the project's ESNext/node resolution.
- `python3 verify.py`: passes, including all 40 candidate stream results and exact 30-stream replay.

check.log preserves the initial full check run alongside heavy calibration workers: two existing 60-second timeouts (phonotactic hook and 200k cluster sample). check-isolated.log records the entire rerun after calibration completed: both pass without changing tests or timeouts (about 40 and 39 seconds). calibrator-typecheck.log preserves an initial invocation using NodeNext, which rejected existing extensionless imports; calibrator-typecheck-project-resolution.log is the successful invocation matching the project resolution. No code was changed to accommodate the mistaken compiler invocation.

The archive is an evidence-only child of the policy commit. The PR branch contains code, config, tests and durable documentation only; measurement packets are not in its history.
