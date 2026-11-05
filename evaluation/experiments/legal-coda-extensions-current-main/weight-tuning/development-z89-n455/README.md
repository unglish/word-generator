# PR 313: replace phoneme exceptions with coda-weight tuning

The user approved replacing the prior selective-limit infrastructure with the tested small coda-weight changes, conditional on full validation. Original baseline is 43ef38ae029f4359f323d1c19955b3d44a10a6f7. Starting PR was f65dcf09291c4c8cabe6ee05ea1d2d086f6ae76b, containing the scoped coda fix and selective exceptions. This candidate restores the original threshold configuration and original phoneme test, removes the exception helper/tests and associated documentation, and changes only /z/ coda 92→89 and /n/ coda 450→455. Onset and word-position weights remain unchanged. The reusable calibration reporter retains common-phone rows for audit; no override logic remains.

## Frozen protocol

protocol.json fixes both weights, the original limits, 30 development streams and ten newly reserved confirmation streams before the full runs. Its SHA256 is 63a9bca846007c9c05ed27d014c640eed9f3cffc247a1d2d579f50fb480992dd. Previously consumed confirmation seeds are excluded. All streams contain 200,000 bare lexicon words through the public API. Actual consumed RNG spans must not overlap. No confirmation outcomes are used to choose weights or limits. These disjoint spans are not a proof of statistical independence.

The initial exploratory three-stream and two-stress-stream experiment remains in archive/pr-313-weight-nudge. That evidence motivated this candidate; it is not held-out evidence. Earlier exception calibration remains in archive/pr-313-recalibration, and original coda correctness/quality evidence in archive/pr-313. No existing archive is modified.

## Trace quality and deterministic contracts

The frozen quality harness captures 200,000 words per arm, with trace:true across four profiles and five seeds each. comparison/ compares both main and the preceding unweighted coda fix; the harness, protocol and reference digests match. source-match.json checks all 55 captured generator files byte-for-byte against the updated checkout. The recorded dirty patch identifies the candidate despite its pre-commit capture ID.

The historical supplementary coda operator is reused unchanged to validate shard hashes and the evaluator's duplicate counts, retain bounded witnesses, and distinguish selected-root construction from morphology. It describes selected words rather than every rejected generation attempt. Raw word shards remain local and are not duplicated into Git; archive summaries, source snapshots, manifests and witness/probe packets retain the interpretation and reproduction inputs. Full integrity verification requires regenerating or retaining the raw shards.

The updated golden fixture changes 78/160 entries relative to the previous PR; golden-review.json records per-case counts, RNG draw changes and examples. This intentionally changes historical seeded output, not the same-config/seed determinism contract. Five golden tests and 25 focused coda tests pass. With both revisions given identical new weights and optional extensions disabled, parity.mjs checks 10,000 complete traced words across text/lexicon × bare/default morphology and the next RNG value: all match.

The actual candidate's strict ugh replay records 18 occurrences in 1,442,587 trigrams, ratio .0167829581 against .0062. Full WordTrace witnesses are in ugh.json. This is the same result as the earlier combined-config experiment.

## Broad side effects

Relative to main, trigram Jensen–Shannon divergence increases in all four profiles: lexicon-default +.000957 bits, bare lexicon +.000662, bare monosyllables +.009274, text-default +.000535. Compared with the preceding coda-only PR, the weight change improves three profiles but worsens bare lexicon (+.000502 bits). There is no overall linguistic-quality or human-preference claim.

Unique spellings (main → candidate, 50,000 words/profile): lexicon-default 49,458→49,496; bare lexicon 47,535→47,425; bare monosyllables 16,785→16,306; text-default 39,375→39,499. Strata, full distributions, stress/length diagnostics, and descriptive per-stream ranges are retained in comparison.json. Equal draw indices are not paired words after RNG consumption changes.

Final spelling/affix ownership (#328/#362), morphology-introduced duplicate codas and terminal-y repairs remain out of scope. Passing gates does not remove these known limitations.

## Reproduction

Run `npm run calibrate:phonemes -- --count 30 --jobs 3 --output <development.json>`. Use `--seeds` with the exact comma-separated confirmationSeeds from protocol.json for confirmation. Run `python3 verify.py` beside the reports to verify original per-phone and aggregate bounds, frozen protocol hash and RNG spans. Run `npm run quality:pr -- --base 43ef38ae --out <fresh-output>`, then quality:compare with the archive/pr-313 captured prior summary as --previous. The unchanged original coda operator lives in archive/pr-313; this packet retains a copy for convenience. Its main guard requires a canonical script path. Local absolute paths in operators describe this machine and must be adjusted for other checkouts.

## Development rejection

The full six-million-word development run does NOT pass: /z/ overrepresentation exceeds 1.066 in three streams (1347916138: 1.0714027067; 42880050: 1.0667253718; 1390796146: 1.0667461116). Every other per-phone/aggregate limit passes. The fresh confirmation streams were not run for this candidate. This z89/n455 candidate was not adopted. A subsequent development-only refinement lowers z coda to 88 and is recorded separately; all this evidence is retained to explain that decision.
