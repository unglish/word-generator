# Q13b atomic writer batches — preparation stage

The ledger preflights ordered edits against an evolving proposed surface, using
prospective cell/edit IDs without advancing live counters. It commits only if
all steps are accepted. Refused transactions retain their original cursor, full
requested sequence and the checked prefix; no provisional cell/edit leaks into
the actual ledger. Invalid later ranges throw before any mutation. Same-text
steps remain no-ops, and successful edits keep their original individual edit
records. Trace v4 records transaction outcomes separately from single guards.

The part observer resolves offsets against projected parts as earlier edits
change their lengths. Every BaseSpelling part observer supplies the batch method.
Atomic batches now serve silent-e swap/marker pairs, multi-token pileup deletion
and junction backstops. Single consonant/vowel/final-letter repairs, silent-e
append and boundary insertion honor refusal before changing visible strings.
The legacy void-only observer fallback retains sequential behavior; a custom
observer that can reject multi-edit operations must supply batch. This is not a
rollback guarantee for arbitrary third-party callback side effects.

Eight new tests cover later-step refusal, invalid later ranges, sequential/batch
cell and edit-ID equivalence, evolving part offsets, real multi-deletion pileup
rollback, single/final-letter refusal, following-vowel preservation and silent-e
swap refusal without a marker. All 287 targeted tests pass across eight suites.
Full npm test completes with 808 passes, one skip and five failures: ex ratio
0.010933806812024306 vs 0.0215; consonant counts 10, 33 and 39; ck/double matches
6 vs maximum 5. Those values match the recorded predecessor. No gate changed.
Strict TypeScript passes. Initial lint reports one prefer-const error; changing
that unassigned local binding to const makes changed-source lint pass. The full
run preceded only that non-behavioral correction; both lint logs are retained.

Focused simplification shares rewrite-cell construction between preflight and
actual commits. Eleven preregistered files are unchanged. The direct-edit audit
finds three remaining writer calls in legacy-only branches: adjacent/join
Deduplication and post-join vowel trimming. The phone-preserving branch uses its
normalizer/coverage paths instead; those shared-aware paths still need completion.

Remaining: full neighboring-reading and joint-unit handling in formation,
coverage and normalization; v4 replay of attempts, guards, transactions and
supersessions; named-slot/config activation; registered legacy parity, frozen
200k candidate comparisons, independent recount and paired performance. Shared
generation remains unactivated. No corpus or human-quality gain is claimed.
