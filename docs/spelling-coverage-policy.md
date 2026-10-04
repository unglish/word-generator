# Phone-preserving spelling budgets (Q13)

English now explicitly sets `writtenFormConstraints.policy` to `preserve-phones`.
A letter-count preference can no longer remove part of a base spelling unit or
silently remove its entire spelling while retaining its pronounced phone. The
writer tries licensed whole-unit alternatives; if it cannot certify a fitting
plan, it retains the spelling and reports the reason. For example, a configured
`/f/ → ph` may become `f`. `/θ/ → th` cannot become `h` or an empty string.
A cluster such as `/l f θ s/` remains intact when its five letters cannot fit a
smaller configured preference.

The numeric caps and distribution gates are unchanged. Consequently a retained
spelling can exceed a cap, and the existing unconditional cap gates can fail.
That conflict is reported rather than hidden by dropping sounds or weakening a
gate. This policy does not change the sampled phoneme sequence to satisfy spelling.

## Compatibility and selection

An omitted `policy` retains the legacy repair behavior and version-1 ledger.
Custom inventories do not acquire reading certification merely by having positive
weights. A custom configuration that copies the English `writtenFormConstraints`
object inherits its explicit policy; set `policy: undefined` to retain its old
repair contract. Annotate custom `Grapheme.reading` only when the corresponding
reading obligation is supported.

The planner uses the same hard conditions, positional weights, fallback pool and
soft doubling-quota preference as ordinary selection. Length does not unlock
fallback-only entries. Every alternative has positive configured support;
probability-zero doubling is unavailable and a forced 100% outcome cannot be
undoubled. Planning consumes no random values. Changing spellings can change
length-rejection paths, so later draws are not guaranteed to pair with the control.
Trace-on/off uses the same decisions and random stream.

Every plan replays the complete ordered choice sequence. The previous grapheme is
the after-doubling choice before duplicate or regex cleanup. Plans first minimize
changed units, then maximize the joint normalized grapheme/doubling probability
across that same full sequence. Scores within `1e-12` tie in stable inventory/outcome
order. Multiplying one phone's candidate weights by a positive constant cannot
favor it merely by changing scale. All applicable budgets are checked on the full
resulting surface. Search is limited to 8,192 visited partial assignments; when
exhausted, it retains the input even if a provisional plan was found.

## Reading and ownership boundaries

Selection eligibility is separate from reading certification. The bundled
inventory has an explicit reading audit; missing custom metadata stays unknown.
Single-phone correspondences do not promise unique English decoding. Following-
letter obligations inspect actual candidate letters. Bare long-vowel spellings
require an open phonological syllable and an exact written part that remains open.
A generic silent-e rewrite cannot supply a licensed split marker. Lexical and
multi-unit constructions without that representation remain unsupported.

A changed unit and its affected neighbors are rechecked. Unsupported or missing
reading declarations, and unresolved rewritten cells, in the changed written part
prevent a certificate. This includes an unchanged `ve` whose possible marker
interaction would be affected by a preceding vowel respelling. Unresolved material
in other parts stays explicitly uncertified. Both budget passes retain a fixed
phonological junction refusal; the certificate verifier checks it independently.

Q06's resolved morphology parts are a prerequisite. Final affixed spelling lacks
complete phone ownership, so an over-budget final surface is retained with a
separate `final-morphology` / `infeasible: unresolved-ownership` outcome. Under-
budget resolved cleanup retains its established behavior. This is not full affix
pronunciation certification.

Duplicate-letter deletion, generic regex damage, joint multi-phone spellings,
split-digraph generation and soft-c/g generation remain separate changes. A
successful certificate covers its exact changed phone IDs at the writer boundary,
not the whole word or later phonological reduction.

## Versioned evidence

Version 2 of `WordTrace.baseSpelling` declares `exactParts: 1`,
`licensedOrigins: 1` and `writerBoundary: 1`. Selected cells get their actual syllable-part identity.
Ordinary edits record their applied part; cross-part replacements keep `null`.
A licensed replacement has a distinct origin and a certificate linking exact
input cells, unit IDs, phone order/multiplicity, final spelling, configured
inventory choices, normalized probabilities, and actual writer-boundary contexts.
Original selected units, inventory identities and IDs are retained. Each phone stores
a deep-detached writer-boundary feature/stress snapshot outside certificates. Replay
derives every fixed selection and doubling input from that snapshot and binds
pre-plan choices to the original selection or preceding verified certificate.
Certificate-local stress, cluster flags or phone features cannot authorize a repair. The live representation and
certificate checks also run without tracing; only historical edits are optional.
Version-2 snapshots are detached from the live state.

All certificate validation precedes cell mutation and ID advancement. Clean and
hyphenated respellings project the same atomic plan. If a cross-part rewrite has
made that projection unknown, planning refuses it. Legacy inferred orthography
continues to be labelled `inferred`; it never supplies a license.

`WordTrace.spellingBudgets` distinguishes `satisfied`, `respell` and `infeasible`
episodes. `satisfied` means the numeric preferences were already met; it does not
certify every unchanged unit's reading. Refusals distinguish unavailable ownership,
unknown readings, unsupported constructions, invalid junctions, proved absence of
a supported plan, and search exhaustion. Version-1 archives retain unavailable
part identity; unknown versions/capabilities are rejected by exact replay.

The measurement contract is preregistered in
[evaluation/quality/probes/spelling-coverage](../evaluation/quality/probes/spelling-coverage/README.md).
The immutable original, Q02a ledger control, Q12a dependency control, resolver
parity proof, and Q06 revised dependency control remain separate artifacts. Results
must be attributed against the revised dependency, not credited wholesale to Q13.
