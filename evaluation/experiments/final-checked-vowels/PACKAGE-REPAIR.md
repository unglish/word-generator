# Publication package repair

Four indexed evidence records were omitted from the original Git publication by
ignore rules: the candidate/control active-quality reports and their two Vitest
result-cache records. This repair restores the exact original bytes at the
original indexed paths.

All 208 indexed records, the original index, measured generator sources,
numerical results, failures and thresholds remain unchanged. The verifier now
validates every record in the published layout. This fixes package completeness;
the disclosed generator acceptance failures and adoption recommendation remain.

This note is supplemental publication documentation outside the original
measurement index. The original indexed results report is byte-identical.
