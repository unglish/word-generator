# PR 313: coda validation with original phoneme gates

Final candidate uses /z/ coda weight 88 (from 92) and /n/ coda weight 460 (from 450). Onset and word-position weights remain unchanged. The original shared threshold configuration and original phoneme quality test are restored byte-for-byte to main. The per-phone exceptions, helper, dedicated tests and exception documentation are removed. The calibration reporter keeps only useful common-phone rows, with no override enforcement infrastructure.

Baseline main: 43ef38ae029f4359f323d1c19955b3d44a10a6f7. Starting PR: f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b. The coda legality implementation remains the scoped pre-mutation fix from 075df460. Evidence is attached to the final implementation commit via an evidence-only archive child; no measurement packet is in the PR branch history.

## Development decisions and frozen confirmation

Three development candidates use the same 30 streams of 200,000 bare lexicon words (six million words per candidate, not independent cohorts):

1. z89/n455: /z/ exceeds 1.066 in 3/30 streams (max 1.0714027067). Other bounds pass. No confirmation run.
2. z88/n455: all /z/ and /n/ bounds pass, but /ʃ/ exceeds 1.066 in one stream (1.0662974898). No confirmation run.
3. z88/n460: all original per-phone, total-variation, coverage and loss requirements pass across all 30. Maximum common-phone ratio 1.0624691651, maximum gap .3154230795 percentage points, maximum total variation 1.5262821109% (limit 1.78).

The all-phone premise audit is retained with the second candidate. Average /ʃ/ ratio stays approximately 1.042 across the candidates, so its isolated failure is not evidence of a systematic compensating /ʃ/ increase. /n/ retains a mean deficit of .3094 percentage points at n455, independently motivating a further increase to 460. No unrelated weight was changed to force a passing gate. The third candidate was explicitly the final development attempt; no further search would follow another failure.

protocol.json freezes the final weights, original limits, development seeds and ten fresh confirmation seeds before the final development run. SHA256: 6ed03c6d66c280e2b38146b875ffeb09bac6688b05d8810f07dc859470d48448. Prior confirmation seeds were excluded and the fresh cohort was first opened only after all 30 final development streams passed. No weight or limit is fitted to confirmation results. verify.py checks every common phone, aggregate bounds, zero losses/coverage requirements and actual RNG span non-overlap. Disjoint spans do not prove statistical independence.

## Trace quality and scope

The unchanged frozen development protocol measures 200,000 words per arm, trace:true, four profiles and five seeds per profile. The comparison includes main and the preceding coda-only PR. source-match.json verifies all 55 captured generator files against the final checkout. The recorded dirty patch and source digest identify the candidate at capture time; the later commit contains that same generator.

The supplementary coda operator derives from the original archived operator and retains its shard/source hash checks and duplicate-count agreement with the frozen evaluator. Version 2 additionally tallies root/final /n/, /z/, and /ʃ/ by syllable position from WordTrace. These counts describe selected words, not all attempted roots or matched counterfactual proposals. Complete bounded witnesses and stage counts are retained.

Relative to main, trigram Jensen–Shannon divergence changes by profile: lexicon-default −.000114 bits, bare lexicon +.001109, bare monosyllables +.009066, text-default +.001585. Compared with the prior coda-only PR, weights improve three profiles but worsen bare lexicon (+.000949 bits). Unique spellings (main → final, 50,000 words/profile): 49,458→49,441;47,535→47,532;16,785→16,303;39,375→39,485 respectively. This is mixed evidence, not an overall linguistic-quality or human-preference claim. Full strata, reference distributions and per-stream ranges remain in the comparison.

Final spelling/affix ownership (#328/#362), morphology-introduced duplicates and terminal-y fixes remain out of scope. Passing the restored gates does not imply universal final-word coda legality.

## Determinism and rare ugh

The final golden fixture changes 125/160 entries relative to the preceding PR, with changed RNG draw totals in all four cases. This intentionally changes historical seeded output; it does not change the same-config/seed determinism requirement. golden-review.json records counts and representative differences.

With both main and candidate given the same new weights and optional extensions disabled, parity.mjs verifies 10,000 complete traced public-API outputs across text/lexicon × bare/default morphology, plus the next RNG values. All match. This isolates the coda-check change from the intentional weight changes.

The actual final candidate generates 9 ugh occurrences in 1,442,578 trigrams at seed42, ratio .0083915314 against unchanged .0062. ugh.json retains every full WordTrace witness. Strict underrepresentation blocking remains enabled during final validation.

## Packet and reproduction

The archive retains final results and both rejected development candidates. The earlier three-stream/five-stream exploratory experiment stays in archive/pr-313-weight-nudge; the superseded exception policy stays in archive/pr-313-recalibration. Existing archives are immutable.

Raw quality word shards are retained locally under /tmp and deliberately excluded from Git. Manifests, hashes, summaries, distributions, source snapshots, fixed review samples, bounded witnesses and full coda-probe reports are retained. The compact packet alone cannot verify absent raw shards: regenerate the frozen captures or retain their local copies for full shard verification.

Use `npm run calibrate:phonemes -- --count 30 --jobs 6 --output <development.json>` and then `--seeds <comma-separated confirmationSeeds from protocol.json> --jobs 5 --output <confirmation.json>`. Run `python3 verify.py` beside final reports. Capture quality with `npm run quality:pr -- --base 43ef38ae --out <fresh-directory>`; quality:compare accepts --previous for the archived coda-only capture. The supplementary analyzer's main guard requires a canonical script path. Local paths in operators/logs describe this machine and need adjustment on another checkout. JSON files may be gzip-compressed; verify.py supports that layout.

## Final confirmation and checks

All ten fresh confirmation streams pass every original bound over two million words: maximum common-phone ratio 1.0627796668 (limit 1.066), maximum gap .3111984359 percentage points (limit .39), maximum total variation 1.4996275336% (limit 1.78). Every per-phone row is checked, all 40 candidate RNG spans are disjoint, and the frozen protocol hash matches. No proposal changed after confirmation.

The full required check passes with NGRAM_TRIGRAM_UNDERREP_BLOCKING=1: lint, all typechecks, 804 unit tests (one existing skip) and 260 review tests. Build passes; diagnostics 6/6; targeted calibrator typecheck passes. Isolated performance 2/2: 5,780 words/sec against 4,500 floor, median batch variance 1.10x against 3x. This is one isolated performance run, not a statistically established comparison with historical measurements.

Frozen trace results: root-stage adjacent duplicate coda pairs 6,137→0; final pairs 6,147→13, all 13 introduced during morphology. Licensed /ksts/ remains observed 103→96. Final duplicate words by profile: lexicon-default 267→7; bare lexicon 283→0; bare monosyllables 5,358→0; text-default 239→6. In the bare lexicon sample, selected-root/final /z/ counts are 8,571/8,414 on main and 8,636/8,636 in the candidate; the surviving-root property remains intact after weight tuning. These selected-word counts are not a complete causal decomposition of the changed distribution.
