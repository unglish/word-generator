# Independent Q13c v3 structural/count recount — source review checkpoint

This is a new verifier. It leaves the two historical Python scripts unchanged
and rejects v1/v2 inputs; historical episodes remain unavailable under their
separate frozen verifier. No generator is called. No complete corpus recount
has been run with this implementation.

The structural machine appends each actual unit and its UTF-16 cells, runs its
adjacent-choice guard, applies an accepted local normalization immediately,
then, at the end of a syllable part, applies that part's generic syllable edits
before its join guard. A join normalization follows that guard. Word/gap edits
occur after every append and guard. Thus recorded cursors must match an actual
machine state, not just be monotonic or lie within a plausible range. Empty
units and empty emitted parts keep their scheduled guards and do not cause a
backward search for another nonempty predecessor.

Every edit replays exact input cells, text, parts, ancestry, output births and
IDs. Local normalization requires an intact whole right unit, a nonempty exact
one-UTF-16-unit shortening, the original phone identity, historical pre-unit
state, and a bijection among collision/episode/certificate/edit/output cells.
Coverage certificates separately require complete pre-plan input, nonduplicated
changed phone identities, intact ordered whole-unit replacements, and exact
final text. Generic regex behavior is not re-executed: only its saved edit is
replayed. The verifier does not evaluate English readings, inventory eligibility
or conditional-support probabilities, neighbor reading obligations, or the
truth of a retained reason. Support pool labels are counted as saved claims.

All current v3 observer counters are independently derived, including coverage
and normalization counts, word incidence, budget/refusal histograms, actual
comparison/collision denominators, and total/profile/stream/actual-morphology
strata. The historical `verifiedCertificates` and
`verifiedNormalizationCertificates` keys are compared as counts of structurally
bijective emitted certificates; they do not turn this counter into an independent
reading-license verifier. Null/unavailable and zero-denominator/not-applicable
replay summaries remain distinct. Production license replay remains separate.

The CLI requires four external authorities: a reviewed tool/source-contract
freeze SHA, the current analyzer/source freeze SHA, the raw manifest SHA, and
the observer report SHA. Before and after counting it verifies every listed
source byte, exact discovered source/quality path sets, historical verifier
bytes, source-contract bytes, archive bytes, full scheduled shard/artifact sets,
configuration, source/reference/evaluator bindings, and the exact 20×10,000
ordered draw schedule. The manifest's raw byte SHA is the authority for its
whole envelope; this script does not claim a general JavaScript binary64
canonical serializer. Source-file arrays, fixed schedule and metric definition
digests are independently recomputed; configuration equality is structural.

Outputs must be fresh, exclusive, and outside all source/archive/file inputs,
including through directory aliases. Assertions cannot be disabled. A caught
failure is preserved as `passed: false`, never a partial successful recount.
Existing mutation/aliasing defects and quality/performance gates are unchanged.

Run only after parent source review and separate formal execution authorization:

```sh
python3 /private/tmp/q13c-independent-v3-recount-v1.py \
  --root SPELLING_CHECKOUT --run RAW_RUN \
  --freeze ANALYZER_FREEZE --freeze-sha REVIEWED_ANALYZER_FREEZE_SHA \
  --manifest-sha REVIEWED_RAW_MANIFEST_SHA \
  --report OBSERVER_REPORT --report-sha REVIEWED_REPORT_SHA \
  --tool-freeze /private/tmp/q13c-independent-v3-tools-v1.json \
  --tool-freeze-sha REVIEWED_TOOL_FREEZE_SHA --out FRESH_PROOF
```

Synthetic tests cover both accepted sites, retained collisions, empty units and
parts, delayed-adjacent/early-join cursors, omitted checks/episodes, count forgery,
phone/cell/certificate multiplicity, cap certificates, generic partial `th`
attribution, UTF-16 surrogate pairs and lone surrogates, exact stream schedules,
source/manifest hash rejection, byte corruption, aliases, exclusive output,
strict boolean-versus-integer identity, null semantics and optimized-Python
refusal. They are not a simulated full-corpus success.
