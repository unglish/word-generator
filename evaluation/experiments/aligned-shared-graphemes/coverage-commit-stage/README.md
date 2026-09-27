# Q13b joint readings at coverage commit — preparation stage

Coverage commits now construct the entire prospective licensed surface before
mutating cells, edit IDs, cell IDs or certificate storage. The configured joint
reading guard validates every live shared construction on that final projection.
A complete prospective coverage certificate lets the guard resolve a respelled
following vowel as owned; it is not mistaken for an unresolved generic rewrite.
Incompatible written-letter conditions still refuse even when a synthetic
inventory declares that letter as a spelling for the same vowel phone.

The shared surface validator is factored from the existing generic edit guard.
Generic overlap/internal-insertion checks retain their specific refusal reasons.
The surface guard assumes licenses have already been authenticated by the caller;
it is not a substitute for selection support, repair search, or semantic replay.
A single cell-construction helper is used in coverage preflight and commit so
IDs, offsets, source-unit ownership and part assignment follow the same law.

Four new structural commit tests cover valid/refused following vowel changes,
each with one or two replacements. Refusals preserve the complete snapshot.
Positive cases preserve the shared cell and both source phones. Fixtures obtain
a real pre-shared coverage certificate, then rebind the full surface around the
shared construction to test the commit contract; they do not establish integrated
search correctness. The original fixture omitted required doubling history;
that failed run is retained and the shared fixture now supplies its actual zero.

All 324 tests in nine affected suites pass. Strict TypeScript and changed-file
lint pass. A parameterized test indentation failure and its correction are kept.
The eleven preregistration hashes remain unchanged. Full-suite/corpus/performance
runs were not repeated and no new linguistic-quality result is claimed.

Remaining: joint ownership in coverage search/verification and its recorded
proof, normalization preflight/search, full v4 event-time semantic replay,
writer/config activation, frozen measurement tools, registered legacy parity,
200k comparisons, independent counts and paired performance runs. Public shared
generation remains unactivated.
