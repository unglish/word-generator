# Q19 frequency source and evaluation requirements

The official SUBTLEX-US documentation distinguishes raw word-form counts from contextual diversity and provides part-of-speech information. The subtitle corpus is a possible source for a token-weighted American-English register target; it is not a general written-text corpus. [Official documentation](https://www.ugent.be/plone_portal/pp/experimentele-psychologie/en/research/documents/subtlexus/overview.htm).

Implementation inference: use an authenticated raw-count source for token-weighted length and phone targets. Do not substitute log frequency, Zipf scale, contextual diversity, ranks or dictionary-type counts for token mass. Record source bytes/version, column meanings, normalization, duplicates, case policy, selected dictionary pronunciation policy and unmatched token mass before fitting.

Function-word treatment must be explicit. Retain separate full-token and content-word targets where source tags support that distinction; preserve ambiguous tags and their documented masses instead of silently choosing the dominant tag. Dictionary citation pronunciations cannot establish contextual reduction, prosody or connected-speech phone distributions. A pronunciation join yields a citation-form estimate weighted by observed word frequencies.

A held-out spelling split assesses prediction on excluded lexical types. It is not a held-out subtitle-document or independent-corpus evaluation: aggregate word-frequency tables lack document-level observations. The study must state this limit or obtain separately authenticated document/corpus partitions. Report both selected-type and token coverage before renormalizing joined targets.

Freeze the source and split before choosing target weights or calibration. Keep all baseline/candidate length, phone, stress, morphology, spelling, diversity and performance results. Token-fit improvement alone does not establish syntax, semantic coherence, or human preference in pseudo-text.

## Authenticated source preflight

The officially linked text table and current POS workbook both contain 74,286 ASCII spellings and 49,719,560 word-form tokens. Their four integer frequency/count columns agree for every row. The pinned compatible CMU population joins 48,825 types with 49,079,866 tokens; 25,461 types and 639,694 tokens are unmatched. The raw 282,170-letter-string archive has 51,010,983 counts, a different tokenization/population; it is a coverage diagnostic rather than the main word-form target. Preserve both denominators.

POS counts do not reconcile with word-form counts: 2,310 rows have more tagged than word-form counts and 8,328 have fewer. Another 191 rows lack an integer POS list. Do not describe these as an exact partition of FREQcount or silently impute them. Any content/function decomposition using within-row relative tag counts is an explicit modeled allocation, with raw tag counts and all discrepancies retained separately. Dominant-tag assignment would erase observed ambiguity.

The official POS dataset includes a CC BY-NC-SA 4.0 license. Preserve attribution/license with research artifacts; do not silently package the derived data under the library's code license or promote it into default runtime tables. Generic source-accounting code can remain separate from externally supplied data.

The first workbook preflight incorrectly rejected derived frequency formulas in F–I; its source/log are retained. Direct count/word/POS input columns remain literal-only. Derived frequency, log-frequency and Zipf columns are not used as token weights. Latin1 decoding of old raw text preserves bytes and is not a language-encoding claim; only ASCII spellings are interpreted.
