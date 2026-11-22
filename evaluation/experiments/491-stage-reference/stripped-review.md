# Issue #491 stripped-row spot-check

Phase 1 digest: 2eacf788dd396e5207908c613d6689390e462d0488fa6e847606e08c124ce467.
The independent Python verifier passed on all 117,485 ledger rows.

Rank the 21,829 included ledger rows with at least one removal by SHA-256 of
`stage-references-phase2-491-stripped-v1:<spelling>`. Take 200 rows without
replacement. One reviewer checked the selected chain against the ordinary
meaning and pronunciation, counting incomplete or ambiguous chains separately
when the boundary or lexeme analysis was debatable.

190 correct, 7 wrong (3.5%), 3 debatable (1.5%). Counting all debatable rows
as wrong puts the observed share at 5.0%. This estimates error among
representable stripped rows. It does not measure missed stripping among bare
rows, or errors in excluded rows. There was no independent second semantic
review. The full row judgments are in stripped-review.tsv.
