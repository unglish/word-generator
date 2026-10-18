# Exploratory audit of the exact #335 control archive

The observer checked the externally pinned manifest and every artifact before and after reading all 200,000 records across 20 streams. It reconciled 1,010,404 spelling units to their selection events and source-phone ownership. There were 20,770 sampled attempts: 17,362 successes and 3,408 failed rolls. A separate 2,878 directly selected ck units consumed quota; these are not sampled expansions.

| Sampled relation | Events | Interpretation |
|---|---:|---|
| /s/: c→ck | 220 | Does not preserve the ordinary intended /s/ reading |
| /z/: s→ss | 1,458 | Requires lexical support absent from the proposed ordinary policy |
| /ʃ/: s→ss | 4 | Requires lexical/construction support absent from the proposed ordinary policy |

The table's 1,682 events are a subset of the 17,362 successes, not three exhaustive categories of English error. Each success occurs in a separate word in this archive. Counts refer to retained root spelling before morphology and later generic repairs, not an adjudication of the final pronunciation. All 465 observed relation/reason categories and their profile counts remain in inventory.json.gz; 18 first full-trace witnesses cover every sampled-success/direct-counted relation.

The Python observer and original log are copied unchanged, including original external paths. inventory.json.gz restores the exact 926,752-byte report with SHA256 `dd240dfe6f6f467f35d50d03b0159cf235092d2e606abe903b105d8d1687fa50`. This is exploratory observation with integrity and trace consistency assertions, not yet an independent linguistic proof. The formal experiment requires a separately reviewed observer and independent recount. The report itself pins the exact observer source. Re-execution requires the manifest-pinned corpus at the recorded path and a fresh output destination. No generator was called.
