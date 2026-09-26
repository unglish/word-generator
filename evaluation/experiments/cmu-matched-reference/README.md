# Q15b matched reference and unchanged-output sensitivity

This package adds a reference; it does not change a generator, historical
baseline, threshold or old score. Read [the population and measurement
contract](../../../docs/cmu-matched-reference.md) before interpreting the tables.
The dependency is shared-parser PR #323 at `41b2455`.

`reference.json.gz` contains the complete new reference artifact: the common
117,485-entry population, all integer tables, the unchanged #304 derived model,
explicit lossy projections, old reference bytes and their units, source snapshots
and license. Decompression yields artifact digest
`f8f5bdd9a083772f76cbb7b9db78ddebb67bcea5fa04afbccfb20f6b0a628862`;
its reference-content digest is
`3a0e0c9c3eb0ba4990f6607e22946dd2971474d405c10b1246779ee13be534f6`.

`sensitivity.json.gz` compares the same 200,000 original development draws under
both reference views, retaining all raw counts and six marginal comparisons for
every profile and stream. Its digest is
`22165c4bbf1d9c56d77cab5675003bb7dfef75074d9fc0f6ba07924e7adb36dc`.
`baseline-manifest.json.gz` pins the original complete archive and source identities;
it is not a replacement for the raw shards required by verification. The original
generator, archived words, frozen distance function and validation cohort remain
unchanged. Scores move solely because the reference population changes.

`reference-verification.json.gz` independently reconstructs every dictionary table
and checks all source/projection/units identities. `sensitivity-verification.json.gz`
independently rereads every original word and recomputes all profile/stream counts
and six legacy/joint distribution measures. Counts agree exactly; the largest
absolute floating score difference is `7.205347429817266e-14` against the declared
`1e-12` tolerance. Identity checking preserves original JSON numeric lexemes;
numeric score computation is independent of the TypeScript implementation.

The TypeScript fixtures reject altered populations, missing/extra policy fields,
percentages in count tables, conserved-total bin changes, forged mappings,
changed licenses, invalid source, and bad archive order/length/hashes. Independent
Python corruption tests also reconstruct conditional marginals and reject
coordinated tampering. `checks.json` and compressed logs record the performed
checks; `files.json` pins every compact package file except itself.

The raw source is CMU revision `74790861f652b15e4ac49015a90074ad62a27690`,
SHA-256 `81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22`.
The dictionary and original raw word archives are retained separately, not copied
into this package. Reproduction commands in the contract require those exact
inputs and fresh output paths. The verifier sources are in `evaluation/corpus/`.

No measure here establishes a reader preference. Whole-dictionary forms include
names, loans and inflections; bare roots and forced monosyllables are not matched
stem populations. Native source stress is retained, but the six marginal
sensitivity comparisons do not score generated stress patterns or conditional
length fit. No source token frequency, lexical category or familiarity is
invented. Later consumer adoption needs its own explicitly versioned change.
