# Q15 next slice: explicit English score-reference construction

Read-only design, 2026-09-26, after ready PR #332. Inspected checkout `linguistic-rejection`, branch `codex/explicit-cmu-transition-builder`, commit `bd70cbfef2a9f58442cf9bb066faec23b79ee2ef`. No source edits, generator calls, corpus scoring, threshold changes or new sensitivity results were performed for this plan.

## Recommendation and boundary

Replace the existing broken manual `scripts/generate-baseline.ts` entrypoint with a typed, explicit builder of a **new score-reference artifact using the unchanged historical scorer and historical transition table**. Use the shared pinned CMU population. Require explicit source, selection policy, projection, scorer profile and output path; write a fresh artifact outside active/frozen data. Preserve the current `src/phonotactic/english-baseline.json` and every consumer byte. The new reference must not contain an invented generated baseline/gap or a compatibility export that could silently become a gate target.

This changes manual construction and makes its provenance reviewable. It does not improve the generator, adopt #332 transition counts, fix IPA conversion, retrain the scorer, calibrate a gate, establish held-out prediction, or measure human wordlikeness. The next independent PR can be stacked on #332 for workflow continuity, but the new pair artifact is explicitly **not** a scoring input.

## Complete active consumer inventory

The inventory used tracked-file searches plus targeted source reads, excluding immutable embedded snapshots from live consumers. A separate read-only search of the copied evaluator found no phonotactic-score/baseline dependency.

| Path | Actual contract and implication |
|---|---|
| `scripts/generate-baseline.ts:49–63` | Reads ignored cwd-local `data/cmudict-0.7b.txt` or downloads mutable `cmudict/master`. No source identity. |
| `scripts/generate-baseline.ts:83–105` | Uppercase/apostrophe regex; skips labelled variants; strips arbitrary digits; does not validate whole pronunciation or inline comments. Pinned lowercase source yields zero matches. Historical population cannot be recovered by pretending uppercased current input is the original source. |
| `scripts/generate-baseline.ts:160–170` | `scoreArpabetWords` returns a `BatchScoreResult`, then the script calls `.filter` on that object. Removing only this error would leave unsafe population and publication semantics. |
| `scripts/generate-baseline.ts:13–39,173–204` | Emits flat score fields, two-decimal rounding, timestamp/empty seeds/degenerate seed ranges, and placeholder generated values `0`; unconditionally overwrites active JSON. This differs from the active nested `scores.total/perBigram` schema and recorded generated gap. |
| `scripts/generate-baseline.ts:223–225` | String-based main guard does not canonicalize entrypoint aliases. `main().catch(console.error)` logs failures without setting a failing exit code. Both belong to the same explicit-CLI repair, not the scorer. |
| `src/phonotactic/score.ts:8,22–38,46–83` | Pure legacy scorer imports only `arpabet-bigrams.ts`. Batch result contains `.words`, `.total`, `.perBigram`; stats have mean/min/median, **no max**. Word scores preserve input order. Stats sort values before summation and select upper-middle median. Empty input stats are zero; empty word returns negative infinity then independently disappears from each aggregate. Do not alter these operational choices here. |
| `src/phonotactic/phonotactic.test.ts:5,12–19,149–180` | The **only live import** of active English score JSON. Gates use `scores.perBigram.mean`, `generatedBaseline.gap`, and a fixed floor; English minimum is logged. Test generator helper reseeds each call with `42+i` for 135,000 words, drops empty mapped strings, and does not capture a continuous seed-42 stream. Existing baseline merely says seed42, so its historical raw stream remains unverified. |
| `src/phonotactic/phonotactic.test.ts:118–142` | Direct no-generation scorer unit tests are separately selectable; useful unchanged-output regression checks. This file is in `npm test`, **not** `npm run test:quality`, whose config selects only `src/core/quality.test.ts`. |
| `evaluation/review/wordlikeness/score.ts:61–84` | #304 comparator calls legacy scorer only after saved-syllable/IPA validation, uses per-word result, does not read English score JSON. It records unsupported saved phonemes rather than silently dropping them. Its current scores must not be recomputed/relabelled. |
| `evaluation/review/wordlikeness/cli.ts:24–33,53` | Pins comparator source digest over scorer, historical table and IPA mapper. Scorer/table migration invalidates this identity and requires separate new evidence, even if generator output is unchanged. |
| `src/phonotactic/ipa-to-arpabet.ts:80–106` | Gate adapter merges some identities, removes aspiration and silently filters unknown phones. This is a separate observed limitation. CMU source builder must take parsed base tokens directly and never go through this mapper. |
| `src/index.ts` / normal generator | No scorer/baseline export or runtime import was found. Internal generation-attempt scoring is another mechanism. There is no generator adoption in the proposed builder. |
| `TUNING.md:306` | Still advertises old baseline local/download/in-place workflow; update only this row as part of the proposed PR. |
| `docs/phonotactic-scoring.md:70–92` | Already flags the baseline script as unresolved and the new transition artifact as separate. Replace only relevant construction guidance; add precise historical-population caveat to existing calibration claims rather than changing its numeric table. |
| `docs/wordlikeness-evaluation.md:102–107,115–123` | Describes frozen comparator identity and immutable score/reference artifacts. Preserve these outputs and source definitions. |
| `package.json`, `tsconfig.json`, `tsconfig.review.json`, `tsconfig.corpus.json` | No package baseline-construction script. Main build excludes `scripts/`; corpus config includes corpus modules and joint test; review typecheck covers review tests. Import the new entrypoint in its dedicated typed review fixtures or explicitly typecheck its source so this API mismatch cannot escape checks again. |

Actual API reproduction is saved at `/private/tmp/q15-score-builder-api-reproduction.json`: calling the unchanged scorer with the single existing-style fixture `K AE T` returns object keys `words,total,perBigram`, stats keys `mean,min,median`, one finite row, and the builder's exact `.filter` expression throws `TypeError: scoredWords.filter is not a function` under Node v24.11.1. This invoked only the scorer and failed expression; it did not execute the unsafe builder, download a source, score a corpus, generate words or overwrite files. The report pins scorer/builder/table hashes.

The CI workflow only targets PRs/pushes to `main`; a stacked branch has no automatic CI claim.

## Pinned old and new meanings

Preserve these exact historical bytes:

- Scorer `src/phonotactic/score.ts`: `c4d5ff5bd77a4a77e63a7ab3ef610f2bb31c1981e4c4666c803e210672ac551f`.
- Table `src/phonotactic/arpabet-bigrams.ts`: `741eee7a1d331432a50c136a4801251bc8c7e3a8a3567265011fd865f203b1a7`.
- Active summary `src/phonotactic/english-baseline.json`: `b09571249718792461073319d610dd634705bdac6fc9454aa9a7950a715d760b`.
- IPA mapper: `e225cbe65a4820e727b8e4bf7f009089b6f3d566cfb07ccf3b13c3d127172913`.
- Gate file: `683f14d99636e59491add7e1e9eded10323d84ed86d2deb32e61e1a5705327d8`.
- Old builder (preserve in evidence): `1d6bdb282c44f51a8b55ff929d34654977d3161df61bfc2f7ce285741b46fbab`.

Historical active summary declares 123,892 entries, total mean −28.37 and per-bigram mean −3.89, with generated 135,000/seed42 per-bigram mean −4.74/gap0.85. These are rounded historical claims, not a reconstructed corpus or matched experiment. The table separately has 976,831 transitions and 132,603 events at each edge; its actual source population remains unresolved. Do not conflate the two populations.

New source/population uses the already verified joint reference: CMU revision `74790861f652b15e4ac49015a90074ad62a27690`, raw SHA `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`, policy `cmu-ascii-first-v1`, 117,485 selected spellings, entry digest `d6a702f18c1bc17f7d7b41206d37498ecab0a7712c862f0398c9a8fde7a13d29`. Exclusions: 9,114 labelled alternatives, 8,559 unsupported spellings, eight vowelless entries; pronunciation/duplicate exclusions happen to be zero in this pin. The new score values are **not yet observed**.

One selected entry is one equally weighted observation, regardless of phone count. Use the named `cmu-arpabet-base-v1` projection directly from parsed phone `.base`, retaining native entry identity in the population digest. Stress is intentionally lost in this projection; AH0/1/2 and ER0/1/2 are merged before scoring, without IPA or dialect reinterpretation. Model vocabulary is the historical 40 labels including `#`; smoothing alpha1, conditional row denominator and log base2 remain unchanged. A word of n phones has n+1 transitions. `total` is sum log2 conditional probability; `perBigram` is that word's total divided by n+1. The aggregate is a mean over words, **not** a corpus event-weighted mean. Per-transition normalization does not establish full length independence.

Source/table overlap is unresolved and likely; this is a descriptive lexical-reference distribution, not held-out model validation. Exhaustively enumerating a selected dictionary removes Monte Carlo sampling for that file but does not remove population bias or generalization uncertainty.

## Proposed typed builder/artifact

Explicit invocation (provisional spelling, freeze before implementation):

```
node --import tsx scripts/generate-baseline.ts \
  --source /absolute/pinned/cmudict.dict \
  --policy cmu-ascii-first-v1 \
  --projection cmu-arpabet-base-v1 \
  --scorer legacy-arpabet-add-one-log2-v1 \
  --out /absolute/fresh/english-score-reference.json
```

One supported scorer profile, pinned to the old source/table hashes above. No optional new table path, legacy overwrite mode, downloads, implicit cwd source, runtime module writer, generated sampling flags or threshold output. Help alone succeeds; duplicate, missing, malformed and unknown explicit flags fail with nonzero status; canonicalized symlink entrypoint works.

Suggested new implementation: `evaluation/corpus/score-reference.ts` (pure row/summary construction and types), `evaluation/corpus/score-reference-builder.ts` (pinned inputs, validator, publication), and the existing entrypoint. Reuse the shared parser, selector, `PHONE_PROJECTIONS`, `jsonDigest`, source types and full joint-parent reconstruction. Do not add another CMU parser, scorer implementation, character wrapper, or generic scorer registry.

- `ScoreReference` contains exact selected source/population/parent identity, units and scorer contract; ordered rows identifying ordinal, source line and spelling, exact base ARPABET input, phone/transition counts, total score and per-bigram score. Native full records remain in the one pinned source; do not duplicate the dictionary in the package.
- Call existing `scoreArpabetWords` on the complete ordered base-token input, read `.words`, assert a bijection with selected inputs and all finite values. Do not silently filter invalid scores. Selected valid entries are nonempty: any missing/nonfinite output is a builder error before publication; malformed-source selection exclusions remain separately counted by the shared policy. Artifact accounting explicitly declares input/output/scored counts and zero dropped rows; a failed build records diagnostics externally, never a partial valid summary.
- Copy `batch.total` and `batch.perBigram` exactly, preserving sorted-addition mean and upper-middle median. Add `max` as an explicitly defined supplemental extremum over all validated rows, **not** a purported `ScoreStats` property or a new scorer algorithm. Retain full binary64 JSON values; no two-decimal rounding. Empty selected corpus is rejected before the scorer's historical zero-stats behavior can masquerade as a reference.
- Avoid the old consumer schema. Use `cmu-legacy-score-reference-artifact-v1` with `summary.total` and `summary.perTransition` each containing exact legacy mean/min/median plus the supplemental max, and exact row identity. The aggregate unit is equal-weighted selected entries; `perTransition` names the within-word normalization. No `generatedBaseline`, dates, seeds, fake variance ranges, inferred generated gap or replacement gate values. Timestamp/host may live in a separate acceptance report, not deterministic artifact bytes.
- Parent must be the pinned joint reference reconstructed completely from raw bytes. Scorer/table source hashes and semantic model labels are separate from the corpus parent identity. Snapshot the full execution closure plus lockfile; validate them against externally trusted checkout sources and pin the historical table bytes independently. Do not trust embedded arbitrary source text as authentication.
- Validator receives externally trusted reconstructed rows/summary, parent, implementation and model identities, then compares the **entire ordered artifact**, not only digest or aggregate stats. A row-score permutation can preserve every summary and still be wrong. Detached snapshots must survive mutation of inputs/result rows without altering source objects, table or subsequent builds.
- Publication uses the existing guarded, exclusive fresh-path contract. The exported `validateTransitionOutputPath` is reusable directly as the shared offline guard without a redundant renamed wrapper; include that module's transitive source closure explicitly if used. This is an I/O-code dependency, not transition-artifact adoption. Do not extract/mutate the frozen transition implementation merely to generalize its name. It already protects all source/corpus/experiments/demo paths and source aliases. The new scorer source and old table are protected under `src`.
- Verify raw, full parent, scorer/table and full source closure both before and immediately before publication; reject unsafe aliases/existing targets/hardlinks/dangling symlinks. Use exclusive create as the only artifact write path. Record exact source closures/Node and deterministic rows/summary digests.

## Frozen validation plan before successful corpus construction

Write the protocol and snapshot every tracked parent path first. Allowed existing edits are only `scripts/generate-baseline.ts`, relevant construction/caveat paragraphs in `docs/phonotactic-scoring.md`, and its single TUNING row. Add typed fixtures, new builder and independent verifier/docs/evidence. All other source, gates, config, model/scores, demo, prior Q15 packages (including #332) and original baseline archives remain byte-identical.

1. Pure/CLI fixtures before formal success: exact `.words` API extraction; upper-middle median on even n; a fixture distinguishing equal-word versus pooled-transition means; exact batch aggregate parity; maximum as the declared supplemental extremum; one-phone/repeated-phone/boundary cases; stress0/1/2 projected from native; same spelling/line order; whole-entry rejection of unknown phones; malformed or empty inputs fail; no dropped rows; detached outputs. Cases must not normalize scorer unknowns differently under the unchanged public scorer API.
2. Artifact forgeries: missing/duplicate/reordered/extra rows; wrong line/spelling/ARPABET; swapped per-word scores with recomputed digest while every aggregate remains unchanged; changed count/denominator/stats/projection/model/table/parent/source; invalid/nonfinite JSON; forged embedded source snapshots. Full expected-row equality must defeat summary-preserving forgeries.
3. Independent Python proof: reuse exact frozen `verify-parser.py` and `verify-joint.py` for population/parent, but traverse each selected entry independently and calculate old-table conditional probabilities with Python `math.log2`. Parse the exact pinned **historical** table data with a restricted non-executing declaration parser (or a reviewed pinned extraction whose every bin is independently checked), not by trusting candidate rows or substituting #332 data. Check all historical pair counts, row totals and vocabulary. Preserve transition summation order, sort before aggregate addition and select index floor(n/2). Compare every row, input identity, n+1 denominator and summary.
4. Predeclare floating comparison before values: exact metadata/order/counts and deterministic TypeScript roundtrip; independent Python numeric equality within `abs(actual-expected) <= 1e-10 + 1e-12*abs(expected)` for finite scores/stats. This tolerates math-library binary64 differences only; do not choose/change it after results. Validator within the TypeScript build uses exact expected values. Package maximum observed independent error and mismatches rather than silently round values. If precision policy needs adjustment, retain failed run and amend before a new acceptance, not retroactively.
5. Strict corpus and review TypeScript; explicit touched-file lint; focused new tests and `npm run test:review`; direct no-generation existing scorer fixtures via their test name. Confirm typed CLI is in a checked dependency graph. Full generator recapture/performance is irrelevant if source closure remains identical; do not claim unrun suites. Any inherited gate run keeps its original thresholds and records failures.
6. Parent source/test/protocol review, exact closure freeze, then two fresh byte-identical full builds (Node+tsx and aliased entrypoint from unrelated cwd/spaced paths). Full independent per-row verification. Real CLI matrix covers help/failure status/no partial output/source pin/parent+model tampering/path protection. Before/after full parent-file hashes establish no adoption.
7. Package compact gzip artifact, frozen source identities, per-row verification report, source/CLI command logs and all failures. No raw dictionary duplicate. Report 117,485 only as already known selected population; new score summaries are results, never predeclared improvement targets.

## Separate later work, requiring a frozen sensitivity protocol

A consumer migration or #332 scorer-table adoption must be another PR. Freeze old/new scorer identities, token projection/unknown accounting, exact saved English/generated inputs, coordinate/snapshot identity, metrics, strata, invalid handling and analysis before any comparison. Keep input words identical to separate model change from generator change. Distinguish corpus-population changes from model-table changes (same new selected English population scored under old and new models); old 123,892 rounded summary has no per-row identity and cannot be used as a paired control.

For generated comparisons, use verified raw archives and a named adapter with explicit unavailable/mapping counts, not regeneration chosen for favorable results; the current gate mapper's dropping behavior and #304 strict adapter are different contracts. Preserve old scores and create separately named outputs. Only a later explicit gate calibration can change reference/gap/floor; construction itself does not justify changing thresholds. Model likelihood changes and pass/fail changes are not evidence of improved human naturalness.
