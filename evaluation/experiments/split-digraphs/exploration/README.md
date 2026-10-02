# Frozen control exploration

The pinned Q13b candidate archive supplies Q14a's prospective control. A read-only
scan covers all 200,000 development words in the registered twenty streams.
Every manifest artifact hash and size was verified before and after the scan.
No generation, validation access or runtime edit occurred.

| Retained edit rule | Events |
|---|---:|
| Syllable `magic-e` rewrite | 5,537 |
| Word-level silent-e swap | 7,080 |
| Word-level silent-e marker | 16,917 |
| Consonant-convention silent-e append | 462 |

22,787 words contain at least one of these edits. Event totals are not disjoint
word counts. The report retains 88 categories by rule, phase, before/after text
and input-origin kinds, each with a complete first word/trace and edit ID.
All category totals reconcile to their rule counts; every witness category was
checked against its referenced edit.

Swaps and markers must not be treated as equally sized trial populations. The
ledger omits edits whose replacement equals the input (`BaseSpelling.edit` and
`editBatch`), while the word-stage function can append a marker even when the
vowel component is unchanged. Refused/unsampled opportunities are unavailable
from this retained-edit inventory. The counts neither certify pronunciation
nor establish that every event is defective. No independent recount is claimed.

Run from the repository root:

```sh
python3 evaluation/experiments/split-digraphs/exploration/control_inventory.py /private/tmp/q14a-control-inventory-new.json
```

The output must not already exist. The script requires the full frozen archive
at `/private/tmp/q13b-aligned-shared-graphemes-candidate-v1`. Its manifest is
packaged here; complete word shards remain external. `manifest.json` pins the
script, compressed report, raw log and compressed control manifest. The report
also records the running script hash, Python version and control manifest hash.
