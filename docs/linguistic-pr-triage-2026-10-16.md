# Linguistic-quality PR decision ledger — 2026-10-16

The new triage goal is complete: **48/48 remaining related open PRs have a decision**.
Recommendations: **2 MERGE, 22 REVISE, 18 DEFER, 6 CLOSE**. These are recommendations,
not authorization to merge, close, publish comments, rewrite branches, implement
changes, launch studies, or create follow-up chats.

Current main is `ad7f09051a2562e990c4db0abdf63421e99b6dda` (2026-10-15).
The open inventory and all 48 PR head/base records were rechecked at 13:24 PDT
on October 16; base branches were subsequently resolved directly. The companion
[JSON snapshot](linguistic-pr-triage-2026-10-16.json) contains full SHA identities,
current checks/reviews, conflict paths, source correspondence and failure excerpts.
Short SHAs in this document link to full immutable revisions.

## What is and is not counted

The live repository-wide open search returned 48 PRs: 47 linguistic/evaluation/
evidence PRs and the related but independent Rust pilot #343. All 48 are included
so none disappears between coordination efforts. The recent all-state inventory
returned 71 PRs. Its other 23 are separate history: **20 merged onto current main,
one merged outside main (#306), and two closed unmerged (#321 and #365)**.
Five early review/wordlikeness PRs are prior dependencies, and #341 is supporting CI;
their publication or merge is not acceptance progress for the new goal.

Discovery used all open PRs, all PRs created since September 1 (71 results, below
the 100-result cap), titles/authors/branches/bodies and dependency references,
main's roadmap and the archived working roadmap/audit. A repository-wide
linguistic search also returned older foundational work; none adds an open PR
outside the complete open inventory. The effort is not defined by a numeric range.
Historical “40/40” publication is not a quality verdict, merge count, or this goal's
progress measure.

## Findings that determine the order

- **Recommend #323 and #359 for merge.** #323 is two commits ahead of current main;
  its applicable CI is green. Its extra latest commit repairs only the CLI score
  fixture. Six compact artifact hashes, embedded parser sources and full frozen
  model/score semantic equality were checked in this triage. #359 adds dated
  evidence only, merges textually with current main, and both portable compact
  verifiers pass (284 and 323 members). Neither result establishes human quality.
- **Repair the corpus chain before considering descendants.** #325, #327, #329,
  #332 and #333 have current failing `review` CI on the old score fingerprint
  fixture; #323 already contains the bounded correction. #336 and #351 also have
  missing `/private/tmp/q16-files/identity.ts` and old worktree-manifest fixtures.
  Build/test/quality success does not override those failures. Here `review` is
  a CI job, not a submitted human PR review.
- **Main has changed materially.** #305 now means root-only length budgets and
  once-attached morphology; its accepted text mean bound is strictly below seven.
  Earlier affix-budget integration evidence must not replace that revision.
  #315, #317, #318, #319/#361, #314, #311 and #369 are merged. #339 makes the rare
  trigram underrepresentation gate report-only by default, and #340 calibrates
  phoneme gates. Historical `ugh` failures remain facts about the original runs,
  not evidence that the present blocking policy still fails in the same way.
  The `ex` bigram gate remains a distinct blocker for #310.
- **#306 is merged outside main.** Its merge commit `93b6fd16` and head `fd5ded6d`
  are not ancestors of main. Its of-spelling guide, probe and added diagnostic
  fixture are absent from main after the #305 branch revision. This is a
  historical diagnostic salvage question, not a remaining open PR or a missing
  runtime feature. The current local checkout preserves that old branch.
- **Do not inherit experimental behavior by merging a control.** #347 composes
  unaccepted #309 and #346 plus their spelling stack. #348, #350 and the shared
  morphology control inherit it. Retiring #347 as a delivery PR requires retaining
  its immutable source/control for the published comparisons, not deleting it.
- **Completion has a narrow success and broad unresolved costs.** #374 reports
  zero unresolved obligations in 200,000 words at `dbe3374b`, but 7,888 statuses
  remain unavailable. Original quality failures and speed-floor failures remain.
  #367 is a sibling optimization, not part of #368→#374. Main's terminal-y fix
  #369 does not fix the consonantal-y magic-e mechanism exposed by #312: current
  configuration still contains the `([aiouy])eC` rewrite.
- **Human work remains deferred.** #357/#363/#364 provide collection and synthetic
  calibration, with adverse missingness/power findings. No authentic participant,
  listening, speech or independent coding result was found. #356's lexical-style
  experiment provides no observed within-word multi-feature coherence either.

## Dependency-aware order of work

This is an order for decisions and separately authorized revisions. Only the two
MERGE recommendations are candidates for immediate owner consideration. Every
later merge is conditional on a new accepted revision and its recorded criteria.

| Track | Order and gate | Excluded automatic imports |
|---|---|---|
| Independent foundations | #323 and #359 can be considered independently; recheck main/head if either changes. | #359's historical source is not a present-main benchmark. |
| Corpus construction | accepted #323 → revised #325 → #327 → #329 → #332 → #333 → repaired #336; #351 after #336. | No new reference/scorer/gate consumer adoption; #353 runtime hypothesis is CLOSE. |
| Root clusters and rimes | revised #313 on current main → revised #324 on that accepted base; #320 is an independent availability revision. | Do not merge old #314/#319 snapshots again; morphology #355 is separate. |
| Lexical lifecycle/stress | revised #309 with merged root budgets/allomorphs; #316 measured separately and then composed; #326 after accepted lexical views; #330 after detachment. | #322 default quantity activation is not accepted. Isolate #334 analytically; #337 runtime activation is CLOSE. |
| Phone-preserving spelling | revised #310 and bounded #312 guard; redesign #328 on the accepted ledger. #331/#335 wait for the accepted representation. Extract #338's sound-specific guard independently if viable. | Do not merge #344 or the completion chain to mask #310's ex regression. |
| Shared/split completion | accepted spelling foundation → #344 → #345 → #368 → #370 → #371 → #372 → #373 → #374, each still requiring its criteria. #367 is a separate conditional optimization. | #346 full sequence experiment is CLOSE. No default promotion from zero unresolved alone. |
| Final provenance/morphology | isolate #349 CLI work on main; revise #348 on accepted mechanisms without #347 policies; #366 only if its hotspot survives; #350/#355 need accepted lifecycle/ownership interfaces. | #347 delivery control, #354 category experiment and #356 style experiment are CLOSE. |
| Studies and Rust | Human studies wait for real resources and named frozen treatments. #343 waits for an explicit backend requirement or accepted-main bottleneck. | These are not prerequisites to merge linguistic fixes. |

The proposed completion sequence is a dependency graph, **not a recommendation to
merge its current heads in sequence**. If the accepted architecture changes, reuse
the old findings and build a new bounded patch/control; do not silently relabel old
results. A deferred child does not accept its parent. Issue
[#362](https://github.com/unglish/word-generator/issues/362) separately tracks final
root/affix phone coverage: base provenance, base repairs and #369 do not establish
the complete final-affix contract.

## Five bounded follow-up chats to propose, not create

1. **Corpus stack CI and portability (#325–#333, then #336/#351).** Carry the
   accepted #323 fixture correction through the construction chain; replace normal
   test dependencies on vanished temporary files with checked-in/hash-pinned small
   fixtures and keep full raw integration checks explicit. Deliver clean-checkout
   CI and a source-binding report. Do not change populations, scores, gates or
   model weights; do not restart the 317,485-vector study.
2. **Current-main root coda/rime integration (#313→#324).** Reapply just extension
   legality and repair-pool compatibility on merged root-budget/edge APIs, keeping
   morphology guards separate. Deliver a reviewable patch plan and forced/public
   trace fixtures; request a new bounded measurement only after the source/control
   and protocol are reviewable. #320 remains an independent small revision.
3. **Lexical lifecycle revision (#309 with #316 composition).** Preserve merged
   root budgets/allomorphs and once-only realization; bound restored-primary versus
   secondary stress behavior. Deliver the lifecycle patch and a concrete clash/
   rime acceptance plan before measuring. Do not activate #322 or #337; #326/#330
   wait for the accepted view contract.
4. **Phone-safe spelling architecture decision (#310/#312/#328/#338 and #362).**
   Define the smallest accepted ownership/reading interfaces and a cost budget,
   covering real /gz/, consonantal-y, phone deletion and sound-specific doubling
   witnesses. Deliver bounded patch boundaries and acceptance protocols. Do not
   resume the full shared/split search stack or run another 200k corpus in this
   design task. Implementation can then be assigned in separate focused fixes.
5. **Standalone trace-audit/provenance decision (#349, #348/#366).** Extract and
   verify the streaming CLI change on current main; decide whether final provenance
   can fit the unchanged suite timeout/speed requirements without #347's policies.
   Deliver the small CLI revision and a source/cost plan for provenance, not a
   rewrite of the entire generator.

Human-study collection is not an implementation chat to start speculatively.
Before resumption, the owner must supply a coordinator/actual readers or listeners,
speech materials where applicable, independent coders/adjudication for read-aloud,
and named frozen treatments. Preserve current collection/calibration work meanwhile.
The six CLOSE recommendations require only an owner disposition and retained links;
no branch deletion, new implementation or rerun is needed to retain useful findings.

## Evidence retention and verification limits

The primary checkout stayed on `codex/document-of-spelling-paths` at `fd5ded6d`.
Its pre-existing untracked `.cursor/` directory was preserved. No reset, branch
switch, primary-ref update, PR mutation, comment, implementation, or experiment run
occurred. A broad fetch into a temporary repository timed out; exact commit objects
already present locally were matched to fresh GitHub head/ref SHAs, with connector
comparisons for the newer #323 commit. Temporary simulated merges do not touch the
checkout. Thirty-five direct main merges conflict; twelve are textually clean;
#323 is separately confirmed ahead of main. Clean text is not behavior acceptance.

PR metadata alone reported seventeen older base SHAs. All 34 distinct named base
branches were resolved directly; per-PR records show both the actual current base
tip and the historical PR-reported base SHA, plus the diff merge base. None of the
47 locally inspected diff merge bases changed when the actual tips were resolved;
#325's comparison with current #323 was checked through GitHub. This avoids treating
an old cached base SHA or local remote-tracking ref as fresh truth.

Fifteen heads have check runs: three have all applicable checks successful and
twelve have failures. Thirty-three have no returned head check runs, not a pass.
PR benchmark jobs are commonly skipped. All 48 returned no submitted reviews or
inline review threads; quality-report bot comments do not count as reviewer
approval. This triage inspected actual diffs, important mechanisms, check failure
logs, dependency ancestry and evidence; it is not line-by-line approval of every
implementation. No new full generator test suite or expensive population was run.

For key runtime studies, named source/implementation commits were compared with
the reviewed heads across `src`, package and lockfile paths. Most correspond
exactly. #351 inherits a changed engine after rebasing; its four own conditional
analysis files remain byte-identical. Corpus references, instrumentation parity,
structural replay, broader distributions, timing, inherited failures, and human
benefit remain different claims. Source correspondence does not re-run science or
prove a package's manifests trustworthy.

Preservation authority is the current local evidence archive at
`/Users/ryanbetts/Code/unglish/word-generator-evidence-archive-2026-10-16/`:
`README.md`, `PRIORITY-RETENTION-REPORT.md`, `EVIDENCE-DISPOSITION.md`, and
`LOCAL-ARCHIVE-VERIFICATION.json` were inspected. The selected raw archive remains
`word-generator-priority-evidence-2026-10-16.tar.zst`, recorded SHA-256
`2996e1de818f6a4beeca8a8eefa8c2e2faaf9cdf1c2d042dfe9b0b045b22a200`.
It was not added, uploaded, deleted, repacked, fully extracted or redundantly
rehashed. Its 660 objects/8,814,905,692 raw bytes were verified by the preservation
receipt, not by a new triage pass. Compact packets preserve aggregate findings,
sources, operators and selected replays; historical indexes are not present-file
availability promises. Copies remain on this machine, not independent backup.

The two archived working Markdown documents were selectively extracted from the
compact packet and their full hashes verified (`513f5af2…` roadmap and `52a7dff1…`
audit). No bulk restoration was needed. The original Q14a joint-neighbor v1/v2 raw
captures were missing before cleanup and are not backed up. PR374's reports,
source and public replay survive; one replay uses different recorded tapes per
arm. It is not an identical-seed paired proof. A new deterministic capture would
be new evidence requiring separate authorization and provenance.

## Decision index


| PR | Recommendation | Track | Purpose |
|---|---|---|---|
| [309](#pr-309) | **REVISE** | stress | Resolve lexical/morphological stress before a single surface pronunciation pass. |
| [310](#pr-310) | **REVISE** | spelling | Require legal finite positive-weight grapheme choices. |
| [312](#pr-312) | **REVISE** | spelling | Restore ordinary /ɛ/→e before /t/. |
| [313](#pr-313) | **REVISE** | clusters | Validate optional coda extensions with the configured production constraints. |
| [316](#pr-316) | **REVISE** | stress | Preserve morphology vowel hiatus instead of adding an unspelled /h/. |
| [320](#pr-320) | **REVISE** | clusters | Restore /æŋ/ availability while retaining other configured exclusions. |
| [322](#pr-322) | **REVISE** | stress | Add the named partial moraic quantity analysis and activate it in English. |
| [323](#pr-323) | **MERGE** | corpus | Share lossless CMU parsing and the existing selected population. |
| [324](#pr-324) | **REVISE** | clusters | Preserve configured nucleus/coda compatibility through root repairs. |
| [325](#pr-325) | **REVISE** | corpus | Publish one matched CMU population and fixed-output reference sensitivity. |
| [326](#pr-326) | **DEFER** | stress | Detach nested quantity metadata across lexical/root/surface views. |
| [327](#pr-327) | **REVISE** | corpus | Make phoneme-reference regeneration explicit and non-overwriting. |
| [328](#pr-328) | **REVISE** | spelling | Preserve whole phone spelling units through written budgets. |
| [329](#pr-329) | **REVISE** | corpus | Make length-reference regeneration explicit with integer entry units. |
| [330](#pr-330) | **DEFER** | stress | Expose complete stress assignments and seven domain snapshots without changing output. |
| [331](#pr-331) | **DEFER** | spelling | Avoid repeated context rebuilding in spelling-budget measurement. |
| [332](#pr-332) | **REVISE** | corpus | Make phone-transition construction pinned, explicit and non-overwriting. |
| [333](#pr-333) | **REVISE** | corpus | Make score-reference construction reproducible and keep it separate from active gates. |
| [334](#pr-334) | **REVISE** | stress | Expose the pure conditional root-stress law and backward sampler. |
| [335](#pr-335) | **DEFER** | spelling | Preserve complete units during adjacent-letter deduplication. |
| [336](#pr-336) | **REVISE** | corpus | Measure phone-transition table sensitivity on fixed vectors. |
| [337](#pr-337) | **CLOSE** | stress | Activate fixed-count conditional root-stress placement. |
| [338](#pr-338) | **REVISE** | spelling | Make consonant doubling sound-specific rather than letting /s/:c become ck. |
| [343](#pr-343) | **DEFER** | auxiliary | Retain the opt-in Rust/Wasm repair pilot. |
| [344](#pr-344) | **DEFER** | spelling | Record aligned ownership for multi-phone shared graphemes. |
| [345](#pr-345) | **DEFER** | completion | Build owned split-vowel formations and obligation completion. |
| [346](#pr-346) | **CLOSE** | spelling | Condition soft c/g on following letters using the full sequence model. |
| [347](#pr-347) | **CLOSE** | provenance | Preserve the old lexical-stress/spelling experimental comparison control. |
| [348](#pr-348) | **REVISE** | provenance | Provide final-word operational phone/cell provenance. |
| [349](#pr-349) | **REVISE** | provenance | Stream the trace-audit CLI to bound retained memory. |
| [350](#pr-350) | **REVISE** | stress | Enforce a structured final open checked-vowel contract. |
| [351](#pr-351) | **REVISE** | corpus | Add an offline conditional onset/rime predictor with held-out evidence. |
| [353](#pr-353) | **CLOSE** | corpus | Apply token-weighted running-text targets through an opt-in adapter. |
| [354](#pr-354) | **CLOSE** | morphology | Sample morphology through authored stem/affix category paths. |
| [355](#pr-355) | **REVISE** | morphology | Guard morphophonemic replacements atomically with configured cluster legality. |
| [356](#pr-356) | **CLOSE** | morphology | Apply an opt-in word spelling style and structured origin uncertainty. |
| [357](#pr-357) | **DEFER** | human | Freeze and collect blinded two-condition written comparisons. |
| [359](#pr-359) | **MERGE** | evidence | Publish cumulative Q07/Q08a comparisons for the already merged mechanisms. |
| [363](#pr-363) | **DEFER** | human | Collect independent blinded auditory comparisons. |
| [364](#pr-364) | **DEFER** | human | Collect first-presentation read-aloud recordings with independent coding. |
| [366](#pr-366) | **DEFER** | provenance | Reduce scalar history snapshot cloning while preserving extended native cloning. |
| [367](#pr-367) | **DEFER** | completion | Authenticate selected completion transactions once. |
| [368](#pr-368) | **DEFER** | completion | Provide structured positional weights only for completion, including initial ai. |
| [370](#pr-370) | **DEFER** | completion | Permit completion beside an unchanged opaque context without granting it a reading license. |
| [371](#pr-371) | **DEFER** | completion | Give existing /u/:oo initial support in the completion experiment. |
| [372](#pr-372) | **DEFER** | completion | Read actual recorded adjacent written context for completion. |
| [373](#pr-373) | **DEFER** | completion | Add completion-only isolated /u/:oo support. |
| [374](#pr-374) | **DEFER** | completion | Complete the final feasible vowel obligations by authenticated atomic neighbor respelling. |

## Per-PR decisions

### PR 309

**REVISE — [#309](https://github.com/unglish/word-generator/pull/309): fix: resolve lexical stress before surface pronunciation**

Current head: [codex/final-lexical-stress@d1d51892](https://github.com/unglish/word-generator/tree/d1d518920e96cfb69515ebe5f41672be269c1364). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `8e9ceb2f`; the inspected diff merge base is `8e9ceb2f`.

**Purpose / dependencies:** Resolve lexical/morphological stress before a single surface pronunciation pass. Integrate with merged #305 root budgets, #315 resolved allomorphs, #317 provenance and #319 weight analysis; do not merge the old composition #347 to obtain these.

**On current main:** Lexical lifecycle is absent; merged allomorph/weight infrastructure covers only part of its prerequisites.

**Evidence and reason:** 200k historical words remove missing-primary/stressed-schwa defects, but default disyllabic clashes rise 21.206%→41.906% and open checked endings rise. Exact engine bytes still match the recorded source; old ugh-only CI failure predates the current gate policy. Current-main merge conflicts span pipeline, morphology, writer and trace. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/d1d518920e96cfb69515ebe5f41672be269c1364/evaluation/experiments/final-lexical-stress).

Source binding checked here: engine/config/package bytes match `d1d51892` at this head.

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/36254711001/job/108439185072); [build: success](https://github.com/unglish/word-generator/actions/runs/36254711001/job/108439184600); [review: success](https://github.com/unglish/word-generator/actions/runs/36254711001/job/108439184598); [test: failure](https://github.com/unglish/word-generator/actions/runs/36254711001/job/108439184550); [quality: success](https://github.com/unglish/word-generator/actions/runs/36254711001/job/108439184445). No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 24 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Reapply only the lexical lifecycle to current main, preserve root-budget semantics, and bound secondary-stress behavior when primary is restored; replace stale exact-word assertions with trace-grounded mechanism fixtures where appropriate.

**Acceptance / resumption:** Current-main tests/lint/quality/perf pass; one realization pass; no promoted reduced vowel; deterministic trace/plain RNG agreement; fresh composition evidence must disclose clash/rime effects rather than importing the standalone result.

### PR 310

**REVISE — [#310](https://github.com/unglish/word-generator/pull/310): fix: require legal positive-weight grapheme choices**

Current head: [codex/legal-grapheme-selection@82c1f387](https://github.com/unglish/word-generator/tree/82c1f3879d3de12303d481110c608a79637d68fa). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `8e9ceb2f`; the inspected diff merge base is `8e9ceb2f`.

**Purpose / dependencies:** Require legal finite positive-weight grapheme choices. Uses merged edge/provenance work; #344 is an unaccepted proposed solution to /gz/ ownership, not an accepted prerequisite to import wholesale.

**On current main:** Legal-choice enforcement is absent from main.

**Evidence and reason:** Historical 200k removes zero-total choices, with 2,127 explicit fallbacks. Current CI fails both ex coverage and a nucleus-position seed fixture; body says only ex. Writer conflicts with current main. Current main's #339 changes trigram policy, not the blocking ex bigram gate. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/82c1f3879d3de12303d481110c608a79637d68fa/docs/grapheme-selection.md).

Source binding checked here: engine/config/package bytes match `17ffb74a` at this head.

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/37240564506/job/111548276352); [quality: success](https://github.com/unglish/word-generator/actions/runs/37240564506/job/111548275865); [test: failure](https://github.com/unglish/word-generator/actions/runs/37240564506/job/111548275817); [review: success](https://github.com/unglish/word-generator/actions/runs/37240564506/job/111548275806); [build: success](https://github.com/unglish/word-generator/actions/runs/37240564506/job/111548275638). No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 41 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Integrate the legal-choice contract with current writer and repair the real /gz/→x licensing route using aligned phones; reconcile the current FOOT fixture without restoring zero-weight choices.

**Acceptance / resumption:** Zero invalid selected weights, legal custom-config failure, ex gate passes unchanged, traced /gz/ witnesses, current-main deterministic/distribution/performance checks and all current CI green.

### PR 312

**REVISE — [#312](https://github.com/unglish/word-generator/pull/312): fix: allow ordinary e spellings before t**

Current head: [codex/ordinary-et-spelling@04e93c79](https://github.com/unglish/word-generator/tree/04e93c7949c8bba7e8e246fa5457a33ed0d9fdb4). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `8e9ceb2f`; the inspected diff merge base is `8e9ceb2f`.

**Purpose / dependencies:** Restore ordinary /ɛ/→e before /t/. #369 terminal-y preservation is merged, but current English magic-e regex still matches ([aiouy])eC and can treat consonantal y as a vowel. Large #345 is not an accepted prerequisite.

**On current main:** The e restriction is still on main; #369 does not establish this magic-e fix.

**Evidence and reason:** Three-line runtime deletion; historical e availability 0/2917→2632/2632 with 13 role-conditioned magic-e errors. Current CI now fails the old ytecose exact-seed fixture and a monosyllable position-weight assertion, despite green wording in the body. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/04e93c7949c8bba7e8e246fa5457a33ed0d9fdb4/evaluation/experiments/ordinary-et-spelling).

Source binding checked here: engine/config/package bytes match `1c2eece2` at this head.

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/37241119313/job/111549875808); [build: success](https://github.com/unglish/word-generator/actions/runs/37241119313/job/111549875007); [test: failure](https://github.com/unglish/word-generator/actions/runs/37241119313/job/111549874949); [quality: success](https://github.com/unglish/word-generator/actions/runs/37241119313/job/111549874920); [review: success](https://github.com/unglish/word-generator/actions/runs/37241119313/job/111549874835). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 27 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Use current main and add a bounded phone/role-aware guard for the exposed magic-e mechanism; renew trace fixtures through public APIs while preserving #369's terminal ownership behavior.

**Acceptance / resumption:** Eligible e remains reachable; consonantal-y vowel reordering is absent; real vowel routes remain supported; current assertions/CI pass without arbitrary seed substitutions or relaxed weights/gates.

### PR 313

**REVISE — [#313](https://github.com/unglish/word-generator/pull/313): fix: validate coda extensions before appending consonants**

Current head: [codex/legal-coda-extensions@0a9c666d](https://github.com/unglish/word-generator/tree/0a9c666d09feb29153ff7100303e725058b4e032). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `8e9ceb2f`; the inspected diff merge base is `8e9ceb2f`.

**Purpose / dependencies:** Validate optional coda extensions with the configured production constraints. Current-main #305 changes root selection and #317 changes writer provenance; #324 should follow an accepted revision of this PR. Morphological /sk/→/ss/ is separate #355.

**On current main:** Extension validation is absent from main.

**Evidence and reason:** Historical 200k removes 6,045 root-stage duplicates, leaves three morphological residuals and shifts licensed cluster frequencies; clash rate rises 0.427 pp. Engine bytes still bind to the measured source. No current-head check runs returned; old body CI is historical. Current-main merge conflicts in generate/write/docs. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/0a9c666d09feb29153ff7100303e725058b4e032/docs/coda-extensions.md).

Source binding checked here: engine/config/package bytes match `5aa948a1` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 33 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Integrate extension eligibility with current root construction and retain exact-completion versus prefix semantics for custom inventories; keep morphological alternation changes out of this fix.

**Acceptance / resumption:** Public forced-extension and 20k bare-root fixtures pass, no adjacent root duplicates, licensed separated repeats retained, rejected proposals preserve root coda, current-main quality/distribution/perf and CI pass.

### PR 316

**REVISE — [#316](https://github.com/unglish/word-generator/pull/316): fix: preserve vowels at morphological boundaries**

Current head: [codex/preserve-morphological-hiatus@0e243ee1](https://github.com/unglish/word-generator/tree/0e243ee198714146e0a3849b878f8769fe7817fc). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `8e9ceb2f`; the inspected diff merge base is `8e9ceb2f`.

**Purpose / dependencies:** Preserve morphology vowel hiatus instead of adding an unspelled /h/. Apply to merged #305/#315; coordinate with the separately revised #309 lifecycle, measuring each accepted cumulative step.

**On current main:** English still enables both fallback insertions on main.

**Evidence and reason:** Historical 200k removes 8,959 bridge events; bare outputs are identical. Phone fit improves while trigram fit/clashes worsen. Latest CI's ugh failure is historical under a now changed gate policy; textual merge with main is clean but composed behavior is unmeasured. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/0e243ee198714146e0a3849b878f8769fe7817fc/docs/morphological-hiatus.md).

Source binding checked here: engine/config/package bytes match `0e243ee1` at this head.

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/36257592427/job/108447212275); [test: failure](https://github.com/unglish/word-generator/actions/runs/36257592427/job/108447211818); [review: success](https://github.com/unglish/word-generator/actions/runs/36257592427/job/108447211782); [build: success](https://github.com/unglish/word-generator/actions/runs/36257592427/job/108447211770); [quality: success](https://github.com/unglish/word-generator/actions/runs/36257592427/job/108447211658). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 22 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Revalidate the small English policy/trace change on current main with resolved allomorphs and root budgets; then verify the #309 composition when that revision is accepted.

**Acceptance / resumption:** No English unspelled bridge, preserved boundary trace coordinates, custom enabled-policy RNG/behavior retained, current-main tests/lint/quality/perf pass and all adverse distributions retained.

### PR 320

**REVISE — [#320](https://github.com/unglish/word-generator/pull/320): fix: permit /æŋ/ rimes in the default phonology**

Current head: [codex/restore-ae-ng-rimes@818b7cf8](https://github.com/unglish/word-generator/tree/818b7cf83ae6ad5bc03601e368034b5726002c72). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `8e9ceb2f`; the inspected diff merge base is `8e9ceb2f`.

**Purpose / dependencies:** Restore /æŋ/ availability while retaining other configured exclusions. No unmerged prerequisite; use current #314/#319/#305 foundations. Do not retune its availability to the historical ang stream.

**On current main:** The /æŋ/ exclusion remains on main.

**Evidence and reason:** Historical 200k yields 1,664 initial /æŋ/ syllables, with broader trigram/duplicate-coda/open-vowel regressions. Current CI fails the seed-985 spelling and observer unmarked-stress fixture; this is not merely the old ang gate failure described in the body. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/818b7cf83ae6ad5bc03601e368034b5726002c72/docs/ae-ng-rimes.md).

Source binding checked here: engine/config/package bytes match `c46a6e82` at this head.

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/37239191406/job/111544271729); [quality: success](https://github.com/unglish/word-generator/actions/runs/37239191406/job/111544271211); [test: failure](https://github.com/unglish/word-generator/actions/runs/37239191406/job/111544271086); [review: success](https://github.com/unglish/word-generator/actions/runs/37239191406/job/111544271017); [build: success](https://github.com/unglish/word-generator/actions/runs/37239191406/job/111544270942). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 40 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Update the observer/stage semantics and deterministic mechanism fixtures for current main; evaluate availability separately from surface spelling frequency and later stress repair.

**Acceptance / resumption:** Public trace proves generation-stage reachability in all prescribed streams and retained custom bans; observer handles unmarked versus unavailable correctly; current-main checks pass with adverse effects explicitly assessed.

### PR 322

**REVISE — [#322](https://github.com/unglish/word-generator/pull/322): feat: activate a partial English syllable-quantity model**

Current head: [codex/english-partial-quantity@70290d06](https://github.com/unglish/word-generator/tree/70290d06b9b99fe9e4c1c3da33cae0c2b2c8b5dc). Current base tip: [codex/shared-syllable-weight@c15565ac](https://github.com/unglish/word-generator/tree/c15565aca3e613a5f321e3128e22098cf6c9aff5). Open; draft.

**Purpose / dependencies:** Add the named partial moraic quantity analysis and activate it in English. #319/#361 shared analysis is already merged; this branch carries an older incarnation. Lexical stress and mutation isolation must not be silently imported from other drafts.

**On current main:** Shared analysis is on main; the partial inventory quantities/default activation are absent.

**Evidence and reason:** 14,093 sampled open diphthongs become heavy, but 107,688 nuclei remain unspecified and default schwa/missing-primary diagnostics worsen. Main comparison exposes an older FOOT entry without current nucleusWordPosition metadata. Current-main conflicts; no head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/70290d06b9b99fe9e4c1c3da33cae0c2b2c8b5dc/docs/english-partial-quantity.md).

Source binding checked here: engine/config/package bytes match `70290d06` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 60 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Rebuild only the two intended inventory/config changes on the accepted weight API, preserving FOOT edge metadata; keep activation explicitly opt-in until its broader regressions have an accepted resolution.

**Acceptance / resumption:** Legacy-default and RNG parity, retained unknown quantities, no metadata aliasing, current-main checks, and a separately justified activation decision with fresh stress/rime evidence.

### PR 323

**MERGE — [#323](https://github.com/unglish/word-generator/pull/323): refactor: share the pinned CMU corpus selection contract**

Current head: [codex/shared-cmu-parser@0391120e](https://github.com/unglish/word-generator/tree/0391120ee3c7258e4c17b3b63256d094fda9979c). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; ready-for-review flag.

**Purpose / dependencies:** Share lossless CMU parsing and the existing selected population. #304 is merged; current head is two commits ahead of current main. #325 still targets the older parser commit e13c1f27, so it does not contain this head's CLI fixture fix.

**On current main:** Parser behavior is absent from main; the prior model/population is already present.

**Evidence and reason:** Pinned 135,166 records reconcile to 117,485 selected spellings; 400 score rows preserve semantics for the same 200 spellings. The exact-head patch includes the corrected CLI score fixture. No generator or performance change. This triage verified six compact package artifacts, three embedded parser sources and complete reference-model/frozen-score semantic equality; GitHub comparison confirms the latest extra commit changes only the CLI test. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/0391120ee3c7258e4c17b3b63256d094fda9979c/evaluation/experiments/cmu-shared-parser/README.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38852900182/job/116817855541); [build: success](https://github.com/unglish/word-generator/actions/runs/38852900182/job/116817854467); [test: success](https://github.com/unglish/word-generator/actions/runs/38852900182/job/116817854440); [review: success](https://github.com/unglish/word-generator/actions/runs/38852900182/job/116817854399); [quality: success](https://github.com/unglish/word-generator/actions/runs/38852900182/job/116817854225). No submitted reviews or inline review threads returned. Direct main applicability: ahead of main (GitHub comparison); 17 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend merging this exact head after the usual owner review; propagate its CLI fixture correction into descendants before considering them.

**Acceptance / resumption:** Current head/base unchanged, four applicable CI jobs green, parser/model parity and fingerprint rejection retained; no consumer or gate migration.

### PR 324

**REVISE — [#324](https://github.com/unglish/word-generator/pull/324): fix: preserve configured rime compatibility during nucleus repair**

Current head: [codex/root-rime-compatibility@a5885c28](https://github.com/unglish/word-generator/tree/a5885c28b798b809078dbef04d490ca079829a91). Current base tip: [codex/root-rime-control@13c2524d](https://github.com/unglish/word-generator/tree/13c2524dccabd58d37f5a8ec675eeffe1181df95). Open; ready-for-review flag.

**Purpose / dependencies:** Preserve configured nucleus/coda compatibility through root repairs. Depends on accepted #313 and already merged #314; current control 13c2524d contains old snapshots, not current accepted composition.

**On current main:** Repair filtering/assertion is absent from main.

**Evidence and reason:** Historical 200k changes prepared-root violations 22→0, with 19,300 changed-repair traces and mixed diversity/trigram effects; source bytes remain bound. No head checks. Direct main merge conflicts and imports old dependency files. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/a5885c28b798b809078dbef04d490ca079829a91/docs/root-rime-compatibility.md).

Source binding checked here: engine/config/package bytes match `43f21fb2` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 66 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** After #313 is accepted, port only the shared pair predicate, replacement-pool filtering and detached trace additions onto that cumulative base.

**Acceptance / resumption:** Configured root pair violations zero; finite positive pools fail before RNG if empty; retained coda/weights and cleared-policy parity verified; current-main structural/distribution/perf/CI pass.

### PR 325

**REVISE — [#325](https://github.com/unglish/word-generator/pull/325): feat(evaluation): add matched CMU reference populations**

Current head: [codex/matched-cmu-reference@b388f03e](https://github.com/unglish/word-generator/tree/b388f03e5ea415dbc96a2d42fd22a22f53cf1318). Current base tip: [codex/shared-cmu-parser@0391120e](https://github.com/unglish/word-generator/tree/0391120ee3c7258e4c17b3b63256d094fda9979c). Open; ready-for-review flag.

The PR metadata reports older base `e13c1f27`; the inspected diff merge base is `e13c1f27`.

**Purpose / dependencies:** Publish one matched CMU population and fixed-output reference sensitivity. #323 first; current base e13c1f27 is an older parser snapshot and lacks its latest fixture correction.

**On current main:** Matched reference is absent; current generator stays unchanged by this PR.

**Evidence and reason:** 117,485 entries and complete integer tables/independent reconstruction support offline construction; score shifts do not demonstrate output gains. Current build/test/quality pass but review fails on the old score implementation fingerprint. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/b388f03e5ea415dbc96a2d42fd22a22f53cf1318/docs/cmu-matched-reference.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38785550967/job/116596496652); [test: success](https://github.com/unglish/word-generator/actions/runs/38785550967/job/116596494276); [quality: success](https://github.com/unglish/word-generator/actions/runs/38785550967/job/116596494247); [review: failure](https://github.com/unglish/word-generator/actions/runs/38785550967/job/116596494198); [build: success](https://github.com/unglish/word-generator/actions/runs/38785550967/job/116596494175). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 25 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Carry #323's accepted CLI fixture correction without altering frozen scientific results; refresh stale CI/dependency wording and check the matched artifact's expected source bindings.

**Acceptance / resumption:** All current CI green, same selected population and legacy bytes, complete count/projection/sensitivity checks pass using explicit pinned inputs; no runtime reference adoption.

### PR 326

**DEFER — [#326](https://github.com/unglish/word-generator/pull/326): fix: detach quantity metadata across lexical views**

Current head: [codex/detach-lexical-metadata@cf017f74](https://github.com/unglish/word-generator/tree/cf017f74e063d0478556d1790c13fe494566545a). Current base tip: [codex/stress-pattern-composition@ca6654cf](https://github.com/unglish/word-generator/tree/ca6654cfff2b827bee16bb5cc8d9fbc5f9fd34d2). Open; ready-for-review flag.

**Purpose / dependencies:** Detach nested quantity metadata across lexical/root/surface views. Prerequisite: accepted current-main lexical-view lifecycle from revised #309. Do not require acceptance of #322's English default activation just to fix copying.

**On current main:** Lexical views are absent; shared quantity metadata types are already on main.

**Evidence and reason:** Historical 200k complete words/traces and 20k RNG schedule match control; five mutation cases isolate the defect. No head checks; branch embeds old #309/#322/#315 composition and conflicts with main. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/cf017f74e063d0478556d1790c13fe494566545a/evaluation/experiments/lexical-metadata-detachment).

Source binding checked here: engine/config/package bytes match `72222591` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 39 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume after the lexical-view contract lands; apply the clone helper and replacement-copy sites to that exact base.

**Acceptance / resumption:** Mutation isolation for root/lexical/surface/config and subsequent calls; complete output/trace/RNG parity against accepted base; tests/lint/perf/CI pass.

### PR 327

**REVISE — [#327](https://github.com/unglish/word-generator/pull/327): fix(corpus): make phoneme reference regeneration explicit**

Current head: [codex/explicit-cmu-phoneme-builder@cce6b532](https://github.com/unglish/word-generator/tree/cce6b5320d20c61723e5f2396660bb12cb5202ad). Current base tip: [codex/matched-cmu-reference@b388f03e](https://github.com/unglish/word-generator/tree/b388f03e5ea415dbc96a2d42fd22a22f53cf1318). Open; ready-for-review flag.

**Purpose / dependencies:** Make phoneme-reference regeneration explicit and non-overwriting. #323→#325, then this builder; base is current #325 head but excludes #323's later fixture fix.

**On current main:** Builder workflow fix is absent; existing legacy baselines remain on main.

**Evidence and reason:** Independent 742,333-event reconstruction and 69 native/39 base bins support construction. Current review CI fails the same fingerprint fixture; other applicable jobs pass. No generator performance claim is needed. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/cce6b5320d20c61723e5f2396660bb12cb5202ad/docs/cmu-phoneme-builder.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38785550228/job/116596493123); [review: failure](https://github.com/unglish/word-generator/actions/runs/38785550228/job/116596491511); [build: success](https://github.com/unglish/word-generator/actions/runs/38785550228/job/116596491013); [test: success](https://github.com/unglish/word-generator/actions/runs/38785550228/job/116596490985); [quality: success](https://github.com/unglish/word-generator/actions/runs/38785550228/job/116596490465). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 15 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Propagate accepted parent correction and rerun bounded builder/integrity/CLI checks; preserve named units and externally expected implementation bytes.

**Acceptance / resumption:** Current CI green; wrong/missing source, aliases and existing destinations rejected; deterministic artifact reproduction and legacy/runtime file preservation.

### PR 328

**REVISE — [#328](https://github.com/unglish/word-generator/pull/328): feat: preserve phoneme coverage through spelling budgets**

Current head: [codex/preserve-spelling-coverage@0bd988a2](https://github.com/unglish/word-generator/tree/0bd988a23464230d1f5edf1600a4fe0592355e0c). Current base tip: [codex/spelling-coverage-control@ba83ac2c](https://github.com/unglish/word-generator/tree/ba83ac2c851673ced5eca237f715ac0283ea25d2). Open; draft.

**Purpose / dependencies:** Preserve whole phone spelling units through written budgets. Merged #305/#315/#317 are only prerequisites; #310 legal selection still needs acceptance. Current ba83ac2c control is historical.

**On current main:** Current base ledger exists on main; active phone-preserving budget planner does not.

**Evidence and reason:** Historical partial-th 126→0 and erased units 1700→0; 1,517 certificates replay, but five-consonant words 22→203 and throughput ~38% lower/below 4500. Exact engine correspondence holds; broad main conflicts and no head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/0bd988a23464230d1f5edf1600a4fe0592355e0c/evaluation/experiments/spelling-coverage/README.md).

Source binding checked here: engine/config/package bytes match `97340676` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 82 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** First produce a bounded replacement design on current ledger with the same phone-preservation contract and explicit refusal behavior; resolve budget/coverage conflict and cost before extending shared/split constructions.

**Acceptance / resumption:** No phone erasure/partial digraphs, no new illegal letter pileups or gate relaxation, valid licenses/refusals, deterministic full trace/RNG tests, current-main quality and speed floor satisfied under an approved protocol.

### PR 329

**REVISE — [#329](https://github.com/unglish/word-generator/pull/329): fix(corpus): require explicit length reference regeneration**

Current head: [codex/explicit-cmu-length-builder@b6eff22d](https://github.com/unglish/word-generator/tree/b6eff22d7a376710ea061aad2f8b95d3cde8b8b5). Current base tip: [codex/explicit-cmu-phoneme-builder@cce6b532](https://github.com/unglish/word-generator/tree/cce6b5320d20c61723e5f2396660bb12cb5202ad). Open; ready-for-review flag.

**Purpose / dependencies:** Make length-reference regeneration explicit with integer entry units. #323→#325→#327→#329; parent corrections must propagate in that order.

**On current main:** Workflow fix is absent; old length baseline stays on main.

**Evidence and reason:** 117,485-entry histogram/conditional reconstruction and path protection support offline change. Current review fingerprint fixture fails; build/test/quality pass. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/b6eff22d7a376710ea061aad2f8b95d3cde8b8b5/docs/cmu-length-builder.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38785549643/job/116596491776); [review: failure](https://github.com/unglish/word-generator/actions/runs/38785549643/job/116596489651); [test: success](https://github.com/unglish/word-generator/actions/runs/38785549643/job/116596489610); [quality: success](https://github.com/unglish/word-generator/actions/runs/38785549643/job/116596489571); [build: success](https://github.com/unglish/word-generator/actions/runs/38785549643/job/116596489220). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 17 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Propagate accepted parent correction; recheck fresh-output and externally bound histogram/conditional artifact validation.

**Acceptance / resumption:** Current CI green; deterministic aliases/cwd behavior, full pinned bin reconstruction, current legacy/runtime files unchanged and no consumer migration.

### PR 330

**DEFER — [#330](https://github.com/unglish/word-generator/pull/330): feat(trace): expose complete stress assignments and patterns**

Current head: [codex/stress-pattern-observation@3d5f1a9f](https://github.com/unglish/word-generator/tree/3d5f1a9feb07b7c13cd384b8c0daf9036295da60). Current base tip: [codex/detach-lexical-metadata@cf017f74](https://github.com/unglish/word-generator/tree/cf017f74e063d0478556d1790c13fe494566545a). Open; ready-for-review flag.

**Purpose / dependencies:** Expose complete stress assignments and seven domain snapshots without changing output. Prerequisite: accepted lexical lifecycle and detachment (#309→#326); older #322 activation must not enter by ancestry alone.

**On current main:** Current main has stressWeight observations, not the complete pattern/origin trace.

**Evidence and reason:** 200k historical words/legacy traces and 281,110 assignments replay; reported parity and single perf interval support instrumentation only. Three inherited assertions remain; no head checks and main conflicts. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/3d5f1a9feb07b7c13cd384b8c0daf9036295da60/evaluation/experiments/complete-stress-patterns).

Source binding checked here: engine/config/package bytes match `564dc572` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 64 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume after the accepted lifecycle/clone base; port the observer hooks and analyzer, preserving trace-domain meaning.

**Acceptance / resumption:** Exact legacy word/trace/RNG parity, detached snapshots, all assignments replay/bind to actual morphology; current-main checks/perf pass.

### PR 331

**DEFER — [#331](https://github.com/unglish/word-generator/pull/331): perf: avoid rebuilding spelling budget context**

Current head: [codex/linear-spelling-budget-scan@47d4dd9a](https://github.com/unglish/word-generator/tree/47d4dd9a704218e0686a2996c72ee55471c58e31). Current base tip: [codex/preserve-spelling-coverage@0bd988a2](https://github.com/unglish/word-generator/tree/0bd988a23464230d1f5edf1600a4fe0592355e0c). Open; ready-for-review flag.

The PR metadata reports older base `97340676`; the inspected diff merge base is `97340676`.

**Purpose / dependencies:** Avoid repeated context rebuilding in spelling-budget measurement. Prerequisite: accepted revised #328 representation. Current base 97340676 is an older #328 snapshot.

**On current main:** Budget module is absent from main.

**Evidence and reason:** 800k parity calls plus 84,800 custom calls and six timings support a local 6.4% improvement; inherited quality failures remain. No head checks; current-main conflicts are inherited stack conflicts. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/47d4dd9a704218e0686a2996c72ee55471c58e31/evaluation/experiments/linear-spelling-budget-scan/README.md).

Source binding checked here: engine/config/package bytes match `0338fbc3` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 81 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only if the accepted budget planner still has this measured bottleneck; apply the small scan optimization to its exact code.

**Acceptance / resumption:** Full measurement/token/y/Unicode parity, certificates and next-RNG agreement; original quality checks unchanged and speed floor satisfied on accepted base.

### PR 332

**REVISE — [#332](https://github.com/unglish/word-generator/pull/332): Require explicit pinned CMU phone-transition construction**

Current head: [codex/explicit-cmu-transition-builder@cef6144d](https://github.com/unglish/word-generator/tree/cef6144d9f8ae998881d17c26f2fb43206626884). Current base tip: [codex/explicit-cmu-length-builder@b6eff22d](https://github.com/unglish/word-generator/tree/b6eff22d7a376710ea061aad2f8b95d3cde8b8b5). Open; ready-for-review flag.

**Purpose / dependencies:** Make phone-transition construction pinned, explicit and non-overwriting. #323→#325→#327→#329→#332.

**On current main:** New builder is absent; active scorer table remains on main unchanged.

**Evidence and reason:** 859,818 transitions per view and 2,985 native/1,339 base pair bins independently reconstructed. Current review fingerprint fixture fails; other applicable jobs pass. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/cef6144d9f8ae998881d17c26f2fb43206626884/docs/cmu-transition-builder.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38785550652/job/116596495138); [quality: success](https://github.com/unglish/word-generator/actions/runs/38785550652/job/116596492987); [test: success](https://github.com/unglish/word-generator/actions/runs/38785550652/job/116596492841); [build: success](https://github.com/unglish/word-generator/actions/runs/38785550652/job/116596492798); [review: failure](https://github.com/unglish/word-generator/actions/runs/38785550652/job/116596492290). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 31 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Propagate the accepted parent fixture correction and verify current source/parent pins plus path guards.

**Acceptance / resumption:** All CI green; every transition bin reproduced; marginal-preserving corruption rejected; no active scorer/table change.

### PR 333

**REVISE — [#333](https://github.com/unglish/word-generator/pull/333): Require explicit pinned CMU score-reference construction**

Current head: [codex/explicit-cmu-score-reference@5b75ea4a](https://github.com/unglish/word-generator/tree/5b75ea4a1a6e67cce6516fdb467c59929f1e4425). Current base tip: [codex/explicit-cmu-transition-builder@cef6144d](https://github.com/unglish/word-generator/tree/cef6144d9f8ae998881d17c26f2fb43206626884). Open; ready-for-review flag.

**Purpose / dependencies:** Make score-reference construction reproducible and keep it separate from active gates. Accept #332 and the earlier corpus chain first.

**On current main:** New builder/reference absent; historical scorer/gates already on main.

**Evidence and reason:** 117,485 ordered rows and 234,978 numeric values independently match. Current review fingerprint fixture fails; build/test/quality pass. This does not justify changing scorer consumers. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/5b75ea4a1a6e67cce6516fdb467c59929f1e4425/docs/cmu-score-reference.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38785550961/job/116596496184); [review: failure](https://github.com/unglish/word-generator/actions/runs/38785550961/job/116596494739); [quality: success](https://github.com/unglish/word-generator/actions/runs/38785550961/job/116596494698); [build: success](https://github.com/unglish/word-generator/actions/runs/38785550961/job/116596494543); [test: success](https://github.com/unglish/word-generator/actions/runs/38785550961/job/116596494357). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 36 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Propagate accepted parent corrections; verify the explicit builder and complete-row integrity against its current parent.

**Acceptance / resumption:** CI green, exact historical scoring semantics/legacy artifacts, complete expected-row reconstruction, aliases/protected destinations rejected; no gate/scorer migration.

### PR 334

**REVISE — [#334](https://github.com/unglish/word-generator/pull/334): Add verified conditional root stress law and sampler**

Current head: [codex/conditional-root-stress@9e772f25](https://github.com/unglish/word-generator/tree/9e772f257def91b4370462e17156f71b8f54575d). Current base tip: [codex/stress-pattern-observation@3d5f1a9f](https://github.com/unglish/word-generator/tree/3d5f1a9feb07b7c13cd384b8c0daf9036295da60). Open; ready-for-review flag.

**Purpose / dependencies:** Expose the pure conditional root-stress law and backward sampler. Current branch imports #330→#326→#322 and old #309 composition; pure law need not accept those behaviors.

**On current main:** Law/sampler is absent from main.

**Evidence and reason:** Large exact-history/numeric-grid/tape evidence supports a bounded analytical API; 33/34 positive patterns appeared, missing rare expected count 0.895. No human/output improvement or machine-exact continuous sampling proof. No head CI and broad inherited main conflicts. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/9e772f257def91b4370462e17156f71b8f54575d/docs/conditional-root-stress-law.md).

Source binding checked here: engine/config/package bytes match `9e772f25` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 79 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Isolate the pure API and minimal stress-mark types from the unaccepted runtime stack; preserve all original oracle/tape findings and zero-support/numerical contracts.

**Acceptance / resumption:** Generator/default/trace/RNG byte parity on current main, focused law/adversarial tests and published proof pins valid for isolated source, current CI green; no activation from #337.

### PR 335

**DEFER — [#335](https://github.com/unglish/word-generator/pull/335): fix: preserve whole spelling units during deduplication**

Current head: [codex/preserve-deduplication-units@ae2965db](https://github.com/unglish/word-generator/tree/ae2965dbc803d5be9d9e49f4dcf4d8606d7edc71). Current base tip: [codex/linear-spelling-budget-scan@47d4dd9a](https://github.com/unglish/word-generator/tree/47d4dd9a704218e0686a2996c72ee55471c58e31). Open; draft.

The PR metadata reports older base `569adf51`; the inspected diff merge base is `569adf51`.

**Purpose / dependencies:** Preserve complete units during adjacent-letter deduplication. Prerequisite: accepted #328 and, if still relevant, #331; current base is an older #331 snapshot.

**On current main:** Whole-unit normalization is absent from main.

**Evidence and reason:** Historical erased units 7398→0 and partial-th 31→0, but five-consonant words 203→252, quality fails, median throughput −4.22% and speed-floor passes 6/6→2/6. No head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/ae2965dbc803d5be9d9e49f4dcf4d8606d7edc71/evaluation/experiments/unit-normalization/README.md).

Source binding checked here: engine/config/package bytes match `855def78` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 169 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume once accepted budget/reading ownership can support normalization without destructive letter clipping; do not promote this frozen prototype merely for structural zeros.

**Acceptance / resumption:** Whole-phone multiplicity/licenses preserved, no new pileups, current quality/speed checks pass, exact disabled-policy and trace/RNG parity.

### PR 336

**REVISE — [#336](https://github.com/unglish/word-generator/pull/336): Measure phone-transition reference sensitivity on fixed word vectors**

Current head: [codex/phone-transition-model-sensitivity@e3a6528b](https://github.com/unglish/word-generator/tree/e3a6528b463c4ee74b5ecd17e2a9c93db0f2bd50). Current base tip: [codex/explicit-cmu-score-reference@5b75ea4a](https://github.com/unglish/word-generator/tree/5b75ea4a1a6e67cce6516fdb467c59929f1e4425). Open; draft.

**Purpose / dependencies:** Measure phone-transition table sensitivity on fixed vectors. Accepted #333 chain and merged #318 identity contract; this is offline comparison, not scorer adoption.

**On current main:** Sensitivity tooling/results absent from main.

**Evidence and reason:** 317,485 vectors and 5,325,847 numeric checks support historical comparison; English B is in-sample and A overlap unknown. Current review has seven failures: common fingerprint fixture plus five missing identity-module cases and missing external-manifest fixture. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/e3a6528b463c4ee74b5ecd17e2a9c93db0f2bd50/evaluation/experiments/cmu-model-sensitivity/outcomes/README.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38785550267/job/116596494189); [review: failure](https://github.com/unglish/word-generator/actions/runs/38785550267/job/116596491188); [quality: success](https://github.com/unglish/word-generator/actions/runs/38785550267/job/116596491003); [build: success](https://github.com/unglish/word-generator/actions/runs/38785550267/job/116596490995); [test: success](https://github.com/unglish/word-generator/actions/runs/38785550267/job/116596490946). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 158 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Use checked-in or explicitly staged hash-pinned small identity/manifest fixtures in normal tests; keep full historical archive verification a separate explicit integration command. Carry the #323 fixture correction.

**Acceptance / resumption:** All current CI green from a clean checkout without old /private/tmp or worktree paths; bounded fixtures preserve validation strength; recorded full study/source/projection pins and negative history remain unchanged.

### PR 337

**CLOSE — [#337](https://github.com/unglish/word-generator/pull/337): Add measured opt-in conditional root stress patterns**

Current head: [codex/conditional-root-stress-runtime@8a2ffd61](https://github.com/unglish/word-generator/tree/8a2ffd618a63f4b2295728a63b552fbdfc1e4c6f). Current base tip: [codex/conditional-root-stress@9e772f25](https://github.com/unglish/word-generator/tree/9e772f257def91b4370462e17156f71b8f54575d). Open; draft.

**Purpose / dependencies:** Activate fixed-count conditional root-stress placement. Depends on #334 and the unaccepted stress lifecycle/quantity stack.

**On current main:** Opt-in activation is absent.

**Evidence and reason:** Adjacency 47,730→46,180 but lapses and non-monosyllable trigram fit worsen; median throughput −17.1% untraced/−48.1% traced. Fixed K cannot resolve important disyllabic clashes; no human gain. Engine evidence remains bound; no head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/8a2ffd618a63f4b2295728a63b552fbdfc1e4c6f/evaluation/experiments/conditional-root-stress-runtime/outcomes/README.md).

Source binding checked here: engine/config/package bytes match `a204eed0` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 203 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend closing this activation hypothesis after preserving results and linking the pure-law alternative #334; do not delete frozen branches/evidence.

**Acceptance / resumption:** Record the negative decision and preserve source/tape/timing failures; reconsider only as a newly registered assembled-stress hypothesis with a specific benefit and cost budget.

### PR 338

**REVISE — [#338](https://github.com/unglish/word-generator/pull/338): fix: preserve phonemic readings through consonant doubling**

Current head: [codex/phoneme-aware-doubling@d81c7c64](https://github.com/unglish/word-generator/tree/d81c7c64303b41961bfad0b11889966474eec14e). Current base tip: [codex/preserve-deduplication-units@ae2965db](https://github.com/unglish/word-generator/tree/ae2965dbc803d5be9d9e49f4dcf4d8606d7edc71). Open; draft.

The PR metadata reports older base `ce3800dd`; the inspected diff merge base is `ce3800dd`.

**Purpose / dependencies:** Make consonant doubling sound-specific rather than letting /s/:c become ck. Currently stacked on older #335; the core doubling guard can be considered independently of accepting the entire normalization stack.

**On current main:** Main still uses selected-form doubledForms, so the phonemic defect is not already fixed.

**Evidence and reason:** Historical unsupported expansions 1682→0, including 220 /s/:c→ck; median local throughput +8.73%, but inherited quality failures and unresolved cells remain. No head checks; broad direct-main conflicts. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/d81c7c64303b41961bfad0b11889966474eec14e/docs/phoneme-aware-doubling.md).

Source binding checked here: engine/config/package bytes match `91fd20a9` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 198 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Extract the 14 explicit realizations and writer guard onto current main; propagate reading support only for accepted representations, with forced public fixtures for every relation.

**Acceptance / resumption:** No unsupported expansion, all supported relations reachable, current selected-form/custom legacy behavior documented, no trace/RNG mismatch or quality regression, current-main full checks/perf green.

### PR 343

**DEFER — [#343](https://github.com/unglish/word-generator/pull/343): feat: evaluate an opt-in Kani-verified Rust/Wasm repair core**

Current head: [codex/issue-342-rust-repair-pilot@39dbb749](https://github.com/unglish/word-generator/tree/39dbb7497357d0892cd94aa9cdc51ca501111eaf). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `0abaff30`; the inspected diff merge base is `0abaff30`.

**Purpose / dependencies:** Retain the opt-in Rust/Wasm repair pilot. Separate #342 architecture effort; no linguistic PR should depend on this. Current main conflicts in pipeline/build/package surfaces.

**On current main:** Pilot/backend is absent from main.

**Evidence and reason:** Head CI including native/Wasm and Kani is green, with bounded proof/parity. No whole-generator speedup; adapter costs and extra publishing toolchain remain material. Kani bounds are not an unbounded engine proof. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/39dbb7497357d0892cd94aa9cdc51ca501111eaf/docs/rust-repair-pilot.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/37056765811/job/111003262454); [kani: success](https://github.com/unglish/word-generator/actions/runs/37056765858/job/111003260804); [quality: success](https://github.com/unglish/word-generator/actions/runs/37056765811/job/111003260739); [build: success](https://github.com/unglish/word-generator/actions/runs/37056765811/job/111003260696); [review: success](https://github.com/unglish/word-generator/actions/runs/37056765811/job/111003260632); [native-wasm: success](https://github.com/unglish/word-generator/actions/runs/37056765858/job/111003260602); [test: success](https://github.com/unglish/word-generator/actions/runs/37056765811/job/111003260268). No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 41 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only for an explicit opt-in backend/product requirement or a measured accepted-main repair bottleneck that justifies toolchain/distribution cost.

**Acceptance / resumption:** Current-main integration and package/browser/worker parity; bounded proof scope retained; agreed cost budget, startup/device requirements and no default-backend change without separate acceptance.

### PR 344

**DEFER — [#344](https://github.com/unglish/word-generator/pull/344): feat: measure aligned shared-grapheme ownership**

Current head: [codex/aligned-shared-graphemes@60f2e36e](https://github.com/unglish/word-generator/tree/60f2e36e8dda66d0c338fde071a3748771a7601f). Current base tip: [codex/phoneme-aware-doubling@d81c7c64](https://github.com/unglish/word-generator/tree/d81c7c64303b41961bfad0b11889966474eec14e). Open; draft.

The PR metadata reports older base `b2373ca8`; the inspected diff merge base is `b2373ca8`.

**Purpose / dependencies:** Record aligned ownership for multi-phone shared graphemes. Prerequisite: accepted #328/#335/#338 representations; declared base is older #338 b2373ca, not its current head.

**On current main:** Main has legacy string contractions, not the structured shared construction policy.

**Evidence and reason:** 5,156 supported formations and unresolved cells 63938→57428, but infeasible budgets rise and median throughput −16.18%, speed-floor passes 6/6→0/6. No head checks; source bytes still match measured 5f9b3ebd. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/60f2e36e8dda66d0c338fde071a3748771a7601f/evaluation/experiments/aligned-shared-graphemes/RESULTS.md).

Source binding checked here: engine/config/package bytes match `5f9b3ebd` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 445 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only after the base phone-preservation design is accepted and has budget for shared ownership; retain this experiment as mechanism evidence.

**Acceptance / resumption:** Correct joint phone/cell ownership across edits, no new infeasible-budget regression or quality failure, original speed floor and current CI pass; complete final-word licensing remains separately evaluated.

### PR 345

**DEFER — [#345](https://github.com/unglish/word-generator/pull/345): feat: measure opt-in split-vowel constructions**

Current head: [codex/split-vowel-constructions@07607f91](https://github.com/unglish/word-generator/tree/07607f914e1222a6feee48bf9abf3d3739c10793). Current base tip: [codex/aligned-shared-graphemes@60f2e36e](https://github.com/unglish/word-generator/tree/60f2e36e8dda66d0c338fde071a3748771a7601f). Open; draft.

The PR metadata reports older base `5f9b3ebd`; the inspected diff merge base is `5f9b3ebd`.

**Purpose / dependencies:** Build owned split-vowel formations and obligation completion. Prerequisite: accepted #344 on the accepted spelling foundation. Declared base is older #344 5f9b3ebd; completion follow-ups continue this experiment.

**On current main:** Legacy silent-e exists, but owned opt-in split constructions/completion are absent.

**Evidence and reason:** Formal v2 has 7,470 live constructions, unresolved 29835→2887 and 8051 unavailable; all-profile trigram worsening and −63.44% median throughput, two quality failures and no speed-floor passes. Later #374 addresses the narrow residual target, not these costs. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/07607f914e1222a6feee48bf9abf3d3739c10793/evaluation/experiments/split-digraphs/RESULTS.md).

Source binding checked here: engine/config/package bytes match `f284fb8c` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 236 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only after accepted ownership architecture and a feasible performance/quality budget; consider the full measured completion chain, not v1 or a standalone merge of this failed intermediate.

**Acceptance / resumption:** Current-main composition, disclosed unavailable denominator, zero unresolved under declared supported policy plus original quality/speed targets, deterministic replay; any rerun needs separate authorization.

### PR 346

**CLOSE — [#346](https://github.com/unglish/word-generator/pull/346): feat: measure soft c/g following-letter conditions**

Current head: [codex/following-letter-conditions@eb1c2165](https://github.com/unglish/word-generator/tree/eb1c21651aa7f01c33b9f3541d0035c2d8d8f2a3). Current base tip: [codex/split-vowel-constructions@07607f91](https://github.com/unglish/word-generator/tree/07607f914e1222a6feee48bf9abf3d3739c10793). Open; draft.

The PR metadata reports older base `f284fb8c`; the inspected diff merge base is `f284fb8c`.

**Purpose / dependencies:** Condition soft c/g on following letters using the full sequence model. Depends on #345/#344 and prior failed spelling prototypes; #347/348 inherit this intervention.

**On current main:** Conditioned sequence model is absent from main.

**Evidence and reason:** Initial incompatible targets 2065→0, but all-profile trigram worsening, quality failures and −50.75% median throughput with all speed floors failed. Source bytes remain bound; no head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/eb1c21651aa7f01c33b9f3541d0035c2d8d8f2a3/evaluation/experiments/following-letter-conditions/RESULTS.md).

Source binding checked here: engine/config/package bytes match `0d841bda` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 181 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend closing the full sequence-model experiment, retaining exact laws, traces and negative findings; a future small local licensing guard needs its own focused proposal.

**Acceptance / resumption:** Preserve reports and frozen refs before coordinated dependent cleanup; no transplant of this runtime through #347 or #348. Reopen only for a new bounded design with explicit benefit/cost acceptance.

### PR 347

**CLOSE — [#347](https://github.com/unglish/word-generator/pull/347): test: compose lexical stress and spelling comparison control**

Current head: [codex/spelling-stress-control@905ba3e9](https://github.com/unglish/word-generator/tree/905ba3e92d396db358504fec1826c1c83f680ff3). Current base tip: [codex/following-letter-conditions@eb1c2165](https://github.com/unglish/word-generator/tree/eb1c21651aa7f01c33b9f3541d0035c2d8d8f2a3). Open; draft.

The PR metadata reports older base `6f435391`; the inspected diff merge base is `0d841bda`.

**Purpose / dependencies:** Preserve the old lexical-stress/spelling experimental comparison control. Combines #309 and older #346, which itself imports the entire unaccepted spelling stack. It is an evidence control, not an independent release feature.

**On current main:** Some foundations are merged; the composition is not on main.

**Evidence and reason:** Four matched writer failures persist, two counts worsen, and active quality times out. Its exact 905ba3e control remains necessary to interpret #348 evidence. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/905ba3e92d396db358504fec1826c1c83f680ff3/evaluation/experiments/spelling-stress-control/CHECKPOINT.md).

Source binding checked here: engine/config/package bytes match `905ba3e9` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 50 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend retiring this PR as a delivery path; preserve the immutable control ref/source and its downstream evidence bindings. Any revised #348 must use a new accepted-main control.

**Acceptance / resumption:** Dependent PR descriptions/ledger identify the retained historical control and replacement base before any branch cleanup; no scientific result relabelled as current-main.

### PR 348

**REVISE — [#348](https://github.com/unglish/word-generator/pull/348): feat: record measured final-word operational provenance**

Current head: [depatched/final-word-provenance@9b24c530](https://github.com/unglish/word-generator/tree/9b24c530f602685753f3e5b3d26d238552e61267). Current base tip: [codex/spelling-stress-control@905ba3e9](https://github.com/unglish/word-generator/tree/905ba3e92d396db358504fec1826c1c83f680ff3). Open; draft.

**Purpose / dependencies:** Provide final-word operational phone/cell provenance. Current #347 delivery stack includes rejected #346; #349 CLI fix and #366 optimization do not accept that stack.

**On current main:** Main has base-spelling provenance (#317), not complete final-word provenance.

**Evidence and reason:** 200k complete operational replays/legacy words agree, but this does not prove phonemic spelling licenses. Trace audit heap failure is handled by #349; throughput −13.88%, storage +67.7%, rising-coda timeout and inherited writer/quality failures remain. Source-byte correspondence to 7e34a17 is verified. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/9b24c530f602685753f3e5b3d26d238552e61267/evaluation/experiments/final-word-ownership/RESULTS.md).

Source binding checked here: engine/config/package bytes match `7e34a17f` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 258 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Separate provenance-only integration onto accepted current-main mechanisms, avoiding #347's active policy imports; make cost/retention behavior explicit and address the original timeout before promotion.

**Acceptance / resumption:** Complete final-surface/morphology/gap replay and trace/plain RNG parity, no extra default output changes, original 50k trace audit and original suite timeouts/speed floors pass; current-main CI green.

### PR 349

**REVISE — [#349](https://github.com/unglish/word-generator/pull/349): fix: bound trace audit retention with identical seeded metrics**

Current head: [depatched/stream-trace-audit@4a5defa5](https://github.com/unglish/word-generator/tree/4a5defa56c7649145bfa9c953e698dc57a2d0acd). Current base tip: [depatched/final-word-provenance@9b24c530](https://github.com/unglish/word-generator/tree/9b24c530f602685753f3e5b3d26d238552e61267). Open; draft.

The PR metadata reports older base `76b102ea`; the inspected diff merge base is `76b102ea`.

**Purpose / dependencies:** Stream the trace-audit CLI to bound retained memory. Currently based on an older #348 head 76b102ea; this 36-line script change need not import that unaccepted engine.

**On current main:** Current main still retains the whole generated traced batch.

**Evidence and reason:** Historical unchanged 50k audit and 10k full Words/next-RNG checks preserve metrics while fixing heap retention. No head checks; no generator source delta in this PR. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/4a5defa56c7649145bfa9c953e698dc57a2d0acd/evaluation/experiments/stream-trace-audit).

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 8 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Isolate the CLI patch on current main, preserving one public seeded RNG stream, count guards and all report semantics.

**Acceptance / resumption:** Byte-identical current-main aggregate reports and deterministic full-word/next-RNG fixtures; unchanged default 50k audit completes under default heap; current tests/lint/CI pass.

### PR 350

**REVISE — [#350](https://github.com/unglish/word-generator/pull/350): Preserve configured final checked-vowel legality with measured evidence**

Current head: [depatched/final-checked-vowels@e6648448](https://github.com/unglish/word-generator/tree/e6648448283fce238a7aba82555aad389d9e4e08). Current base tip: [depatched/stream-trace-audit@4a5defa5](https://github.com/unglish/word-generator/tree/4a5defa56c7649145bfa9c953e698dc57a2d0acd). Open; draft.

**Purpose / dependencies:** Enforce a structured final open checked-vowel contract. Depends on #349 and a revised accepted final-word/lifecycle foundation; current base embeds the old #347/#348 stack.

**On current main:** Main's root-edge FOOT rule is narrower; this final lexical/surface policy is absent.

**Evidence and reason:** 800k four-arm replay/recount reaches zero configured final violations, but candidate unit failures 5→11 include reduced inventories without replacements; all original gate commands and speed floors fail. Source correspondence holds; no head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/e6648448283fce238a7aba82555aad389d9e4e08/evaluation/experiments/final-checked-vowels/RESULTS.md).

Source binding checked here: engine/config/package bytes match `8499e925` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 252 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resolve the reduced/custom-inventory contract and contradictory affix realization errors with explicit eligibility/refusal semantics, then port only onto the accepted lifecycle.

**Acceptance / resumption:** No new valid-config exceptions, root/affix/reduction legality and provenance fixtures pass, deterministic changed-RNG contract documented, original full quality/perf/timeouts and current-main CI pass.

### PR 351

**REVISE — [#351](https://github.com/unglish/word-generator/pull/351): Measure conditional onset/rime prediction with held-out and rare-tail evidence**

Current head: [depatched/conditional-onset-rime@14b40ad7](https://github.com/unglish/word-generator/tree/14b40ad761fd8a497c3a1271d5f94a0ec4e6b7bf). Current base tip: [codex/phone-transition-model-sensitivity@e3a6528b](https://github.com/unglish/word-generator/tree/e3a6528b463c4ee74b5ecd17e2a9c93db0f2bd50). Open; draft.

**Purpose / dependencies:** Add an offline conditional onset/rime predictor with held-out evidence. Accept repaired #336/#333 corpus chain first; identity prerequisite #318 is merged.

**On current main:** Model/tooling is absent; active generator/scorer unchanged by own delta.

**Evidence and reason:** Held-out mean loss improves 9.12%, but unseen-context events worsen 7.72753 nats/event and smoothing selects grid boundary 64. Original cbf479a engine is not current head's inherited engine after rebase; the four own conditional analysis files are byte-identical to that measured source. Current review inherits seven missing-input/fingerprint failures. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/14b40ad761fd8a497c3a1271d5f94a0ec4e6b7bf/evaluation/experiments/conditional-onset-rime/RESULTS.md).

Source binding: engine/config/package paths differ from `cbf479a1`; the four own conditional-analysis files match. This is offline-model evidence, not a current-generator capture.

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/38785549601/job/116596493470); [quality: success](https://github.com/unglish/word-generator/actions/runs/38785549601/job/116596489143); [build: success](https://github.com/unglish/word-generator/actions/runs/38785549601/job/116596489082); [review: failure](https://github.com/unglish/word-generator/actions/runs/38785549601/job/116596489073); [test: success](https://github.com/unglish/word-generator/actions/runs/38785549601/job/116596488623). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 65 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Repair inherited hermetic fixtures, verify the conditional analysis-source pins after corpus rebasing and preserve all rare-tail/support results without held-out retuning.

**Acceptance / resumption:** Clean-checkout CI green; exact splits/counts/smoothing choices and rare-tail diagnostics reproduced from pinned source; no claim of generator or human improvement and no runtime adoption.

### PR 353

**CLOSE — [#353](https://github.com/unglish/word-generator/pull/353): Evaluate token-weighted running-text targets and retain regressions**

Current head: [depatched/running-text-frequency@491c4998](https://github.com/unglish/word-generator/tree/491c4998a253d5e60cddd718541786e3ae3cb6d5). Current base tip: [codex/phone-transition-model-sensitivity@e3a6528b](https://github.com/unglish/word-generator/tree/e3a6528b463c4ee74b5ecd17e2a9c93db0f2bd50). Open; draft.

**Purpose / dependencies:** Apply token-weighted running-text targets through an opt-in adapter. Based on old #336 lineage, not current #336 head; direct main conflicts and no current-head checks.

**On current main:** Adapter/weights are absent.

**Evidence and reason:** Held-out token objective improves 27.76%, but affected text diversity 28443→16503 and missing-primary 36.51%→45.93%; low-frequency strata and phone/trigram diagnostics worsen. Source terms must remain with retained research artifacts. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/491c4998a253d5e60cddd718541786e3ae3cb6d5/evaluation/experiments/running-text-frequency/RESULTS.md).

Source binding checked here: engine/config/package bytes match `2144c816` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 482 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend closing the runtime-adoption hypothesis; preserve authenticated sources, offline fit results, full negative comparisons and license notices.

**Acceptance / resumption:** No default or opt-in adapter promoted from objective gain alone; a later corpus-only reuse is a new scoped proposal with explicit population/objective and rare-tail criteria.

### PR 354

**CLOSE — [#354](https://github.com/unglish/word-generator/pull/354): Model opt-in stem and affix categories with measured compatibility evidence**

Current head: [depatched/stem-affix-compatibility@244924c1](https://github.com/unglish/word-generator/tree/244924c106bd769474b5b049343e0e70eeadfd02). Current base tip: [depatched/morphology-cluster-control@1159465f](https://github.com/unglish/word-generator/tree/1159465fe6c10f55a97e8c5851e8a75c604450e7). Open; draft.

**Purpose / dependencies:** Sample morphology through authored stem/affix category paths. Old composed 1159465f control combines #313 with #349/#348/#347; not an accepted integration base.

**On current main:** Category planner is absent.

**Evidence and reason:** Declared path contracts hold, but uniform authored priors are not empirical semantics/productivity; every enabled profile loses diversity and phone/trigram fit, text hiatus rises, 42/48 checks fail and all timings miss floor. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/244924c106bd769474b5b049343e0e70eeadfd02/evaluation/experiments/stem-affix-compatibility/RESULTS.md).

Source binding checked here: engine/config/package bytes match `11bdf6a9` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 304 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend closing this runtime experiment while retaining typed contracts, priors and complete negative evidence. Do not carry old short-root prefix-drop behavior past merged #305.

**Acceptance / resumption:** Document failure to establish the intended linguistic benefit; reconsider only with a concrete category-aware product use or empirical priors and a new prospective protocol.

### PR 355

**REVISE — [#355](https://github.com/unglish/word-generator/pull/355): fix(morphology): guard configured root alternations atomically**

Current head: [depatched/morphophonemic-cluster-legality@404b8aa5](https://github.com/unglish/word-generator/tree/404b8aa50db91a11ca99dcf4f541e68d750df3c2). Current base tip: [depatched/morphology-cluster-control@1159465f](https://github.com/unglish/word-generator/tree/1159465fe6c10f55a97e8c5851e8a75c604450e7). Open; draft.

**Purpose / dependencies:** Guard morphophonemic replacements atomically with configured cluster legality. Depends on accepted #313 and accepted morphology/provenance interfaces; current 1159465f control embeds old rejected stacks.

**On current main:** Main still contains unguarded ity softening; #313 addresses root extensions, not this alternation.

**Evidence and reason:** Four output-changing pairs remove /sk/→/ss/; 114,774 trace changes are not improved words. Candidate adds two inventory-compatibility assertion failures and a timeout; throughput is lower in every pair and all floors fail. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/404b8aa50db91a11ca99dcf4f541e68d750df3c2/evaluation/experiments/morphophonemic-cluster-legality/results/RESULTS.md).

Source binding checked here: engine/config/package bytes match `9d2680b3` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 397 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Isolate same-root collision protection on current resolved-allomorph interfaces; distinguish licenses for morphology destinations from root generation's positional pools so valid custom substitutions are not rejected indiscriminately.

**Acceptance / resumption:** Both legacy-valid custom destinations and real illegal replacements have public atomic phone/written fixtures; no added exceptions/timeouts, current-main distributions/perf/CI pass; preserve independent four-pair traces.

### PR 356

**CLOSE — [#356](https://github.com/unglish/word-generator/pull/356): feat: add opt-in spelling style with measured trace evidence**

Current head: [depatched/soft-lexical-style@47b24603](https://github.com/unglish/word-generator/tree/47b246030b58f84481a5ca9732fa3ef30c36967f). Current base tip: [depatched/morphology-cluster-control@1159465f](https://github.com/unglish/word-generator/tree/1159465fe6c10f55a97e8c5851e8a75c604450e7). Open; draft.

**Purpose / dependencies:** Apply an opt-in word spelling style and structured origin uncertainty. Based on the same old 1159465f composed control, not accepted #355 or #354; these are siblings.

**On current main:** Style sampler/origin assessment additions are absent.

**Evidence and reason:** No sampled word selects multiple declared style features, so the intended within-word coherence outcome is untested. Mixed distributions and 68/74 failed commands including all 60 throughput runs provide no promotion case. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/47b246030b58f84481a5ca9732fa3ef30c36967f/evaluation/experiments/lexical-style/completed-evidence/RESULTS.md).

Source binding checked here: engine/config/package bytes match `4f4c95d5` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 556 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend closing the runtime style experiment and preserving origin uncertainty/source assessments separately as findings; do not treat unassessed legacy origin labels as historical facts.

**Acceptance / resumption:** Retain full treatment/control outcomes and the lack of coherence opportunities. Any future origin-data-only cleanup or style study needs a focused purpose and observable coherence metric.

### PR 357

**DEFER — [#357](https://github.com/unglish/word-generator/pull/357): feat(review): freeze and collect blinded written comparisons**

Current head: [depatched/blinded-written-comparison@76aece22](https://github.com/unglish/word-generator/tree/76aece223e1f366696c3825bc6944be2768a9f50). Current base tip: [depatched/written-study-control-58baeaa@58baeaa3](https://github.com/unglish/word-generator/tree/58baeaa388ee2d83e670764a94f649506b098464). Open; draft.

**Purpose / dependencies:** Freeze and collect blinded two-condition written comparisons. Exact preserved control 58baeaa is an old #307 snapshot. Baseline review infrastructure #298–#304 is merged; no active linguistic draft is automatically the study candidate.

**On current main:** Two-condition collector/inference is absent; earlier single-condition review exists on main.

**Evidence and reason:** 14,400 synthetic datasets/43,156,800 contrasts calibrate assumed laws, not readers; informative nonresponse full-truth coverage is 28/1200. Historical gates do not certify current main. No head CI; engine bytes match measured source. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/76aece223e1f366696c3825bc6944be2768a9f50/docs/written-study-evidence.md).

Source binding checked here: engine/config/package bytes match `5796cb44` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 712 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume with an actual coordinator/readers, named accepted candidate/control, prospectively piloted recruitment/stopping and missingness plan; integrate collection on current review infrastructure before collecting.

**Acceptance / resumption:** Authentic consented ratings, real assignment/exposure/missingness receipts and preregistered participant/item analysis; current-main collector checks green. Synthetic calibration never counts as human acceptance.

### PR 359

**MERGE — [#359](https://github.com/unglish/word-generator/pull/359): docs(evaluation): publish Q07 and Q08a cumulative evidence**

Current head: [depatched/q08a-cumulative-evidence@c981d69a](https://github.com/unglish/word-generator/tree/c981d69a3abf5fbfa23094dc9c059707859557b0). Current base tip: [main@ad7f0905](https://github.com/unglish/word-generator/tree/ad7f09051a2562e990c4db0abdf63421e99b6dda). Open; draft.

The PR metadata reports older base `cd96f54f`; the inspected diff merge base is `cd96f54f`.

**Purpose / dependencies:** Publish cumulative Q07/Q08a comparisons for the already merged mechanisms. Independent of the unaccepted runtime stacks; measures c15565a against 233b455 and cd96f54 against c15565a.

**On current main:** #314/#319 behavior is already on main; these supporting evidence packages are absent.

**Evidence and reason:** Both compact verifiers passed in this triage (284 and 323 members); simulated merge with current main is clean and contains no runtime changes. Historical comparisons retain mixed metrics and a 0.959941 median timing ratio; they do not certify later main. The intermediate sample is shared, not an independent extra cohort. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/c981d69a3abf5fbfa23094dc9c059707859557b0/evaluation/experiments/shared-weight-control/merged-composition-2026-10-03/README.md).

**Current blockers:** [benchmark: skipped](https://github.com/unglish/word-generator/actions/runs/37165496187/job/111327435446); [test: success](https://github.com/unglish/word-generator/actions/runs/37165496187/job/111327434925); [quality: success](https://github.com/unglish/word-generator/actions/runs/37165496187/job/111327434878); [build: success](https://github.com/unglish/word-generator/actions/runs/37165496187/job/111327434855); [review: success](https://github.com/unglish/word-generator/actions/runs/37165496187/job/111327434750). No submitted reviews or inline review threads returned. Direct main applicability: textually clean with main; 15 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Recommend merging as dated historical evidence; use this ledger's retention receipts for current file availability.

**Acceptance / resumption:** Retain exact measured heads, shared-control qualification, negative results and external-input requirements. No claim that original loose paths or future-main validation are restored.

### PR 363

**DEFER — [#363](https://github.com/unglish/word-generator/pull/363): feat(review): add blinded auditory comparisons with measured calibration**

Current head: [depatched/blinded-auditory-comparison@abe8a71f](https://github.com/unglish/word-generator/tree/abe8a71fdd2258c32134ca3da77043854997d656). Current base tip: [depatched/auditory-study-control-5796cb4@5796cb44](https://github.com/unglish/word-generator/tree/5796cb441e9eb806266406becfcea2f822103e95). Open; draft.

**Purpose / dependencies:** Collect independent blinded auditory comparisons. Exact old 5796cb44 control includes written-study code; shared infrastructure must be accepted separately, not merged by this branch's ancestry.

**On current main:** Auditory collector/inference absent from main.

**Evidence and reason:** 20,400 synthetic datasets/122,277,600 contrasts pass 28 calibration gates under assumptions; −20.96 pp informative-nonresponse bias and zero unfamiliar-subset coverage remain. No actual listeners/speech/coders; no head CI. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/abe8a71fdd2258c32134ca3da77043854997d656/docs/auditory-study-evidence.md).

Source binding checked here: engine/config/package bytes match `be7401bc` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 480 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only when coordinator, real audio/materials and independent listeners/transcription resources exist, after named targets/accepted candidate and current-main infrastructure are fixed.

**Acceptance / resumption:** Authentic blinded listening observations, frozen target/audio identities, playback/missingness receipts and prespecified listener/target analysis; retain power/attrition limitations and current-main integration checks.

### PR 364

**DEFER — [#364](https://github.com/unglish/word-generator/pull/364): feat(review): add independent read-aloud agreement with measured calibration**

Current head: [depatched/independent-read-aloud-agreement@b0f2fd50](https://github.com/unglish/word-generator/tree/b0f2fd5025679f57a238bc6d165b5892e15ff817). Current base tip: [depatched/read-aloud-control-37e9054@37e90545](https://github.com/unglish/word-generator/tree/37e9054591bd9c54ec3b3d144ae11d3122e049c0). Open; draft.

**Purpose / dependencies:** Collect first-presentation read-aloud recordings with independent coding. Exact 37e90545 control carries earlier study infrastructure; b0f2fd50 correctly distinguishes calibration from collection. No human result prerequisite has been met.

**On current main:** Read-aloud collection/coding/inference absent from main.

**Evidence and reason:** 20,400 synthetic datasets/244,555,200 contrasts and 60 calibration gates remain simulations; −18.63 pp informative-nonresponse bias. The latest head only corrects documentation; measured engine bytes match. No head CI. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/b0f2fd5025679f57a238bc6d165b5892e15ff817/docs/read-aloud-study-evidence.md).

Source binding checked here: engine/config/package bytes match `65c6b761` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 973 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume with real readers, speech/recording coordination, two independent blind coders and adjudication, named frozen intended/accepted targets and a prospectively fixed analysis plan.

**Acceptance / resumption:** Actual first-presentation speech and coding/adjudication provenance; intended/accepted phone/stress outcomes and missingness kept separate; current-main collection/coding checks pass. No synthetic substitute.

### PR 366

**DEFER — [#366](https://github.com/unglish/word-generator/pull/366): perf: reduce scalar spelling-history snapshot cloning**

Current head: [depatched/spelling-history-snapshot-copy@9436da3d](https://github.com/unglish/word-generator/tree/9436da3da1c175559bacee4b6ae36f02a0e58a68). Current base tip: [depatched/final-word-provenance@9b24c530](https://github.com/unglish/word-generator/tree/9b24c530f602685753f3e5b3d26d238552e61267). Open; draft.

**Purpose / dependencies:** Reduce scalar history snapshot cloning while preserving extended native cloning. Prerequisite: accepted revised #348 representation. #349 is a sibling CLI fix, not included by ancestry here.

**On current main:** Snapshot optimization absent; relevant extended history is absent from main.

**Evidence and reason:** Source-bound 8k/80k/200k parity and scalar/extended-cursor regression support semantics. Isolated workload duration improves 26.323%, but full policy still takes 87.852s against 60s and all six original commands fail. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/9436da3da1c175559bacee4b6ae36f02a0e58a68/evaluation/experiments/spelling-history-copy/RESULTS.md).

Source binding checked here: engine/config/package bytes match `2165c99d` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 70 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume if the accepted provenance design retains this hotspot; apply only to its exact scalar histories with native fallback and preserve the Symbol-cursor counterexample.

**Acceptance / resumption:** Full graph/mutation/trace/RNG parity; original full-suite timeout and throughput targets pass together, not only the isolated policy test; current-main CI green.

### PR 367

**DEFER — [#367](https://github.com/unglish/word-generator/pull/367): perf: verify selected vowel completion once (+3.65% measured median)**

Current head: [depatched/completion-verification-once@7b6f0559](https://github.com/unglish/word-generator/tree/7b6f055956b3346b65f0d6a5bf0de6a6df37e500). Current base tip: [codex/split-vowel-constructions@07607f91](https://github.com/unglish/word-generator/tree/07607f914e1222a6feee48bf9abf3d3739c10793). Open; draft.

**Purpose / dependencies:** Authenticate selected completion transactions once. Sibling on #345; it is not included in #368→#374. Do not assume its +3.65% timing benefit exists in that chain.

**On current main:** Optimization/relevant completion path absent from main.

**Evidence and reason:** 200k full records plus 50k audit/quality reports remain equal; +3.65% median with an adverse pair and both arms failing all speed floors. No head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/7b6f055956b3346b65f0d6a5bf0de6a6df37e500/evaluation/experiments/completion-verification-once/README.md).

Source binding checked here: engine/config/package bytes match `bfa1f145` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 53 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only after an accepted completion design; combine separately with later joint transactions and retain validation before mutation for selected and nonselected/forged attempts.

**Acceptance / resumption:** Current transaction authentication and all full Word/trace/RNG fields unchanged, forged-attempt tests pass, meaningful perf/quality targets pass on accepted base.

### PR 368

**DEFER — [#368](https://github.com/unglish/word-generator/pull/368): feat: measure opt-in ai support for vowel completion**

Current head: [depatched/completion-vowel-support-v2@8c2f08c8](https://github.com/unglish/word-generator/tree/8c2f08c868a8ac569de4e11b5efdc47f8802a357). Current base tip: [codex/split-vowel-constructions@07607f91](https://github.com/unglish/word-generator/tree/07607f914e1222a6feee48bf9abf3d3739c10793). Open; draft.

**Purpose / dependencies:** Provide structured positional weights only for completion, including initial ai. Prerequisite: accepted #345/#344 ownership and budget design. #367 optimization is a sibling, not an ancestor.

**On current main:** Opt-in completion-weight field absent from main.

**Evidence and reason:** Unresolved 2887→277 and unavailable 8051→8026; zero-support-only infeasibility removed, but median throughput −4.98%, two quality failures and all floors fail. Engine is still byte-identical to the measured implementation. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/8c2f08c868a8ac569de4e11b5efdc47f8802a357/evaluation/experiments/completion-vowel-support).

Source binding checked here: engine/config/package bytes match `8da48371` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 65 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume as the first completion-support amendment after the accepted parent, preserving initial sampling and context/neighbor guards.

**Acceptance / resumption:** Legacy/default RNG parity, positive finite unambiguous completion support, full available/unavailable/obligation accounting, current quality/speed/CI acceptance.

### PR 370

**DEFER — [#370](https://github.com/unglish/word-generator/pull/370): Preserve unchanged opaque contexts during vowel completion**

Current head: [depatched/completion-context-preservation@319ece68](https://github.com/unglish/word-generator/tree/319ece680b81e453272be85fdb2ff54fd051d5d1). Current base tip: [depatched/completion-vowel-support-v2@8c2f08c8](https://github.com/unglish/word-generator/tree/8c2f08c868a8ac569de4e11b5efdc47f8802a357). Open; draft.

**Purpose / dependencies:** Permit completion beside an unchanged opaque context without granting it a reading license. Prerequisite: accepted #368 and the accepted ownership representation.

**On current main:** Projection relaxation absent from main.

**Evidence and reason:** Unresolved 277→100, unavailable 8026→8088 and satisfied 23115→23072; 195 opaque contexts audited. Timing −0.4367%, broader regressions and original failures persist; no head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/319ece680b81e453272be85fdb2ff54fd051d5d1/evaluation/experiments/completion-context-preservation/RESULTS.md).

Source binding checked here: engine/config/package bytes match `74313079` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 122 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume after the parent; retain exact same-cell/following-context preservation and explicit unknown ownership.

**Acceptance / resumption:** Opaque unchanged contexts only, changed/missing/known-incompatible contexts refused, complete recount and trace/RNG parity, quality/speed checks pass on accepted base.

### PR 371

**DEFER — [#371](https://github.com/unglish/word-generator/pull/371): Measure completion-only initial oo support for /u/**

Current head: [depatched/completion-u-support@d2bcfcee](https://github.com/unglish/word-generator/tree/d2bcfcee8d653d3a4440de03006487fe2aef1bad). Current base tip: [depatched/completion-context-preservation@319ece68](https://github.com/unglish/word-generator/tree/319ece680b81e453272be85fdb2ff54fd051d5d1). Open; draft.

**Purpose / dependencies:** Give existing /u/:oo initial support in the completion experiment. Prerequisite: accepted #370; intervention is experiment configuration only, not a new default runtime inventory.

**On current main:** Runtime bytes unchanged from parent; experimental support is absent from main.

**Evidence and reason:** Unresolved 100→58, unavailable 8088→7935; 22 infeasible/29 prefix/7 ownership residuals. +1.855% median but all floors fail; quality mixed. Production seal/hashes passed but process exit code was not observed. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/d2bcfcee8d653d3a4440de03006487fe2aef1bad/evaluation/experiments/completion-u-support).

Source binding checked here: engine/config/package bytes match `319ece68` at this head. For #371/#373 this compares unchanged runtime bytes; the intervention is experiment configuration.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 100 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only after the parent and an accepted observable completion objective; preserve the explicit missing process-exit observation.

**Acceptance / resumption:** All residual/unavailable strata retained, initial/default sampling unchanged, source-bound full replay and current quality/performance acceptance; do not relabel the seal as an observed exit.

### PR 372

**DEFER — [#372](https://github.com/unglish/word-generator/pull/372): Derive completion context from recorded written boundaries**

Current head: [depatched/completion-prefix-context@da8cdec3](https://github.com/unglish/word-generator/tree/da8cdec39aa6a0cda5aeb0f34772c0dfcdd6c533). Current base tip: [depatched/completion-u-support@d2bcfcee](https://github.com/unglish/word-generator/tree/d2bcfcee8d653d3a4440de03006487fe2aef1bad). Open; draft.

**Purpose / dependencies:** Read actual recorded adjacent written context for completion. Prerequisite: accepted #371.

**On current main:** Prefix-context change absent from main.

**Evidence and reason:** Unresolved 58→22; all 22 remaining /u/ cases infeasible. 3,800,019 independent comparisons and written-boundary audits support the historical mechanism; −0.468% throughput and all floors failed. No head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/da8cdec39aa6a0cda5aeb0f34772c0dfcdd6c533/evaluation/experiments/completion-prefix-context/RESULTS.md).

Source binding checked here: engine/config/package bytes match `b5b9d27d` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 198 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only after the parent; preserve target ownership, quota and shared-prefix validation while using the recorded boundary.

**Acceptance / resumption:** Exact adjacent-cell evidence including inserted/rewritten cases, refusals still sound, deterministic default compatibility, complete status denominators and current quality/speed/CI pass.

### PR 373

**DEFER — [#373](https://github.com/unglish/word-generator/pull/373): Measure completion-only isolated /u/ spelling support**

Current head: [depatched/completion-isolated-u@0d8811ee](https://github.com/unglish/word-generator/tree/0d8811ee2b3ee5860abb7097e3d4b140c81d8f49). Current base tip: [depatched/completion-prefix-context@da8cdec3](https://github.com/unglish/word-generator/tree/da8cdec39aa6a0cda5aeb0f34772c0dfcdd6c533). Open; draft.

**Purpose / dependencies:** Add completion-only isolated /u/:oo support. Prerequisite: accepted #372; configuration-only amendment, not a default inventory change. Serves as the last fully retained immediate control for #374.

**On current main:** Runtime bytes equal parent; experimental isolated support absent from main.

**Evidence and reason:** Unresolved 22→2; both residuals retained. Timing −0.6054%, all speed floors fail; broad run has timeout failures whose unchanged isolated reruns are separately reported. No head checks. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/tree/0d8811ee2b3ee5860abb7097e3d4b140c81d8f49/evaluation/experiments/completion-isolated-u).

Source binding checked here: engine/config/package bytes match `da8cdec3` at this head. For #371/#373 this compares unchanged runtime bytes; the intervention is experiment configuration.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 139 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only after the parent; preserve its full raw control archive and the distinction between broad and isolated test results.

**Acceptance / resumption:** Default/runtime parity, full residual/status accounting, no substitution of isolated passes for a required complete-suite pass; accepted quality/speed/current CI.

### PR 374

**DEFER — [#374](https://github.com/unglish/word-generator/pull/374): Complete vowel obligations with authenticated neighboring respelling**

Current head: [depatched/completion-joint-neighbor-v2@c7d7be87](https://github.com/unglish/word-generator/tree/c7d7be871f208476c721252492e0b201d56a361d). Current base tip: [depatched/completion-isolated-u@0d8811ee](https://github.com/unglish/word-generator/tree/0d8811ee2b3ee5860abb7097e3d4b140c81d8f49). Open; draft.

**Purpose / dependencies:** Complete the final feasible vowel obligations by authenticated atomic neighbor respelling. Prerequisite: accepted chain #345→#368→#370→#371→#372→#373, itself depending on accepted #344/#338/#335/#328/#310. #367 is not included.

**On current main:** Atomic joint completion is absent from main.

**Evidence and reason:** At source dbe3374b, reported 200k unresolved 2→0 with 7888 unavailable; head c7d7be87 retains source bytes. Narrow success coexists with four default/two quality failures and failed absolute speed in both arms (median −0.658%). Original joint-neighbor v1/v2 raw captures are missing; published reports/replays/source survive. One public replay uses different RNG tapes per arm, not an identical-seed paired proof. [Revision-bound evidence entry point](https://github.com/unglish/word-generator/blob/c7d7be871f208476c721252492e0b201d56a361d/evaluation/experiments/completion-joint-neighbor/results.md).

Source binding checked here: engine/config/package bytes match `dbe3374b` at this head.

**Current blockers:** No check runs returned for this head; not a passing CI result. No submitted reviews or inline review threads returned. Direct main applicability: conflicts with main; 155 changed files in the PR delta. GitHub mergeability against a dependency branch is not acceptance of that dependency.

**Next action:** Resume only after accepted parent architecture meets quality/cost criteria. Review preserved joint-transaction source and replay packet first; explicitly register any separately authorized replacement corpus run as new evidence, never restored original raw provenance.

**Acceptance / resumption:** Atomic separate phone ownership and license checks, no unresolved obligations among declared available cases, unavailable counts retained, original quality/speed/timeout criteria pass on accepted base; a full new corpus claim requires new source-bound captures and independent recount.

## Already merged, superseded and closed context

| PR | Scope | Current disposition |
|---|---|---|
| [#298](https://github.com/unglish/word-generator/pull/298) — Add anonymous written-word review pilot | prior dependency | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#299](https://github.com/unglish/word-generator/pull/299) — Clarify English-word ratings and add optional comments | prior dependency | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#300](https://github.com/unglish/word-generator/pull/300) — Allow reviewers to continue beyond twenty words | prior dependency | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#303](https://github.com/unglish/word-generator/pull/303) — feat: link anonymous review batches without repeated spellings | prior dependency | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#304](https://github.com/unglish/word-generator/pull/304) — feat: evaluate wordlikeness scores against human judgments | prior dependency | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#305](https://github.com/unglish/word-generator/pull/305) — fix: apply length budgets to roots before affixation | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#306](https://github.com/unglish/word-generator/pull/306) — test: document productive of spelling paths | adjacent diagnostic | MERGED OUTSIDE MAIN: merged into an old #305 branch incarnation; neither head nor merge commit is on current main. Diagnostic/probe/test additions are absent. Preserve; consider a separate bounded salvage only if still wanted, not an open-PR merge task. |
| [#307](https://github.com/unglish/word-generator/pull/307) — feat: freeze measurable linguistic quality baselines | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#308](https://github.com/unglish/word-generator/pull/308) — fix: measure complete corpus distributions from distinct RNG streams | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#311](https://github.com/unglish/word-generator/pull/311) — feat: trace complete generation rejection and fallback accounting | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#314](https://github.com/unglish/word-generator/pull/314) — fix: distinguish nucleus segment edges from syllable positions | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#315](https://github.com/unglish/word-generator/pull/315) — fix: preserve resolved allomorphs through written cleanup | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#317](https://github.com/unglish/word-generator/pull/317) — feat(trace): record exact base-spelling edit provenance | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#318](https://github.com/unglish/word-generator/pull/318) — feat: preserve phoneme identity in scoring observations | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#319](https://github.com/unglish/word-generator/pull/319) — feat: share explicit syllable-weight analysis across stress | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#321](https://github.com/unglish/word-generator/pull/321) — test: measure fixed-gate reproducibility across unchanged streams | effort / follow-up | CLOSED / SUPERSEDED: owner explicitly closed in favor of merged #339; keep unchanged-stream findings and source/evidence refs, do not reopen the harness as remaining implementation. |
| [#339](https://github.com/unglish/word-generator/pull/339) — test: make the trigram under-representation gate report-only | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#340](https://github.com/unglish/word-generator/pull/340) — test: calibrate phoneme gate limits from multi-seed spread | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#341](https://github.com/unglish/word-generator/pull/341) — ci: use Node 24 across workflows | supporting CI | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#358](https://github.com/unglish/word-generator/pull/358) — docs: add the measurable linguistic improvement plan | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#361](https://github.com/unglish/word-generator/pull/361) — chore: syllable-weight follow-ups from #319 review | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |
| [#365](https://github.com/unglish/word-generator/pull/365) — Add separate phoneme identity and stress diagnostics with complete archived evidence | effort / follow-up | CLOSED / UNMERGED: separate identity/stress-score diagnostic follow-up; no closure rationale returned. Public API files are absent from main. Preserve findings; do not infer supersession or reopen without a new decision. |
| [#369](https://github.com/unglish/word-generator/pull/369) — fix: classify terminal y and preserve selected vowel spellings | effort / follow-up | MERGED ON MAIN: verified head and merge-commit ancestry; no remaining merge work. |

For #306, a future salvage would need to port only the documented probe/tests, use public generator APIs, reconcile current root semantics and pass current checks. Do not switch or republish the preserved checkout as part of this coordination task. #365 remains closed without an inferred owner rationale; its source and findings remain reviewable at the recorded head.

## Updating this ledger

Re-read GitHub before acting. Any head, named base tip, accepted prerequisite, gate policy or treatment change can invalidate a MERGE recommendation or require a new control. Update both the Markdown recommendation and JSON identity/evidence fields. Preserve the original adverse reports and explicit unavailable observations. Mark this triage goal complete independently of whether the owner later accepts any recommendation.
