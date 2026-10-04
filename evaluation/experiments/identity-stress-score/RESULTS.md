# Identity/stress score evidence

Q16 supplied aligned identities but no probability score. This follow-up supplies separate coarse and stress-sensitive phone-transition diagnostics, preserving missingness and losses. It changes no generator behavior or existing score. The runtime dependency is open PR #318 at `d95167b`; the unchanged transition-data dependency is PR #332.

| Archive | Words | Full coarse | Explicit matched | Trace matched | Complete length/morphology strata |
| --- | ---: | ---: | ---: | ---: | ---: |
| original | 200,000 | 200,000 | 17,005 | 0 | 1,340 |
| control | 200,000 | 200,000 | 108,440 | 195,973 | 1,329 |
| active | 200,000 | 200,000 | 108,517 | 195,931 | 1,285 |

Trace-supported coverage uses the declared operational unmarked-to-target-zero crosswalk. It is not independently observed lexical stress. The original archive lacks the required final trace snapshot; its zero trace coverage is missing evidence. Coarse/native alphabets differ, and eligible sets may differ across arms. These are diagnostic coverage results, not a word-quality or dialect verdict.

All 600,000 archived records and 60 complete streams independently verify every projection, evidence binding, loss, transition, score, counter, stratum and witness. Maximum per-word difference is `3.552713678800501e-15` under the fixed `1e-12` absolute plus relative tolerance. Full-row comparison proves every previous score/evidence/loss field exactly unchanged after cleanup; the separately registered written-codepoint dimension refines the original length strata.

Local acceptance runs 19 commands: 17 pass; the two full `npm run lint` commands retain exactly the same ten existing errors in unchanged `src/config/language.test.ts` and `src/core/write.ts`. No new lint error remains. The parent/candidate unit suites pass 609/622 tests with the same one skipped test. Each side passes 12 quality and two performance tests. The 17 new TypeScript and six Python fixtures, strict types and touched lint pass. Public parity covers 2,000 coordinates and 8,000 parent/candidate trace-on/off calls, complete words, RNG counts, next probes and mutation isolation.

The final single parent-first timing observation records 6,880/7,050 words per second and 1.36/1.37× median variance. Earlier retained runs had different directions. No stable throughput gain is inferred. All original thresholds remain unchanged.

Read [the API contract](../../../docs/identity-stress-score.md), then [the collector](study.ts) and [independent verifier](verify.py). [The publication manifest](outcomes/MANIFEST.json) pins every full current score stream, compressed full report, proof and check log. [Attempt histories](outcomes/history.json) retain the summary-schema, canonical-JSON and trace-property checker failures, successful earlier acceptance, and introduced indentation failure. All earlier full streams/source snapshots and all 600,000 raw inputs are preserved in the owner workspace; reproduction needs those original pinned archives. No frozen validation data or human judgments were created.
