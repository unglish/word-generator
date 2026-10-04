# Q13 performance revision: measured design, awaiting review

Recommend one first revision confined to `measureSpellingBudgets` in `src/core/spelling-budget.ts`: preserve its measurements exactly while removing repeated raw-letter classification and token string/offset reconstruction. This is a semantics-preserving performance hypothesis, not a linguistic improvement or a promise to recover the performance floor. Do not change the branch or runtime until parent review.

## Frozen subject and evidence

- Published draft: https://github.com/unglish/word-generator/pull/328
- Exact subject commit: `973406761e17f9b1795ba519a694cade68a7c2db` (runtime commit `62a4e91`).
- Runtime identity, all 52 files: `f0a9da1fa95cb7f0d8901b82567d94f1b565a36a83c58d404f7c8b0528a79666`.
- Original Q13 archive: `memory/quality-runs/spelling-coverage-candidate` in the linguistic-spelling checkout. Its full 200,000 words and traces remain immutable.
- Read-only profiles and exact function-call counters: `/private/tmp/q13-cpu-profiles-v2/`. `artifacts.json` hashes 18 source scripts, raw profiles, and derived reports. `source-check.json` confirms exact frozen source bytes and a clean tracked worktree after profiling. No runtime, observer, evaluator, gate, or branch edits were made.
- Runtime: Node v24.11.1, Darwin 27.0.0, arm64, Apple M1 Max, 10 reported CPUs. Source runs through the existing tsx dependency.

The old ordered isolated comparison measured approximately 4,140 words/sec for this candidate and 6,705 for its prerequisite control. It established a material regression in that one ordering; it is not sufficient to establish an optimization gain. This proposal compares a future optimization directly with the frozen Q13 candidate, not with the different prerequisite behavior.

## What was profiled

`/private/tmp/q13-profile.mjs` uses Node's inspector CPU sampler at a requested 1,000 microsecond interval. Generation uses only public APIs. Each case warms 50 calls using a continuous seed-0 stream, then generates 10,000 outputs at seed 42:

1. Active policy, public `generateWords` batch, trace off.
2. Omitted policy, `createGenerator(...).generateWord` loop retaining returned words, trace off.
3. Repeat of case 1.
4. Active policy, public `generateWord` loop, trace on. This loop retains spellings and counts selected returned certificates rather than retaining all traces.
5. Active policy, one syllable, morphology false, public `generateWord` loop, trace off.

Profile durations are diagnostic only. JIT order, profiler overhead, retention differences, and other machine work prevent interpreting them as isolated throughput comparisons. The omitted-policy run is useful for attribution, not an old/new speed estimate. An earlier attempt in `/private/tmp/q13-cpu-profiles/` stopped after the first profile because the custom generator has no batch API; it is retained as an aborted exploratory attempt and excluded from this dataset.

The two active batch spelling digests and the active traced digest are identical: `aa479feef40176805b6af70b9fafa49de9cfc55fd99a5476702b153ef7980f45`. Source hashes were checked before and after the run. These spelling checks validate diagnostic workload consistency; they do not replace the full trace/RNG equivalence proof proposed below.

`/private/tmp/q13-coverage-profile.mjs` separately uses V8 precise function coverage with call counts enabled and block coverage disabled. It repeats the 10,000-output active, omitted-policy, and traced workloads. Warmup is outside coverage, and spelling digests must match the corresponding CPU-profile workload. Precise coverage changes execution optimization, so these runs supply counts only, not timings. The traced counting run retains full returned words, unlike the traced sampling run; that difference does not affect the counted generator call path.

## Observed hot paths

The following percentages are interval-weighted CPU samples, inclusive of callees. Inclusive rows overlap and must not be summed. Profile 1 has 1,857 samples; profile 2 has 1,608. Anonymous/native and transpiler frame names are not interpreted as application functionality.

| Operation | Active trace-off 1 | Active trace-off 2 |
| --- | ---: | ---: |
| Entire writer | 53.18% | 53.56% |
| Coverage `apply` | 13.55% | 13.74% |
| Boundary per-phone `structuredClone` | 10.716% | 11.641% |
| `measureSpellingBudgets` | 6.35% | 8.02% |
| Search, including its callees | 6.34% | 6.70% |
| `optionsFor`, including resolution/doubling | 4.37% | 4.83% |
| `isConsonantToken`, all callers | 2.88% | 3.80% |
| Plan-context cloning inside `evaluate` | 0.515% | 0.359% |
| Certificate cloning in `commitLicensedPlan` | 0.278% | 0.242% |

For trace-on generation, `BaseSpelling.snapshot` accounts for 25.92% inclusive samples, with its internal clone accounting for 12.934%. That is a different cost from the trace-off throughput gate. The one-syllable diagnostic has more phonotactic candidate checking and a smaller budget-measurement share (3.57%). These differences argue against generalizing a single sample into a universal speedup.

The largest new copy cost is an actual detached phone boundary, not repeated losing-plan materialization. Per-call counts make that distinction concrete.

| Function/event, all attempted candidates | Trace off | Trace on |
| --- | ---: | ---: |
| Returned words | 10,000 | 10,000 |
| Writer calls / boundary context construction | 41,507 | 41,507 |
| Independently cloned phone positions | 162,005 | 162,005 |
| Coverage `apply` | 83,014 | 83,014 |
| Complete budget measurements | 129,611 | 129,611 |
| Search function invocations | 93,097 | 93,097 |
| `optionsFor` calls | 49,769 | 49,769 |
| Complete assignments entering `evaluate` | 4,880 | 4,880 |
| Plan-context clones after budget/reading checks | 349 | 349 |
| Verified/committed plans, including rejected words | 210 | 210 |
| `isConsonantToken`, including legacy repair callers | 689,593 | 689,593 |
| `isVowelChar`, all callers | 2,411,721 | 2,411,721 |
| `BaseSpelling.snapshot` | 0 | 41,509 |

The 129,611 measurement calls decompose exactly into 83,014 `apply` entry measurements, 4,880 complete proposed assignments, 210 certificate replay measurements, and 41,507 final morphology measurements. Each of those calls remains required in the proposed revision. The 349 plan clones are also confirmed by 559 `contextsFor` calls minus 210 verifier calls. The native clone totals are 162,564 untraced and 204,073 traced.

Search invocation counts are not interchangeable with `visitedAssignments`: a call may return at the existing bound check without incrementing it. Returned traces cover only selected words. The 10,000 returned traced words contain 53 certificates and 10,375 summed visited assignments; the larger instrumentation counts also include attempted words that generation did not return. We will not use selected-index accounting to explain total work.

The omitted-policy workload performs zero coverage measurements, boundary clones, or coverage searches. Its 490,421 `isConsonantToken` calls are legacy repair work; this is why the shared helper should remain untouched in the first revision.

## Proposed bounded source change

Current measurement first classifies every raw UTF-16 code unit twice: `isConsonantLetter(ch, index, surface)` is exactly the negation of `isVowelChar(ch, index, surface)`, followed immediately by a second `isVowelChar` call. It then tokenizes the same surface and calls `isConsonantToken(token, tokenIndex, tokens)` for every token. That helper rejoins the entire token array and sums every preceding token length on every call. This adds quadratic token-string/offset reconstruction to a scan that already has the full surface.

The revision would:

1. Call `isVowelChar` once per raw code unit and use the same boolean to update the vowel and consonant runs.
2. Leave `tokenizeGraphemes` and its configured-list behavior unchanged. Walk those exact tokens with one running UTF-16 character offset. Determine whether each token contains a vowel by calling the existing classifier with that token's characters, their absolute offsets, and the original complete surface. Advance the offset by the token length even if classification stops early at a vowel.
3. Leave the numeric limits, property access order, exceeded-key ordering, fresh result allocation, and measurements' call sites unchanged.

For every terminating tokenizer execution on string entries, concatenating its tokens reproduces the original surface exactly. The current helper's prefix-length sum equals the proposed running offset by induction over tokens. Thus each token sees the same characters and right context, while repeated joins and prefix sums disappear. Tokenization cost is unchanged; only its subsequent classification scan becomes linear in total token text length.

Expected runtime scope: only `measureSpellingBudgets` and the now-unneeded import in `src/core/spelling-budget.ts`. Keep exported `isConsonantToken` and `tokenizeGraphemes` unchanged. Add focused measurement tests and a separately tracked nested parity/performance probe plus compact evidence. Do not refactor the frozen evaluator or observer source closure to accommodate this work.

This targets a measured 6–8% inclusive region in the default trace-off diagnostics; it cannot recover all of the previous 38% throughput loss. The actual removable fraction is smaller and unknown before isolated measurement. Retain the revision only if exact equivalence passes and the paired experiment supports a useful improvement. If the existing floor still fails, report that failure plainly.

## Semantic hazards to preserve

- **Right context for y:** the existing classifier checks the next character at every position, not just initially. At word end it tests `"aeiou".includes("")`, which is true, so terminal y is currently consonantal. Preserve that behavior, however surprising; correcting it is a separate linguistic hypothesis.
- **Token boundaries:** y can be classified using the next character in a different token. Token-local context would be wrong. Custom greedy lists use their given first-match order; do not sort, normalize, deduplicate, or replace the tokenizer.
- **UTF-16 and nonletters:** indices and lengths are code units. Existing punctuation, uppercase conversion, and surrogate behavior remain unchanged. Do not introduce code-point iteration or an ASCII-only regex.
- **Mutable configuration:** no factory-wide or per-word measurement cache. Read the current constraints and classifier data at the same application points. Preserve truthiness behavior for zero, undefined, NaN, negative values, and Infinity. Do not add validation or alter existing error/nontermination behavior for invalid custom data as part of this optimization.
- **Detached results:** every measurement returns fresh values, limits, and exceeded objects. Trace collection retains outcomes directly; sharing cached measurements could add observable cross-episode aliases.
- **All search semantics:** preserve every measurement invocation, full-surface recheck, traversal order, normalized arithmetic order, 1e-12 score tie convention, all option/refusal counters, stable IDs, and the exact 8,192 visited-assignment bound. No pruning, candidate reordering, counter adjustment, or weakened reading certificate checks.
- **Trace and mutation contracts:** policy omission retains legacy behavior. Trace-off live units/cells and decisions remain active. Do not change detached writer snapshots, certificate snapshots, or trace serialization.

## Considered alternatives, deferred

1. **Boundary clone consolidation:** the largest measured copy site, but current code clones each phone position independently. Cloning the whole phone array once preserves aliases between repeated positions sharing one inventory object; the current implementation separates them. A shallow copy loses nested quantity/position/reading metadata detachment. JSON equality would miss these mutation differences. Do not gate boundary copying on trace or optimize this site without a separate alias-aware contract and proof.
2. **Plan-context construction after the best-score predicate:** a plausible small independent optimization. Keep budget/readings/refusal accounting before the existing exact predicate, then materialize only an improving plan. A lazy context clone can live within one `apply` only, because later applies see updated choice forms. The sampled clone share is small and only 349 copies occur here, so this is not the primary proposal. Keep commit and final snapshot detachment intact.
3. **Per-apply `optionsFor` memoization:** possible later, keyed by unit index, previous after-doubling choice form (undefined distinct from empty), cumulative doubling count, and current/previous nucleus forms. It must still increment every visited/options/refusal counter and replay verification freshly. Factory caches are unsafe because captured map/doubling objects and weights can be mutated between public calls; replacing a config field differs from mutating a captured object. Do not merge DFS states or skip repeated subtrees.
4. **Reverse next-nucleus indexing:** could remove per-phone `slice().find()` allocation, but requires preserving strictly following nucleus behavior, multiple nuclei, validation order, and detached phone identity. A separate measured revision if warranted.

Stress agent independently reviewed these search/cache/context hazards. Their review found no pruning blocker in the frozen candidate and specifically warned against combining per-position boundary clones. Their final read-only review also supports the narrower budget scan, provided token characters are all tested against the full surface, empty custom lists remain distinct from undefined, and existing UTF-16/y/list-order behavior is preserved.

## Preimplementation equivalence protocol

After approval, create a separate branch from exact `9734067`, leaving #328 source/evidence unchanged. Freeze this plan and the probe definition before editing behavior. Materialize the original runtime from its existing source bundle; verify all 52 hashes. Freeze the proposed runtime independently, and assert both closures before and after each experiment.

1. **Measurement equivalence and semantic fixtures.** Compare against the frozen original function over all strings of zero through four code units from `[a, A, y, Y, t, h, b, !, high-surrogate-D83D, low-surrogate-DE00]` (11,111 strings), plus explicit longer witnesses such as `strengths`, `twelfths`, `tchyath`, `ThYATH`, `yay`, and an astral character followed by `ya`. Cross that grid with undefined constraints, an empty object, default lists, an empty custom list, ordered overlapping lists `[th,t]` and `[t,th]`, `[ya,y]` and `[y,ya]`, case-sensitive mixed lists, and a list containing a surrogate pair before its high-surrogate prefix. Include all four budgets separately/together; undefined/zero/negative/NaN/Infinity limits. Mutate a custom token list between calls, including reordering overlapping entries and replacing the list reference, and compare both versions after every mutation. Include hand-asserted cases so the oracle comparison is not the sole test. Verify fresh results and mutation independence. Test only terminating valid-string lists; do not hang the test on an empty custom grapheme entry or silently repair it.
2. **Exact public API schedule.** Use the unchanged v1 development protocol (digest `451f4e5fab7285cc7f61f886391d6ac21ed042eb468e262790ea9e467a6c9862`): four profiles × five fixed seeds × 10,000 draws = 200,000 coordinates. Run original and proposed runtime with trace on and off, using independently counted seeded RNG streams. Compare complete returned words, full trace objects without stripping additive fields, and per-draw RNG counts plus the next RNG value. Cross-check trace-on/off nontrace output and RNG. This is 800,000 generator calls across the four paths, not a change to the 200,000-coordinate protocol. Also compare the regenerated original and proposed traced outputs to every word in the immutable #328 archive, checking the manifest/shards/protocol with the existing frozen reader.
3. **Exact search/certificate accounting.** Full trace equality includes every before/after budget value, changed-unit list, refusal reason/count, visited-assignment/options count, certificate, context, probability, cell/unit/edit ID, morphology part, and repair. Independently run the frozen TypeScript certificate verifier on proposed archived evidence; retain the original observer capability contract. No approximate float comparison or JSON field normalization.
4. **Custom and mutation contracts.** Reuse the existing omitted-policy parity/custom schedule and adversarial evidence tests. Include disabled/forced doubling, quota boundaries, unknown constructions, mutable captured config references versus replaced config fields, nested metadata mutation, independent repeated-phone positions, detached returned snapshots, and an explicit search-budget-exhaustion fixture. Exact source scope should make these invariant; tests must demonstrate it.
5. **Gates and source checks.** Run focused tests, strict type checks, touched-file lint, then the existing full/quality suites and frozen 200,000-word metrics. The existing Q13 failures are retained as baseline: five full-suite failures and one quality-suite raw-cap failure. Expected output/metric equality is stronger than merely keeping thresholds unchanged. Any changed quality failure, trace difference, RNG difference, or certificate-verification failure blocks a performance claim. Do not change thresholds or rewrite witnesses to accommodate drift.

Save the concrete limit configurations and reused custom fixture coordinates with the probe before implementation. This document defines the measurement grid and required coverage, not an already-executed result.

## Isolated performance protocol

Run only after equivalence passes, under an explicitly reserved quiet window with parent and other agents holding generator captures, builds, tests, and archive recounts. No inspector/coverage profiler during timed runs. Record machine, Node, lockfile, harness hashes, process command, start/end time, environment, and any interruption. Do not set CI to lower the local floor.

- Let A be frozen Q13 `9734067`, B the proposed revision. Use fresh processes with the unchanged perf test/config and identical dependencies for every run.
- Fix six paired trials before measurement: `A/B`, `B/A`, `A/B`, `B/A`, `A/B`, `B/A` (12 full suite runs). This balances which version is first in a pair and prevents choosing a favorable ordering after results.
- Each run uses the existing harness: 50 warmup words at seed 0; batch `generateWords(10000, {seed:42})`; unchanged local floor of 4,500 words/sec; unchanged sequential-seed variance test (three trials of five 200-word batches, median variance <3). Preserve every failure and raw duration.
- Report all 12 throughput/variance results, six within-pair B/A ratios, their median and range, and both version medians. Do not describe this one-machine series as a universal speed estimate. For a concrete local improvement claim require a median paired throughput ratio above 1 and at least five of six pairs in the same positive direction. Report floor passes/failures separately; improvement does not mean the existing gate is restored.
- If another heavy job starts or a process fails, preserve that entire run and its reason. Resume only in a new agreed quiet window with the full fixed series; do not delete inconvenient measurements or substitute the best result.

After timing, retain compact source bundles, exact parity/checksum reports, raw perf logs, and this predeclared schedule as a new experiment package. Ask parent to review before any publication. A broad copy/search/cache rewrite is not authorized by this proposal.
