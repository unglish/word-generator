# Q11b treatment contract before implementation

The frozen `1159465` control has completed both registered 200,000-word arms.
Independent complete structural replay finds two newly equal same-root-coda pairs
per arm from /sk/ to /ss/ after `ity` velar softening. This observation identifies
one failure mode; it does not define the entire treatment domain.

The proposed treatment makes each configured morphophonemic replacement an atomic
transaction. Evaluate its proposed phonological result before changing root phones,
recording a ledger replacement, or scheduling its written half. Reject an unlicensed
result with an explicit trace event; preserve the input root and omit that rule's
written half. Later ordered rules see the last accepted root state. Written-only and
identity rules continue to work. No root/affix resampling or new RNG draw is added.
This is a declared generator policy for nonce roots, not a claim that native speakers
prefer blocked alternation to a coalesced pronunciation.

The checks must cover every configured replacement and every target segment:

- Exact inventory identity and positional eligibility at the actual word position.
- Complete affected lexical onset/coda, including both neighbours of an interior
  replacement, rather than validating the replaced phone alone.
- Existing cluster lengths, configured onset prependers and coda appendants,
  attested cluster/prefix licensing, repeated phones, fallback sonority and invalid
  patterns. Reuse production classification instead of implementing a weaker copy.
- Configured coda voicing, nasal/stop place and banned nucleus/coda relationships.
  Nuclear replacements must therefore recheck their unchanged coda.
- Affected cross-syllable configured bans, including the selected affix boundary.
  Whole-word-final restrictions apply only when the changed segment really is final.
- Morphologically licensed distinct-source repetition must remain admissible. It
  must not be mistaken for a duplicate created within a lexical root cluster.
  Flat affix additions and syllabic affixes need explicit source ownership in the
  proposed assembly, even when tracing is disabled.

Do not silently coalesce a phone: the existing v1 ledger requires every identity
and would otherwise misrepresent deletion. Do not mutate the frozen control.
The implementation must make rejection distinguishable from condition-not-matched,
identity replacement, inventory failure, accepted replacement and written-only rule.
Record rule index, affix boundary, source target coordinates, old/proposed sounds,
structural reason and relevant before/proposed phone sequence.

Required examples include the four authenticated /sk/ witnesses, accepted ordinary
velar softening, licensed /sts/ and /ksts/, distinct prefix/root repeated phones,
custom onset and coda substitutions, interior target neighbours, nuclear changes
which newly conflict with the coda, configured boundary bans, zero-syllable affixes,
ordered rules after both acceptance and rejection, unavailable inventory identity,
written-only/no-op rules, and public trace/plain complete output plus RNG parity.
Independent replay must detect forged accepted/rejected outcomes and bad coordinates.

Before treatment measurements, freeze the implementation, full measurement protocol
and preflight fixtures. Keep the two existing 200,000-word baseline arms intact and
capture the same two candidate policy arms. Recount all structural eligibility and
rejection reasons independently, retain every failed repository gate, execute the
original 2m-word trigram and 50k-word trace diagnostics, and run the six original
paired timing comparisons without concurrent capture/replay load. No publication
coverage increment until the independent PR and complete evidence are available.


Implementation clarification before treatment measurement: mixed physical clusters
are also checked with the shared production classifier. A run of adjacent identical
sounds can receive an explicit cross-morpheme license only when every member has a
distinct root/prefix/suffix owner. Logical grouping is limited to classifier
attestation/sonority evaluation; all physical phones, source coordinates, feature
checks, and ledger identities remain intact. Two root identities cannot receive
this license. Complete affected-syllable before/proposed sounds are recorded.

The shared classifier preserves the current production semantics. Existing onset
prependers and sonority-constraint options that it does not currently apply are
not newly implemented by this treatment; this amendment narrows the earlier
checklist wording accordingly. The policy checks the declared result cluster and
nearby boundaries; it does not certify all phonotactics elsewhere in the word.

The public morphology configuration uses the structured optional
`morphophonemicPolicy.preserveClusterLegality` flag. Omission or false retains
legacy execution and trace shape; the candidate English configuration enables it.
Enabled internal attachment requires a bound production guard and fails visibly
if it is missing. Generator and evidence replay share exactly one cluster runtime
builder, with no new dependency or RNG draw.
