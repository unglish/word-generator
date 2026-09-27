# Additional ownership fixtures

Five existing Q14a traces were selected from the stratified witness archive for
actual following-letter contexts before selection, rewrite, completion and
split-vowel cells, plus a licensed replacement. Selection provenance and exact
stream coordinates are retained. These are targeted tests, not a representative
sample. The archived source contains 1,473 witnesses; its hash is recorded.

Three new public-API words use an explicitly synthetic custom inventory to
force ed → d whole-unit normalization at seeds 13, 137 and 4099. This inventory
is a test fixture, not an English reading recommendation or candidate policy.
Both the complete normalized span and rejection of a damaged certificate are
checked by the TypeScript harness.

All eight traces pass producer authentication and independent event/count
comparison: 72 events and 1,194 integer comparisons. The targeted harness also
rejects a corrupted licensed certificate. Run check_recount.py against each
compressed file to repeat the independent comparisons. The TypeScript harnesses
are check-targeted.ts and check-normalized.ts; neither overwrites output files.

Still needed: full contextual adjacency before shared output, historical ledger
versions, empty populations, and systematic selection-to-root transition and
cross-syllable assertions. Broader evidence must precede baseline registration.
