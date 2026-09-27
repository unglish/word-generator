# Q14a implementation checkpoint

The writer accepts an optional `splitVowels` configuration containing structured
`supports` and `routes`. It requires the existing shared spelling schedule,
preserve-phones policy, and exactly one syllable `magic-e` predecessor slot.
Omitting the configuration preserves the predecessor path. The English default
has not been activated at this checkpoint.

With the option present, owned split formation replaces the syllable magic-e
operation and the word-stage silent-e swap. Consonant-only silent-e append
remains a separate operation. The final completion pass runs after the second
coverage check and all ordinary root spelling rules, before returning the root
surface. It visits each source nucleus once, rechecking live state after every
committed replacement. Formation and completion use explicit v5 ownership and
recorded attempts rather than generic rewrite ancestry.

`createSplitLedgerReplayer` reconstructs recorded operations, including completion
commits. `verifyCompletionSchedule` separately checks a contiguous, complete,
source-ordered final completion pass and refuses subsequent ordinary root edits.
It permits later lexical whole-root supersession. `createSplitFormationScheduleVerifier` separately verifies every required
syllable and word formation trial at its registered slot, including refusals.
These checks still need composition with the broader shared-writer schedule;
the public general evidence verifier still rejects v5. Root provenance does not certify final morphology.

The initial public API integration test covers 500 words from seed 129, alternating
morphology and text/lexicon modes. Every word passes operation replay, formation-slot verification and completion
schedule verification. Traced and untraced outputs, RNG call counts and the next
RNG value agree. Both formation and completion occur. This is an integration
check, not the registered corpus experiment, an independent linguistic recount,
a performance result, or a quality claim.

Before measurement and publication, compose the complete writer-schedule checks,
exercise repair interactions and diagnostic empty policy, verify exact legacy
parity against the pinned predecessor, run the registered corpus and paired
performance protocols, and retain all unavailable/infeasible outcomes and failed
gates. The registered law and evidence files remain unchanged.
