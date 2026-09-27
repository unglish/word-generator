# Accounting revision 2

Adds original-selection cohort denominators and selection-to-root status
transitions. This prevents units with unavailable final ownership from silently
leaving their original c/g cohort. Both implementations independently count the
new measures. This supersedes earlier observation totals, not their inputs.

All 249 archived words, configurations and coordinates are unchanged (checked
record by record with only observation fields removed). Independent comparison
passes 2,788 events and 51,445 integer comparisons. Earlier artifacts remain
historical evidence of the previous observer revision; the current recount
expects the revised accounting files here.

The first reobservation attempt failed before producing output because fixture
JSON had serialized Maps as empty objects. The corrected runner rebuilds the
inventory-derived grapheme maps for the three known fixture configurations;
it refuses unknown configuration names. This is a fixture replay contract, not
a general promise to reconstruct arbitrary custom Maps. No new words were
generated during reobservation.

TypeScript tests also cover a public-generated v3 trace: final-root ownership
is outside-supported-version for every phone and remains in the cohort totals.
Shared-output adjacency, empty-ledger and explicit cross-syllable assertions
remain outstanding before full baseline registration.
