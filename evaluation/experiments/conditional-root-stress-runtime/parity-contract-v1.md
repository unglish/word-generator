# Delegation verifier contract before formal execution

The original registration and protocol remain unchanged. This tool refinement
pins the exact original #307 protocol bytes, SHA256
`70d661acae4605ae064d7a194f76a405b452c0124c9e2651e96c666e86b03df9`.
This includes every profile option, development and validation seed, and their
order. The delegation run uses only the first 1,000 development coordinates of
each of the 20 streams; it does not consume validation coordinates.

The primary schedule is exactly 160,000 public generation calls: four policy
paths, trace off/on, and 20,000 distinct coordinates. Separately, one subsequent
RNG call per path/mode/stream yields 160 supplementary next-value checks. Those
calls are not generation calls or additional sample coordinates. The word and
full trace are compared without stripping any field between policy paths.
Only the trace-on/off comparison projects out the trace property. Live checks
also compare recursively ordered own keys and property descriptors, including
keys whose value is undefined and nonenumerable keys. Per-draw consumed counts,
all consumed RNG binary64 bytes, and the next values must match.

Original production sources and package files must equal exact #334 Git blobs.
Pinned source/tool leaves must be regular files; every directory ancestor up to
and including its declared checkout root must be a regular directory. Ancestors
above the declared root are outside that check.
Both production source path sets and bytes, the declared parity-tool closure,
the 77 immutable published files, schedule bytes and Node executable are checked
before and after execution. The after-check also runs following a generation or
comparison failure. Outcomes and immutable input manifests use exclusive fresh
paths and are outside this source closure. A passed result requires the full
schedule and successful source preservation. The attempted-call counter advances before each API invocation, including a
call which throws. Failures retain their actual call
counts and current coordinate; no partial stream is promoted to a pass.

Synthetic fixtures exercise own-property/trace corruption, changed schedule
options/count/seeds/order, modified/missing/aliased pinned files and occupied
publication paths. These tests perform no generator calls. Formal execution
requires parent review of the final tool/source closure and is not authorized by
running the synthetic fixtures.
