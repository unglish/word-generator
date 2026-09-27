# Q13b registered construction experiment

Registered after the disclosed 200,000-word exploratory control inspection and
before runtime edits. This completes the sampling decisions left open in the
audit README; it does not replace the retained exploratory evidence.

## Policy and execution law

The structured English path uses three typed rules:

- `ks-to-x`: ordered /k,s/ → x; probability 25; scope both. Refuse a match at
  the beginning of the active scope, preserving the old regex's scope-relative
  restriction (syllable start during the syllable pass, root start during word).
- `gz-to-x`: ordered /g,z/ → x; probability 85; word scope. Require a following
  vowel phone and a following written letter from a/e/i/o/u/y outside the
  consumed units. Also require noninitial root position: word-initial x remains
  the existing separate /z/ inventory choice. This context restriction is an
  explicit model choice, not a claim that the old regex had the same condition.
- `cw-to-qu`: ordered /k,w/ → qu; probability 100; word scope. No additional
  positional restriction; cross-syllable source units are permitted.

Each structured rule occupies its predecessor's named slot in the ordered
spelling-rule passes. Source-unit order determines candidate order. Every
candidate is revalidated against the live state at that slot, not a stale
precomputed match. The migrated regexes and `cx-to-x` cleanup do not run in this
path. Other rules retain their order. Eligibility uses sounds and complete live
units, so ck+s and k+w become directly representable without substring tricks.
The configured percentages are retained; altered eligibility still changes
sampling and subsequent RNG coordinates and must be measured.

At each slot/phase, scan adjacent original source units once in order; no match
may reuse a consumed phone. A failed syllable-stage ks trial may be tried again
at the word slot if still eligible. Do not combine those attempts into an
undocumented one-pass probability. A successful construction is atomic and not
eligible for another formation. Refused and probability-zero cases consume no
RNG; probability 100 consumes no RNG, matching the old spelling-rule contract;
other eligible trials consume exactly one draw, succeeding iff draw < p/100.
Record actual guard/refusal, eligibility, draw/skip, result and event-time cursor.
No policy lookup, ownership inspection or certificate verifier draws randomness.

Absent `sharedSpellings` selects exact legacy behavior. A present empty rule
list explicitly disables migrated formations; it is not a successful quality
candidate. Custom policies must be typed and validated for duplicate IDs,
malformed sequences, forms, scopes, conditions and probabilities. Caller or
returned-plan mutation must not mutate the compiled policy.

## Representation and preservation

Retain original selected units, their phone IDs, selections, source cells and
historical doubling increments. Add a separate realized construction with
ordered source unit/phone IDs, exact live input cells, output cells, source
parts, context/reading obligation and certificate identity. Do not assign all
phones to the first unit or conflate display placement with phone ownership.
For cross-syllable output, the display anchor is the first consumed part while
all source parts remain in the ownership record. Record this convention rather
than claiming x has an unambiguous phonological syllable boundary.

A complete original selection requires all original source cells. A complete
licensed replacement/normalization requires its authenticated whole live unit;
partial, mixed, missing or unresolved ancestry is refused unless a separate
complete contextual certificate establishes its repartition. Ancestry alone
cannot license the /ŋ,k,s/ exploratory cases. Unknown cases stay unavailable.

New trace version/capabilities must distinguish shared ownership from v3.
Replay must verify the event-time ledger, source sound order, full input extent,
configured rule, context, sampling evidence, output text and phone multiplicity.
Reject forged/reordered/duplicated/missing/partial claims. Coverage and
normalization must treat shared spans atomically and preserve neighboring
reading obligations. Generic later edits may not split or silently erase a
licensed construction; record refusals. Explicit whole-word lexical gap
replacement may supersede the complete root, retaining its event and unavailable
new ownership; it must not masquerade as a still-live shared certificate.
Final morphology ownership remains Q02 and is never reported clean by default.

## Frozen evaluation requirements

Primary endpoints: no formed construction with an unsupported sound sequence;
no partial source-unit consumption; exact ordered phone multiplicity at every
formation; no silently split live construction after later root edits. Positive
support for every declared rule and measured nonzero use are required, alongside
counterexamples /g,ʒ/, /ŋ,z/, /k,z/, standalone /z/→x, ck+s, missing units,
previously licensed units, cross-part spans and previously unresolved rewrites.
No missing field, refused sample or unavailable ownership counts as a clean pass.

Freeze source, observer, independent recount, protocol, reference, engine and
installed dependencies before the candidate capture. Use the unchanged four
profiles × five development streams × 10,000 words (200,000), comparing both
the original baseline and exact #338. Preserve every general metric, raw letter
clusters, resolved-affix/morphology/length strata, per-rule opportunities,
eligible denominators, attempts, RNG counts, refusals, direct and shared forms,
coverage/normalization certificates, unresolved cells, diversity and rejection.
Historic missing eligibility is unavailable; do not infer it from final strings.
Independently recount all derivable event/ownership integers and complete
witnesses; distinguish independent arithmetic/structure from production licenses.

Legacy checks use 20 streams × 1,000 public API coordinates with traced/untraced
complete word and trace parity, consumed RNG and next-value probes, plus custom
legacy configurations. Structured-mode fixtures must test determinism and
trace-on/off equality separately. Run the existing full, quality and performance
suites, strict TypeScript and changed-source lint, retaining unchanged failures.
Performance is six fixed fresh-process pairs AB,BA,AB,BA,AB,BA using unchanged
`test:perf`, with both candidates pinned and every result retained. Sealed
validation remains untouched. No human preference or universal decoding claim.
