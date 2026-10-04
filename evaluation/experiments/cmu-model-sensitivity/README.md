# Paired phone-transition table sensitivity

This is preparation for an offline measurement audit, with **no full study outcome yet**. It holds the 117,485 selected CMU entries and original 200,000 archived development words fixed, scores their complete vectors under A (historical table) and B (matched selected-entry table), and changes no generator, gate, reference consumer or threshold. B's English scores are in-sample. A's training population is unresolved. Neither a favorable score direction nor a smaller gap establishes improved generated output.

`design.md`, `protocol.json` and `fixtures-plan.md` preregister the populations, loss/identity distinctions, summaries, fixed tolerances and acceptance. `parent-files.json` freezes all 325 files from #333; there are no allowed prior-file edits. The one external pure #318 identity module is hash-pinned and supplied explicitly, not copied into this branch. Its classifications do not establish an English dialect or restore underlying reduced vowels.

Run targeted synthetic tests with `Q15_IDENTITY_MODULE=/absolute/pinned/identity.ts npx vitest run --config vitest.review.config.ts evaluation/review/cmu-model-sensitivity.test.ts` and `python3 evaluation/corpus/verify-model-sensitivity-test.py`. These tests do not run a generator or the full corpus. Use `npx tsc -p tsconfig.corpus.json` and targeted ESLint for new TS files.

The explicit CLI is `node --import tsx evaluation/corpus/model-sensitivity-cli.ts --help`. `freeze` takes the pinned raw CMU, original archive, external observer and old identity report plus a fresh output. It captures every parent/new source byte, all archive artifacts, external inputs, Node executable SHA and engine/tsx metadata. Review that freeze's byte SHA externally before passing it to `score`. The registered new-source allowlist rejects extra matching source files and excludes only a future `outcomes/` directory from source closure. Publication never changes the original freeze.

After source review, two fresh `score --freeze FILE --freeze-sha256 EXTERNALLY_REVIEWED_SHA --out NEW_DIRECTORY` executions must have byte-identical complete files. The directory is created exclusively; full ordered row streams are compressed with deterministic gzip. `report.json` is the completion marker and is written last after all input/source/output checks. A failure retains incomplete streams and `failure.json`, with no completed report. Fresh destinations must be outside source and archive inputs. Invocation from another working directory uses an absolute tsx loader (`--import /absolute/checkout/node_modules/tsx/dist/loader.mjs`), absolute entrypoint and identical inputs; no package-script migration is included.

`verify-model-sensitivity.py --freeze FILE --freeze-sha256 SHA --run DIRECTORY --report-sha256 EXTERNALLY_PINNED_SHA --out NEW_PROOF.json` independently reparses raw CMU, reads the historical table with the frozen restricted nonexecuting parser, recounts all B transitions, traverses every archived segment, and reconstructs scores, full grouping, gaps, decomposition and deterministic witnesses. It never imports the TS evaluator or invokes generation. Integers/identities are exact; binary64 log results use `1e-10 + 1e-12 * abs(reference)`. Worst absolute/relative coordinates and near-zero sign disagreements are retained. Producer exact-sign/witness ordering is independently recounted from numerically verified producer scores, so floating differences are not silently relabeled as sign changes.

The report labels decomposition arithmetic `compensated-signed-terms-v2` in
`units.decomposition` and every group's `decomposition.arithmetic`. Weighted terms
remain binary64 `occurrences * transitionDelta`, and row terms remain the original
binary64 per-word `B - A`. Only their decomposition accumulators change: TypeScript
uses a floating expansion that retains addition corrections through final rounding;
the independent verifier uses Python `math.fsum`. The residual is one compensated
sum of weighted terms and negated row terms. It can therefore differ from
subtracting the two rounded aggregate totals; it is neither clamped nor forced to
zero. Per-word scores, sorted sequential summary means, sign categories, gap
arithmetic and all tolerances remain unchanged. Synthetic cancellation, halfway
rounding, subnormal and one-ULP fixtures compare both implementations against exact
sums of their binary64 input terms. Compensation cannot guarantee agreement across
different `log2` implementations or remove rounding already present in word scores
and weighted products. Full-data acceptance is still unestablished, and any future
tolerance failure remains a failure under the preregistered tolerance. Source-review
snapshots preserve the earlier arithmetic; design and protocol bytes are unchanged.

The externally pinned full report SHA anchors its exact bytes. The JS canonical envelope digest is retained as a producer identifier; Python does not pretend that its own floating JSON rendering reproduces JS canonical bytes. The independent verifier checks all report fields and numerical contents, and all source/input/output identities again at completion. This is distinct from a self-digested artifact proving its own authenticity.

The result's flat group keys include `english/all`, `generated/all`, `profile/ID/all`, `stream/ID/SEED/all` and their exact `phoneCount/N` partitions. Each generated parent also has an `identity-complete` nested view, independent of recorded stress. Empty nested totals have null score summaries. English surface loss/preimage objects are null, and identity eligibility is unavailable, because CMU base tokens are not assigned unique IPA source identities. Overlapping loss masks and potential merger flags are separate from observed multi-preimage counts. Missing mapped tokens stay aligned and make both scores unavailable.

Full construction, the CLI acceptance matrix and independent 317,485-row verification remain held for parent source review. No sealed-validation archive, new generation, performance result, model adoption or held-out-quality claim is part of this PR.

`model-sensitivity-acceptance.ts REVIEWED_FREEZE EXTERNAL_SHA FRESH_MATRIX_DIRECTORY` is the reviewed formal matrix driver. It preserves individual logs and JSON records for every failure/help/success, then executes exactly two full fixed-input runs from different working directories and checks every output byte. Its source is in the freeze before scoring; do not execute it before approval. The independent Python verifier is run on the accepted complete run with externally pinned report bytes; it is a separate numerical proof, not inferred from the CLI exit code.

During source review, a bounded metadata check found that Python's sorted-key JSON
serialization does not reproduce the archived JavaScript manifest digest: integer
property names serialize first in numeric order. The verifier now preserves the
producer's numeric lexemes and JavaScript property enumeration order. Synthetic
coverage includes nested index keys, the 2^32−1 exclusion, exponent spellings and
UTF-16 key order. Original review bytes remain preserved; no corpus scoring or
metric/tolerance change was needed to identify or correct this preflight issue.
