# Shared CMU source contract

Q15a is an evaluation-only dependency followup to wordlikeness PR #304 at
`820f80dd72edac7d69ffc7c4e03212f2e2399a2f`. It extracts that model's record selection
into one reusable parser. It changes neither generator behavior nor the model's
population, counts, syllabification, probabilities or score interpretation.

The source is CMU revision `74790861f652b15e4ac49015a90074ad62a27690`,
`cmudict.dict`, SHA-256
`81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
The existing license remains beside the #304 model. New audit output must verify
the raw bytes before parsing, use exclusive creation and include source, policy,
parser, selected-entry and license identities. It does not download a mutable
source or fall back to demo percentages.

The parser retains source lines, endings, original labels, variant labels,
comments and each original phone token. Token interpretations distinguish vowel
stress 0, 1 and 2. Unsupported tokens remain visible; a selector must reject the
whole unsupported pronunciation instead of silently deleting a token.

The compatibility policy retains #304's exact first-exclusion order: numbered
alternative, non-ASCII-letter spelling, unsupported pronunciation, no vowel,
duplicate spelling. First valid unlabelled pronunciation wins; alphabetic case
is normalized. This keeps 117,485 entries from the pinned 135,166 entry records,
excluding 9,114 alternatives, 8,559 unsupported spellings and eight vowel-less
forms. The eight forms are fs, hm, hmm, hmmm, mm, sh, shh and ths. Source comments
and blank lines are accounted separately. This is a broad dictionary of word
types, including names, loans and inflections; it does not identify roots,
familiarity, lexical category or running-text frequency.

Every rebuilt model count and all score components for both frozen 200-row
rubric snapshots match #304. The existing model and score files remain byte for
byte unchanged. The extraction changes implementation provenance: newly named
artifacts carry the new source digest, while the old commit remains the
reproduction environment for old artifacts. Current provenance validation
rejects the old implementation fingerprint rather than relabelling it.

The independent Python verifier recounts every source record and checks every
selected entry's line, label, spelling and original phone tokens through the
selected-entry digest. It compares the complete models and all 400 score rows,
including sample IDs, contributions and diagnostics. Score-artifact checksum
validation uses the scorer's pinned JavaScript numeric canonicalizer; population
counting and semantic comparisons are independent. Its corruption checks cover
truncated source, changed entry identity/units/exclusions, changed model counts,
reordered score rows and a forged score digest.

Run the audit and reproduction commands in
[wordlikeness evaluation](wordlikeness-evaluation.md). Shared parser fixtures
run with `npm run test:review`; strict checking uses `npm run review:typecheck`.
The compact source/audit/model/score proof is in
`evaluation/experiments/cmu-shared-parser/`. The dictionary itself is retrieved
from the pinned upstream URL and checked before use.

Record parsing, population selection, phonemic projection and numeric units are
separate contracts. The extraction does not adopt a new reference for any legacy
consumer. [Q15b](cmu-matched-reference.md) derives matched-population integer
counts and compares old/new references on the same immutable generator archive.
Q15c will migrate manual
consumers individually. Existing reference percentages, runtime weights, tests
and thresholds remain outside this extraction.
