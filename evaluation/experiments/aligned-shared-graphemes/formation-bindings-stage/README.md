# Q13b formation bindings and repair-order audit

The structural binding validator links each formed attempt to exactly one
construction and one shared edit, in formation order. It checks duplicated
attempt evidence, source/phone/input/part fields, reading/form fields, edit
identity/phase/rule/text and exact shared output origins. Failed/refused attempts
cannot claim construction IDs; extra constructions and unbound shared edits
fail. Positive cases include two formation orders and a construction subsequently
superseded by a lexical gap. Seven corruption cases fail as expected.

This is not semantic replay. It does not reconstruct live input ownership,
validate configured pronunciation support, prove sampling draws or authenticate
named writer-slot ordering. validateSharedEventOrder remains a separate
structural ordering check; neither authorizes accepting v4 in the old verifier.

Source audit of createWrittenFormGenerator confirms normalization at adjacent
selection and syllable-join sites precedes coverage. Coverage explicitly refuses
a normalized ledger; normalization after coverage is not scheduled by this
writer. Broadening either policy would add a separate behavioral hypothesis,
not merely preserve joint spans. Two positive joint-normalization cases now
exercise the existing coverage refusal afterward: zero visited assignments,
normalization-context-unavailable, and an unchanged ledger. These restrictions
remain explicit; the prior roadmap's generic mixed-repair item does not imply
that this experiment must introduce an unregistered repair policy.

All 335 tests across nine affected suites pass, as do TypeScript and changed-file
lint. Eleven registration pins remain unchanged. The binding validator is a
single linear scan with explicit assertions; simplification review added no
unrelated changes. No public activation, full-suite/corpus/performance result or
quality gain is claimed.

Next: v4 event-time semantic replay of actual append state, prior licenses,
shared trials and generic decisions; normalization guard schedule; complete
coverage edits; lexical supersession; final cells/live construction IDs. Replay
must combine this binding validation with authoritative phase/part and named
writer-slot scheduling rather than trusting a self-consistent rewritten log.
Then configure/wire the public writer, reuse compiled machinery and execute the
registered compatibility, corpus, independent recount and performance protocol.
